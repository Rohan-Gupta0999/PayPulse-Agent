"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Store, Users, Wallet, CheckCircle2, TrendingUp, TrendingDown,
  X, Smartphone, Terminal, UserX, Calendar
} from 'lucide-react';
import {
  listenToAgent, UploadResult, WeeklyGraphData, KpiData,
  ChurnedCustomer, bulkApproveOffers, WeekBreakdown
} from '../agentService';
import CsvUploadZone from './CsvUploadZone';

interface TelemetryLog {
  id: string;
  timestamp: string;
  nodeKey: string;
  messageKey: string;
  customerName?: string;
  status: 'running' | 'interrupted' | 'completed' | 'info';
}

interface AuditLedgerItem {
  id: string;
  customer: string;
  amount: number;
  status: string;
  time: string;
}

// ─── GRAPH HELPERS ────────────────────────────────────────────────────────────

/** Converts raw data values into bar pixel heights (min 8px, max 130px). */
function normalizeHeights(values: number[], maxPx = 130, minPx = 8): number[] {
  const max = Math.max(...values, 1);
  return values.map((v) => (v === 0 ? 0 : Math.max(minPx, Math.round((v / max) * maxPx))));
}

// ─── TRANSLATION DICTIONARY ───────────────────────────────────────────────────
const TRANSLATIONS = {
  EN: {
    title: "Customer Loyalty & Retention",
    subtitle: "Upload your weekly POS file and the AI will automatically find customers to bring back.",
    salesKpi: "This Week's Sales",
    salesDesc: "Total revenue from weekly sales",
    profitKpi: "This Week's Profit",
    lossKpi: "This Week's Loss",
    profitDesc: "Net earnings this week",
    lossDesc: "Net loss this week",
    regularKpi: "Regular Customers",
    regularDesc: "Visited this week",
    riskKpi: "Customers At Risk",
    riskDesc: "Absent regulars needing outreach",

    // Graph Titles
    graph1: "Daily Sales (This Week)",
    graph2: "Daily Customer Visits",
    graph3: "Daily Profit & Loss",
    graph4: "Customer Retention & Footfall",

    // Legends
    legendSales: "Sales",
    legendActive: "Visits",
    legendProfit: "Profit",
    legendLoss: "Loss",
    legendRegular: "Regular",
    legendRisk: "At Risk",
    legendCurrent: "This Week",
    netProfitText: "Net Profit:",

    // Upload Zone
    uploadTitle: "Upload Your Weekly Sales File",
    uploadSubtitle: "Drag & drop your POS export CSV here, or click to choose a file",
    uploadBtn: "Choose File",
    uploadSuccess: "File uploaded! AI is scanning transactions & detecting absent regulars...",
    uploadError: "Upload failed. Please check the file and try again.",
    uploadHint: "Required columns: transaction_id, transaction_date, sales_amount, item_cost, phone_number, customer_name",
    weeklyCapitalPlaceholder: "Week's Capital",
    weeklyCapitalTitle: "Enter weekly procurement cost (optional)",

    logsTitle: "Live AI Activity Feed",
    outreachTitle: "Customers Needing Outreach",
    outreachSubtitle: "These high-value customers haven't visited recently. Send them an offer to bring them back.",
    approveAllBtn: "Send WhatsApp Offers to All",
    approvingBtn: "Sending Offers...",
    outreachSuccess: "Offers sent successfully!",
    outreachSuccessDesc: "WhatsApp messages sent to all customers.",
    skipCustomer: "Skip",
    historyTitle: "Customers Contacted History",
    historyDesc: "A list of all customers you have sent offers to",
    tableCol1: "Customer ID",
    tableCol2: "Customer Name",
    tableCol3: "Offer Sent",
    tableCol4: "Your Decision",
    tableCol5: "Time",

    emptyLogs: "Upload your sales file above to start the AI scan...",
    emptyOutreach: "No customers need outreach right now.",
    emptyHistory: "No history available yet.",

    atRiskBadge: "At Risk",
    justNow: "Just now",
    discountLabel: "Off",
    offLabel: "OFF",
    statusApproved: "APPROVED",
    statusRejected: "REJECTED",
    statusPending: "PENDING",
    offerSent: "Offer Sent",
    actionCancelled: "Skipped",
    daysAgo1: "hasn't visited in",
    daysAgo2: "days",
    spend1: "Lifetime Spend",
    spend2: "Proposed Offer",

    // Log Nodes
    node_searching: "Searching",
    node_found: "Found Customer",
    node_planning: "AI Planning",
    node_waiting: "Waiting",
    node_done: "Done",

    // Log Messages
    msg_init: "Checking store records for inactive customers...",
    msg_found: "Found customer needing win-back outreach.",
    msg_planning: "Generated customized offer discount.",
    msg_waiting: "Offers ready for approval.",
    msg_approved: "Offer approved! Sent WhatsApp message to {name}.",
    msg_rejected: "Offer skipped."
  },
  HI: {
    title: "ग्राहकों को वापस लाएं",
    subtitle: "अपनी साप्ताहिक POS फ़ाइल अपलोड करें — AI खुद ही पुराने ग्राहकों को खोज लेगा।",
    salesKpi: "इस हफ़्ते की बिक्री",
    salesDesc: "साप्ताहिक बिक्री से कुल आय",
    profitKpi: "इस हफ़्ते का मुनाफा",
    lossKpi: "इस हफ़्ते का नुकसान",
    profitDesc: "इस हफ़्ते की शुद्ध बचत",
    lossDesc: "इस हफ़्ते का कुल नुकसान",
    regularKpi: "नियमित ग्राहक",
    regularDesc: "इस हफ़्ते दुकान पर आए",
    riskKpi: "आना बंद कर चुके ग्राहक",
    riskDesc: "पुराने ग्राहक जिन्हें ऑफ़र चाहिए",

    // Graph Titles
    graph1: "दैनिक बिक्री (इस हफ़्ते)",
    graph2: "दैनिक ग्राहक आगमन",
    graph3: "दैनिक मुनाफ़ा और नुकसान",
    graph4: "ग्राहक वफादारी और उपस्थिति",

    // Legends
    legendSales: "बिक्री",
    legendActive: "मुलाक़ातें",
    legendProfit: "मुनाफ़ा",
    legendLoss: "नुकसान",
    legendRegular: "नियमित",
    legendRisk: "लापता ग्राहक",
    legendCurrent: "यह दिन",
    netProfitText: "कुल मुनाफ़ा:",

    // Upload Zone
    uploadTitle: "अपनी साप्ताहिक बिक्री फ़ाइल अपलोड करें",
    uploadSubtitle: "अपनी POS फ़ाइल यहाँ खींचें और छोड़ें, या क्लिक करके चुनें",
    uploadBtn: "फ़ाइल चुनें",
    uploadSuccess: "फ़ाइल मिली! AI गैर-मौजूद पुराने ग्राहकों को खोज रहा है...",
    uploadError: "अपलोड विफल। फ़ाइल जाँचें और दोबारा कोशिश करें।",
    uploadHint: "कॉलम: transaction_id, transaction_date, sales_amount, item_cost, phone_number, customer_name",
    weeklyCapitalPlaceholder: "हफ़्ते की पूँजी",
    weeklyCapitalTitle: "हफ़्ते का कुल माल/खर्च दर्ज करें (वैकल्पिक)",

    logsTitle: "लाइव AI गतिविधि",
    outreachTitle: "जिन ग्राहकों तक पहुंचना है",
    outreachSubtitle: "ये ग्राहक काफी दिनों से नहीं आए। इन्हें वापस बुलाने के लिए ऑफ़र भेजें।",
    approveAllBtn: "सभी को WhatsApp ऑफ़र भेजें",
    approvingBtn: "ऑफ़र भेजे जा रहे हैं...",
    outreachSuccess: "ऑफ़र सफलतापूर्वक भेज दिए गए!",
    outreachSuccessDesc: "सभी ग्राहकों को WhatsApp संदेश भेजा गया।",
    skipCustomer: "छोड़ें",
    historyTitle: "संपर्क किए गए ग्राहकों का इतिहास",
    historyDesc: "उन सभी ग्राहकों की सूची जिन्हें आपने ऑफ़र भेजे हैं",
    tableCol1: "ग्राहक ID",
    tableCol2: "ग्राहक का नाम",
    tableCol3: "भेजा गया ऑफ़र",
    tableCol4: "आपका निर्णय",
    tableCol5: "समय",

    emptyLogs: "ऊपर अपनी बिक्री फ़ाइल अपलोड करें...",
    emptyOutreach: "अभी किसी ग्राहक को संपर्क करने की आवश्यकता नहीं है।",
    emptyHistory: "अभी तक कोई इतिहास उपलब्ध नहीं है।",

    atRiskBadge: "पुराना ग्राहक",
    justNow: "अभी-अभी",
    discountLabel: "की छूट",
    offLabel: "की छूट",
    statusApproved: "स्वीकृत",
    statusRejected: "अस्वीकृत",
    statusPending: "लंबित",
    offerSent: "ऑफ़र भेजा गया",
    actionCancelled: "छोड़ दिया",
    daysAgo1: "",
    daysAgo2: "दिनों से नहीं आए",
    spend1: "कुल खरीदारी",
    spend2: "प्रस्तावित ऑफ़र",

    node_searching: "खोज जारी",
    node_found: "ग्राहक मिला",
    node_planning: "AI योजना",
    node_waiting: "प्रतीक्षा",
    node_done: "पूरा हुआ",

    msg_init: "रिकॉर्ड्स में पुराने ग्राहकों की तलाश जारी...",
    msg_found: "ग्राहक मिला जिसे वापस बुलाने की जरूरत है।",
    msg_planning: "विशेष छूट तैयार की जा रही है।",
    msg_waiting: "ऑफ़र मंज़ूरी के लिए तैयार हैं।",
    msg_approved: "{name} को WhatsApp संदेश भेजा गया।",
    msg_rejected: "ऑफ़र छोड़ा गया।"
  }
};

