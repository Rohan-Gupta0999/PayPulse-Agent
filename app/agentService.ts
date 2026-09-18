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

export interface NewCustomer {
  id?: number;
  name: string;
  phone_number: string;
  amount_spent: number;
  visit_date: string;
}

export interface UploadSummary {
  total_rows: number;
  total_customers?: number;
  regular_customers?: number;
  new_customers?: number;
  new_customers_list?: NewCustomer[];
  repeat_visits?: number;
  inserted: number;
  updated: number;
  churned_flagged: number;
}

/** A churned customer returned by the upload endpoint, pre-loaded with offer details. */
export interface ChurnedCustomer {
  id: number;
  name: string;
  phone_number: string;
  total_spend: number;
  days_away: number;
  // Pre-generated offer fields (set by upload_routes.py)
  campaign_id?: number;
  thread_id?: string;
  discount?: number;
  coupon?: string;
}

/** Weekly graph data sourced from the weekly_snapshots table. */
export interface WeeklyGraphData {
  weeks: string[];    // e.g. ["Sep 08", "Sep 15"]
  sales: number[];    // total_sales per week
  visits: number[];   // total_customers per week
  regular: number[];  // regular_customers per week
  at_risk: number[];  // at_risk_customers per week
  profit: number[];   // profit per week
}

/** Legacy monthly graph data (kept for backwards compat, no longer primary). */
export interface GraphData {
  months: string[];
  visits: number[];
  sales: number[];
}

export interface KpiData {
  total_sales: number;
  profit: number | null;
  weekly_capital: number;
  regular_customers: number;
  new_customers?: number;
  total_customers?: number;
  at_risk_customers: number;
}

export interface WeekBreakdown {
  week_id: string;
  week_num: number;
  label: string;
  short_label: string;
  start_date: string;
  end_date?: string;
  kpis: {
    total_sales: number;
    profit: number | null;
    weekly_capital?: number;
    regular_customers: number;
    new_customers?: number;
    total_customers?: number;
    at_risk_customers?: number;
    visits?: number;
  };
  graph_data: WeeklyGraphData;
}

export interface UploadResult {
  status: string;
  summary: UploadSummary;
  kpis: KpiData;
  current_week_id?: string;
  churned_customers: ChurnedCustomer[];
  new_customers_list?: NewCustomer[];
  weekly_graph_data: WeeklyGraphData;   // Primary — from weekly_snapshots
  weeks_breakdown?: WeekBreakdown[];
  graph_data?: GraphData;               // Legacy, may be absent
  daily_stats?: {
    dates: string[];
    sales: number[];
    profit: number[];
    visits: number[];
  };
  summary_kpis?: {
    total_sales: number;
    total_profit: number;
    total_visits: number;
    regular_count: number;
    at_risk_count: number;
  };
  churn_candidate?: {
    id: number;
    name: string;
    phone_number: string;
    lifetime_spend: number;
    days_away: number;
  } | null;
}

// ─── Agent SSE Stream ─────────────────────────────────────────────────────────

/**
 * Connects to the FastAPI backend SSE endpoint to listen to the agent in real time.
 * Used purely for the "Live AI Feed" telemetry panel (cosmetic).
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
    eventSource.close();
  });

  eventSource.onerror = (err) => {
    if (onError) onError(err);
    eventSource.close();
  };

  return () => eventSource.close();
}

// ─── Approval Decision (single) ───────────────────────────────────────────────

export async function sendApprovalDecision(threadId: string, action: "APPROVED" | "REJECTED") {
  const response = await fetch("http://localhost:8000/api/agent/approve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ thread_id: threadId, action }),
  });
  if (!response.ok) throw new Error(`Failed to submit approval: ${response.statusText}`);
  return await response.json();
}

// ─── Bulk Approval ────────────────────────────────────────────────────────────

/**
 * Approves (or rejects) ALL pending campaigns in one click.
 * Called when merchant presses "Send Offers to All X Customers".
 */
export async function bulkApproveOffers(
  merchantId: number,
  campaignIds: number[],
  action: "APPROVED" | "REJECTED" = "APPROVED"
): Promise<{ status: string; updated: number }> {
  const response = await fetch("http://localhost:8000/api/agent/bulk-approve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ merchant_id: merchantId, campaign_ids: campaignIds, action }),
  });
  if (!response.ok) throw new Error(`Bulk approve failed: ${response.statusText}`);
  return await response.json();
}

/**
 * Fetches all PENDING_APPROVAL campaigns from the DB.
 * Used on page refresh to restore the outreach queue.
 */
export async function fetchPendingCampaigns(merchantId: number): Promise<ChurnedCustomer[]> {
  const response = await fetch(`http://localhost:8000/api/agent/pending/${merchantId}`);
  if (!response.ok) return [];
  const data = await response.json();
  return data.pending_customers ?? [];
}

/**
 * Fetches previously uploaded weekly snapshots and KPI stats.
 * Allows merchant to view historical weekly bar graphs immediately upon login.
 */
export async function fetchMerchantStats(merchantId: number): Promise<{
  has_data: boolean;
  latest_kpis: KpiData | null;
  weekly_graph_data: WeeklyGraphData;
  weeks_breakdown: WeekBreakdown[];
  current_week_id?: string;
}> {
  const response = await fetch(`http://localhost:8000/api/merchant/${merchantId}/stats`);
  if (!response.ok) throw new Error("Failed to fetch merchant stats");
  return await response.json();
}

// ─── WhatsApp Welcome Greetings ──────────────────────────────────────────────

export async function sendWelcomeMessage(
  merchantId: number,
  customer: { customer_id?: number; customer_name: string; phone_number: string; amount_spent: number }
): Promise<{ status: string; customer_name: string; phone_number: string }> {
  const response = await fetch(`http://localhost:8000/api/merchant/${merchantId}/send-welcome`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(customer),
  });
  if (!response.ok) throw new Error(`Failed to send welcome message: ${response.statusText}`);
  return await response.json();
}

export async function sendBulkWelcomeMessages(
  merchantId: number,
  customers: Array<{ customer_id?: number; customer_name: string; phone_number: string; amount_spent: number }>
): Promise<{ status: string; count: number; results: any[] }> {
  const response = await fetch(`http://localhost:8000/api/merchant/${merchantId}/send-welcome-bulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customers }),
  });
  if (!response.ok) throw new Error(`Bulk welcome dispatch failed: ${response.statusText}`);
  return await response.json();
}