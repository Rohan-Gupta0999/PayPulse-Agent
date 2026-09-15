import csv
import io
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, UploadFile, File
from sqlalchemy import text
from app.database.session import AsyncSessionLocal

router = APIRouter(prefix="/upload", tags=["CSV Upload"])

# Thresholds for flagging a customer as churned and worth a win-back campaign
CHURN_DAYS = 30
CHURN_SPEND = 10000.0


@router.post("/ledger/{merchant_id}")
async def upload_ledger(merchant_id: int, file: UploadFile = File(...)):
    """
    Accepts a weekly POS export CSV with columns:
      Phone Number | Name | Total Spend | Last Visit Date

    Steps:
    1. Validates and parses the CSV
    2. Upserts each row into the customers table (keyed by phone + merchant)
    3. Runs a churn diff — finds high-value customers above CHURN_DAYS threshold
       who have NOT already been contacted in the last 30 days
    4. Returns graph data (6-month aggregates) + the list of churned customers
       so the frontend can redraw charts and fire the agent immediately
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

    required = {"Phone Number", "Name", "Total Spend", "Last Visit Date"}
    missing = required - set(reader.fieldnames)
    if missing:
        raise HTTPException(
            status_code=422,
            detail=f"Missing columns: {', '.join(missing)}. Required: Phone Number, Name, Total Spend, Last Visit Date"
        )

    rows = list(reader)
    if not rows:
        raise HTTPException(status_code=422, detail="CSV file has no data rows.")

    inserted = 0
    updated = 0
    churned: list[dict] = []

    async with AsyncSessionLocal() as session:
        for row in rows:
            phone = row.get("Phone Number", "").strip()
            name = row.get("Name", "").strip()
            if not phone or not name:
                continue  # Skip blank rows silently

            # Clean ₹ and commas from spend values (common in Indian POS exports)
            try:
                spend = float(
                    str(row.get("Total Spend", "0"))
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
                continue  # Skip rows with unparseable dates

            # --- SELECT then UPDATE-or-INSERT (no unique constraint needed) ---
            lookup = await session.execute(
                text(
                    "SELECT id FROM customers "
                    "WHERE phone_number = :phone AND merchant_id = :mid"
                ),
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
                    {
                        "mid": merchant_id,
                        "name": name,
                        "phone": phone,
                        "spend": spend,
                        "visited": last_visit,
                    },
                )
                cid = ins.scalar_one()
                inserted += 1

            # --- CHURN DIFF: flag only if above threshold AND not recently contacted ---
            days_away = (datetime.now(timezone.utc) - last_visit).days
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

        # --- GRAPH DATA: 6-month aggregates from freshly upserted data ---
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

    return {
        "status": "SUCCESS",
        "summary": {
            "total_rows": len(rows),
            "inserted": inserted,
            "updated": updated,
            "churned_flagged": len(churned),
        },
        # Sorted by most days away first — most urgent customer is index 0
        "churned_customers": sorted(churned, key=lambda x: x["days_away"], reverse=True),
        "graph_data": graph_data,
    }
