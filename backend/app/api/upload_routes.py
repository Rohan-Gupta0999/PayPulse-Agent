import csv
import io
import re
import uuid as uuid_module
from datetime import datetime, timezone, timedelta, date
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from sqlalchemy import text
from app.database.session import AsyncSessionLocal

router = APIRouter(prefix="/upload", tags=["CSV Upload"])

CHURN_DAYS = 30
CHURN_SPEND = 3000.0

CREATE_WEEKLY_SNAPSHOTS_SQL = """
    CREATE TABLE IF NOT EXISTS weekly_snapshots (
        id SERIAL PRIMARY KEY,
        merchant_id INTEGER NOT NULL,
        week_start_date DATE NOT NULL,
        week_label TEXT NOT NULL,
        total_sales FLOAT DEFAULT 0,
        weekly_capital FLOAT DEFAULT 0,
        profit FLOAT DEFAULT 0,
        total_customers INTEGER DEFAULT 0,
        regular_customers INTEGER DEFAULT 0,
        at_risk_customers INTEGER DEFAULT 0,
        uploaded_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(merchant_id, week_start_date)
    )
"""


def normalize_phone(raw_phone: str) -> str:
    """Extracts digits and returns the standard 10-digit number."""
    digits = re.sub(r"\D", "", raw_phone)
    return digits[-10:] if len(digits) >= 10 else digits


@router.post("/ledger/{merchant_id}")
async def upload_ledger(
    merchant_id: int,
    file: UploadFile = File(...),
    weekly_capital: float = Form(0.0),
):
    """
    Weekly POS Batch Upload Endpoint.
    Supports:
    1. Transaction Receipts Schema (Primary):
       transaction_id, transaction_date, sales_amount, item_cost, phone_number, customer_name
    2. Legacy Customer Ledger Schema (Fallback):
       Phone Number, Name, Total Spend, Last Visit Date
    """
    if not (file.filename or "").endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted.")

    raw = await file.read()
    try:
        text_content = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        text_content = raw.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text_content))
    if not reader.fieldnames:
        raise HTTPException(status_code=422, detail="Empty or invalid CSV file.")

    # Normalize header field lookup (lowercase, stripped)
    field_map = {f.strip().lower().replace(" ", "_"): f for f in reader.fieldnames}

    is_transaction_schema = (
        "sales_amount" in field_map or "transaction_id" in field_map
    )

    rows = list(reader)
    if not rows:
        raise HTTPException(status_code=422, detail="CSV file has no data rows.")

    now = datetime.now(timezone.utc)

    if is_transaction_schema:
        return await process_transaction_receipts(
            merchant_id=merchant_id,
            rows=rows,
            field_map=field_map,
            weekly_capital=weekly_capital,
            now=now
        )
    else:
        return await process_legacy_customer_ledger(
            merchant_id=merchant_id,
            rows=rows,
            field_map=field_map,
            weekly_capital=weekly_capital,
            now=now
        )


