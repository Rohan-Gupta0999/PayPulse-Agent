from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.agent_routes import router as agent_router

app = FastAPI(
    title="PayPulse AI Merchant Operations Agent",
    version="1.0.0",
    description="Stateful agentic backend with human-in-the-loop approval and WhatsApp dispatch"
)

# Enable CORS so your teammate's Next.js frontend (localhost:3000) can communicate seamlessly
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the agent endpoints
app.include_router(agent_router, prefix="/api")


@app.get("/")
async def health_check():
    return {"status": "online", "service": "PayPulse Agent Backend"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)