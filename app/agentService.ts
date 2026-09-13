export interface AgentOfferPayload {
  merchant_id: number;
  customer_name: string;
  proposed_discount: number;
  proposed_coupon: string;
  reasoning: string;
}

export interface StreamEventData {
  thread_id?: string;
  node?: string;
  status?: string;
  data?: any;
  payload?: AgentOfferPayload;
  message?: string;
}

/**
 * Connects to the FastAPI backend SSE endpoint to listen to the agent in real time.
 */
export function listenToAgent(
  merchantId: number,
  onProgress: (node: string, data: any) => void,
  onApprovalRequired: (threadId: string, payload: AgentOfferPayload) => void,
  onError?: (err: any) => void
): () => void {
  const eventSource = new EventSource(`http://localhost:8000/api/agent/stream/${merchantId}`);

  eventSource.addEventListener("session_init", (e) => {
    const data: StreamEventData = JSON.parse(e.data);
    onProgress("init", data);
  });

  eventSource.addEventListener("agent_progress", (e) => {
    const data: StreamEventData = JSON.parse(e.data);
    onProgress(data.node || "progress", data.data);
  });

  eventSource.addEventListener("approval_required", (e) => {
    const data: StreamEventData = JSON.parse(e.data);
    if (data.thread_id && data.payload) {
      onApprovalRequired(data.thread_id, data.payload);
    }
    // Close stream once it reaches the approval gateway
    eventSource.close();
  });

  eventSource.onerror = (err) => {
    if (onError) onError(err);
    eventSource.close();
  };

  // Return teardown function
  return () => eventSource.close();
}

/**
 * Sends the merchant's approval decision back to resume the paused agent.
 */
export async function sendApprovalDecision(threadId: string, action: "APPROVED" | "REJECTED") {
  const response = await fetch("http://localhost:8000/api/agent/approve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      thread_id: threadId,
      action: action,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to submit approval: ${response.statusText}`);
  }

  return await response.json();
}