async def process_transaction_receipts(
    merchant_id: int,
    rows: list[dict],
    field_map: dict,
    weekly_capital: float,
    now: datetime
):
    """Processes 7-day raw transaction receipts and triggers autonomous churn detection."""
    # Resolve column names
    col_id = field_map.get("transaction_id") or "transaction_id"
    col_date = field_map.get("transaction_date") or "transaction_date"
    col_sales = field_map.get("sales_amount") or "sales_amount"
    col_cost = field_map.get("item_cost") or "item_cost"
    col_phone = field_map.get("phone_number") or "phone_number"
    col_name = field_map.get("customer_name") or "customer_name"

    # Aggregators
    total_sales = 0.0
    total_item_cost = 0.0
    customer_agg: dict[str, dict] = {}
    daily_agg: dict[date, dict] = {}
    this_week_phones_norm: set[str] = set()

    for row in rows:
        raw_phone = str(row.get(col_phone, "")).strip()
        phone_norm = normalize_phone(raw_phone)
        name = str(row.get(col_name, "")).strip()
        if not phone_norm:
            continue

        try:
            sales = float(str(row.get(col_sales, "0")).replace("₹", "").replace(",", "").strip())
        except ValueError:
            sales = 0.0

        try:
            cost = float(str(row.get(col_cost, "0")).replace("₹", "").replace(",", "").strip())
        except ValueError:
            cost = 0.0

        raw_date = str(row.get(col_date, "")).strip()
        txn_date = None
        for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%m/%d/%Y"):
            try:
                txn_date = datetime.strptime(raw_date, fmt).date()
                break
            except ValueError:
                continue
        if txn_date is None:
            continue

        total_sales += sales
        total_item_cost += cost
        this_week_phones_norm.add(phone_norm)

        # Customer aggregation for upserting
        if phone_norm not in customer_agg:
            customer_agg[phone_norm] = {
                "name": name or f"Customer {phone_norm[-4:]}",
                "phone_number": raw_phone,
                "phone_norm": phone_norm,
                "week_spend": 0.0,
                "max_date": txn_date,
            }
        customer_agg[phone_norm]["week_spend"] += sales
        if txn_date > customer_agg[phone_norm]["max_date"]:
            customer_agg[phone_norm]["max_date"] = txn_date
        if name and not customer_agg[phone_norm]["name"].startswith("Customer "):
            customer_agg[phone_norm]["name"] = name

        # Daily aggregation for graphs
        if txn_date not in daily_agg:
            daily_agg[txn_date] = {
                "sales": 0.0,
                "cost": 0.0,
                "profit": 0.0,
                "visits": 0,
                "customers": set(),
            }
        daily_agg[txn_date]["sales"] += sales
        daily_agg[txn_date]["cost"] += cost
        daily_agg[txn_date]["profit"] += (sales - cost)
        daily_agg[txn_date]["visits"] += 1
        daily_agg[txn_date]["customers"].add(phone_norm)

    # Calculate net profit (use weekly_capital if merchant entered, otherwise exact item cost)
    effective_capital = weekly_capital if weekly_capital > 0 else total_item_cost
    net_profit = total_sales - effective_capital

    async with AsyncSessionLocal() as session:
        await session.execute(text(CREATE_WEEKLY_SNAPSHOTS_SQL))
        await session.commit()

        # ── Step 1: Upsert visiting customers in Supabase ─────────────────────
        inserted = 0
        updated = 0
        for phone_norm, cdata in customer_agg.items():
            dt_visit = datetime.combine(cdata["max_date"], datetime.min.time(), tzinfo=timezone.utc)

            # Look up customer by last 10 digits
            lookup = await session.execute(
                text("""
                    SELECT id, total_spend FROM customers
                    WHERE merchant_id = :mid
                      AND RIGHT(REGEXP_REPLACE(phone_number, '[^0-9]', '', 'g'), 10) = :phone_norm
                    LIMIT 1
                """),
                {"mid": merchant_id, "phone_norm": phone_norm},
            )
            existing = lookup.fetchone()

            if existing:
                await session.execute(
                    text("""
                        UPDATE customers
                        SET name = :name,
                            total_spend = total_spend + :spend,
                            last_visited_at = :visited
                        WHERE id = :cid
                    """),
                    {
                        "name": cdata["name"],
                        "spend": cdata["week_spend"],
                        "visited": dt_visit,
                        "cid": existing.id,
                    },
                )
                updated += 1
            else:
                await session.execute(
                    text("""
                        INSERT INTO customers (merchant_id, name, phone_number, total_spend, last_visited_at)
                        VALUES (:mid, :name, :phone, :spend, :visited)
                    """),
                    {
                        "mid": merchant_id,
                        "name": cdata["name"],
                        "phone": cdata["phone_number"],
                        "spend": cdata["week_spend"],
                        "visited": dt_visit,
                    },
                )
                inserted += 1

        await session.commit()

        # ── Step 2: Autonomous Churn Detection ────────────────────────────────
        # Find high-value regulars in Supabase absent from this week's CSV
        # (phone_number NOT IN this_week_phones AND last_visited_at <= NOW() - 30 days)
        churn_cutoff = now - timedelta(days=CHURN_DAYS)

        # Clear existing PENDING_APPROVAL campaigns to refresh queue cleanly
        await session.execute(
            text("DELETE FROM campaigns WHERE merchant_id = :mid AND status = 'PENDING_APPROVAL'"),
            {"mid": merchant_id},
        )
        await session.commit()

        absent_query = await session.execute(
            text("""
                SELECT id, name, phone_number, total_spend, last_visited_at,
                       EXTRACT(DAY FROM (:now_ts - last_visited_at))::int AS days_away
                FROM customers
                WHERE merchant_id = :mid
                  AND last_visited_at <= :cutoff
                  AND total_spend >= :min_spend
                ORDER BY total_spend DESC, days_away DESC
            """),
            {
                "mid": merchant_id,
                "now_ts": now,
                "cutoff": churn_cutoff,
                "min_spend": CHURN_SPEND,
            },
        )
        all_absent_candidates = absent_query.fetchall()

        churned: list[dict] = []
        for cand in all_absent_candidates:
            cand_phone_norm = normalize_phone(cand.phone_number)
            # Filter out anyone who actually visited this week
            if cand_phone_norm in this_week_phones_norm:
                continue

            disc = 20.0 if (cand.total_spend >= 3500 or (cand.days_away or 0) >= 60) else 15.0
            coupon = f"COMEBACK{int(disc)}"
            tid = str(uuid_module.uuid4())

            ins_camp = await session.execute(
                text("""
                    INSERT INTO campaigns
                        (merchant_id, customer_id, thread_id, discount_percentage,
                         coupon_code, template_name, status)
                    VALUES (:mid, :cid, :tid, :disc, :coupon, 'win_back_offer', 'PENDING_APPROVAL')
                    RETURNING id
                """),
                {"mid": merchant_id, "cid": cand.id, "tid": tid, "disc": disc, "coupon": coupon},
            )
            camp_id = ins_camp.scalar_one()

            churned.append({
                "id": cand.id,
                "name": cand.name,
                "phone_number": cand.phone_number,
                "total_spend": float(cand.total_spend),
                "days_away": cand.days_away or 30,
                "campaign_id": camp_id,
                "thread_id": tid,
                "discount": disc,
                "coupon": coupon,
            })

        await session.commit()

        total_at_risk_count = len(churned)

    # ── Step 3: Dynamic Daily Metrics & Weekly Breakdown ───────────────────────
    all_day_labels = []
    all_day_sales = []
    all_day_visits = []
    all_day_profit = []
    all_day_regular = []

    weeks_breakdown = []

    if daily_agg:
        sorted_dates = sorted(daily_agg.keys())
        min_date = sorted_dates[0]
        max_date = sorted_dates[-1]

        # 1. Full period daily iteration (from min_date to max_date)
        curr = min_date
        while curr <= max_date:
            lbl = curr.strftime("%a %d").upper()
            all_day_labels.append(lbl)
            if curr in daily_agg:
                st = daily_agg[curr]
                all_day_sales.append(round(st["sales"], 2))
                all_day_visits.append(st["visits"])
                all_day_profit.append(round(st["profit"], 2))
                all_day_regular.append(len(st["customers"]))
            else:
                all_day_sales.append(0.0)
                all_day_visits.append(0)
                all_day_profit.append(0.0)
                all_day_regular.append(0)
            curr += timedelta(days=1)

        # 2. Partition into 7-day weekly blocks for History Tracking
        curr_start = min_date
        w_idx = 1
        has_capital = weekly_capital > 0
        while curr_start <= max_date:
            curr_end = min(curr_start + timedelta(days=6), max_date)
            w_sales = 0.0
            w_cost = 0.0
            w_visits = 0
            w_custs: set[str] = set()
            w_labels = []
            w_sales_list = []
            w_visits_list = []
            w_profit_list = []

            d = curr_start
            while d <= curr_start + timedelta(days=6):
                lbl = d.strftime("%a %d").upper()
                w_labels.append(lbl)
                if d in daily_agg:
                    st = daily_agg[d]
                    w_sales += st["sales"]
                    w_cost += st["cost"]
                    w_visits += st["visits"]
                    w_custs.update(st["customers"])
                    w_sales_list.append(round(st["sales"], 2))
                    w_visits_list.append(st["visits"])
                    w_profit_list.append(round(st["profit"], 2))
                else:
                    w_sales_list.append(0.0)
                    w_visits_list.append(0)
                    w_profit_list.append(0.0)
                d += timedelta(days=1)

            w_profit = round(w_sales - w_cost, 2)
            weeks_breakdown.append({
                "week_id": f"week_{w_idx}",
                "week_num": w_idx,
                "label": f"Week {w_idx} ({curr_start.strftime('%b %d')} – {curr_end.strftime('%b %d')})",
                "short_label": f"W{w_idx} ({curr_start.strftime('%d %b')})",
                "start_date": curr_start.isoformat(),
                "end_date": curr_end.isoformat(),
                "kpis": {
                    "total_sales": round(w_sales, 2),
                    "profit": w_profit if has_capital else None,
                    "regular_customers": len(w_custs),
                    "visits": w_visits,
                },
                "graph_data": {
                    "weeks": w_labels,
                    "sales": w_sales_list,
                    "visits": w_visits_list,
                    "regular": [0] * len(w_labels),
                    "at_risk": [0] * len(w_labels),
                    "profit": w_profit_list,
                },
            })
            curr_start += timedelta(days=7)
            w_idx += 1
    else:
        for day_idx in range(7):
            curr_d = now.date() + timedelta(days=day_idx)
            lbl = curr_d.strftime("%a %d").upper()
            all_day_labels.append(lbl)
            all_day_sales.append(0.0)
            all_day_visits.append(0)
            all_day_profit.append(0.0)
            all_day_regular.append(0)

    weekly_graph_data = {
        "weeks": all_day_labels,
        "sales": all_day_sales,
        "visits": all_day_visits,
        "regular": all_day_regular,
        "at_risk": [0] * len(all_day_labels),
        "profit": all_day_profit,
    }

    # Store weekly snapshots in DB
    has_capital = weekly_capital > 0
    calculated_profit = round(total_sales - weekly_capital, 2) if has_capital else 0.0

    async with AsyncSessionLocal() as session:
        if weeks_breakdown:
            for w in weeks_breakdown:
                w_start_d = datetime.strptime(w["start_date"], "%Y-%m-%d").date()
                await session.execute(text("""
                    INSERT INTO weekly_snapshots
                        (merchant_id, week_start_date, week_label, total_sales, weekly_capital,
                         profit, total_customers, regular_customers, at_risk_customers)
                    VALUES
                        (:mid, :wstart, :wlabel, :sales, :capital,
                         :profit, :total, :regular, :at_risk)
                    ON CONFLICT (merchant_id, week_start_date) DO UPDATE SET
                        total_sales        = EXCLUDED.total_sales,
                        weekly_capital     = EXCLUDED.weekly_capital,
                        profit             = EXCLUDED.profit,
                        total_customers    = EXCLUDED.total_customers,
                        regular_customers  = EXCLUDED.regular_customers,
                        at_risk_customers  = EXCLUDED.at_risk_customers,
                        uploaded_at        = NOW()
                """), {
                    "mid": merchant_id,
                    "wstart": w_start_d,
                    "wlabel": w["label"],
                    "sales": w["kpis"]["total_sales"],
                    "capital": weekly_capital if w == weeks_breakdown[-1] else 0.0,
                    "profit": w["kpis"]["profit"] or 0.0,
                    "total": w["kpis"]["regular_customers"],
                    "regular": w["kpis"]["regular_customers"],
                    "at_risk": total_at_risk_count,
                })
        else:
            await session.execute(text("""
                INSERT INTO weekly_snapshots
                    (merchant_id, week_start_date, week_label, total_sales, weekly_capital,
                     profit, total_customers, regular_customers, at_risk_customers)
                VALUES
                    (:mid, :wstart, :wlabel, :sales, :capital,
                     :profit, :total, :regular, :at_risk)
                ON CONFLICT (merchant_id, week_start_date) DO UPDATE SET
                    total_sales        = EXCLUDED.total_sales,
                    weekly_capital     = EXCLUDED.weekly_capital,
                    profit             = EXCLUDED.profit,
                    total_customers    = EXCLUDED.total_customers,
                    regular_customers  = EXCLUDED.regular_customers,
                    at_risk_customers  = EXCLUDED.at_risk_customers,
                    uploaded_at        = NOW()
            """), {
                "mid": merchant_id,
                "wstart": now.date(),
                "wlabel": now.date().strftime("%b %d"),
                "sales": total_sales,
                "capital": weekly_capital,
                "profit": calculated_profit,
                "total": len(customer_agg),
                "regular": len(customer_agg),
                "at_risk": total_at_risk_count,
            })
        await session.commit()

    return {
        "status": "SUCCESS",
        "mode": "TRANSACTION_RECEIPTS",
        "summary": {
            "total_rows": len(rows),
            "total_customers": len(customer_agg),
            "inserted": inserted,
            "updated": updated,
            "churned_flagged": len(churned),
        },
        "kpis": {
            "total_sales": round(total_sales, 2),
            "profit": round(total_sales - weekly_capital, 2) if has_capital else None,
            "weekly_capital": round(weekly_capital, 2),
            "regular_customers": len(customer_agg),
            "at_risk_customers": total_at_risk_count,
        },
        "churned_customers": churned,
        "weekly_graph_data": weekly_graph_data,
        "weeks_breakdown": weeks_breakdown,
    }


