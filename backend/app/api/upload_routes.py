import csv
import io
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from sqlalchemy import text
from app.database.session import AsyncSessionLocal

router = APIRouter(prefix="/upload", tags=["CSV Upload"])

# Thresholds for flagging a customer as churned and worth a win-back campaign
CHURN_DAYS = 30
CHURN_SPEND = 3000.0


@router.post("/ledger/{merchant_id}")
async def upload_ledger(
    merchant_id: int,
    file: UploadFile = File(...),
    weekly_capital: float = Form(0.0),   # Merchant's procurement cost for the week
):
    """
    Accepts a weekly POS export CSV with columns:
      Phone Number | Name | Total Spend (or Total Weekly Spend) | Last Visit Date

    Also accepts weekly_capital (float) as a form field alongside the file.
    Returns real KPI data: total_sales, profit, regular_customers, at_risk_customers.
    """
    if not (file.filename or "").endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted.")

    raw = await file.read()

    # Handle BOM (Excel CSVs) and latin-1 encoded files from older POS systems
    try:
        text_content = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        text_content = raw.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text_content))
    if not reader.fieldnames:
        raise HTTPException(status_code=422, detail="Empty or invalid CSV file.")

    fields = set(reader.fieldnames)

    # Accept either "Total Spend" or "Total Weekly Spend"
    spend_col = (
        "Total Spend" if "Total Spend" in fields
        else "Total Weekly Spend" if "Total Weekly Spend" in fields
        else None
    )

    required = {"Phone Number", "Name", "Last Visit Date"}
    missing = required - fields
    if missing or spend_col is None:
        all_missing = missing | ({"Total Spend"} if spend_col is None else set())
        raise HTTPException(
            status_code=422,
            detail=f"Missing columns: {', '.join(all_missing)}. Required: Phone Number, Name, Total Spend (or Total Weekly Spend), Last Visit Date"
        )

    rows = list(reader)
    if not rows:
        raise HTTPException(status_code=422, detail="CSV file has no data rows.")

    inserted = 0
    updated = 0
    churned: list[dict] = []

    # KPI accumulators — computed from the CSV rows directly
    total_sales = 0.0
    regular_count = 0
    at_risk_count = 0
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=CHURN_DAYS)

    async with AsyncSessionLocal() as session:
        for row in rows:
            phone = row.get("Phone Number", "").strip()
            name = row.get("Name", "").strip()
            if not phone or not name:
                continue

            # Clean ₹ and commas (common in Indian POS exports)
            try:
                spend = float(
                    str(row.get(spend_col, "0"))
                    .replace("₹", "")
                    .replace(",", "")
                    .strip()
                )
            except ValueError:
                spend = 0.0

            # Try multiple date formats common in Indian billing software
            raw_date = row.get("Last Visit Date", "").strip()
            last_visit = None
            for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%m/%d/%Y"):
                try:
                    last_visit = datetime.strptime(raw_date, fmt).replace(tzinfo=timezone.utc)
                    break
                except ValueError:
                    continue
            if last_visit is None:
                continue

            # Accumulate KPIs
            total_sales += spend
            if last_visit >= cutoff:
                regular_count += 1
            else:
                at_risk_count += 1

            # SELECT → UPDATE or INSERT
            lookup = await session.execute(
                text("SELECT id FROM customers WHERE phone_number = :phone AND merchant_id = :mid"),
                {"phone": phone, "mid": merchant_id},
            )
            existing = lookup.fetchone()

            if existing:
                cid = existing.id
                await session.execute(
                    text("""
                        UPDATE customers
                        SET name = :name, total_spend = :spend, last_visited_at = :visited
                        WHERE id = :cid
                    """),
                    {"name": name, "spend": spend, "visited": last_visit, "cid": cid},
                )
                updated += 1
            else:
                ins = await session.execute(
                    text("""
                        INSERT INTO customers
                            (merchant_id, name, phone_number, total_spend, last_visited_at)
                        VALUES (:mid, :name, :phone, :spend, :visited)
                        RETURNING id
                    """),
                    {"mid": merchant_id, "name": name, "phone": phone, "spend": spend, "visited": last_visit},
                )
                cid = ins.scalar_one()
                inserted += 1

            # CHURN DIFF
            days_away = (now - last_visit).days
            if days_away >= CHURN_DAYS and spend >= CHURN_SPEND:
                recent_camp = await session.execute(
                    text("""
                        SELECT id FROM campaigns
                        WHERE customer_id = :cid
                          AND merchant_id = :mid
                          AND status IN ('APPROVED', 'REJECTED')
                          AND created_at > NOW() - INTERVAL '30 days'
                        LIMIT 1
                    """),
                    {"cid": cid, "mid": merchant_id},
                )
                if not recent_camp.fetchone():
                    churned.append({
                        "id": cid,
                        "name": name,
                        "phone_number": phone,
                        "total_spend": spend,
                        "days_away": days_away,
                    })

        await session.commit()

        # 6-month graph data from freshly upserted data
        g = await session.execute(
            text("""
                SELECT
                    TO_CHAR(DATE_TRUNC('month', last_visited_at), 'Mon') AS month,
                    COUNT(*) AS visits,
                    SUM(total_spend) AS sales
                FROM customers
                WHERE merchant_id = :mid
                  AND last_visited_at >= NOW() - INTERVAL '6 months'
                GROUP BY DATE_TRUNC('month', last_visited_at)
                ORDER BY DATE_TRUNC('month', last_visited_at)
            """),
            {"mid": merchant_id},
        )
        graph_rows = g.fetchall()

    graph_data = {
        "months": [r.month for r in graph_rows],
        "visits": [int(r.visits) for r in graph_rows],
        "sales": [float(r.sales) for r in graph_rows],
    }

    profit = total_sales - weekly_capital

    return {
        "status": "SUCCESS",
        "summary": {
            "total_rows": len(rows),
            "inserted": inserted,
            "updated": updated,
            "churned_flagged": len(churned),
        },
        # Live KPIs — computed from the uploaded CSV data
        "kpis": {
            "total_sales": round(total_sales, 2),
            "profit": round(profit, 2),
            "weekly_capital": round(weekly_capital, 2),
            "regular_customers": regular_count,
            "at_risk_customers": at_risk_count,
        },
        "churned_customers": sorted(churned, key=lambda x: x["days_away"], reverse=True),
        "graph_data": graph_data,
    }
