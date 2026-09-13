import json
import uuid
from typing import AsyncGenerator
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse, ServerSentEvent
from langgraph.types import Command

from app.agent.graph import agent_app

router = APIRouter(prefix="/agent", tags=["Agent"])


class ApprovalRequest(BaseModel):
    thread_id: str
    action: str  # "APPROVED" or "REJECTED"


@router.get("/stream/{merchant_id}")
async def stream_agent_execution(merchant_id: int):
    """
    Initiates the agent run and streams real-time step-by-step progress 
    to the frontend via Server-Sent Events (SSE).
    """
    thread_id = f"session_{merchant_id}_{uuid.uuid4().hex[:6]}"
    config = {"configurable": {"thread_id": thread_id}}

    initial_state = {
        "merchant_id": merchant_id,
        "thread_id": thread_id,
        "anomaly_detected": False,
        "drop_percentage": 0.0,
        "target_customer": None,
        "generated_offer": None,
        "approval_status": None,
        "execution_result": None,
    }

    async def event_generator() -> AsyncGenerator[ServerSentEvent, None]:
        # Send initial session identifier
        yield ServerSentEvent(
            event="session_init",
            data=json.dumps({"thread_id": thread_id, "message": "Agent session started"})
        )

        # Run the graph until it reaches interrupt() or finish
        async for event in agent_app.astream(initial_state, config):
            node_name = list(event.keys())[0]

            if node_name == "__interrupt__":
                # The agent hit the approval gateway!
                interrupt_payload = event["__interrupt__"][0].value
                yield ServerSentEvent(
                    event="approval_required",
                    data=json.dumps({
                        "thread_id": thread_id,
                        "status": "AWAITING_APPROVAL",
                        "payload": interrupt_payload
                    })
                )
            else:
                yield ServerSentEvent(
                    event="agent_progress",
                    data=json.dumps({"node": node_name, "data": event[node_name]})
                )

    return EventSourceResponse(event_generator())


@router.post("/approve")
async def approve_and_dispatch(request: ApprovalRequest):
    """
    Resumes a paused agent thread upon merchant decision on the frontend.
    """
    config = {"configurable": {"thread_id": request.thread_id}}

    # Verify if thread exists and is waiting
    state = await agent_app.aget_state(config)
    if not state or not state.next:
        raise HTTPException(status_code=404, detail="No active paused agent found for this thread.")

    # Resume the graph from the interrupt
    resume_cmd = Command(resume={"status": request.action})
    
    execution_result = {}
    async for event in agent_app.astream(resume_cmd, config):
        if "dispatch" in event:
            execution_result = event["dispatch"]

    return {
        "status": "SUCCESS",
        "thread_id": request.thread_id,
        "final_state": execution_result
    }