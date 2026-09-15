from typing import TypedDict, Optional
from datetime import datetime, timezone
from langgraph.graph import StateGraph, START, END
from langgraph.types import interrupt
from langgraph.checkpoint.memory import MemorySaver
from sqlalchemy import select

from app.database.session import AsyncSessionLocal
from app.database.models import Campaign
from app.agent.tools import detect_payment_drop, get_lapsed_customers_with_consent
from app.agent.llm import generate_guardrailed_offer
from app.services.whatsapp import send_whatsapp_template_message


# 1. State Definition: The shared data backpack passed between all nodes
class AgentState(TypedDict):
    merchant_id: int
    thread_id: str
    anomaly_detected: bool
    drop_percentage: float
    target_customer: Optional[dict]
    generated_offer: Optional[dict]
    approval_status: Optional[str]  # "APPROVED" or "REJECTED"
    execution_result: Optional[dict]


# 2. Node 1: Monitor Node (Scans database for payment drops)
async def monitor_node(state: AgentState) -> dict:
    print("\n🔍 [Node: Monitor] Checking payment volume...")
    async with AsyncSessionLocal() as session:
        anomaly = await detect_payment_drop(session, state["merchant_id"])
        
    return {
        "anomaly_detected": anomaly["anomaly_detected"],
        "drop_percentage": anomaly.get("drop_percentage", 0.0)
    }


async def strategist_node(state: dict):
    target = state.get("target_customer", {})
    spend = target.get("lifetime_spend", 10000)
    days = target.get("days_away", 45)
    customer_name = target.get("name", "Customer")

    # Dynamic fallback defaults based on merchant business rules
    discount = 20.0 if (spend >= 20000 or days >= 60) else 15.0
    coupon = f"COMEBACK{int(discount)}"

    try:
        # YOUR EXISTING GEMINI LLM INVOCATION HERE
        # e.g.:
        # response = await llm.ainvoke(...)
        # discount = parsed_discount
        # coupon = parsed_coupon
        pass 
    except Exception as e:
        # If Gemini throws 429 Quota Exceeded or fails, seamlessly fall back!
        print(f"⚠️ [PayPulse Defense] LLM unavailable ({e}). Using deterministic strategy.")

    return {
        "generated_offer": {
            "discount_percentage": discount,
            "coupon_code": coupon
        }
    }


# 4. Node 3: Gateway Node (Pauses and halts execution for merchant approval)
def gateway_node(state: AgentState) -> dict:
    print("⏸️ [Node: Gateway] Halting graph execution. Awaiting merchant approval...")
    
    payload_for_review = {
        "merchant_id": state["merchant_id"],
        "customer_name": state["target_customer"]["name"],
        "proposed_discount": state["generated_offer"]["discount_percentage"],
        "proposed_coupon": state["generated_offer"]["coupon_code"],
        "reasoning": state["generated_offer"]["reasoning"]
    }

    # interrupt() halts the state graph and waits for external Command(resume=...)
    human_decision = interrupt(payload_for_review)

    return {"approval_status": human_decision.get("status", "REJECTED")}


# 5. Node 4: Dispatcher Node (Sends WhatsApp message after approval)
async def dispatch_node(state: AgentState) -> dict:
    print("🚀 [Node: Dispatch] Merchant approved! Dispatching offer via WhatsApp...")
    
    cust = state["target_customer"]
    offer = state["generated_offer"]

    res = await send_whatsapp_template_message(
        recipient_phone=cust["phone_number"],
        customer_name=cust["name"],
        discount_percentage=offer["discount_percentage"],
        coupon_code=offer["coupon_code"]
    )

    # Update status to APPROVED in database
    async with AsyncSessionLocal() as session:
        stmt = select(Campaign).where(Campaign.thread_id == state["thread_id"])
        campaign = (await session.execute(stmt)).scalar_one_or_none()
        if campaign:
            campaign.status = "APPROVED"
            campaign.approved_at = datetime.now(timezone.utc)
            await session.commit()

    return {"execution_result": res}


# 6. Edge Decision Router
def check_anomaly_condition(state: AgentState) -> str:
    if state["anomaly_detected"]:
        return "strategist"
    return END


def check_approval_condition(state: AgentState) -> str:
    if state.get("approval_status") == "APPROVED":
        return "dispatch"
    return END


# 7. Assemble the StateGraph
workflow = StateGraph(AgentState)

workflow.add_node("monitor", monitor_node)
workflow.add_node("strategist", strategist_node)
workflow.add_node("gateway", gateway_node)
workflow.add_node("dispatch", dispatch_node)

workflow.add_edge(START, "monitor")
workflow.add_conditional_edges("monitor", check_anomaly_condition)
workflow.add_edge("strategist", "gateway")
workflow.add_conditional_edges("gateway", check_approval_condition)
workflow.add_edge("dispatch", END)

# Durable in-memory checkpointer for thread management
checkpointer = MemorySaver()
agent_app = workflow.compile(checkpointer=checkpointer)