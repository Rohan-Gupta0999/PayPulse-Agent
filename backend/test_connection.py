import asyncio
import os
from urllib.parse import urlparse
from dotenv import load_dotenv

load_dotenv()  # loads backend/.env

raw_url = os.getenv("DATABASE_URL")
if not raw_url:
    print("❌ DATABASE_URL is not set — check backend/.env is present and loaded.")
    raise SystemExit(1)

parsed = urlparse(raw_url)
print("=== Parsed DATABASE_URL ===")
print(f"scheme:   {parsed.scheme}")
print(f"username: {parsed.username}")
print(f"host:     {parsed.hostname!r}")
print(f"port:     {parsed.port}")
print(f"dbname:   {parsed.path.lstrip('/')}")
print("============================")

async def main():
    import asyncpg
    try:
        conn = await asyncpg.connect(
            host=parsed.hostname,
            port=parsed.port or 5432,
            user=parsed.username,
            password=parsed.password,
            database=parsed.path.lstrip("/") or "postgres",
            ssl="require",
        )
        print("✅ Connected:", await conn.fetchval("SELECT version();"))
        await conn.close()
    except Exception as e:
        print(f"❌ {type(e).__name__}: {e}")

if __name__ == "__main__":
    asyncio.run(main())