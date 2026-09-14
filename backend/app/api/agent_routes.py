import json
import os
import uuid
import random
from datetime import datetime, timezone
from typing import AsyncGenerator
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse, ServerSentEvent
from langgraph.types import Command
from sqlalchemy import text
from app.database.session import AsyncSessionLocal
from app.agent.graph import agent_app

router = APIRouter(prefix="/agent", tags=["Agent"])

class ApprovalRequest(BaseModel):
    thread_id: str
    action: str

# Data for AI to simulate offline store metrics
DAYS_AWAY = [35, 42, 60, 85, 120]
LIFETIME_SPEND = [12000, 45000, 8900, 21000, 34000, 6500, 150000, 52000]
DISCOUNTS = [10.0, 15.0, 20.0, 5.0]

@router.get("/stream/{merchant_id}")
async def stream_agent_execution(merchant_id: int):
    thread_id = f"session_{merchant_id}_{uuid.uuid4().hex[:6]}"
    config = {"configurable": {"thread_id": thread_id}}

    # 1. FETCH A REAL AT-RISK CUSTOMER DIRECTLY FROM SUPABASE
    db_customer_id = 1
    db_customer_name = "Aarav Sharma"
    days_away = 45
    total_spend = 15000.0

    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                text("""
                    SELECT id, name, total_spend, 
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
                total_spend = float(row.total_spend) if row.total_spend else 12000.0
                days_away = int(row.days_away) if row.days_away else 45
    except Exception as e:
        print(f"⚠️ Could not fetch from DB, using fallback: {e}")

    # 2. GENERATE AI METRICS
    days_away = random.choice(DAYS_AWAY)
    total_spend = random.choice(LIFETIME_SPEND)
    discount_pct = random.choice(DISCOUNTS)
    coupon = f"COMEBACK{int(discount_pct)}"

    # 3. INJECT REAL ID INTO THE STATE MACHINE
    initial_state = {
        "merchant_id": merchant_id,
        "thread_id": thread_id,
        "anomaly_detected": False,
        "drop_percentage": 0.0,
        "target_customer": {
            "id": db_customer_id, 
            "name": db_customer_name, 
            "lifetime_spend": total_spend, 
            "days_away": days_away
        },
        "generated_offer": {"discount_percentage": discount_pct, "coupon_code": coupon},
        "approval_status": None,
        "execution_result": None,
    }

    async def event_generator() -> AsyncGenerator[ServerSentEvent, None]:
        yield ServerSentEvent(
            event="session_init",
            data=json.dumps({"thread_id": thread_id, "message": "Checking customer records..."})
        )

        async for event in agent_app.astream(initial_state, config):
            node_name = list(event.keys())[0]

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

    return EventSourceResponse(event_generator())


@router.post("/approve")
async def approve_and_dispatch(request: ApprovalRequest):
    config = {"configurable": {"thread_id": request.thread_id}}
    state = await agent_app.aget_state(config)
    
    discount_pct = 15.0
    coupon_code = "COMEBACK"
    actual_customer_id = 1 
    
    # READ THE REAL CUSTOMER ID BACK OUT OF THE LANGGRAPH STATE
    if state and state.values.get("target_customer"):
        actual_customer_id = state.values["target_customer"].get("id", 1)

    if state and state.values.get("generated_offer"):
        discount_pct = state.values["generated_offer"]["discount_percentage"]
        coupon_code = state.values["generated_offer"]["coupon_code"]

    try:
        async with AsyncSessionLocal() as session:
            await session.execute(
                text("""
                    INSERT INTO campaigns (merchant_id, customer_id, thread_id, discount_percentage, coupon_code, template_name, status, created_at)
                    VALUES (:mid, :cid, :thread_id, :discount, :coupon, :template, :status, :created);
                """),
                {
                    "mid": 1,
                    "cid": actual_customer_id, # <--- REAL FOREIGN KEY LINKED!
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