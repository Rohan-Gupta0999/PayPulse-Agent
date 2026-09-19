// ─── Dynamic API Base URL ───────────────────────────────────────────────────

export function getApiBase(): string {
  let url = (process.env.NEXT_PUBLIC_API_BASE_URL || "").trim();

  if (!url) {
    const isBrowser = typeof window !== "undefined";
    const isLocalhost = isBrowser && (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname.endsWith(".local")
    );
    const isProd = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";

    if (isBrowser && !isLocalhost) {
      url = "https://paypulse-agent-production.up.railway.app";
    } else if (isProd && !isLocalhost) {
      url = "https://paypulse-agent-production.up.railway.app";
    } else {
      url = "http://127.0.0.1:8000";
    }
  }

  // Ensure scheme is present (e.g. if user set 'paypulse-agent-production.up.railway.app')
  if (!/^https?:\/\//i.test(url)) {
    if (url.startsWith("localhost") || url.startsWith("127.0.0.1")) {
      url = `http://${url}`;
    } else {
      url = `https://${url}`;
    }
  }

  return url.replace(/\/$/, "");
}

export const API_BASE = getApiBase();

// ─── Agent Stream Types ─────────────────────────────────────────────────────

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

// ─── Upload Types ───────────────────────────────────────────────────────────

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

/** Legacy monthly graph data (kept for backwards compat). */
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
  weekly_graph_data: WeeklyGraphData;
  weeks_breakdown?: WeekBreakdown[];
  graph_data?: GraphData;
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

// ─── Agent SSE Stream ───────────────────────────────────────────────────────

/**
 * Connects to the FastAPI backend SSE endpoint to listen to the agent in real time.
 */
export function listenToAgent(
  merchantId: number,
  onProgress: (node: string, data: any) => void,
  onApprovalRequired: (threadId: string, payload: AgentOfferPayload) => void,
  onError?: (err: any) => void,
  customerId?: number
): () => void {
  const base = getApiBase();
  const url = customerId
    ? `${base}/api/agent/stream/${merchantId}?customer_id=${customerId}`
    : `${base}/api/agent/stream/${merchantId}`;

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

// ─── Approval Decision (single) ─────────────────────────────────────────────

export async function sendApprovalDecision(threadId: string, action: "APPROVED" | "REJECTED") {
  const response = await fetch(`${getApiBase()}/api/agent/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ thread_id: threadId, action }),
  });
  if (!response.ok) throw new Error(`Failed to submit approval: ${response.statusText}`);
  return await response.json();
}

// ─── Bulk Approval ──────────────────────────────────────────────────────────

export async function bulkApproveOffers(
  merchantId: number,
  campaignIds: number[],
  action: "APPROVED" | "REJECTED" = "APPROVED"
): Promise<{ status: string; updated: number }> {
  const response = await fetch(`${getApiBase()}/api/agent/bulk-approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ merchant_id: merchantId, campaign_ids: campaignIds, action }),
  });
  if (!response.ok) throw new Error(`Bulk approve failed: ${response.statusText}`);
  return await response.json();
}

export async function fetchPendingCampaigns(merchantId: number): Promise<ChurnedCustomer[]> {
  const response = await fetch(`${getApiBase()}/api/agent/pending/${merchantId}`);
  if (!response.ok) return [];
  const data = await response.json();
  return data.pending_customers ?? [];
}

export async function fetchMerchantStats(merchantId: number = 1): Promise<{
  weeks_breakdown: WeekBreakdown[];
  current_kpis?: KpiData;
} | null> {
  try {
    const response = await fetch(`${getApiBase()}/api/merchant/${merchantId}/stats`);
    if (!response.ok) {
      console.warn(`Merchant stats endpoint returned status ${response.status}`);
      return { weeks_breakdown: [] };
    }
    return await response.json();
  } catch (error) {
    console.warn("Could not connect to merchant stats API:", error);
    return { weeks_breakdown: [] };
  }
}

// ─── WhatsApp Welcome Greetings ────────────────────────────────────────────

export async function sendWelcomeMessage(
  merchantId: number,
  customer: { customer_id?: number; customer_name: string; phone_number: string; amount_spent: number }
): Promise<{ status: string; customer_name: string; phone_number: string }> {
  const response = await fetch(`${getApiBase()}/api/merchant/${merchantId}/send-welcome`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(customer),
  });
  if (!response.ok) throw new Error(`Failed to send welcome message: ${response.statusText}`);
  return await response.json();
}

export async function sendBulkWelcomeMessages(
  merchantId: number,
  customers: Array<{
    customer_id?: number;
    customer_name: string;
    phone_number: string;
    amount_spent?: number;
  }>,
  testPhone?: string
) {
  const res = await fetch(`${getApiBase()}/api/agent/welcome-bulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      merchant_id: merchantId,
      customers,
      test_phone: testPhone || undefined,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to dispatch WhatsApp greetings");
  }
  return res.json();
}