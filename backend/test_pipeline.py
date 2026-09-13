import asyncio
import uuid
from langgraph.types import Command
from app.agent.graph import agent_app


async def test_full_pipeline():
    thread_id = f"merchant_session_{uuid.uuid4().hex[:8]}"
    config = {"configurable": {"thread_id": thread_id}}

    initial_state = {
        "merchant_id": 1,
        "thread_id": thread_id,
        "anomaly_detected": False,
        "drop_percentage": 0.0,
        "target_customer": None,
        "generated_offer": None,
        "approval_status": None,
        "execution_result": None
    }

    print(f"--- Starting Agent Workflow for Thread: {thread_id} ---")
    
    # 1. Run the agent until it reaches the interrupt() approval gateway
    async for event in agent_app.astream(initial_state, config):
        print(f"State updated: {list(event.keys())}")

    # Inspect current state
    current_state = await agent_app.aget_state(config)
    print("\n--- Current Graph Snapshot ---")
    print(f"Next Node in Line: {current_state.next}")
    print(f"Pending Interrupt Tasks: {len(current_state.tasks)}")

    # 2. Simulate Merchant clicking "Approve" on the frontend
    print("\n👉 Simulating Merchant clicking 'APPROVE' on the frontend...")
    resume_command = Command(resume={"status": "APPROVED"})

    # 3. Resume the agent from the exact paused node
    async for event in agent_app.astream(resume_command, config):
        print(f"State updated: {list(event.keys())}")

    print("\n🎉 Full pipeline completed successfully!")


if __name__ == "__main__":
    asyncio.run(test_full_pipeline())
    