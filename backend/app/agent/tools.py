from datetime import datetime, timedelta, timezone
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.models import Transaction, Customer, ConsentLog


async def detect_payment_drop(session: AsyncSession, merchant_id: int) -> dict:
    """
    Compares trailing 7-day revenue against prior 7-day revenue (days 8-14).
    Flags an anomaly if revenue dropped by 15% or more.
    """
    now = datetime.now(timezone.utc)
    seven_days_ago = now - timedelta(days=7)
    fourteen_days_ago = now - timedelta(days=14)

    # 1. Trailing 7-day revenue (days 1 to 7)
    recent_stmt = select(func.coalesce(func.sum(Transaction.amount), 0.0)).where(
        and_(
            Transaction.merchant_id == merchant_id,
            Transaction.status == "SUCCESS",
            Transaction.created_at >= seven_days_ago
        )
    )
    recent_revenue = (await session.execute(recent_stmt)).scalar_one()

    # 2. Prior 7-day revenue (days 8 to 14)
    previous_stmt = select(func.coalesce(func.sum(Transaction.amount), 0.0)).where(
        and_(
            Transaction.merchant_id == merchant_id,
            Transaction.status == "SUCCESS",
            Transaction.created_at >= fourteen_days_ago,
            Transaction.created_at < seven_days_ago
        )
    )
    previous_revenue = (await session.execute(previous_stmt)).scalar_one()

    if previous_revenue == 0:
        return {"anomaly_detected": False, "drop_percentage": 0.0}

    # Calculate percentage change
    change_pct = ((previous_revenue - recent_revenue) / previous_revenue) * 100

    return {
        "anomaly_detected": change_pct >= 15.0,
        "recent_revenue": round(recent_revenue, 2),
        "previous_revenue": round(previous_revenue, 2),
        "drop_percentage": round(change_pct, 2)
    }


async def get_lapsed_customers_with_consent(session: AsyncSession, merchant_id: int, days_inactive: int = 30) -> list[dict]:
    """
    Finds customers inactive for >= 30 days who legally consented under DPDP Act 2023.
    """
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=days_inactive)

    stmt = (
        select(Customer)
        .join(ConsentLog, Customer.id == ConsentLog.customer_id)
        .where(
            and_(
                Customer.merchant_id == merchant_id,
                Customer.last_visited_at <= cutoff_date,
                ConsentLog.marketing_opt_in.is_(True)
            )
        )
    )

    result = await session.execute(stmt)
    customers = result.scalars().all()

    return [
        {
            "customer_id": c.id,
            "name": c.name,
            "phone_number": c.phone_number,
            "days_inactive": (datetime.now(timezone.utc) - c.last_visited_at).days,
            "total_spend": c.total_spend
        }
        for c in customers
    ]