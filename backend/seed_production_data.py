import asyncio
import random
from datetime import datetime, timedelta, timezone
from sqlalchemy import text
from app.database.session import AsyncSessionLocal

INDIAN_NAMES = [
    ("Aarav Sharma", "+919810123456"), ("Priya Patel", "+919820234567"),
    ("Vikram Singh", "+919830345678"), ("Ananya Iyer", "+919840456789"),
    ("Rohan Mehta", "+919850567890"), ("Sneha Reddy", "+919860678901"),
    ("Kabir Sen", "+919870789012"), ("Diya Chatterjee", "+919880890123"),
    ("Aditya Nair", "+919890901234"), ("Ishaan Verma", "+919901012345"),
    ("Tanvi Kulkarni", "+919912123456"), ("Manish Tiwari", "+919923234567"),
    ("Pooja Hegde", "+919934345678"), ("Devansh Joshi", "+919945456789"),
    ("Meera Nambiar", "+919956567890"), ("Arjun Kapoor", "+919967678901"),
    ("Zoya Siddiqui", "+919978789012"), ("Farhan Akhtar", "+919989890123"),
    ("Kriti Sanon", "+919990901234"), ("Siddharth Rao", "+919811122334"),
    ("Kavita Menon", "+919822233445"), ("Varun Dhawan", "+919833344556"),
    ("Shruti Haasan", "+919844455667"), ("Nikhil Gupta", "+919855566778"),
    ("Bhavna Shah", "+919866677889"), ("Gaurav Chopra", "+919877788990"),
    ("Alia Bhatt", "+919888899001"), ("Rahul Dravid", "+919899900112"),
    ("Sunita Williams", "+919900011223"), ("Karan Johar", "+919911122334"),
]

CHANNELS = ["UPI (GPay)", "UPI (PhonePe)", "Paytm Wallet", "HDFC Netbanking", "ICICI Gateway", "Axis Gateway"]


async def generate_production_seed():
    async with AsyncSessionLocal() as session:
        print("🔧 Auto-fixing database schema (Adding missing payment_channel column)...")
        await session.execute(text("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payment_channel VARCHAR(50);"))
        
        print("🧹 Cleaning out old seed rows...")
        await session.execute(text("TRUNCATE TABLE campaigns, transactions, consent_logs, customers, merchants RESTART IDENTITY CASCADE;"))

        print("🏢 Creating Primary Merchant...")
        merchant_res = await session.execute(
            text("""
                INSERT INTO merchants (business_name, phone_number)
                VALUES ('Urban Artisan Roasters', '+911145678900')
                RETURNING id;
            """)
        )
        merchant_id = merchant_res.scalar_one()

        now = datetime.now(timezone.utc)

        print("👥 Seeding 30 Customers with DPDP 2023 Consent Logs...")
        created_customer_ids = []
        for i, (name, phone) in enumerate(INDIAN_NAMES):
            days_ago = random.randint(32, 55) if i < 8 else random.randint(1, 15)
            last_visited = now - timedelta(days=days_ago, hours=random.randint(1, 23))
            total_spend = float(random.randint(1800, 18500))

            cust_res = await session.execute(
                text("""
                    INSERT INTO customers (merchant_id, name, phone_number, last_visited_at, total_spend)
                    VALUES (:mid, :name, :phone, :visited, :spend)
                    RETURNING id;
                """),
                {
                    "mid": merchant_id,
                    "name": name,
                    "phone": phone,
                    "visited": last_visited,
                    "spend": total_spend
                }
            )
            cid = cust_res.scalar_one()
            created_customer_ids.append(cid)

            await session.execute(
                text("""
                    INSERT INTO consent_logs (customer_id, marketing_opt_in, opt_in_timestamp)
                    VALUES (:cid, :opt_in, :opt_time);
                """),
                {"cid": cid, "opt_in": True, "opt_time": last_visited}
            )

        print("💳 Generating 155 realistic transactions spanning 14 days...")
        for _ in range(95):
            days_offset = random.randint(8, 14)
            txn_time = now - timedelta(days=days_offset, hours=random.randint(0, 23), minutes=random.randint(0, 59))
            cid = random.choice(created_customer_ids)
            amount = float(random.choice([250, 450, 890, 1200, 1550, 2400, 3100]))
            channel = random.choice(CHANNELS)
            status = "SUCCESS" if random.random() > 0.05 else "FAILED"

            await session.execute(
                text("""
                    INSERT INTO transactions (merchant_id, customer_id, amount, payment_channel, status, created_at)
                    VALUES (:mid, :cid, :amt, :chan, :status, :created);
                """),
                {"mid": merchant_id, "cid": cid, "amt": amount, "chan": channel, "status": status, "created": txn_time}
            )

        for _ in range(40):
            days_offset = random.randint(1, 7)
            txn_time = now - timedelta(days=days_offset, hours=random.randint(0, 23), minutes=random.randint(0, 59))
            cid = random.choice(created_customer_ids)
            amount = float(random.choice([220, 350, 680, 950, 1400]))
            channel = random.choice(CHANNELS)
            status = "SUCCESS" if random.random() > 0.08 else "FAILED"

            await session.execute(
                text("""
                    INSERT INTO transactions (merchant_id, customer_id, amount, payment_channel, status, created_at)
                    VALUES (:mid, :cid, :amt, :chan, :status, :created);
                """),
                {"mid": merchant_id, "cid": cid, "amt": amount, "chan": channel, "status": status, "created": txn_time}
            )

        for _ in range(20):
            mins_ago = random.randint(3, 420)
            txn_time = now - timedelta(minutes=mins_ago)
            cid = random.choice(created_customer_ids)
            amount = float(random.choice([310, 420, 890, 1240, 2100, 4500]))
            channel = random.choice(CHANNELS)
            status = "FAILED" if random.random() > 0.85 else "SUCCESS"

            await session.execute(
                text("""
                    INSERT INTO transactions (merchant_id, customer_id, amount, payment_channel, status, created_at)
                    VALUES (:mid, :cid, :amt, :chan, :status, :created);
                """),
                {"mid": merchant_id, "cid": cid, "amt": amount, "chan": channel, "status": status, "created": txn_time}
            )

        await session.commit()
        print("\n🎉 PRODUCTION DATASET SEEDED SUCCESSFULLY!")


if __name__ == "__main__":
    asyncio.run(generate_production_seed())