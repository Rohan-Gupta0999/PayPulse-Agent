import re
import json
from datetime import timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import text

from app.database.session import AsyncSessionLocal

router = APIRouter(prefix="/merchant", tags=["Merchant Metrics"])


@router.get("/{merchant_id}/stats")
async def get_merchant_stats(merchant_id: int):
    """
    Aggregates campaign + customer data for the frontend KPI dashboard.
    Also returns weekly_graph_data from weekly_snapshots so the charts
    render correctly after a page refresh (without requiring a new upload).
    """
    try:
        async with AsyncSessionLocal() as session:
            # ── Campaign counts ───────────────────────────────────────────────
            result = await session.execute(
                text("""
                    SELECT
                        COUNT(*) as total_interventions,
                        COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as approved_count,
                        COUNT(CASE WHEN status = 'REJECTED' THEN 1 END) as rejected_count,
                        COUNT(CASE WHEN status = 'PENDING_APPROVAL' THEN 1 END) as pending_count
                    FROM campaigns
                    WHERE merchant_id = :mid
                """),
                {"mid": merchant_id}
            )
            stats = result.fetchone()

            total = stats.total_interventions or 0
            approved = stats.approved_count or 0
            decided = approved + (stats.rejected_count or 0)
            success_rate = round((approved / decided * 100), 1) if decided > 0 else 0.0

            # ── Customer live metrics ─────────────────────────────────────────
            cust_res = await session.execute(
                text("""
                    SELECT
                        COUNT(*) AS total_customers,
                        COALESCE(SUM(total_spend), 0) AS total_sales,
                        COUNT(CASE WHEN last_visited_at >= NOW() - INTERVAL '30 days' THEN 1 END) AS regular_customers,
                        COUNT(CASE WHEN last_visited_at < NOW() - INTERVAL '30 days' THEN 1 END) AS at_risk_customers
                    FROM customers
                    WHERE merchant_id = :mid
                """),
                {"mid": merchant_id}
            )
            c_row = cust_res.fetchone()

            # ── Weekly Snapshots History (for Bar Graphs & KPI switching) ───
            weeks_breakdown = []
            latest_kpis = None
            weekly_graph_data = {"weeks": [], "sales": [], "visits": [], "regular": [], "at_risk": [], "profit": []}

            try:
                snap_all = await session.execute(
                    text("""
                        SELECT id, week_start_date, week_label, total_sales, weekly_capital, profit,
                               total_customers, regular_customers, at_risk_customers, daily_metrics
                        FROM weekly_snapshots
                        WHERE merchant_id = :mid
                        ORDER BY id ASC
                    """),
                    {"mid": merchant_id}
                )
                snap_rows = snap_all.fetchall()

                for idx, r in enumerate(snap_rows):
                    dm = r.daily_metrics
                    if isinstance(dm, str):
                        try:
                            dm = json.loads(dm)
                        except Exception:
                            dm = None

                    if not dm or not isinstance(dm, dict) or not dm.get("weeks"):
                        # Fallback 7 days if daily_metrics was not set
                        start_d = r.week_start_date
                        w_labels = [(start_d + timedelta(days=d)).strftime("%a %d").upper() for d in range(7)]
                        avg_sales = round(float(r.total_sales) / 7.0, 2)
                        avg_visits = max(1, int(r.total_customers or 1) // 7)
                        dm = {
                            "weeks": w_labels,
                            "sales": [avg_sales] * 7,
                            "visits": [avg_visits] * 7,
                            "regular": [int(r.regular_customers)] * 7,
                            "at_risk": [int(r.at_risk_customers)] * 7,
                            "profit": [round(float(r.profit) / 7.0, 2)] * 7,
                        }

                    # Enforce sequential Week numbering: Week 1, Week 2, ..., Week 5
                    computed_week_num = idx + 1
                    raw_label = r.week_label or f"Week {computed_week_num}"
                    formatted_label = re.sub(r"^Week\s*\d+", f"Week {computed_week_num}", raw_label, flags=re.IGNORECASE)

                    w_entry = {
                        "week_id": f"week_{computed_week_num}",
                        "week_num": computed_week_num,
                        "label": formatted_label,
                        "short_label": f"W{computed_week_num} ({r.week_start_date.strftime('%d %b')})",
                        "start_date": r.week_start_date.isoformat(),
                        "kpis": {
                            "total_sales": float(r.total_sales),
                            "weekly_capital": float(r.weekly_capital),
                            "profit": float(r.profit),
                            "total_customers": int(r.total_customers or 0),
                            "regular_customers": int(r.regular_customers),
                            "new_customers": max(0, int(r.total_customers or 0) - int(r.regular_customers)),
                            "at_risk_customers": int(r.at_risk_customers),
                        },
                        "graph_data": dm,
                    }
                    weeks_breakdown.append(w_entry)

                if weeks_breakdown:
                    latest_week = weeks_breakdown[-1]
                    latest_kpis = latest_week["kpis"]
                    weekly_graph_data = latest_week["graph_data"]

            except Exception as e:
                print("Error loading weekly snapshots:", e)
                pass

            return {
                "merchant_id": merchant_id,
                "has_data": len(weeks_breakdown) > 0,
                "latest_kpis": latest_kpis,
                "weekly_graph_data": weekly_graph_data,
                "weeks_breakdown": weeks_breakdown,
                "current_week_id": weeks_breakdown[-1]["week_id"] if weeks_breakdown else None,
                "metrics": {
                    "total_interventions": total,
                    "active_pending": stats.pending_count or 0,
                    "approved_campaigns": approved,
                    "success_rate_percentage": success_rate,
                    "total_customers": c_row.total_customers if c_row else 0,
                    "total_sales": float(c_row.total_sales) if c_row else 0.0,
                    "regular_customers": c_row.regular_customers if c_row else 0,
                    "at_risk_customers": c_row.at_risk_customers if c_row else 0,
                },
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch merchant stats: {str(e)}")


@router.get("/{merchant_id}/weeks")
async def get_merchant_weeks(merchant_id: int):
    """Returns all stored weekly snapshots with 7-day bar chart metrics."""
    stats = await get_merchant_stats(merchant_id)
    return {
        "merchant_id": merchant_id,
        "weeks": stats.get("weeks_breakdown", []),
        "current_week_id": stats.get("current_week_id")
    }


@router.get("/{merchant_id}/campaigns")
async def get_merchant_campaigns(merchant_id: int):
    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                text("""
                    SELECT c.id, c.thread_id, c.customer_id, cust.name AS customer_name,
                           c.discount_percentage, c.coupon_code, c.template_name, 
                           c.status, c.created_at 
                    FROM campaigns c
                    LEFT JOIN customers cust ON c.customer_id = cust.id
                    WHERE c.merchant_id = :mid 
                    ORDER BY c.created_at DESC 
                    LIMIT 50
                """),
                {"mid": merchant_id}
            )
            
            campaigns = []
            for row in result.fetchall():
                campaigns.append({
                    "id": row.id,
                    "thread_id": row.thread_id,
                    "customer_id": row.customer_id,
                    "customer_name": row.customer_name or f"Customer #{row.customer_id}",
                    "discount_percentage": float(row.discount_percentage) if row.discount_percentage else 0,
                    "coupon_code": row.coupon_code,
                    "status": row.status,
                    "created_at": row.created_at.isoformat() if row.created_at else None
                })
                
            return {"campaigns": campaigns}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch campaigns: {str(e)}")


class SendWelcomeRequest(BaseModel):
    customer_id: Optional[int] = None
    customer_name: str
    phone_number: str
    amount_spent: float = 0.0


class BulkWelcomeRequest(BaseModel):
    customers: list[SendWelcomeRequest]


@router.post("/{merchant_id}/send-welcome")
async def send_welcome(merchant_id: int, req: SendWelcomeRequest):
    """Sends a WhatsApp first-visit greeting / thank-you message to a new customer."""
    from app.services.whatsapp import send_whatsapp_welcome_message
    res = await send_whatsapp_welcome_message(
        recipient_phone=req.phone_number,
        customer_name=req.customer_name,
        amount_spent=req.amount_spent
    )
    return {
        "status": "SUCCESS",
        "customer_name": req.customer_name,
        "phone_number": req.phone_number,
        "detail": res
    }


@router.post("/{merchant_id}/send-welcome-bulk")
async def send_welcome_bulk(merchant_id: int, req: BulkWelcomeRequest):
    """Sends WhatsApp thank-you greetings to multiple new customers in bulk."""
    from app.services.whatsapp import send_whatsapp_welcome_message
    results = []
    for c in req.customers:
        res = await send_whatsapp_welcome_message(
            recipient_phone=c.phone_number,
            customer_name=c.customer_name,
            amount_spent=c.amount_spent
        )
        results.append({"customer_name": c.customer_name, "status": "SUCCESS", "detail": res})
    return {
        "status": "SUCCESS",
        "count": len(results),
        "results": results
    }