export default function MerchantDashboard() {
  const router = useRouter();

  const [lang, setLang] = useState<'EN' | 'HI'>('EN');
  const t = TRANSLATIONS[lang];

  // Core State
  const [telemetryLogs, setTelemetryLogs] = useState<TelemetryLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLedgerItem[]>([]);

  // Weekly data state — ONLY populated after file upload
  const [hasData, setHasData] = useState(false);
  const [weeklyGraphData, setWeeklyGraphData] = useState<WeeklyGraphData | null>(null);
  const [weeksBreakdown, setWeeksBreakdown] = useState<WeekBreakdown[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [kpiData, setKpiData] = useState<KpiData | null>(null);
  const [weeklyCapital, setWeeklyCapital] = useState<string>('');

  // Bulk Outreach Queue
  const [bulkQueue, setBulkQueue] = useState<ChurnedCustomer[]>([]);
  const [skippedIds, setSkippedIds] = useState<Set<number>>(new Set());
  const [isApprovingAll, setIsApprovingAll] = useState(false);
  const [bulkApproved, setBulkApproved] = useState(false);
  const [approvedCount, setApprovedCount] = useState(0);

  // Fetch campaign history for the history table only
  const fetchDashboardData = useCallback(async () => {
    try {
      const ledgerRes = await fetch("http://localhost:8000/api/merchant/1/campaigns");
      if (ledgerRes.ok) {
        const ledgerData = await ledgerRes.json();
        const formattedLogs: AuditLedgerItem[] = (ledgerData.campaigns || [])
          .filter((camp: any) => camp.status !== 'PENDING_APPROVAL')
          .map((camp: any, idx: number) => ({
            id: `CUST-${camp.customer_id || idx}`,
            customer: camp.customer_name || `Customer #${camp.customer_id}`,
            amount: parseFloat(camp.discount_percentage) || 0,
            status: camp.status,
            time: camp.created_at
              ? new Date(camp.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'Just now'
          }));
        setAuditLogs(formattedLogs);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 6000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  // Agent SSE Stream
  const stopStreamRef = useRef<(() => void) | null>(null);
  const getClientTime = () =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const startAgentStream = (customerId?: number) => {
    if (stopStreamRef.current) stopStreamRef.current();

    stopStreamRef.current = listenToAgent(
      1,
      (node: string) => {
        let nodeKey = 'node_searching';
        let msgKey = 'msg_init';
        if (node === 'init') { nodeKey = 'node_searching'; msgKey = 'msg_init'; }
        else if (node === 'monitor') { nodeKey = 'node_found'; msgKey = 'msg_found'; }
        else if (node === 'strategist') { nodeKey = 'node_planning'; msgKey = 'msg_planning'; }

        setTelemetryLogs((prev) => [
          {
            id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            timestamp: getClientTime(),
            nodeKey,
            messageKey: msgKey,
            status: 'completed'
          },
          ...prev
        ]);
      },
      () => {
        setTelemetryLogs((prev) => [
          {
            id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            timestamp: getClientTime(),
            nodeKey: 'node_waiting',
            messageKey: 'msg_waiting',
            status: 'interrupted'
          },
          ...prev
        ]);
      },
      (err) => { console.warn('Stream notice:', err); },
      customerId
    );
  };

  useEffect(() => {
    return () => { if (stopStreamRef.current) stopStreamRef.current(); };
  }, []);

  // CSV Upload Complete Handler
  const handleUploadComplete = (result: UploadResult) => {
    setHasData(true);

    if (result.kpis) {
      setKpiData(result.kpis);
    }

    if (result.weekly_graph_data && result.weekly_graph_data.weeks?.length > 0) {
      setWeeklyGraphData(result.weekly_graph_data);
    }

    if (result.weeks_breakdown && result.weeks_breakdown.length > 0) {
      setWeeksBreakdown(result.weeks_breakdown);
      setSelectedPeriod('all');
    } else {
      setWeeksBreakdown([]);
      setSelectedPeriod('all');
    }

    if (result.churned_customers && result.churned_customers.length > 0) {
      setBulkQueue(result.churned_customers);
      setBulkApproved(false);
      setSkippedIds(new Set());
      startAgentStream(result.churned_customers[0].id);
    } else {
      setBulkQueue([]);
    }
  };

  // Bulk Approval Handler
  const handleApproveAll = async () => {
    const toApprove = bulkQueue.filter(c => !skippedIds.has(c.id));
    const campaignIds = toApprove
      .map(c => c.campaign_id)
      .filter((id): id is number => id !== undefined);

    if (campaignIds.length === 0) return;

    setIsApprovingAll(true);
    try {
      await bulkApproveOffers(1, campaignIds, 'APPROVED');
      setApprovedCount(toApprove.length);
      setBulkApproved(true);
      setBulkQueue([]);

      toApprove.forEach((c, idx) => {
        setTelemetryLogs(prev => [{
          id: `log-appr-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
          timestamp: getClientTime(),
          nodeKey: 'node_done',
          messageKey: 'msg_approved',
          customerName: c.name,
          status: 'completed'
        }, ...prev]);
      });

      fetchDashboardData();
    } catch (err) {
      console.error("Bulk approve failed:", err);
    } finally {
      setIsApprovingAll(false);
    }
  };

  const handleSkip = async (customerId: number, campaignId?: number) => {
    setSkippedIds(prev => new Set(prev).add(customerId));
    if (campaignId) {
      try {
        await bulkApproveOffers(1, [campaignId], 'REJECTED');
      } catch {}
    }
  };

  // Derived KPI & Graph Values
  const activeWeek = weeksBreakdown.find(w => w.week_id === selectedPeriod);
  const activeGraphData: WeeklyGraphData | null = activeWeek ? activeWeek.graph_data : weeklyGraphData;

  const capitalNum = parseFloat(weeklyCapital.replace(/,/g, '')) || 0;
  const effectiveSales = activeWeek
    ? activeWeek.kpis.total_sales
    : (kpiData?.total_sales ?? 0);
  const effectiveRegular = activeWeek
    ? activeWeek.kpis.regular_customers
    : (kpiData?.regular_customers ?? 0);
  const effectiveAtRisk = kpiData?.at_risk_customers ?? 0;

  // Capital must be provided by merchant to calculate actual net profit
  const hasCapital = capitalNum > 0 || (kpiData?.weekly_capital ?? 0) > 0;
  const activeCapital = capitalNum > 0 ? capitalNum : (kpiData?.weekly_capital ?? 0);
  const effectiveProfit = hasCapital ? (effectiveSales - activeCapital) : null;

  const weekLabels = activeGraphData?.weeks ?? [];
  const salesHeights = activeGraphData ? normalizeHeights(activeGraphData.sales) : [];
  const visitsHeights = activeGraphData ? normalizeHeights(activeGraphData.visits) : [];

  const visibleQueue = bulkQueue.filter(c => !skippedIds.has(c.id));

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col selection:bg-[#00BAF2]/20 selection:text-[#002970]">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(#00BAF2_1.2px,transparent_1.2px)] [background-size:24px_24px] opacity-[0.08]" />

      {/* TOP NAVIGATION */}
      <header className="sticky top-0 z-40 bg-white/45 backdrop-blur-3xl border-b border-white/60 px-6 lg:px-10 py-3 flex justify-between items-center shadow-sm transition-all">
        <div onClick={() => router.push('/')} className="flex items-center space-x-2.5 cursor-pointer select-none">
          <div className="w-8 h-8 bg-[#00BAF2] rounded-2xl flex items-center justify-center shadow-sm">
            <Store className="text-white w-5 h-5" />
          </div>
          <span className="text-xl font-black tracking-tight text-[#002970]">PayPulse</span>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Week's Capital Input */}
          <div className="flex items-center bg-white/90 border border-slate-200/90 rounded-2xl px-3 py-1.5 shadow-xs focus-within:border-[#00BAF2] focus-within:ring-2 focus-within:ring-[#00BAF2]/20 transition-all">
            <span className="text-xs font-black text-[#002970] mr-1.5">₹</span>
            <input
              type="text"
              inputMode="numeric"
              value={weeklyCapital}
              onChange={(e) => setWeeklyCapital(e.target.value.replace(/[^0-9.]/g, ''))}
              placeholder={t.weeklyCapitalPlaceholder}
              title={t.weeklyCapitalTitle}
              className="w-24 sm:w-36 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-hidden bg-transparent"
            />
          </div>

          <button
            onClick={() => setLang(lang === 'EN' ? 'HI' : 'EN')}
            className="p-2 text-[#002970] bg-blue-50 hover:bg-blue-100 rounded-full border border-blue-200 shadow-sm cursor-pointer transition-colors shrink-0"
            title="Switch Language"
          >
            <span className="text-xs font-bold px-1">{lang === 'EN' ? 'EN 🔁 Aअ' : 'Aअ 🔁 EN'}</span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 lg:px-10 py-8 space-y-6 relative z-10">

        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#002970]">{t.title}</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{t.subtitle}</p>
        </div>

        {/* ── POST-UPLOAD ONLY: KPI CARDS ──────────────────────────────────── */}
        {hasData && kpiData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span>
                  {weeksBreakdown.length > 1 && selectedPeriod === 'all'
                    ? (lang === 'EN' ? "Total Sales (All Weeks)" : "कुल बिक्री (सभी हफ़्ते)")
                    : t.salesKpi}
                </span>
                <Wallet className="w-4 h-4 text-[#00BAF2]" />
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                ₹{Math.round(effectiveSales).toLocaleString('en-IN')}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {weeksBreakdown.length > 1 && selectedPeriod === 'all'
                  ? (lang === 'EN' ? `Across all ${weeklyGraphData?.weeks.length || 0} days in ledger` : `लेज़र के सभी ${weeklyGraphData?.weeks.length || 0} दिनों की बिक्री`)
                  : t.salesDesc}
              </p>
            </div>

            {/* ── TILE 2: PROFIT / LOSS ── */}
            <div className={`bg-white p-5 rounded-2xl border shadow-xs ${
              !hasCapital || effectiveProfit === null
                ? 'border-slate-200'
                : effectiveProfit >= 0
                ? 'border-emerald-200'
                : 'border-rose-200'
            }`}>
              <div className={`flex justify-between items-center text-xs font-bold uppercase tracking-wider ${
                !hasCapital || effectiveProfit === null
                  ? 'text-slate-500'
                  : effectiveProfit >= 0
                  ? 'text-emerald-700'
                  : 'text-rose-600'
              }`}>
                <span>
                  {!hasCapital || effectiveProfit === null
                    ? (weeksBreakdown.length > 1 && selectedPeriod === 'all'
                        ? (lang === 'EN' ? "Total Profit" : "कुल मुनाफ़ा")
                        : t.profitKpi)
                    : effectiveProfit >= 0
                    ? (weeksBreakdown.length > 1 && selectedPeriod === 'all'
                        ? (lang === 'EN' ? "Total Profit" : "कुल मुनाफ़ा")
                        : t.profitKpi)
                    : (weeksBreakdown.length > 1 && selectedPeriod === 'all'
                        ? (lang === 'EN' ? "Total Loss" : "कुल घाटा")
                        : t.lossKpi)}
                </span>
                {effectiveProfit !== null && effectiveProfit < 0 ? (
                  <TrendingDown className="w-4 h-4 text-rose-600" />
                ) : (
                  <TrendingUp className={`w-4 h-4 ${hasCapital ? 'text-emerald-600' : 'text-slate-400'}`} />
                )}
              </div>
              {hasCapital && effectiveProfit !== null ? (
                <>
                  <div className={`mt-2 text-2xl sm:text-3xl font-black tracking-tight ${effectiveProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {effectiveProfit >= 0
                      ? `₹${Math.round(effectiveProfit).toLocaleString('en-IN')}`
                      : `-₹${Math.round(Math.abs(effectiveProfit)).toLocaleString('en-IN')}`}
                  </div>
                  <p className={`text-[11px] mt-1 ${effectiveProfit >= 0 ? 'text-slate-500' : 'text-rose-500'}`}>
                    {effectiveProfit >= 0 ? t.profitDesc : t.lossDesc}
                  </p>
                </>
              ) : (
                <div className="mt-2.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    {lang === 'EN' ? '⚠️ Enter Capital above' : '⚠️ ऊपर पूँजी दर्ज करें'}
                  </span>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {lang === 'EN' ? 'Required to show profit/loss' : 'मुनाफ़ा/नुकसान देखने के लिए पूँजी दें'}
                  </p>
                </div>
              )}
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span>
                  {weeksBreakdown.length > 1 && selectedPeriod === 'all'
                    ? (lang === 'EN' ? "Total Customers" : "कुल ग्राहक")
                    : t.regularKpi}
                </span>
                <Users className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {effectiveRegular}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {weeksBreakdown.length > 1 && selectedPeriod === 'all'
                  ? (lang === 'EN' ? "Active in uploaded ledger" : "अपलोड किए गए लेज़र में आए")
                  : t.regularDesc}
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-xs">
              <div className="flex justify-between items-center text-xs font-bold text-rose-600 uppercase tracking-wider">
                <span>{t.riskKpi}</span>
                <UserX className="w-4 h-4 text-rose-500" />
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-black text-rose-700 tracking-tight">
                {effectiveAtRisk}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">{t.riskDesc}</p>
            </div>
          </div>
        )}

        {/* ── CSV UPLOAD ZONE (Only one, clean component) ───────────────────── */}
        <CsvUploadZone
          merchantId={1}
          lang={lang}
          t={t}
          weeklyCapital={weeklyCapital}
          onUploadComplete={handleUploadComplete}
        />

        {/* ── HISTORY / WEEK FILTER SELECTOR (When ledger covers multiple weeks) ── */}
        {hasData && weeksBreakdown.length > 1 && (
          <div className="flex items-center justify-between flex-wrap gap-3 bg-white px-5 py-3.5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-[#00BAF2]" />
              <span className="text-xs font-bold text-[#002970] uppercase tracking-wider">
                {lang === 'EN' ? 'Period View / History Tracking:' : 'अवधि / इतिहास ट्रैकिंग:'}
              </span>
            </div>
            <div className="flex items-center flex-wrap gap-2">
              <button
                onClick={() => setSelectedPeriod('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedPeriod === 'all'
                    ? 'bg-[#002970] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {lang === 'EN' ? `All Days (${weeklyGraphData?.weeks.length || 0}D)` : `सभी दिन (${weeklyGraphData?.weeks.length || 0})`}
              </button>
              {weeksBreakdown.map((w, idx) => (
                <button
                  key={w.week_id}
                  onClick={() => setSelectedPeriod(w.week_id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedPeriod === w.week_id
                      ? 'bg-[#002970] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {w.short_label}{idx === weeksBreakdown.length - 1 ? (lang === 'EN' ? ' (Latest)' : ' (नवीनतम)') : ''}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── POST-UPLOAD ONLY: REAL DYNAMIC CHARTS WITH HOVER EFFECTS ────────── */}
        {hasData && activeGraphData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Graph 1: Daily Sales */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col">
              <h3 className="text-sm font-bold text-[#002970] mb-6">
                {activeWeek
                  ? `${t.graph1} — ${activeWeek.label}`
                  : weeksBreakdown.length > 1
                  ? (lang === 'EN' ? 'Daily Sales (All Uploaded Days)' : 'दैनिक बिक्री (सभी अपलोड किए गए दिन)')
                  : t.graph1}
              </h3>
              <div className="flex items-end justify-between h-44 px-2 border-b border-slate-100 pb-2 gap-1 overflow-x-auto">
                {salesHeights.map((h, i) => {
                  const isLast = i === salesHeights.length - 1;
                  const label = weekLabels[i] || `Day ${i + 1}`;
                  const actualVal = activeGraphData.sales[i] || 0;
                  return (
                    <div key={`sales-${i}-${label}`} className="group relative flex flex-col items-center flex-1 min-w-[28px] justify-end space-y-2 cursor-pointer">
                      <div className="flex items-end justify-center h-36 w-full relative">
                        {/* Hover Tooltip */}
                        <div className="absolute -top-9 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-30 bg-slate-900 text-white text-[10px] font-bold py-1 px-2 rounded-md shadow-lg whitespace-nowrap">
                          {label}: ₹{Math.round(actualVal).toLocaleString('en-IN')}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                        </div>
                        <div
                          className={`w-full max-w-[22px] rounded-t-sm transition-all duration-200 group-hover:brightness-110 group-hover:shadow-md ${isLast ? 'bg-[#002970]' : 'bg-[#00BAF2]'}`}
                          style={{ height: `${h}px` }}
                        />
                      </div>
                      <span className={`text-[8px] sm:text-[9px] font-bold truncate ${isLast ? 'text-[#002970] font-black' : 'text-slate-400'}`}>
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-center flex-wrap gap-x-6 gap-y-2 mt-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <span className="flex items-center"><span className="w-2.5 h-2.5 bg-[#00BAF2] rounded-xs mr-1.5"></span> {t.legendSales}</span>
                <span className="flex items-center"><span className="w-2.5 h-2.5 bg-[#002970] rounded-xs mr-1.5"></span> {t.legendCurrent}</span>
              </div>
            </div>

            {/* Graph 2: Customer Visits */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col">
              <h3 className="text-sm font-bold text-[#002970] mb-6">
                {activeWeek
                  ? `${t.graph2} — ${activeWeek.label}`
                  : weeksBreakdown.length > 1
                  ? (lang === 'EN' ? 'Daily Customer Visits (All Uploaded Days)' : 'दैनिक ग्राहक आगमन (सभी अपलोड किए गए दिन)')
                  : t.graph2}
              </h3>
              <div className="flex items-end justify-between h-44 px-2 border-b border-slate-100 pb-2 gap-1 overflow-x-auto">
                {visitsHeights.map((h, i) => {
                  const isLast = i === visitsHeights.length - 1;
                  const label = weekLabels[i] || `Day ${i + 1}`;
                  const actualVisits = activeGraphData.visits[i] || 0;
                  return (
                    <div key={`visits-${i}-${label}`} className="group relative flex flex-col items-center flex-1 min-w-[28px] justify-end space-y-2 cursor-pointer">
                      <div className="flex items-end justify-center h-36 w-full relative">
                        {/* Hover Tooltip */}
                        <div className="absolute -top-9 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-30 bg-slate-900 text-white text-[10px] font-bold py-1 px-2 rounded-md shadow-lg whitespace-nowrap">
                          {label}: {actualVisits} {lang === 'EN' ? 'visits' : 'आगमन'}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                        </div>
                        <div
                          className={`w-full max-w-[22px] rounded-t-sm transition-all duration-200 group-hover:brightness-110 group-hover:shadow-md ${isLast ? 'bg-[#002970]' : 'bg-indigo-400'}`}
                          style={{ height: `${h}px` }}
                        />
                      </div>
                      <span className={`text-[8px] sm:text-[9px] font-bold truncate ${isLast ? 'text-[#002970] font-black' : 'text-slate-400'}`}>
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-center flex-wrap gap-x-6 gap-y-2 mt-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <span className="flex items-center"><span className="w-2.5 h-2.5 bg-indigo-400 rounded-xs mr-1.5"></span> {t.legendActive}</span>
                <span className="flex items-center"><span className="w-2.5 h-2.5 bg-[#002970] rounded-xs mr-1.5"></span> {t.legendCurrent}</span>
              </div>
            </div>
          </div>
        )}

        {/* ── POST-UPLOAD ONLY: OUTREACH QUEUE & TERMINAL FEED ──────────────── */}
        {hasData && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Terminal Log Feed */}
            <div className="lg:col-span-5 bg-[#001D52] text-slate-200 p-5 rounded-2xl shadow-md border border-[#00BAF2]/30 flex flex-col h-[520px]">
              <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
                <div className="flex items-center space-x-2">
                  <Terminal className="w-4 h-4 text-[#00BAF2]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-white">{t.logsTitle}</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 font-mono text-[12px] pr-2 py-4">
                {telemetryLogs.map((log) => {
                  const nodeText = t[log.nodeKey as keyof typeof t] as string || log.nodeKey;
                  const msgText = (t[log.messageKey as keyof typeof t] as string)
                    ?.replace('{name}', log.customerName || '') || log.messageKey;
                  return (
                    <div key={log.id} className="p-3 rounded-xl border bg-white/5 border-white/5 text-slate-300">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                        <span className="text-[#00BAF2] font-bold uppercase">{nodeText}</span>
                        <span>{log.timestamp}</span>
                      </div>
                      <p>{msgText}</p>
                    </div>
                  );
                })}
                {telemetryLogs.length === 0 && (
                  <div className="text-center text-slate-500 py-10 text-sm">{t.emptyLogs}</div>
                )}
              </div>
            </div>

            {/* Bulk Outreach Approval Queue */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                <h2 className="text-lg font-bold text-[#002970]">{t.outreachTitle}</h2>
                {visibleQueue.length > 0 && (
                  <span className="bg-rose-100 text-rose-700 text-xs font-black px-2 py-0.5 rounded-full">
                    {visibleQueue.length}
                  </span>
                )}
              </div>

              {/* Success State */}
              {bulkApproved && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center flex flex-col items-center space-y-3">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  </div>
                  <h3 className="text-base font-black text-emerald-800">{t.outreachSuccess}</h3>
                  <p className="text-sm text-emerald-600">{t.outreachSuccessDesc}</p>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                    {approvedCount} {lang === 'EN' ? 'customers' : 'ग्राहक'}
                  </span>
                </div>
              )}

              {/* Queue List */}
              {!bulkApproved && visibleQueue.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500">{t.outreachSubtitle}</p>

                  <div className="space-y-2.5">
                    {visibleQueue.map((customer, idx) => (
                      <div
                        key={`queue-item-${customer.id}-${customer.campaign_id ?? idx}`}
                        className="bg-white border border-amber-200 rounded-2xl p-4 shadow-xs flex items-center justify-between"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-xs font-mono font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">{t.atRiskBadge}</span>
                            <span className="text-xs text-slate-400">{customer.days_away} {t.daysAgo2}</span>
                          </div>
                          <h3 className="text-sm font-bold text-slate-900 truncate">{customer.name}</h3>
                          <div className="flex items-center space-x-3 mt-1">
                            <span className="text-xs text-slate-500">
                              {t.spend1}: <span className="font-bold text-slate-800">₹{Math.round(customer.total_spend).toLocaleString('en-IN')}</span>
                            </span>
                            <span className="text-xs text-emerald-600 font-black">{customer.discount ?? 15}% {t.discountLabel}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleSkip(customer.id, customer.campaign_id)}
                          className="ml-3 p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors shrink-0 cursor-pointer"
                          title={t.skipCustomer}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Approve All Button */}
                  <button
                    onClick={handleApproveAll}
                    disabled={isApprovingAll}
                    className="w-full py-4 bg-[#002970] hover:bg-[#001D52] disabled:opacity-60 text-white rounded-2xl text-sm font-black shadow-lg cursor-pointer transition-colors flex items-center justify-center space-x-2"
                  >
                    {isApprovingAll ? (
                      <><span className="animate-spin mr-2">⏳</span> {t.approvingBtn}</>
                    ) : (
                      <><Smartphone className="w-4 h-4 text-[#00BAF2] mr-2" /> {t.approveAllBtn} {visibleQueue.length > 1 ? `(${visibleQueue.length})` : ''}</>
                    )}
                  </button>
                </div>
              )}

              {/* Empty Queue State */}
              {!bulkApproved && visibleQueue.length === 0 && (
                <div className="text-center bg-white border border-slate-200 rounded-2xl py-12 text-slate-500 text-sm">
                  {t.emptyOutreach}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── HISTORY TABLE ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-[#002970]">{t.historyTitle}</h2>
              <p className="text-xs text-slate-400 mt-0.5">{t.historyDesc}</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200/70">
                  <th className="py-3 px-5">{t.tableCol1}</th>
                  <th className="py-3 px-5">{t.tableCol2}</th>
                  <th className="py-3 px-5">{t.tableCol3}</th>
                  <th className="py-3 px-5">{t.tableCol4}</th>
                  <th className="py-3 px-5 text-right">{t.tableCol5}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-slate-400">{t.emptyHistory}</td></tr>
                ) : (
                  auditLogs.map((tx, index) => {
                    const statusText =
                      tx.status === 'APPROVED' ? t.statusApproved :
                      tx.status === 'REJECTED' ? t.statusRejected :
                      t.statusPending;
                    return (
                      <tr key={`audit-tx-${tx.id}-${index}`} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-5 font-mono font-medium text-slate-700">{tx.id}</td>
                        <td className="py-3.5 px-5 font-bold text-slate-900">{tx.customer}</td>
                        <td className="py-3.5 px-5 font-extrabold text-slate-800">{tx.amount}% {t.offLabel}</td>
                        <td className="py-3.5 px-5">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                            tx.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' :
                            tx.status === 'REJECTED' ? 'bg-rose-50 text-rose-700' :
                            'bg-amber-50 text-amber-700'
                          }`}>
                            {statusText}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-slate-400 font-medium text-right">
                          {tx.time === 'Just now' ? t.justNow : tx.time}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}