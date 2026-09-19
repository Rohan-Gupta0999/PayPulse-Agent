from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.agent_routes import router as agent_router
from app.api.merchant_routes import router as merchant_router
from app.api.upload_routes import router as upload_router

app = FastAPI(
    title="PayPulse AI Merchant Operations Agent",
    version="1.0.0",
    description="Stateful agentic backend with human-in-the-loop approval and WhatsApp dispatch"
)

# Production CORS: Allows local Next.js and all Cloudflare Pages preview & production domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"https://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(agent_router, prefix="/api")
app.include_router(merchant_router, prefix="/api")
app.include_router(upload_router, prefix="/api")


@app.get("/")
@app.get("/health")
async def health_check():
    return {"status": "online", "service": "PayPulse Agent Backend"}


@app.get("/api/debug-db")
async def debug_db():
    from app.database.session import DATABASE_URL, AsyncSessionLocal
    from sqlalchemy import text
    import urllib.parse
    
    parsed = urllib.parse.urlparse(DATABASE_URL) if DATABASE_URL else None
    masked_host = f"{parsed.hostname}:{parsed.port}/{parsed.path.lstrip('/')}" if parsed else "NONE"
    user = parsed.username if parsed else "NONE"
    
    status = {"db_host": masked_host, "db_user": user}
    try:
        async with AsyncSessionLocal() as session:
            res = await session.execute(text("SELECT count(*) FROM weekly_snapshots;"))
            status["weekly_snapshots_count"] = res.scalar()
            res2 = await session.execute(text("SELECT count(*) FROM customers;"))
            status["customers_count"] = res2.scalar()
            status["success"] = True
    except Exception as e:
        import traceback
        status["success"] = False
        status["error"] = str(e)
        status["traceback"] = traceback.format_exc()
    return status


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, loop="asyncio")