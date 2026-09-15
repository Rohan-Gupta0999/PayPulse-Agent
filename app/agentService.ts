// ─── Agent Stream Types ───────────────────────────────────────────────────────

export interface AgentOfferPayload {
  merchant_id: number;
  customer_name: string;
  proposed_discount: number;
  proposed_coupon: string;
  reasoning: string;
  lifetime_spend?: number;
  days_away?: number;
}

export interface StreamEventData {
  thread_id?: string;
  node?: string;
  status?: string;
  data?: any;
  payload?: AgentOfferPayload;
  message?: string;
}

// ─── Upload Types ─────────────────────────────────────────────────────────────

export interface UploadSummary {
  total_rows: number;
  inserted: number;
  updated: number;
  churned_flagged: number;
}

export interface ChurnedCustomer {
  id: number;
  name: string;
  phone_number: string;
  total_spend: number;
  days_away: number;
}

export interface GraphData {
  months: string[];   // e.g. ["Apr", "May", "Jun", "Jul", "Aug", "Sep"]
  visits: number[];
  sales: number[];
}

export interface KpiData {
  total_sales: number;
  profit: number;
  weekly_capital: number;
  regular_customers: number;
  at_risk_customers: number;
}

export interface UploadResult {
  status: string;
  summary: UploadSummary;
  kpis: KpiData;
  churned_customers: ChurnedCustomer[];
  graph_data: GraphData;
}

// ─── Agent SSE Stream ─────────────────────────────────────────────────────────

/**
 * Connects to the FastAPI backend SSE endpoint to listen to the agent in real time.
 *
 * @param customerId  Optional. When provided (post-CSV upload), the stream will
 *                    target that specific churned customer instead of a random one.
 */
export function listenToAgent(
  merchantId: number,
  onProgress: (node: string, data: any) => void,
  onApprovalRequired: (threadId: string, payload: AgentOfferPayload) => void,
  onError?: (err: any) => void,
  customerId?: number
): () => void {
  const url = customerId
    ? `http://localhost:8000/api/agent/stream/${merchantId}?customer_id=${customerId}`
    : `http://localhost:8000/api/agent/stream/${merchantId}`;

  const eventSource = new EventSource(url);

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

// ─── Approval Decision ────────────────────────────────────────────────────────

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