async def process_legacy_customer_ledger(
    merchant_id: int,
    rows: list[dict],
    field_map: dict,
    weekly_capital: float,
    now: datetime
):
    """Fallback handler for 4-column Customer Master Ledger CSVs."""
    col_phone = field_map.get("phone_number") or "Phone Number"
    col_name = field_map.get("name") or "Name"
    col_date = field_map.get("last_visit_date") or "Last Visit Date"
    col_spend = (
        field_map.get("total_spend")
        or field_map.get("total_weekly_spend")
        or field_map.get("spend")
        or "Total Spend"
    )

    parsed_entries = []
    total_sales = 0.0
    regular_count = 0
    at_risk_count = 0
    churn_cutoff = now - timedelta(days=CHURN_DAYS)

    for row in rows:
        phone = str(row.get(col_phone, "")).strip()
        name = str(row.get(col_name, "")).strip()
        if not phone or not name:
            continue

        try:
            spend = float(str(row.get(col_spend, "0")).replace("₹", "").replace(",", "").strip())
        except ValueError:
            spend = 0.0

        raw_date = str(row.get(col_date, "")).strip()
        last_visit = None
        for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%m/%d/%Y"):
            try:
                last_visit = datetime.strptime(raw_date, fmt).replace(tzinfo=timezone.utc)
                break
            except ValueError:
                continue
        if last_visit is None:
            continue

        total_sales += spend
        if last_visit >= churn_cutoff:
            regular_count += 1
        else:
            at_risk_count += 1

        parsed_entries.append({
            "name": name,
            "phone": phone,
            "spend": spend,
            "last_visit": last_visit
        })

    profit = total_sales - weekly_capital
    churned: list[dict] = []

    async with AsyncSessionLocal() as session:
        await session.execute(text(CREATE_WEEKLY_SNAPSHOTS_SQL))
        await session.commit()

        await session.execute(
            text("DELETE FROM campaigns WHERE merchant_id = :mid AND status = 'PENDING_APPROVAL'"),
            {"mid": merchant_id},
        )
        await session.commit()

        inserted = 0
        updated = 0
        for entry in parsed_entries:
            lookup = await session.execute(
                text("SELECT id FROM customers WHERE phone_number = :phone AND merchant_id = :mid"),
                {"phone": entry["phone"], "mid": merchant_id},
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
                    {"name": entry["name"], "spend": entry["spend"], "visited": entry["last_visit"], "cid": cid},
                )
                updated += 1
            else:
                ins = await session.execute(
                    text("""
                        INSERT INTO customers (merchant_id, name, phone_number, total_spend, last_visited_at)
                        VALUES (:mid, :name, :phone, :spend, :visited)
                        RETURNING id
                    """),
                    {"mid": merchant_id, "name": entry["name"], "phone": entry["phone"], "spend": entry["spend"], "visited": entry["last_visit"]},
                )
                cid = ins.scalar_one()
                inserted += 1

            days_away = (now - entry["last_visit"]).days
            if days_away >= CHURN_DAYS and entry["spend"] >= CHURN_SPEND:
                disc = 20.0 if (entry["spend"] >= 3500 or days_away >= 60) else 15.0
                coupon = f"COMEBACK{int(disc)}"
                tid = str(uuid_module.uuid4())

                ins_camp = await session.execute(
                    text("""
                        INSERT INTO campaigns
                            (merchant_id, customer_id, thread_id, discount_percentage,
                             coupon_code, template_name, status)
                        VALUES (:mid, :cid, :tid, :disc, :coupon, 'win_back_offer', 'PENDING_APPROVAL')
                        RETURNING id
                    """),
                    {"mid": merchant_id, "cid": cid, "tid": tid, "disc": disc, "coupon": coupon},
                )
                camp_id = ins_camp.scalar_one()

                churned.append({
                    "id": cid,
                    "name": entry["name"],
                    "phone_number": entry["phone"],
                    "total_spend": entry["spend"],
                    "days_away": days_away,
                    "campaign_id": camp_id,
                    "thread_id": tid,
                    "discount": disc,
                    "coupon": coupon,
                })

        await session.commit()

    # 6-week breakdown for legacy
    max_d = max((e["last_visit"].date() for e in parsed_entries), default=now.date())
    week_labels = []
    week_sales = []
    week_visits = []
    week_regular = []
    week_at_risk = []
    week_profit = []

    for i in range(5, -1, -1):
        w_end = max_d - timedelta(days=i * 7)
        w_start = w_end - timedelta(days=6)
        matching = [e for e in parsed_entries if w_start <= e["last_visit"].date() <= w_end]
        s = sum(e["spend"] for e in matching)
        v = len(matching)
        reg = sum(1 for e in matching if (now - e["last_visit"]).days < CHURN_DAYS)
        risk = sum(1 for e in matching if (now - e["last_visit"]).days >= CHURN_DAYS)
        p = (s - weekly_capital) if i == 0 else round(s * 0.35, 2)

        week_labels.append(w_start.strftime("%b %d"))
        week_sales.append(round(s, 2))
        week_visits.append(v)
        week_regular.append(reg)
        week_at_risk.append(risk)
        week_profit.append(round(p, 2))

    return {
        "status": "SUCCESS",
        "mode": "LEGACY_LEDGER",
        "summary": {
            "total_rows": len(rows),
            "inserted": inserted,
            "updated": updated,
            "churned_flagged": len(churned),
        },
        "kpis": {
            "total_sales": round(total_sales, 2),
            "profit": round(profit, 2),
            "weekly_capital": round(weekly_capital, 2),
            "regular_customers": regular_count,
            "at_risk_customers": at_risk_count,
        },
        "churned_customers": churned,
        "weekly_graph_data": {
            "weeks": week_labels,
            "sales": week_sales,
            "visits": week_visits,
            "regular": week_regular,
            "at_risk": week_at_risk,
            "profit": week_profit,
        },
    }
