"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Store, Users, Wallet, CheckCircle2, TrendingUp, TrendingDown,
  X, Smartphone, Terminal, UserX, Calendar, ChevronDown, Database, BarChart3, Sparkles
} from 'lucide-react';
import {
  listenToAgent, UploadResult, WeeklyGraphData, KpiData,
  ChurnedCustomer, bulkApproveOffers, WeekBreakdown, fetchMerchantStats
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

const TRANSLATIONS = {
  EN: {
    title: "Customer Loyalty & Retention",
    subtitle: "Upload your weekly POS file and the AI will automatically find customers to bring back.",
    salesKpi: "Weekly Sales",
    salesDesc: "Total revenue for selected period",
    profitKpi: "Weekly Profit",
    lossKpi: "Weekly Loss",
    profitDesc: "Net earnings for selected period",
    lossDesc: "Net loss for selected period",
    regularKpi: "Regular Customers",
    regularDesc: "Active customers in this period",
    riskKpi: "Customers At Risk",
    riskDesc: "Absent regulars needing outreach",

    graph1: "Daily Sales",
    graph2: "Daily Customer Visits",
    legendSales: "Daily Sales",
    legendActive: "Customer Visits",
    legendCurrent: "Day Highlight",

    previousWeeks: "Previous Weeks",
    selectWeekPrompt: "Select a week from the dropdown to view past sales, profit, and customer retention.",
    historySectionTitle: "Historical Performance",
    historySectionDesc: "Explore past weekly records and monthly overviews stored in database",
    noWeekSelected: "Click 'Previous Weeks' above to view data for any week.",

    uploadTitle: "Upload Your Weekly Sales File",
    uploadSubtitle: "Drag & drop your POS export CSV here, or click to choose a file",
    uploadBtn: "Choose File",
    uploadSuccess: "File uploaded! AI is scanning transactions & detecting absent regulars...",
    uploadError: "Upload failed. Please check the file and try again.",
    uploadHint: "Required columns: transaction_id, transaction_date, sales_amount, item_cost, phone_number, customer_name",
    weeklyCapitalPlaceholder: "Week's Capital",
    weeklyCapitalTitle: "Enter weekly procurement cost (optional)",
    uploadedBatchTitle: "Uploaded Week Analysis",
    uploadedBatchSubtitle: "Performance metrics and outreach generated for the uploaded file",

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
    daysAgo2: "days",
    spend1: "Lifetime Spend",

    node_searching: "Searching",
    node_found: "Found Customer",
    node_planning: "AI Planning",
    node_waiting: "Waiting",
    node_done: "Done",

    msg_init: "Checking store records for inactive customers...",
    msg_found: "Found customer needing win-back outreach.",
    msg_planning: "Generated customized offer discount.",
    msg_waiting: "Offers ready for approval.",
    msg_approved: "Offer approved! Sent WhatsApp message to {name}.",
    msg_rejected: "Offer skipped."
  },
  HI: { /* Keep identical for fallback */ }
};

export default function MerchantDashboard() {
  const router = useRouter();

  const [lang, setLang] = useState<'EN' | 'HI'>('EN');
  const t = TRANSLATIONS.EN;

  // Working Capital State
  const [weeksCapital, setWeeksCapital] = useState<string>("");

  // Core State
  const [telemetryLogs, setTelemetryLogs] = useState<TelemetryLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLedgerItem[]>([]);

  const [hasUploadedThisSession, setHasUploadedThisSession] = useState(false);
  const [uploadedKpis, setUploadedKpis] = useState<KpiData | null>(null);
  const [uploadedGraphData, setUploadedGraphData] = useState<WeeklyGraphData | null>(null);

  // Historical data state
  const [weeksBreakdown, setWeeksBreakdown] = useState<WeekBreakdown[]>([]);
  const [selectedHistoryWeekId, setSelectedHistoryWeekId] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Bulk Outreach Queue
  const [bulkQueue, setBulkQueue] = useState<ChurnedCustomer[]>([]);
  const [skippedIds, setSkippedIds] = useState<Set<number>>(new Set());
  const [isApprovingAll, setIsApprovingAll] = useState(false);
  const [bulkApproved, setBulkApproved] = useState(false);
  const [approvedCount, setApprovedCount] = useState(0);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

      const stats = await fetchMerchantStats(1);
      if (stats && stats.weeks_breakdown?.length > 0) {
        setWeeksBreakdown(stats.weeks_breakdown);
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

  const handleUploadComplete = (result: UploadResult) => {
    setHasUploadedThisSession(true);

    if (result.kpis) {
      setUploadedKpis(result.kpis);
    }

    if (result.weekly_graph_data && result.weekly_graph_data.weeks?.length > 0) {
      setUploadedGraphData(result.weekly_graph_data);
    }

    if (result.weeks_breakdown && result.weeks_breakdown.length > 0) {
      setWeeksBreakdown(result.weeks_breakdown);
    }

    if (result.churned_customers && result.churned_customers.length > 0) {
      setBulkQueue(result.churned_customers);
      setBulkApproved(false);
      setSkippedIds(new Set());
      const churnId = result.churn_candidate?.id || result.churned_customers[0].id;
      startAgentStream(churnId);
    } else {
      setBulkQueue([]);
    }
  };

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

  // ── UPLOADED WEEK METRICS ──
  const uploadedSales = uploadedKpis?.total_sales ?? 0;
  const uploadedProfit = uploadedKpis?.profit ?? 0;
  const uploadedCapital = uploadedKpis?.weekly_capital ?? 0;
  const uploadedRegular = uploadedKpis?.regular_customers ?? 0;
  const uploadedNew = uploadedKpis?.new_customers ?? 0;
  const uploadedRisk = uploadedKpis?.at_risk_customers ?? 0;
  const uploadedLabels = uploadedGraphData?.weeks ?? [];
  const visibleQueue = bulkQueue.filter(c => !skippedIds.has(c.id));

  // ── MONTHLY & HISTORICAL VIEW METRICS ──
  const isMonthlyView = selectedHistoryWeekId === "monthly";
  const selectedHistoryWeek = weeksBreakdown.find(w => w.week_id === selectedHistoryWeekId) || null;
  const historyGraphData = selectedHistoryWeek?.graph_data || null;
  const historyLabels = historyGraphData?.weeks ?? [];
  
  // Weekly History Specific Variables (Restored)
  const historySales = selectedHistoryWeek?.kpis.total_sales ?? 0;
  const historyProfit = selectedHistoryWeek?.kpis.profit ?? 0;
  const historyRegular = selectedHistoryWeek?.kpis.regular_customers ?? 0;
  const historyNew = selectedHistoryWeek?.kpis.new_customers ?? 0;
  const historyRisk = selectedHistoryWeek?.kpis.at_risk_customers ?? 0;

  // Monthly Aggregation Data
  const mSales = weeksBreakdown.reduce((sum, w) => sum + w.kpis.total_sales, 0);
  const mProfit = weeksBreakdown.reduce((sum, w) => sum + w.kpis.profit, 0);
  const mCapital = weeksBreakdown.reduce((sum, w) => sum + w.kpis.weekly_capital, 0);
  const mNew = weeksBreakdown.reduce((sum, w) => sum + (w.kpis.new_customers || 0), 0);
  const monthlyLabels = weeksBreakdown.map(w => w.short_label);
  const monthlySalesData = weeksBreakdown.map(w => w.kpis.total_sales);
  const monthlyVisitsData = weeksBreakdown.map(w => w.graph_data?.visits?.reduce((a,b)=>a+b, 0) || w.kpis.total_customers);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col selection:bg-[#00BAF2]/20 selection:text-[#002970]">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(#00BAF2_1.2px,transparent_1.2px)] [background-size:24px_24px] opacity-[0.08]" />

      {/* TOP NAVIGATION */}
      <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-3xl border-b border-white/60 px-6 lg:px-10 py-3 flex justify-between items-center shadow-sm transition-all">
        <div onClick={() => router.push('/')} className="flex items-center space-x-2.5 cursor-pointer select-none">
          <div className="w-8 h-8 bg-[#00BAF2] rounded-2xl flex items-center justify-center shadow-sm">
            <Store className="text-white w-5 h-5" />
          </div>
          <span className="text-xl font-black tracking-tight text-[#002970]">PayPulse</span>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Week's Capital Input */}
          <div className="relative flex items-center">
            <span className="absolute left-3 text-xs font-bold text-slate-400">₹</span>
            <input
              type="number"
              value={weeksCapital}
              onChange={(e) => setWeeksCapital(e.target.value)}
              placeholder={t.weeklyCapitalPlaceholder}
              title={t.weeklyCapitalTitle}
              className="w-32 sm:w-36 pl-7 pr-3 py-1.5 text-xs font-bold bg-white/90 border border-slate-200 rounded-xl text-[#002970] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00BAF2] shadow-xs"
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

        {/* 1. CSV UPLOAD ZONE */}
        <CsvUploadZone
          merchantId={1}
          lang={lang}
          t={t}
          weeksCapital={weeksCapital}
          onUploadComplete={handleUploadComplete}
        />

        {/* 2. POST-UPLOAD SECTION */}
        {hasUploadedThisSession && uploadedKpis && (
          <div className="space-y-6 pt-2">
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h2 className="text-lg font-black text-[#002970]">{t.uploadedBatchTitle}</h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{t.uploadedBatchSubtitle}</p>
            </div>

            {/* 4 KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <span>{t.salesKpi}</span>
                  <Wallet className="w-4 h-4 text-[#00BAF2]" />
                </div>
                <div className="mt-2 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  ₹{Math.round(uploadedSales).toLocaleString('en-IN')}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">{t.salesDesc}</p>
              </div>

              <div className={`bg-white p-5 rounded-2xl border shadow-xs ${
                uploadedProfit >= 0 ? 'border-emerald-200' : 'border-rose-200'
              }`}>
                <div className={`flex justify-between items-center text-xs font-bold uppercase tracking-wider ${
                  uploadedProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'
                }`}>
                  <span>{uploadedProfit >= 0 ? t.profitKpi : t.lossKpi}</span>
                  {uploadedProfit < 0 ? (
                    <TrendingDown className="w-4 h-4 text-rose-600" />
                  ) : (
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  )}
                </div>
                <div className={`mt-2 text-2xl sm:text-3xl font-black tracking-tight ${uploadedProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {uploadedProfit >= 0
                    ? `₹${Math.round(uploadedProfit).toLocaleString('en-IN')}`
                    : `-₹${Math.round(Math.abs(uploadedProfit)).toLocaleString('en-IN')}`}
                </div>
                <p className={`text-[11px] mt-1 ${uploadedProfit >= 0 ? 'text-slate-500' : 'text-rose-500'}`}>
                  Sales (₹{Math.round(uploadedSales).toLocaleString('en-IN')}) - Capital
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <span>{t.regularKpi}</span>
                  <Users className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="mt-2 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {uploadedRegular + uploadedNew}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {uploadedRegular} returning regulars • {uploadedNew} new
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-xs">
                <div className="flex justify-between items-center text-xs font-bold text-rose-600 uppercase tracking-wider">
                  <span>{t.riskKpi}</span>
                  <UserX className="w-4 h-4 text-rose-500" />
                </div>
                <div className="mt-2 text-2xl sm:text-3xl font-black text-rose-700 tracking-tight">
                  {uploadedRisk}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">{t.riskDesc}</p>
              </div>
            </div>

            {/* 2 Primary Daily Charts */}
            {uploadedGraphData && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-[#002970]">{t.graph1}</h3>
                    <span className="text-[11px] font-bold text-slate-500">
                      ₹{Math.round(uploadedSales).toLocaleString('en-IN')} {lang === 'EN' ? 'total' : 'कुल'}
                    </span>
                  </div>
                  <div className="flex items-end justify-between h-44 px-2 sm:px-4 border-b border-slate-100 pb-2 gap-1.5 sm:gap-3">
                    {uploadedGraphData.sales.map((val, i) => {
                      const isLast = i === uploadedGraphData.sales.length - 1;
                      const label = uploadedLabels[i] || `Day ${i + 1}`;
                      const maxS = Math.max(...uploadedGraphData.sales, 1);
                      const sPct = val === 0 ? 0 : Math.max(10, Math.round((val / maxS) * 100));
                      return (
                        <div key={`up-sales-${i}-${label}`} className="group relative flex flex-col items-center flex-1 max-w-[42px] justify-end space-y-2 cursor-pointer">
                          <div className="flex items-end justify-center h-36 w-full relative">
                            <div className="absolute -top-9 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-30 bg-slate-900 text-white text-[11px] font-bold py-1 px-2.5 rounded-md shadow-lg whitespace-nowrap">
                              {label}: ₹{Math.round(val).toLocaleString('en-IN')}
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                            </div>
                            <div
                              className={`w-full max-w-[28px] rounded-t-sm transition-all duration-200 group-hover:brightness-110 group-hover:shadow-md ${
                                val === 0
                                  ? 'bg-slate-200'
                                  : isLast
                                  ? 'bg-[#002970]'
                                  : 'bg-[#00BAF2]'
                              }`}
                              style={{ height: `${sPct}%` }}
                            />
                          </div>
                          <span className={`text-[9px] sm:text-[10px] font-bold tracking-tight truncate ${isLast ? 'text-[#002970] font-black' : 'text-slate-500'}`}>
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

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-[#002970]">{t.graph2}</h3>
                    <span className="text-[11px] font-bold text-indigo-600">
                      {uploadedGraphData.visits.reduce((a, b) => a + b, 0)} {lang === 'EN' ? 'receipts' : 'आगमन'}
                    </span>
                  </div>
                  <div className="flex items-end justify-between h-44 px-2 sm:px-4 border-b border-slate-100 pb-2 gap-1.5 sm:gap-3">
                    {uploadedGraphData.visits.map((val, i) => {
                      const isLast = i === uploadedGraphData.visits.length - 1;
                      const label = uploadedLabels[i] || `Day ${i + 1}`;
                      const maxV = Math.max(...uploadedGraphData.visits, 1);
                      const vPct = val === 0 ? 0 : Math.max(10, Math.round((val / maxV) * 100));
                      return (
                        <div key={`up-visits-${i}-${label}`} className="group relative flex flex-col items-center flex-1 max-w-[42px] justify-end space-y-2 cursor-pointer">
                          <div className="flex items-end justify-center h-36 w-full relative">
                            <div className="absolute -top-9 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-30 bg-slate-900 text-white text-[11px] font-bold py-1 px-2.5 rounded-md shadow-lg whitespace-nowrap">
                              {label}: {val} {lang === 'EN' ? 'visits' : 'आगमन'}
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                            </div>
                            <div
                              className={`w-full max-w-[28px] rounded-t-sm transition-all duration-200 group-hover:brightness-110 group-hover:shadow-md ${
                                val === 0
                                  ? 'bg-slate-200'
                                  : isLast
                                  ? 'bg-[#002970]'
                                  : 'bg-indigo-500'
                              }`}
                              style={{ height: `${vPct}%` }}
                            />
                          </div>
                          <span className={`text-[9px] sm:text-[10px] font-bold tracking-tight truncate ${isLast ? 'text-[#002970] font-black' : 'text-slate-500'}`}>
                            {label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-center flex-wrap gap-x-6 gap-y-2 mt-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <span className="flex items-center"><span className="w-2.5 h-2.5 bg-indigo-500 rounded-xs mr-1.5"></span> {t.legendActive}</span>
                    <span className="flex items-center"><span className="w-2.5 h-2.5 bg-[#002970] rounded-xs mr-1.5"></span> {t.legendCurrent}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Outreach Queue & Activity Feed */}
            {(visibleQueue.length > 0 || telemetryLogs.length > 0 || bulkApproved) && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
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

                  {!bulkApproved && visibleQueue.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-xs text-slate-500">{t.outreachSubtitle}</p>
                      <div className="space-y-2.5">
                        {visibleQueue.map((customer, idx) => (
                          <div key={`queue-item-${customer.id}-${customer.campaign_id ?? idx}`} className="bg-white border border-amber-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
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
                            <button onClick={() => handleSkip(customer.id, customer.campaign_id)} className="ml-3 p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors shrink-0 cursor-pointer" title={t.skipCustomer}>
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <button onClick={handleApproveAll} disabled={isApprovingAll} className="w-full py-4 bg-[#002970] hover:bg-[#001D52] disabled:opacity-60 text-white rounded-2xl text-sm font-black shadow-lg cursor-pointer transition-colors flex items-center justify-center space-x-2">
                        {isApprovingAll ? <><span className="animate-spin mr-2">⏳</span> {t.approvingBtn}</> : <><Smartphone className="w-4 h-4 text-[#00BAF2] mr-2" /> {t.approveAllBtn} {visibleQueue.length > 1 ? `(${visibleQueue.length})` : ''}</>}
                      </button>
                    </div>
                  )}

                  {!bulkApproved && visibleQueue.length === 0 && (
                    <div className="text-center bg-white border border-slate-200 rounded-2xl py-12 text-slate-500 text-sm">
                      {t.emptyOutreach}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. HISTORICAL PERFORMANCE SECTION */}
        <div className="space-y-6 pt-8 border-t border-slate-200/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-[#00BAF2]" />
                <h2 className="text-lg font-black text-[#002970]">{t.historySectionTitle}</h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{t.historySectionDesc}</p>
            </div>

            <div className="flex items-center space-x-3">
              <button 
                onClick={() => setSelectedHistoryWeekId('monthly')} 
                disabled={weeksBreakdown.length === 0}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer ${
                  isMonthlyView 
                    ? 'bg-purple-600 text-white border border-purple-600' 
                    : 'bg-white border border-slate-300 text-slate-700 hover:border-purple-400 disabled:opacity-50'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Monthly Overview</span>
              </button>

              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="inline-flex items-center justify-between space-x-2.5 px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-2xl text-xs font-bold text-[#002970] shadow-xs cursor-pointer transition-all hover:border-[#00BAF2]"
                >
                  <span>{selectedHistoryWeek ? selectedHistoryWeek.short_label : t.previousWeeks}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      {t.previousWeeks}
                    </div>
                    <div className="max-h-60 overflow-y-auto py-1">
                      {weeksBreakdown.length === 0 ? (
                        <div className="px-4 py-3 text-xs text-slate-400 text-center">
                          {lang === 'EN' ? 'No previous weeks recorded yet' : 'अभी तक कोई पुराना हफ़्ता दर्ज नहीं है'}
                        </div>
                      ) : (
                        weeksBreakdown.map((w) => {
                          const isSelected = selectedHistoryWeekId === w.week_id;
                          return (
                            <button
                              key={w.week_id}
                              type="button"
                              onClick={() => {
                                setSelectedHistoryWeekId(w.week_id);
                                setIsDropdownOpen(false);
                              }}
                              className={`w-full text-left px-4 py-2.5 text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                                isSelected ? 'bg-blue-50/80 text-[#002970] font-black' : 'text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex flex-col">
                                <span className="text-slate-900">{w.label}</span>
                                <span className="text-[10px] font-normal text-slate-400">
                                  ₹{Math.round(w.kpis.total_sales).toLocaleString('en-IN')} • {w.kpis.regular_customers} {lang === 'EN' ? 'regulars' : 'ग्राहक'} {w.kpis.new_customers ? `• ${w.kpis.new_customers} ${lang === 'EN' ? 'new' : 'नए'}` : ''}
                                </span>
                              </div>
                              {isSelected && <CheckCircle2 className="w-4 h-4 text-[#00BAF2] shrink-0 ml-2" />}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── MONTHLY VIEW RENDER ── */}
          {isMonthlyView && weeksBreakdown.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-purple-50/60 border border-purple-100 rounded-2xl px-4 py-2.5">
                <div className="flex items-center space-x-2 text-xs font-bold text-purple-900">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  <span>Monthly Performance Aggregation</span>
                </div>
                <button onClick={() => setSelectedHistoryWeekId(null)} className="text-[11px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer">✕ Close</button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider"><span>Total Monthly Sales</span><Wallet className="w-4 h-4 text-[#00BAF2]" /></div>
                  <div className="mt-2 text-2xl sm:text-3xl font-black text-slate-900">₹{Math.round(mSales).toLocaleString('en-IN')}</div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-xs">
                  <div className="flex justify-between items-center text-xs font-bold text-emerald-700 uppercase tracking-wider"><span>Total Monthly Profit</span><TrendingUp className="w-4 h-4 text-emerald-600" /></div>
                  <div className="mt-2 text-2xl sm:text-3xl font-black text-emerald-700">₹{Math.round(mProfit).toLocaleString('en-IN')}</div>
                  <p className="text-[11px] text-slate-400 mt-1">Total Sales - Total Capital</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider"><span>Total Capital</span><Database className="w-4 h-4 text-indigo-500" /></div>
                  <div className="mt-2 text-2xl sm:text-3xl font-black text-slate-900">₹{Math.round(mCapital).toLocaleString('en-IN')}</div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider"><span>New Shoppers Acquired</span><Sparkles className="w-4 h-4 text-amber-500" /></div>
                  <div className="mt-2 text-2xl sm:text-3xl font-black text-slate-900">{mNew}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                  <h3 className="text-sm font-bold text-[#002970] mb-4">Monthly Sales Trend</h3>
                  <div className="flex items-end justify-between h-44 px-2 sm:px-4 border-b border-slate-100 pb-2 gap-1.5 sm:gap-3">
                    {monthlySalesData.map((val, i) => (
                      <div key={`m-sales-${i}`} className="group relative flex flex-col items-center flex-1 max-w-[42px] justify-end space-y-2 cursor-pointer">
                        <div className="flex items-end justify-center h-36 w-full relative">
                          <div className="absolute -top-7 opacity-0 group-hover:opacity-100 bg-slate-900 text-white text-[10px] py-1 px-2 rounded shadow-lg whitespace-nowrap z-10">
                            ₹{Math.round(val).toLocaleString('en-IN')}
                          </div>
                          <div className="w-full max-w-[28px] bg-[#00BAF2] rounded-t-sm transition-all group-hover:brightness-110" style={{ height: `${val === 0 ? 0 : Math.max(5, (val / Math.max(...monthlySalesData)) * 100)}%` }} />
                        </div>
                        <span className="text-[9px] font-bold text-slate-500 mt-2 text-center">{monthlyLabels[i]}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                  <h3 className="text-sm font-bold text-[#002970] mb-4">Monthly Footfall Trend</h3>
                  <div className="flex items-end justify-between h-44 px-2 sm:px-4 border-b border-slate-100 pb-2 gap-1.5 sm:gap-3">
                    {monthlyVisitsData.map((val, i) => (
                      <div key={`m-visits-${i}`} className="group relative flex flex-col items-center flex-1 max-w-[42px] justify-end space-y-2 cursor-pointer">
                        <div className="flex items-end justify-center h-36 w-full relative">
                          <div className="absolute -top-7 opacity-0 group-hover:opacity-100 bg-slate-900 text-white text-[10px] py-1 px-2 rounded shadow-lg whitespace-nowrap z-10">
                            {val} visits
                          </div>
                          <div className="w-full max-w-[28px] bg-purple-500 rounded-t-sm transition-all group-hover:brightness-110" style={{ height: `${val === 0 ? 0 : Math.max(5, (val / Math.max(...monthlyVisitsData)) * 100)}%` }} />
                        </div>
                        <span className="text-[9px] font-bold text-slate-500 mt-2 text-center">{monthlyLabels[i]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── WEEKLY HISTORICAL VIEW RENDER ── */}
          {selectedHistoryWeek && !isMonthlyView && (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-blue-50/60 border border-blue-100 rounded-2xl px-4 py-2.5">
                <div className="flex items-center space-x-2 text-xs font-bold text-[#002970]">
                  <span className="w-2 h-2 rounded-full bg-[#00BAF2]" />
                  <span>{selectedHistoryWeek.label}</span>
                </div>
                <button
                  onClick={() => setSelectedHistoryWeekId(null)}
                  className="text-[11px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {lang === 'EN' ? '✕ Close View' : '✕ बंद करें'}
                </button>
              </div>

              {/* 4 Historical KPI Tiles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <span>{t.salesKpi}</span>
                    <Wallet className="w-4 h-4 text-[#00BAF2]" />
                  </div>
                  <div className="mt-2 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    ₹{Math.round(historySales).toLocaleString('en-IN')}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">{t.salesDesc}</p>
                </div>

                <div className={`bg-white p-5 rounded-2xl border shadow-xs ${
                  historyProfit >= 0 ? 'border-emerald-200' : 'border-rose-200'
                }`}>
                  <div className={`flex justify-between items-center text-xs font-bold uppercase tracking-wider ${
                    historyProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'
                  }`}>
                    <span>{historyProfit >= 0 ? t.profitKpi : t.lossKpi}</span>
                    {historyProfit < 0 ? (
                      <TrendingDown className="w-4 h-4 text-rose-600" />
                    ) : (
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                    )}
                  </div>
                  <div className={`mt-2 text-2xl sm:text-3xl font-black tracking-tight ${historyProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {historyProfit >= 0
                      ? `₹${Math.round(historyProfit).toLocaleString('en-IN')}`
                      : `-₹${Math.round(Math.abs(historyProfit)).toLocaleString('en-IN')}`}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Sales (₹{historySales.toLocaleString('en-IN')}) - Capital (₹{selectedHistoryWeek.kpis.weekly_capital.toLocaleString('en-IN')})
                  </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <span>{t.regularKpi}</span>
                    <Users className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div className="mt-2 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    {historyRegular + historyNew}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {historyRegular} {lang === 'EN' ? 'returning regulars' : 'नियमित'} {historyNew > 0 ? `• ${historyNew} ${lang === 'EN' ? 'new' : 'नए'}` : ''}
                  </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-xs">
                  <div className="flex justify-between items-center text-xs font-bold text-rose-600 uppercase tracking-wider">
                    <span>{t.riskKpi}</span>
                    <UserX className="w-4 h-4 text-rose-500" />
                  </div>
                  <div className="mt-2 text-2xl sm:text-3xl font-black text-rose-700 tracking-tight">
                    {historyRisk}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">{t.riskDesc}</p>
                </div>
              </div>

              {/* 2 Primary Historical Daily Charts */}
              {historyGraphData && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-[#002970]">
                        {t.graph1} — {selectedHistoryWeek.label}
                      </h3>
                      <span className="text-[11px] font-bold text-slate-500">
                        ₹{Math.round(historySales).toLocaleString('en-IN')} {lang === 'EN' ? 'total' : 'कुल'}
                      </span>
                    </div>
                    <div className="flex items-end justify-between h-44 px-2 sm:px-4 border-b border-slate-100 pb-2 gap-1.5 sm:gap-3">
                      {historyGraphData.sales.map((val, i) => {
                        const isLast = i === historyGraphData.sales.length - 1;
                        const label = historyLabels[i] || `Day ${i + 1}`;
                        const maxS = Math.max(...historyGraphData.sales, 1);
                        const sPct = val === 0 ? 0 : Math.max(10, Math.round((val / maxS) * 100));
                        return (
                          <div key={`hist-sales-${i}-${label}`} className="group relative flex flex-col items-center flex-1 max-w-[42px] justify-end space-y-2 cursor-pointer">
                            <div className="flex items-end justify-center h-36 w-full relative">
                              <div className="absolute -top-9 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-30 bg-slate-900 text-white text-[11px] font-bold py-1 px-2.5 rounded-md shadow-lg whitespace-nowrap">
                                {label}: ₹{Math.round(val).toLocaleString('en-IN')}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                              </div>
                              <div
                                className={`w-full max-w-[28px] rounded-t-sm transition-all duration-200 group-hover:brightness-110 group-hover:shadow-md ${
                                  val === 0 ? 'bg-slate-200' : isLast ? 'bg-[#002970]' : 'bg-[#00BAF2]'
                                }`}
                                style={{ height: `${sPct}%` }}
                              />
                            </div>
                            <span className={`text-[9px] sm:text-[10px] font-bold tracking-tight truncate ${isLast ? 'text-[#002970] font-black' : 'text-slate-500'}`}>
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

                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-[#002970]">
                        {t.graph2} — {selectedHistoryWeek.label}
                      </h3>
                      <span className="text-[11px] font-bold text-indigo-600">
                        {historyGraphData.visits.reduce((a, b) => a + b, 0)} {lang === 'EN' ? 'receipts' : 'आगमन'}
                      </span>
                    </div>
                    <div className="flex items-end justify-between h-44 px-2 sm:px-4 border-b border-slate-100 pb-2 gap-1.5 sm:gap-3">
                      {historyGraphData.visits.map((val, i) => {
                        const isLast = i === historyGraphData.visits.length - 1;
                        const label = historyLabels[i] || `Day ${i + 1}`;
                        const maxV = Math.max(...historyGraphData.visits, 1);
                        const vPct = val === 0 ? 0 : Math.max(10, Math.round((val / maxV) * 100));
                        return (
                          <div key={`hist-visits-${i}-${label}`} className="group relative flex flex-col items-center flex-1 max-w-[42px] justify-end space-y-2 cursor-pointer">
                            <div className="flex items-end justify-center h-36 w-full relative">
                              <div className="absolute -top-9 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-30 bg-slate-900 text-white text-[11px] font-bold py-1 px-2.5 rounded-md shadow-lg whitespace-nowrap">
                                {label}: {val} {lang === 'EN' ? 'visits' : 'आगमन'}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                              </div>
                              <div
                                className={`w-full max-w-[28px] rounded-t-sm transition-all duration-200 group-hover:brightness-110 group-hover:shadow-md ${
                                  val === 0 ? 'bg-slate-200' : isLast ? 'bg-[#002970]' : 'bg-indigo-500'
                                }`}
                                style={{ height: `${vPct}%` }}
                              />
                            </div>
                            <span className={`text-[9px] sm:text-[10px] font-bold tracking-tight truncate ${isLast ? 'text-[#002970] font-black' : 'text-slate-500'}`}>
                              {label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-center flex-wrap gap-x-6 gap-y-2 mt-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <span className="flex items-center"><span className="w-2.5 h-2.5 bg-indigo-500 rounded-xs mr-1.5"></span> {t.legendActive}</span>
                      <span className="flex items-center"><span className="w-2.5 h-2.5 bg-[#002970] rounded-xs mr-1.5"></span> {t.legendCurrent}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {!selectedHistoryWeek && !isMonthlyView && (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-[#00BAF2]" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">{t.selectWeekPrompt}</h3>
              <p className="text-xs text-slate-400 max-w-md">{t.noWeekSelected}</p>
            </div>
          )}
        </div>

        {/* 4. HISTORY TABLE */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden mt-6">
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