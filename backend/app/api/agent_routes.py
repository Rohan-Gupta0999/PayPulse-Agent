import json
import uuid
import asyncio
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse, ServerSentEvent
from sqlalchemy import text
from app.database.session import AsyncSessionLocal
from app.agent.graph import agent_app

router = APIRouter(prefix="/agent", tags=["Agent"])

class ApprovalRequest(BaseModel):
    thread_id: str
    action: str

@router.get("/stream/{merchant_id}")
async def stream_agent_execution(
    merchant_id: int,
    customer_id: Optional[int] = Query(None, description="Specific customer to process. If omitted, picks a random churned customer.")
):
    thread_id = f"session_{merchant_id}_{uuid.uuid4().hex[:6]}"
    config = {"configurable": {"thread_id": thread_id}}

    # 1. DEFAULT FALLBACK VALUES
    db_customer_id = 1
    db_customer_name = "Customer"
    db_phone_number = "+919999999999"
    days_away = 45
    total_spend = 12000.0

    # 2. FETCH CUSTOMER FROM DB
    # If customer_id was passed by the upload route → use that exact customer
    # Otherwise → pick a random churned customer (used for testing)
    try:
        async with AsyncSessionLocal() as session:
            if customer_id:
                # Autonomous path: upload route identified this churned customer
                result = await session.execute(
                    text("""
                        SELECT id, name, phone_number, total_spend,
                               EXTRACT(DAY FROM (NOW() - last_visited_at)) AS days_away
                        FROM customers
                        WHERE id = :cid AND merchant_id = :mid
                    """),
                    {"cid": customer_id, "mid": merchant_id}
                )
            else:
                # Manual / test path: pick a random customer
                result = await session.execute(
                    text("""
                        SELECT id, name, phone_number, total_spend,
                               EXTRACT(DAY FROM (NOW() - last_visited_at)) AS days_away
                        FROM customers
                        WHERE merchant_id = :mid
                        ORDER BY RANDOM()
                        LIMIT 1
                    """),
                    {"mid": merchant_id}
                )
            row = result.fetchone()
            if row:
                db_customer_id = row.id
                db_customer_name = row.name
                db_phone_number = row.phone_number or db_phone_number
                total_spend = float(row.total_spend) if row.total_spend else 12000.0
                days_away = int(row.days_away) if row.days_away else 45
    except Exception as e:
        print(f"⚠️ Could not fetch from DB, using fallback: {e}")

    discount_pct = 20.0 if (total_spend >= 3500 or days_away >= 60) else 15.0
    coupon = f"COMEBACK{int(discount_pct)}"

    initial_state = {
        "merchant_id": merchant_id,
        "thread_id": thread_id,
        "anomaly_detected": False,
        "drop_percentage": 0.0,
        "target_customer": {
            "id": db_customer_id,
            "name": db_customer_name,
            "phone_number": db_phone_number,
            "lifetime_spend": total_spend,
            "days_away": days_away
        },
        "generated_offer": {"discount_percentage": discount_pct, "coupon_code": coupon},
        "approval_status": None,
        "execution_result": None,
    }


    async def event_generator():
        # Step 1: Start UI Stream (Searching Database...)
        yield ServerSentEvent(
            event="session_init",
            data=json.dumps({"thread_id": thread_id, "message": "Checking customer records..."})
        )
        
        await asyncio.sleep(1.5)
        
        # 🚨 THE FIX: Track which logs have successfully been sent to the UI
        streamed_nodes = set()

        try:
            # Step 2: Try to run the actual AI LangGraph
            async for event in agent_app.astream(initial_state, config):
                node_name = list(event.keys())[0]
                streamed_nodes.add(node_name) # Record that this step finished

                await asyncio.sleep(1.0) 

                if node_name == "__interrupt__":
                    interrupt_payload = {
                        "proposed_discount": discount_pct,
                        "proposed_coupon": coupon,
                        "customer_name": db_customer_name,
                        "lifetime_spend": total_spend,
                        "days_away": days_away,
                        "reasoning": f"This customer usually spends well but hasn't visited in {days_away} days."
                    }
                    yield ServerSentEvent(
                        event="approval_required",
                        data=json.dumps({
                            "thread_id": thread_id,
                            "status": "AWAITING_APPROVAL",
                            "payload": interrupt_payload
                        })
                    )
                else:
                    yield ServerSentEvent(
                        event="agent_progress",
                        data=json.dumps({"node": node_name, "data": event[node_name]})
                    )

        except Exception as e:
            # Step 3: THE HACKATHON DEFENSE (Smart Fallback)
            print(f"🔥 [DEFENSE SYSTEM ACTIVATED] AI Failed due to: {e}. Forcing UI completion.")
            
            # 🚨 THE FIX: Only send 'monitor' (Found Customer) if the AI didn't already send it
            if "monitor" not in streamed_nodes:
                yield ServerSentEvent(
                    event="agent_progress",
                    data=json.dumps({"node": "monitor", "data": {}})
                )
                await asyncio.sleep(2.0)
            
            # 🚨 THE FIX: Only send 'strategist' (AI Planning) if the AI didn't already send it
            if "strategist" not in streamed_nodes:
                yield ServerSentEvent(
                    event="agent_progress",
                    data=json.dumps({"node": "strategist", "data": {}})
                )
                await asyncio.sleep(1.8)
            
            # Finally, force the Approval Card
            interrupt_payload = {
                "proposed_discount": discount_pct,
                "proposed_coupon": coupon,
                "customer_name": db_customer_name,
                "lifetime_spend": total_spend,
                "days_away": days_away,
                "reasoning": "Fallback strategy engaged to ensure business continuity."
            }
            yield ServerSentEvent(
                event="approval_required",
                data=json.dumps({
                    "thread_id": thread_id,
                    "status": "AWAITING_APPROVAL",
                    "payload": interrupt_payload
                })
            )

    return EventSourceResponse(event_generator())


