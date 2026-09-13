import asyncio
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from app.database.session import engine, Base, AsyncSessionLocal
from app.database.models import Merchant, Customer, ConsentLog, Transaction


async def init_and_seed():
    print("Connecting to Supabase and creating tables...")
    
    # 1. Create all tables in Supabase based on models.py
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Tables created successfully.")

    # 2. Seed mock data to simulate payment drop
    async with AsyncSessionLocal() as session:
        # Check if test merchant already exists
        result = await session.execute(select(Merchant).where(Merchant.phone_number == "+919876543210"))
        if result.scalar_one_or_none():
            print("⚡ Database already has seed data. Skipping seed step.")
            return

        print("🌱 Seeding merchant, customers, consent logs, and transactions...")
        
        # Create Merchant
        merchant = Merchant(
            business_name="SuperMart Express",
            phone_number="+919876543210"
        )
        session.add(merchant)
        await session.flush()  # Generates merchant.id

        now = datetime.now(timezone.utc)

        # Create Customers (with DPDP consent flags)
        customer1 = Customer(
            merchant_id=merchant.id,
            name="Aarav Sharma",
            phone_number="+919123456780",
            last_visited_at=now - timedelta(days=35),  # Churn risk: hasn't visited in 35 days
            total_spend=4500.0
        )
        customer2 = Customer(
            merchant_id=merchant.id,
            name="Priya Patel",
            phone_number="+919123456781",
            last_visited_at=now - timedelta(days=40),  # Churn risk: hasn't visited in 40 days
            total_spend=8200.0
        )
        customer3 = Customer(
            merchant_id=merchant.id,
            name="Vikram Singh",
            phone_number="+919123456782",
            last_visited_at=now - timedelta(days=2),   # Active customer
            total_spend=1200.0
        )
        session.add_all([customer1, customer2, customer3])
        await session.flush()

        # Add DPDP Consent Records
        consent1 = ConsentLog(customer_id=customer1.id, marketing_opt_in=True, opt_in_timestamp=now - timedelta(days=90))
        consent2 = ConsentLog(customer_id=customer2.id, marketing_opt_in=True, opt_in_timestamp=now - timedelta(days=90))
        consent3 = ConsentLog(customer_id=customer3.id, marketing_opt_in=False, opt_in_timestamp=None)  # Opted out
        session.add_all([consent1, consent2, consent3])

        # Add Historical Transactions: Simulating a 40% payment dip
        # Two weeks ago (days 8 to 14): ₹10,000 revenue
        for day_offset in range(8, 15):
            session.add(Transaction(
                merchant_id=merchant.id,
                customer_id=customer1.id,
                amount=1428.5,
                status="SUCCESS",
                created_at=now - timedelta(days=day_offset)
            ))

        # Trailing 7 days (days 1 to 7): Only ₹3,000 revenue (A massive drop)
        for day_offset in range(1, 8):
            session.add(Transaction(
                merchant_id=merchant.id,
                customer_id=customer3.id,
                amount=428.5,
                status="SUCCESS",
                created_at=now - timedelta(days=day_offset)
            ))

        await session.commit()
        print("🎉 Seed data successfully inserted!")


if __name__ == "__main__":
    asyncio.run(init_and_seed())