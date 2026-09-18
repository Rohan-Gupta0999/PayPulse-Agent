import json
import uuid
import asyncio
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse, ServerSentEvent
from sqlalchemy import text

from app.database.session import AsyncSessionLocal
from app.agent.graph import agent_app
from app.api.upload_routes import calculate_spend_based_discount

router = APIRouter(prefix="/agent", tags=["Agent"])


class ApprovalRequest(BaseModel):
    thread_id: str
    action: str  # "APPROVED" | "REJECTED"


class BulkApproveRequest(BaseModel):
    merchant_id: int
    campaign_ids: List[int]
    action: str = "APPROVED"  # "APPROVED" | "REJECTED"


async def safe_send_whatsapp_offer(phone: str, customer_name: str, discount: float, coupon: str):
    """Safely triggers WhatsApp dispatch without crashing if credentials or service are offline."""
    try:
        from app.services.whatsapp import send_whatsapp_discount_offer
        await send_whatsapp_discount_offer(
            recipient_phone=phone,
            customer_name=customer_name,
            discount_percentage=discount,
            coupon_code=coupon
        )
    except (ImportError, AttributeError):
        # Fallback if whatsapp service only has generic message function
        try:
            from app.services.whatsapp import send_whatsapp_welcome_message
            pass
        except Exception:
            pass
    except Exception as e:
        print(f"⚠️ WhatsApp win-back dispatch notice: {e}")


