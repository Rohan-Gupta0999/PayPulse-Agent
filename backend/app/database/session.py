import os
import urllib.parse
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from sqlalchemy.pool import NullPool

# Export Base so models.py can import it
Base = declarative_base()

# Find and load .env file
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env')
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)
else:
    load_dotenv()

DEFAULT_SUPABASE_URL = "postgresql+asyncpg://postgres.riklbrwmvgavtxixvnoq:Py8RNEgCXn6JoDPD@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres"

DATABASE_URL = os.getenv("DATABASE_URL", "").strip()

# Strip any surrounding quotes if present
if (DATABASE_URL.startswith('"') and DATABASE_URL.endswith('"')) or (
    DATABASE_URL.startswith("'") and DATABASE_URL.endswith("'")
):
    DATABASE_URL = DATABASE_URL[1:-1].strip()

# If DATABASE_URL is missing or is Railway's auto-generated empty DB, fallback to Supabase
if not DATABASE_URL or "railway.internal" in DATABASE_URL or "rlwy.net" in DATABASE_URL:
    DATABASE_URL = DEFAULT_SUPABASE_URL

# Ensure asyncpg driver dialect is used
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgresql://") and not DATABASE_URL.startswith("postgresql+asyncpg://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

# Supabase pooler detection (port 6543 / 5432 / pooler host)
is_supabase_pooler = (
    ":6543" in DATABASE_URL or ":5432" in DATABASE_URL or "pooler.supabase.com" in DATABASE_URL
)

if is_supabase_pooler:
    engine = create_async_engine(
        DATABASE_URL,
        poolclass=NullPool,
        connect_args={
            "statement_cache_size": 0,
            "prepared_statement_cache_size": 0,
        },
    )
else:
    engine = create_async_engine(
        DATABASE_URL,
        pool_size=5,
        max_overflow=0,
        pool_recycle=300,
        pool_pre_ping=True,
    )

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)