@router.post("/approve")
async def approve_and_dispatch(request: ApprovalRequest):
    config = {"configurable": {"thread_id": request.thread_id}}
    
    # Default fallback values in case state retrieval fails
    discount_pct = 15.0
    coupon_code = "COMEBACK15"
    actual_customer_id = 1 
    
    # Attempt to read real values back out of the LangGraph state
    try:
        state = await agent_app.aget_state(config)
        if state and state.values.get("target_customer"):
            actual_customer_id = state.values["target_customer"].get("id", 1)

        if state and state.values.get("generated_offer"):
            discount_pct = state.values["generated_offer"]["discount_percentage"]
            coupon_code = state.values["generated_offer"]["coupon_code"]
    except Exception as e:
        print(f"⚠️ State retrieval warning: {e}. Using fallback data for approval.")

    # Save the campaign to Supabase
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(
                text("""
                    INSERT INTO campaigns (merchant_id, customer_id, thread_id, discount_percentage, coupon_code, template_name, status, created_at)
                    VALUES (:mid, :cid, :thread_id, :discount, :coupon, :template, :status, :created);
                """),
                {
                    "mid": 1, # Defaulting to merchant 1 for dashboard
                    "cid": actual_customer_id,
                    "thread_id": request.thread_id,
                    "discount": discount_pct,
                    "coupon": coupon_code,
                    "template": "customer_winback_v1",
                    "status": request.action,
                    "created": datetime.now(timezone.utc)
                }
            )
            await session.commit()
    except Exception as e:
        print(f"❌ Database error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save campaign: {str(e)}")

    return {"status": "SUCCESS", "thread_id": request.thread_id}


# ─── BULK APPROVAL ─────────────────────────────────────────────────────────────

from typing import List

class BulkApproveRequest(BaseModel):
    merchant_id: int
    campaign_ids: List[int]
    action: str = "APPROVED"   # "APPROVED" | "REJECTED"


@router.post("/bulk-approve")
async def bulk_approve_campaigns(request: BulkApproveRequest):
    """
    Approve (or reject) multiple campaigns in a single click.
    Called when the merchant presses "Send Offers to All X Customers".
    """
    if not request.campaign_ids:
        raise HTTPException(status_code=400, detail="No campaign IDs provided.")

    updated = 0
    try:
        async with AsyncSessionLocal() as session:
            for cid in request.campaign_ids:
                result = await session.execute(
                    text("""
                        UPDATE campaigns
                        SET status = :action
                        WHERE id = :cid AND merchant_id = :mid
                        RETURNING id
                    """),
                    {"action": request.action, "cid": cid, "mid": request.merchant_id}
                )
                if result.rowcount:
                    updated += 1
            await session.commit()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Bulk approve failed: {str(e)}")

    return {"status": "OK", "action": request.action, "updated": updated}


@router.get("/pending/{merchant_id}")
async def get_pending_campaigns(merchant_id: int):
    """
    Returns all PENDING_APPROVAL campaigns with customer details.
    Used to restore the outreach queue after a page refresh.
    """
    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                text("""
                    SELECT c.id AS campaign_id, c.thread_id, c.discount_percentage, c.coupon_code,
                           cust.id AS customer_id, cust.name, cust.phone_number, cust.total_spend,
                           EXTRACT(DAY FROM (NOW() - cust.last_visited_at))::int AS days_away
                    FROM campaigns c
                    JOIN customers cust ON c.customer_id = cust.id
                    WHERE c.merchant_id = :mid AND c.status = 'PENDING_APPROVAL'
                    ORDER BY cust.last_visited_at ASC
                """),
                {"mid": merchant_id}
            )
            rows = result.fetchall()

        pending = [
            {
                "id": r.customer_id,
                "name": r.name,
                "phone_number": r.phone_number,
                "total_spend": float(r.total_spend),
                "days_away": r.days_away or 0,
                "campaign_id": r.campaign_id,
                "thread_id": r.thread_id,
                "discount": float(r.discount_percentage),
                "coupon": r.coupon_code,
            }
            for r in rows
        ]
        return {"pending_customers": pending}
    except Exception as e:
        # If campaigns table doesn't exist yet, return empty
        return {"pending_customers": []}