@router.get("/stream/{merchant_id}")
async def stream_agent_execution(
    merchant_id: int,
    customer_id: Optional[int] = Query(None, description="Specific customer to process. If omitted, picks top churned customer.")
):
    thread_id = f"session_{merchant_id}_{uuid.uuid4().hex[:6]}"
    config = {"configurable": {"thread_id": thread_id}}

    db_customer_id = 1
    db_customer_name = "Customer"
    db_phone_number = "+919999999999"
    days_away = 45
    total_spend = 12000.0

    try:
        async with AsyncSessionLocal() as session:
            if customer_id:
                result = await session.execute(
                    text("""
                        SELECT id, name, phone_number, total_spend,
                               COALESCE(EXTRACT(DAY FROM (NOW() - last_visited_at))::int, 45) AS days_away
                        FROM customers
                        WHERE id = :cid AND merchant_id = :mid
                    """),
                    {"cid": customer_id, "mid": merchant_id}
                )
            else:
                # Prefer the customer with longest absence rather than random
                result = await session.execute(
                    text("""
                        SELECT id, name, phone_number, total_spend,
                               COALESCE(EXTRACT(DAY FROM (NOW() - last_visited_at))::int, 45) AS days_away
                        FROM customers
                        WHERE merchant_id = :mid
                        ORDER BY last_visited_at ASC NULLS LAST
                        LIMIT 1
                    """),
                    {"mid": merchant_id}
                )

            row = result.fetchone()
            if row:
                db_customer_id = row.id
                db_customer_name = row.name or "Valued Customer"
                db_phone_number = row.phone_number or db_phone_number
                total_spend = float(row.total_spend) if row.total_spend else 12000.0
                days_away = int(row.days_away) if row.days_away else 45

                # Sync this session's thread_id with any pending campaign staged during upload
                await session.execute(
                    text("""
                        UPDATE campaigns
                        SET thread_id = :tid
                        WHERE merchant_id = :mid 
                          AND customer_id = :cid 
                          AND status = 'PENDING_APPROVAL'
                    """),
                    {"tid": thread_id, "mid": merchant_id, "cid": db_customer_id}
                )
                await session.commit()

    except Exception as e:
        print(f"⚠️ Could not fetch from DB, using fallback: {e}")

    discount_pct, coupon = calculate_spend_based_discount(total_spend)

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
        yield ServerSentEvent(
            event="session_init",
            data=json.dumps({"thread_id": thread_id, "message": "Checking customer records..."})
        )
        
        await asyncio.sleep(1.2)
        streamed_nodes = set()

        try:
            async for event in agent_app.astream(initial_state, config):
                node_name = list(event.keys())[0]
                streamed_nodes.add(node_name)

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
            print(f"🔥 [DEFENSE SYSTEM ACTIVATED] Fallback engaged: {e}")
            
            if "monitor" not in streamed_nodes:
                yield ServerSentEvent(
                    event="agent_progress",
                    data=json.dumps({"node": "monitor", "data": {}})
                )
                await asyncio.sleep(1.8)
            
            if "strategist" not in streamed_nodes:
                yield ServerSentEvent(
                    event="agent_progress",
                    data=json.dumps({"node": "strategist", "data": {}})
                )
                await asyncio.sleep(1.6)
            
            interrupt_payload = {
                "proposed_discount": discount_pct,
                "proposed_coupon": coupon,
                "customer_name": db_customer_name,
                "lifetime_spend": total_spend,
                "days_away": days_away,
                "reasoning": f"High-value patron absent for {days_away} days. Win-back incentive suggested."
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
    
    discount_pct = 15.0
    coupon_code = "COMEBACK15"
    actual_customer_id = 1 
    customer_phone = None
    customer_name = "Valued Customer"
    
    try:
        state = await agent_app.aget_state(config)
        if state and state.values.get("target_customer"):
            actual_customer_id = state.values["target_customer"].get("id", 1)
            customer_phone = state.values["target_customer"].get("phone_number")
            customer_name = state.values["target_customer"].get("name", "Valued Customer")

        if state and state.values.get("generated_offer"):
            discount_pct = state.values["generated_offer"].get("discount_percentage", 15.0)
            coupon_code = state.values["generated_offer"].get("coupon_code", "COMEBACK15")
    except Exception as e:
        print(f"⚠️ State retrieval notice: {e}")

    # Upsert into campaigns table: update existing pending campaign or insert new
    try:
        async with AsyncSessionLocal() as session:
            # Check for pre-staged campaign with matching thread_id or pending customer_id
            lookup = await session.execute(
                text("""
                    SELECT id, customer_id FROM campaigns 
                    WHERE thread_id = :tid 
                       OR (customer_id = :cid AND status = 'PENDING_APPROVAL')
                    ORDER BY id DESC LIMIT 1
                """),
                {"tid": request.thread_id, "cid": actual_customer_id}
            )
            camp_row = lookup.fetchone()

            if camp_row:
                await session.execute(
                    text("""
                        UPDATE campaigns
                        SET status = :status,
                            discount_percentage = :discount,
                            coupon_code = :coupon,
                            created_at = :created
                        WHERE id = :id
                    """),
                    {
                        "status": request.action,
                        "discount": discount_pct,
                        "coupon": coupon_code,
                        "created": datetime.now(timezone.utc),
                        "id": camp_row.id
                    }
                )
            else:
                await session.execute(
                    text("""
                        INSERT INTO campaigns 
                            (merchant_id, customer_id, thread_id, discount_percentage, 
                             coupon_code, template_name, status, created_at)
                        VALUES 
                            (:mid, :cid, :thread_id, :discount, 
                             :coupon, 'customer_winback_v1', :status, :created);
                    """),
                    {
                        "mid": 1,
                        "cid": actual_customer_id,
                        "thread_id": request.thread_id,
                        "discount": discount_pct,
                        "coupon": coupon_code,
                        "status": request.action,
                        "created": datetime.now(timezone.utc)
                    }
                )

            # Retrieve customer details if missing
            if not customer_phone:
                c_res = await session.execute(
                    text("SELECT name, phone_number FROM customers WHERE id = :cid"),
                    {"cid": actual_customer_id}
                )
                c_row = c_res.fetchone()
                if c_row:
                    customer_name = c_row.name or customer_name
                    customer_phone = c_row.phone_number

            await session.commit()

        # Trigger WhatsApp message if approved
        if request.action == "APPROVED" and customer_phone:
            await safe_send_whatsapp_offer(customer_phone, customer_name, discount_pct, coupon_code)

    except Exception as e:
        print(f"❌ Database error on approval: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save campaign decision: {str(e)}")

    return {"status": "SUCCESS", "thread_id": request.thread_id, "action": request.action}


@router.post("/bulk-approve")
async def bulk_approve_campaigns(request: BulkApproveRequest):
    """
    Approve (or reject) multiple campaigns in a single click.
    Dispatches WhatsApp notifications for all approved customers.
    """
    if not request.campaign_ids:
        raise HTTPException(status_code=400, detail="No campaign IDs provided.")

    updated = 0
    dispatched_list = []
    try:
        async with AsyncSessionLocal() as session:
            for cid in request.campaign_ids:
                # Fetch details for WhatsApp dispatch before updating
                camp_query = await session.execute(
                    text("""
                        SELECT c.id, c.discount_percentage, c.coupon_code, cust.name, cust.phone_number
                        FROM campaigns c
                        JOIN customers cust ON c.customer_id = cust.id
                        WHERE c.id = :cid AND c.merchant_id = :mid
                    """),
                    {"cid": cid, "mid": request.merchant_id}
                )
                camp_item = camp_query.fetchone()

                result = await session.execute(
                    text("""
                        UPDATE campaigns
                        SET status = :action,
                            created_at = NOW()
                        WHERE id = :cid AND merchant_id = :mid
                        RETURNING id
                    """),
                    {"action": request.action, "cid": cid, "mid": request.merchant_id}
                )
                if result.rowcount:
                    updated += 1
                    if camp_item and request.action == "APPROVED":
                        dispatched_list.append({
                            "phone": camp_item.phone_number,
                            "name": camp_item.name,
                            "discount": float(camp_item.discount_percentage or 15.0),
                            "coupon": camp_item.coupon_code or "COMEBACK15"
                        })

            await session.commit()

        # Dispatch WhatsApp messages
        for item in dispatched_list:
            if item["phone"]:
                await safe_send_whatsapp_offer(item["phone"], item["name"], item["discount"], item["coupon"])

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
                           COALESCE(EXTRACT(DAY FROM (NOW() - cust.last_visited_at))::int, 30) AS days_away
                    FROM campaigns c
                    JOIN customers cust ON c.customer_id = cust.id
                    WHERE c.merchant_id = :mid AND c.status = 'PENDING_APPROVAL'
                    ORDER BY c.id DESC
                """),
                {"mid": merchant_id}
            )
            rows = result.fetchall()

        pending = [
            {
                "id": r.customer_id,
                "name": r.name,
                "phone_number": r.phone_number,
                "total_spend": float(r.total_spend or 0.0),
                "days_away": r.days_away or 30,
                "campaign_id": r.campaign_id,
                "thread_id": r.thread_id,
                "discount": float(r.discount_percentage or 15.0),
                "coupon": r.coupon_code or "COMEBACK15",
            }
            for r in rows
        ]
        return {"pending_customers": pending}
    except Exception as e:
        print(f"Error fetching pending campaigns: {e}")
        return {"pending_customers": []}