from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

# 1. Create the asynchronous database engine
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,  # Set to True if you want to see raw SQL logs in terminal
    future=True,
)

# 2. Factory that generates independent database sessions
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,  # Prevents SQLAlchemy from lazy-loading crashes
    autoflush=False,
)

# 3. Base class for all our database tables
class Base(DeclarativeBase):
    pass

# 4. Dependency helper to yield a session for FastAPI endpoints
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session