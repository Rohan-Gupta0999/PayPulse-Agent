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
        daily_metrics JSONB,
        uploaded_at TIMESTAMPTZ DEFAULT NOW()
    )
"""

def normalize_phone(raw_phone: str) -> str:
    digits = re.sub(r"\D", "", raw_phone)
    return digits[-10:] if len(digits) >= 10 else digits

def calculate_spend_based_discount(spend: float) -> tuple[float, str]:
    s = float(spend or 0.0)
    if s < 5000: return 10.0, "COMEBACK10"
    elif s < 10000: return 12.0, "LOYAL12"
    elif s < 14000: return 15.0, "LOYAL15"
    elif s < 17000: return 18.0, "PREMIUM18"
    else: return 20.0, "VIP20"

@router.post("/{merchant_id}")
@router.post("/ledger/{merchant_id}")
async def upload_ledger(
    merchant_id: int,
    file: UploadFile = File(...),
    weekly_capital: float = Form(0.0),
):
    if not (file.filename or "").endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted.")

    raw = await file.read()
    try: text_content = raw.decode("utf-8-sig")
    except UnicodeDecodeError: text_content = raw.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text_content))
    if not reader.fieldnames:
        raise HTTPException(status_code=422, detail="Empty or invalid CSV file.")

    field_map = {f.strip().lower().replace(" ", "_"): f for f in reader.fieldnames}
    is_transaction_schema = "sales_amount" in field_map or "transaction_id" in field_map
    rows = list(reader)
    if not rows: raise HTTPException(status_code=422, detail="CSV file has no data rows.")

    now = datetime.now(timezone.utc)
    if is_transaction_schema:
        return await process_transaction_receipts(merchant_id, rows, field_map, weekly_capital, now)
    else:
        return await process_legacy_customer_ledger(merchant_id, rows, field_map, weekly_capital, now)


async def process_transaction_receipts(merchant_id: int, rows: list[dict], field_map: dict, weekly_capital: float, now: datetime):
    col_date = field_map.get("transaction_date") or "transaction_date"
    col_sales = field_map.get("sales_amount") or "sales_amount"
    col_cost = field_map.get("item_cost") or "item_cost"
    col_phone = field_map.get("phone_number") or "phone_number"
    col_name = field_map.get("customer_name") or "customer_name"

    total_sales = 0.0
    total_item_cost = 0.0
    customer_agg: dict[str, dict] = {}
    daily_agg: dict[date, dict] = {}
    this_week_phones_norm = set()
    this_week_names_norm = set()

    for row in rows:
        raw_phone = str(row.get(col_phone, "")).strip()
        phone_norm = normalize_phone(raw_phone)
        name = str(row.get(col_name, "")).strip()
        if not phone_norm and not name: continue

        try: sales = float(str(row.get(col_sales, "0")).replace("₹", "").replace(",", "").strip())
        except ValueError: sales = 0.0

        try: cost = float(str(row.get(col_cost, "0")).replace("₹", "").replace(",", "").strip())
        except ValueError: cost = 0.0

        raw_date = str(row.get(col_date, "")).strip()
        txn_date = None
        for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%m/%d/%Y"):
            try:
                txn_date = datetime.strptime(raw_date, fmt).date()
                break
            except ValueError: continue
        if txn_date is None: continue

        total_sales += sales
        total_item_cost += cost
        if phone_norm: this_week_phones_norm.add(phone_norm)
        if name: this_week_names_norm.add(name.lower())

        agg_key = phone_norm or f"name_{name.lower()}"
        if agg_key not in customer_agg:
            customer_agg[agg_key] = {
                "name": name or (f"Customer {phone_norm[-4:]}" if phone_norm else "Customer"),
                "phone_number": raw_phone, "phone_norm": phone_norm,
                "week_spend": 0.0, "max_date": txn_date,
            }
        customer_agg[agg_key]["week_spend"] += sales
        if txn_date > customer_agg[agg_key]["max_date"]: customer_agg[agg_key]["max_date"] = txn_date
        if name and not customer_agg[agg_key]["name"].startswith("Customer "):
            customer_agg[agg_key]["name"] = name

        if txn_date not in daily_agg:
            daily_agg[txn_date] = {"sales": 0.0, "cost": 0.0, "profit": 0.0, "visits": 0, "customers": set()}
        daily_agg[txn_date]["sales"] += sales
        daily_agg[txn_date]["cost"] += cost
        daily_agg[txn_date]["profit"] += (sales - cost)
        daily_agg[txn_date]["visits"] += 1
        daily_agg[txn_date]["customers"].add(agg_key)

    used_capital = weekly_capital if weekly_capital > 0 else total_item_cost
    calculated_profit = round(total_sales - used_capital, 2)

    sorted_dates = sorted(daily_agg.keys()) if daily_agg else [now.date()]
    min_date, max_date = sorted_dates[0], sorted_dates[-1]

    async with AsyncSessionLocal() as session:
        await session.execute(text(CREATE_WEEKLY_SNAPSHOTS_SQL))
        await session.commit()

        snap_prior_res = await session.execute(
            text("SELECT COUNT(*) FROM weekly_snapshots WHERE merchant_id = :mid AND week_start_date < :wstart"),
            {"mid": merchant_id, "wstart": min_date}
        )
        target_week_num = (snap_prior_res.scalar() or 0) + 1
        target_week_label = f"Week {target_week_num} ({min_date.strftime('%b %d')} – {(min_date + timedelta(days=6)).strftime('%b %d')}, {min_date.year})"

        inserted, updated = 0, 0
        for agg_key, cdata in customer_agg.items():
            dt_visit = datetime.combine(cdata["max_date"], datetime.min.time(), tzinfo=timezone.utc)
            lookup = await session.execute(
                text("""SELECT id, first_snapshot_id FROM customers WHERE merchant_id = :mid AND (
                        (:phone_norm != '' AND RIGHT(REGEXP_REPLACE(phone_number, '[^0-9]', '', 'g'), 10) = :phone_norm)
                        OR (:norm_name != '' AND LOWER(TRIM(name)) = :norm_name)
                      ) ORDER BY id ASC LIMIT 1"""),
                {"mid": merchant_id, "phone_norm": cdata["phone_norm"], "norm_name": cdata["name"].strip().lower()}
            )
            existing = lookup.fetchone()
            
            # 🚨 THE FIX: Strictly action-based logic. If they exist in DB already, they are NOT new.
            if existing:
                cdata["id"] = existing.id
                cdata["is_new"] = False 
                updated += 1
                await session.execute(
                    text("UPDATE customers SET total_spend = total_spend + :s, last_visited_at = :v WHERE id = :cid"),
                    {"s": cdata["week_spend"], "v": dt_visit, "cid": existing.id}
                )
            else:
                ins_res = await session.execute(
                    text("INSERT INTO customers (merchant_id, name, phone_number, total_spend, last_visited_at, first_snapshot_id, created_at) VALUES (:m, :n, :p, :s, :v, :snap, NOW()) RETURNING id"),
                    {"m": merchant_id, "n": cdata["name"].strip(), "p": cdata["phone_number"], "s": cdata["week_spend"], "v": dt_visit, "snap": target_week_num}
                )
                cdata["id"] = ins_res.scalar_one()
                cdata["is_new"] = True
                inserted += 1
        await session.commit()

        new_customers_list = [{"id": d.get("id"), "name": d["name"], "phone_number": d["phone_number"], "amount_spent": round(d["week_spend"], 2), "visit_date": d["max_date"].strftime("%d %b %Y")} for d in customer_agg.values() if d.get("is_new")]
        new_count = len(new_customers_list)
        regular_count = max(0, len(customer_agg) - new_count)

        await session.execute(text("DELETE FROM campaigns WHERE merchant_id = :mid AND status = 'PENDING_APPROVAL'"), {"mid": merchant_id})
        await session.commit()

        absent_query = await session.execute(
            text("SELECT id, name, phone_number, total_spend, EXTRACT(DAY FROM (:now_ts - last_visited_at))::int AS days_away FROM customers WHERE merchant_id = :m AND last_visited_at <= :c AND total_spend >= :ms ORDER BY total_spend DESC"),
            {"m": merchant_id, "now_ts": now, "c": now - timedelta(days=CHURN_DAYS), "ms": CHURN_SPEND}
        )
        churned = []
        for cand in absent_query.fetchall():
            if (normalize_phone(cand.phone_number) in this_week_phones_norm) or ((cand.name or "").strip().lower() in this_week_names_norm): continue
            disc, coupon = calculate_spend_based_discount(cand.total_spend)
            tid = str(uuid_module.uuid4())
            ins_camp = await session.execute(text("INSERT INTO campaigns (merchant_id, customer_id, thread_id, discount_percentage, coupon_code, template_name, status) VALUES (:m, :c, :t, :d, :cp, 'win_back', 'PENDING_APPROVAL') RETURNING id"), {"m": merchant_id, "c": cand.id, "t": tid, "d": disc, "cp": coupon})
            churned.append({"id": cand.id, "name": cand.name, "phone_number": cand.phone_number, "total_spend": float(cand.total_spend), "days_away": cand.days_away or 30, "campaign_id": ins_camp.scalar_one(), "thread_id": tid, "discount": disc, "coupon": coupon})
        await session.commit()
        
    upload_days_labels, upload_days_sales, upload_days_visits, upload_days_profit = [], [], [], []
    for d_offset in range(7):
        d = min_date + timedelta(days=d_offset)
        upload_days_labels.append(d.strftime("%a %d").upper())
        if d in daily_agg:
            upload_days_sales.append(round(daily_agg[d]["sales"], 2))
            upload_days_visits.append(daily_agg[d]["visits"])
            upload_days_profit.append(round(daily_agg[d]["profit"], 2))
        else:
            upload_days_sales.append(0.0)
            upload_days_visits.append(0)
            upload_days_profit.append(0.0)

    uploaded_graph_data = {"weeks": upload_days_labels, "sales": upload_days_sales, "visits": upload_days_visits, "regular": [0]*7, "at_risk": [0]*7, "profit": upload_days_profit}

    all_weeks = []
    async with AsyncSessionLocal() as session:
        import json
        check_snap = await session.execute(text("SELECT id FROM weekly_snapshots WHERE merchant_id = :mid AND week_start_date = :wstart LIMIT 1"), {"mid": merchant_id, "wstart": min_date})
        existing_snap_row = check_snap.fetchone()

        if existing_snap_row:
            await session.execute(text("UPDATE weekly_snapshots SET week_label = :wl, total_sales = :s, weekly_capital = :c, profit = :p, total_customers = :tc, regular_customers = :rc, at_risk_customers = :ar, daily_metrics = :dm, uploaded_at = NOW() WHERE id = :id"),
                {"id": existing_snap_row.id, "wl": target_week_label, "s": round(total_sales, 2), "c": round(used_capital, 2), "p": calculated_profit, "tc": len(customer_agg), "rc": regular_count, "ar": len(churned), "dm": json.dumps(uploaded_graph_data)})
        else:
            await session.execute(text("INSERT INTO weekly_snapshots (merchant_id, week_start_date, week_label, total_sales, weekly_capital, profit, total_customers, regular_customers, at_risk_customers, daily_metrics, uploaded_at) VALUES (:m, :ws, :wl, :s, :c, :p, :tc, :rc, :ar, :dm, NOW())"),
                {"m": merchant_id, "ws": min_date, "wl": target_week_label, "s": round(total_sales, 2), "c": round(used_capital, 2), "p": calculated_profit, "tc": len(customer_agg), "rc": regular_count, "ar": len(churned), "dm": json.dumps(uploaded_graph_data)})
        await session.commit()

        all_snaps_res = await session.execute(text("SELECT * FROM weekly_snapshots WHERE merchant_id = :mid ORDER BY week_start_date ASC, id ASC"), {"mid": merchant_id})
        for idx, r in enumerate(all_snaps_res.fetchall()):
            dm = r.daily_metrics if not isinstance(r.daily_metrics, str) else json.loads(r.daily_metrics)
            w_num = idx + 1
            all_weeks.append({
                "week_id": f"week_{w_num}", "week_num": w_num, "label": re.sub(r"^Week\s*\d+", f"Week {w_num}", r.week_label, flags=re.IGNORECASE),
                "short_label": f"W{w_num}", "start_date": r.week_start_date.isoformat(),
                "kpis": {"total_sales": float(r.total_sales), "weekly_capital": float(r.weekly_capital), "profit": float(r.profit), "total_customers": int(r.total_customers), "regular_customers": int(r.regular_customers), "new_customers": max(0, int(r.total_customers) - int(r.regular_customers)), "at_risk_customers": int(r.at_risk_customers)},
                "graph_data": dm or {},
            })

    return {
        "status": "SUCCESS", "mode": "TRANSACTION_RECEIPTS",
        "summary": {"total_rows": len(rows), "total_customers": len(customer_agg), "regular_customers": regular_count, "new_customers": new_count, "new_customers_list": new_customers_list, "repeat_visits": max(0, len(rows) - len(customer_agg)), "churned_flagged": len(churned)},
        "new_customers_list": new_customers_list,
        "kpis": {"total_sales": round(total_sales, 2), "profit": calculated_profit, "weekly_capital": round(used_capital, 2), "regular_customers": regular_count, "new_customers": new_count, "total_customers": len(customer_agg), "at_risk_customers": len(churned)},
        "current_week_id": f"week_{len(all_weeks)}",
        "churned_customers": churned, "weekly_graph_data": uploaded_graph_data, "weeks_breakdown": all_weeks,
    }

async def process_legacy_customer_ledger(m_id, rows, fmap, cap, now):
    pass