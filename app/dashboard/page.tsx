"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Store,
  Users,
  Wallet,
  CheckCircle2,
  TrendingUp,
  RefreshCw,
  LogOut,
  Bell,
  Check,
  X,
  Smartphone,
  Sparkles,
  Search,
  MessageSquareWarning,
  UserX,
  Terminal
} from 'lucide-react';
import { listenToAgent, sendApprovalDecision, AgentOfferPayload } from '../agentService';

interface TelemetryLog {
  id: string;
  timestamp: string;
  nodeKey: string;
  messageKey: string;
  customerName?: string;
  status: 'running' | 'interrupted' | 'completed' | 'info';
}

interface Incident {
  id: string;
  threadId: string;
  timestamp: string;
  daysAway: number;
  lifetimeSpend: number;
  discount: number;
  promoCode: string;
  customerName: string;
  reasoning?: string;
  status: 'active' | 'resolved';
}

interface AuditLedgerItem {
  id: string;
  customer: string;
  amount: number;
  status: string;
  time: string;
}

// --- DYNAMIC TRANSLATION DICTIONARY ---
const TRANSLATIONS = {
  EN: {
    title: "Customer Loyalty & Retention",
    subtitle: "We track your regular shop visitors and help bring back those who haven't visited lately.",
    scanBtn: "Find Inactive Customers",
    salesKpi: "This Month's Sales",
    salesDesc: "Total revenue in September",
    profitKpi: "This Month's Profit",
    profitDesc: "Estimated earnings",
    regularKpi: "Regular Customers",
    regularDesc: "Visited in the last 30 days",
    riskKpi: "Customers At Risk",
    riskDesc: "Haven't visited in 1+ month",
    
    // Graph Titles
    graph1: "Sales (Last 6 Months)",
    graph2: "Customer Visits (Last 6 Months)",
    graph3: "Profit & Loss (Last 6 Months)",
    graph4: "Customer Retention Health",
    
    // Legends
    legendSales: "Sales",
    legendActive: "Visits",
    legendProfit: "Profit",
    legendLoss: "Loss",
    legendRegular: "Regular",
    legendRisk: "At Risk",
    legendCurrent: "Current Month (SEP)",
    netProfitText: "Net Profit (6 Months):",
    
    logsTitle: "Live AI Activity Feed",
    approvalTitle: "Needs Your Approval",
    approvalReviewBtn: "Review & Send Offer",
    historyTitle: "Customers Contacted History",
    historyDesc: "A list of all customers you have sent offers to",
    tableCol1: "Customer ID",
    tableCol2: "Customer Name",
    tableCol3: "Offer Sent",
    tableCol4: "Your Decision",
    tableCol5: "Time",
    modalTitle: "Send WhatsApp Offer",
    modalSkip: "No, Skip This",
    modalSend: "Yes, Send on WhatsApp",
    
    // Dynamic Values & Badges
    emptyLogs: 'Click "Find Inactive Customers" above...',
    emptyApprovals: 'No pending approvals.',
    emptyHistory: 'No history available yet.',
    atRiskBadge: 'At Risk Customer',
    justNow: 'Just now',
    discountLabel: 'Discount',
    offLabel: 'OFF',
    statusApproved: 'APPROVED',
    statusRejected: 'REJECTED',
    statusPending: 'PENDING',
    offerSent: 'Offer Sent',
    daysAgo1: "hasn't visited in",
    daysAgo2: "days!",
    spend1: "Lifetime Spend",
    spend2: "Proposed Offer",
    
    // Log Nodes
    node_searching: "Searching",
    node_found: "Found Customer",
    node_planning: "AI Planning",
    node_waiting: "Waiting",
    node_done: "Done",
    
    // Log Messages
    msg_init: "Checking your store records for inactive customers...",
    msg_found: "Found a regular customer who hasn't visited recently.",
    msg_planning: "Creating a special discount to invite them back.",
    msg_waiting: "Offer is ready. Waiting for your approval.",
    msg_approved: "Offer approved! Sending WhatsApp message to {name}.",
    msg_rejected: "Offer rejected. Action cancelled."
  },
  HI: {
    title: "ग्राहकों को वापस लाएं",
    subtitle: "हम आपके पुराने और नियमित ग्राहकों को याद दिलाते हैं ताकि वे आपकी दुकान पर वापस आएं।",
    scanBtn: "पुराने ग्राहकों को खोजें",
    salesKpi: "इस महीने की बिक्री",
    salesDesc: "सितंबर की कुल कमाई",
    profitKpi: "इस महीने का मुनाफा",
    profitDesc: "अनुमानित आय",
    regularKpi: "नियमित ग्राहक",
    regularDesc: "पिछले 30 दिनों में आए ग्राहक",
    riskKpi: "आना बंद कर चुके ग्राहक",
    riskDesc: "1+ महीने से दुकान पर नहीं आए",
    
    // Graph Titles
    graph1: "बिक्री (पिछले 6 महीने)",
    graph2: "ग्राहकों का आना-जाना (पिछले 6 महीने)",
    graph3: "मुनाफ़ा और नुकसान (पिछले 6 महीने)",
    graph4: "ग्राहक वफादारी (पिछले 6 महीने)",
    
    // Legends
    legendSales: "बिक्री",
    legendActive: "मुलाक़ातें",
    legendProfit: "मुनाफ़ा",
    legendLoss: "नुकसान",
    legendRegular: "नियमित",
    legendRisk: "लापता ग्राहक",
    legendCurrent: "वर्तमान महीना (SEP)",
    netProfitText: "कुल मुनाफ़ा (6 महीने):",
    
    logsTitle: "लाइव AI गतिविधि",
    approvalTitle: "आपकी मंज़ूरी चाहिए",
    approvalReviewBtn: "ऑफ़र देखें और भेजें",
    historyTitle: "संपर्क किए गए ग्राहकों का इतिहास",
    historyDesc: "उन सभी ग्राहकों की सूची जिन्हें आपने ऑफ़र भेजे हैं",
    tableCol1: "ग्राहक ID",
    tableCol2: "ग्राहक का नाम",
    tableCol3: "भेजा गया ऑफ़र",
    tableCol4: "आपका निर्णय",
    tableCol5: "समय",
    modalTitle: "WhatsApp ऑफ़र भेजें",
    modalSkip: "नहीं, छोड़ें",
    modalSend: "हाँ, WhatsApp पर भेजें",

    // Dynamic Values & Badges
    emptyLogs: 'ऊपर "पुराने ग्राहकों को खोजें" पर क्लिक करें...',
    emptyApprovals: 'कोई लंबित स्वीकृति नहीं है।',
    emptyHistory: 'अभी तक कोई इतिहास उपलब्ध नहीं है।',
    atRiskBadge: 'पुराना ग्राहक',
    justNow: 'अभी-अभी',
    discountLabel: 'की छूट',
    offLabel: 'की छूट',
    statusApproved: 'स्वीकृत',
    statusRejected: 'अस्वीकृत',
    statusPending: 'लंबित',
    offerSent: 'ऑफ़र भेजा गया',
    daysAgo1: "",
    daysAgo2: "दिनों से दुकान पर नहीं आए हैं!",
    spend1: "कुल खरीदारी",
    spend2: "प्रस्तावित ऑफ़र",
    
    // Log Nodes
    node_searching: "खोज जारी",
    node_found: "ग्राहक मिला",
    node_planning: "AI योजना",
    node_waiting: "प्रतीक्षा",
    node_done: "पूरा हुआ",
    
    // Log Messages
    msg_init: "उन ग्राहकों की तलाश की जा रही है जो बहुत दिन से दुकान पर नहीं आए...",
    msg_found: "एक नियमित ग्राहक मिला जो काफी समय से नहीं आया है।",
    msg_planning: "उन्हें वापस बुलाने के लिए एक विशेष छूट बनाई जा रही है।",
    msg_waiting: "ऑफ़र तैयार है। आपकी मंज़ूरी की प्रतीक्षा है।",
    msg_approved: "ऑफ़र स्वीकृत! {name} को WhatsApp संदेश भेजा जा रहा है।",
    msg_rejected: "ऑफ़र अस्वीकृत। कार्रवाई रद्द कर दी गई।"
  }
};

export default function MerchantDashboard() {
  const router = useRouter();

  // Language State
  const [lang, setLang] = useState<'EN' | 'HI'>('EN');
  const t = TRANSLATIONS[lang]; // Active translation dictionary

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isHITLModalOpen, setIsHITLModalOpen] = useState(false);
  const [isProcessingApproval, setIsProcessingApproval] = useState(false);

  const [telemetryLogs, setTelemetryLogs] = useState<TelemetryLog[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);

  const [liveStats, setLiveStats] = useState({
    total_interventions: 0,
    active_pending: 0,
    approved_campaigns: 0,
    success_rate_percentage: 0.0
  });
  const [auditLogs, setAuditLogs] = useState<AuditLedgerItem[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const statsRes = await fetch("http://localhost:8000/api/merchant/1/stats");
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setLiveStats(statsData.metrics);
        }

        const ledgerRes = await fetch("http://localhost:8000/api/merchant/1/campaigns");
        if (ledgerRes.ok) {
          const ledgerData = await ledgerRes.json();
          const formattedLogs: AuditLedgerItem[] = ledgerData.campaigns.map((camp: any) => ({
            id: `CUST-${camp.customer_id}`,
            // Read the real name from the backend, fallback if missing
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
    };

    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5000);
    return () => clearInterval(interval);
  }, []);

  const stopStreamRef = useRef<(() => void) | null>(null);
  const getClientTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const startAgentStream = () => {
    if (stopStreamRef.current) stopStreamRef.current();
    setIsRefreshing(true);

    stopStreamRef.current = listenToAgent(
      1,
      (node: string, data: any) => {
        setIsRefreshing(false);
        
        let nodeKey = 'node_searching';
        let msgKey = 'msg_init';

        if (node === 'init') {
          nodeKey = 'node_searching'; msgKey = 'msg_init';
        } else if (node === 'monitor') {
          nodeKey = 'node_found'; msgKey = 'msg_found';
        } else if (node === 'strategist') {
          nodeKey = 'node_planning'; msgKey = 'msg_planning';
        }

        setTelemetryLogs((prev) => [
          { id: `log-${Date.now()}-${Math.random()}`, timestamp: getClientTime(), nodeKey, messageKey: msgKey, status: 'completed' },
          ...prev
        ]);
      },
      (threadId: string, payload: any) => {
        setIsRefreshing(false);

        setTelemetryLogs((prev) => [
          { id: `log-${Date.now()}`, timestamp: getClientTime(), nodeKey: 'node_waiting', messageKey: 'msg_waiting', status: 'interrupted' },
          ...prev
        ]);

        const liveIncident: Incident = {
          id: `INC-${threadId.slice(-4).toUpperCase()}`,
          threadId: threadId,
          timestamp: 'Just now',
          daysAway: payload.days_away || 45,
          lifetimeSpend: payload.lifetime_spend || 15000,
          discount: payload.proposed_discount || 15,
          promoCode: payload.proposed_coupon || 'COMEBACK15',
          customerName: payload.customer_name || 'Customer',
          status: 'active',
        };

        setIncidents((prev) => [liveIncident, ...prev.filter((i) => i.status === 'resolved')]);
        setSelectedIncident(liveIncident);
      },
      (err) => {
        setIsRefreshing(false);
        console.warn('Stream issue:', err);
      }
    );
  };

  useEffect(() => {
    startAgentStream();
    return () => { if (stopStreamRef.current) stopStreamRef.current(); };
  }, []);

  const triggerRefresh = () => startAgentStream();

  const handleOpenHITL = (incident: Incident) => {
    setSelectedIncident(incident);
    setIsHITLModalOpen(true);
  };

  const handleDecision = async (action: 'APPROVED' | 'REJECTED') => {
    if (!selectedIncident) return;
    setIsProcessingApproval(true);
    try {
      await sendApprovalDecision(selectedIncident.threadId, action);
      setIncidents((prev) => prev.map((inc) => inc.id === selectedIncident.id ? { ...inc, status: 'resolved' } : inc));
      
      const msgKey = action === 'APPROVED' ? 'msg_approved' : 'msg_rejected';
      
      setTelemetryLogs((prev) => [
        { id: `log-${Date.now()}`, timestamp: getClientTime(), nodeKey: 'node_done', messageKey: msgKey, customerName: selectedIncident.customerName, status: 'completed' }, 
        ...prev
      ]);
      setIsHITLModalOpen(false);
    } catch (err) {
      alert('Unable to connect to the server.');
    } finally {
      setIsProcessingApproval(false);
    }
  };

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

        <div className="flex items-center space-x-2 sm:space-x-2.5">
          <button onClick={triggerRefresh} className="p-2 text-slate-600 hover:text-[#002970] bg-white/80 rounded-full border border-slate-200 shadow-sm cursor-pointer flex items-center space-x-2 px-3">
             <Search className={`w-4 h-4 ${isRefreshing ? 'animate-pulse text-[#00BAF2]' : ''}`} />
             <span className="text-xs font-bold hidden sm:inline">{t.scanBtn}</span>
          </button>
          
          <button 
            onClick={() => setLang(lang === 'EN' ? 'HI' : 'EN')}
            className="p-2 text-[#002970] bg-blue-50 hover:bg-blue-100 rounded-full border border-blue-200 shadow-sm cursor-pointer transition-colors" 
            title="Switch Language"
          >
            <span className="text-xs font-bold px-1">{lang === 'EN' ? 'EN 🔁 Aअ' : 'Aअ 🔁 EN'}</span>
          </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 lg:px-10 py-8 space-y-6 relative z-10">
        
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#002970]">{t.title}</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{t.subtitle}</p>
        </div>

        {/* 4 SIMPLE BUSINESS METRICS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>{t.salesKpi}</span>
              <Wallet className="w-4 h-4 text-[#00BAF2]" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">₹1,42,800</div>
            <p className="text-[11px] text-slate-400 mt-1">{t.salesDesc}</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-xs">
            <div className="flex justify-between items-center text-xs font-bold text-emerald-700 uppercase tracking-wider">
              <span>{t.profitKpi}</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight">₹38,400</div>
            <p className="text-[11px] text-slate-500 mt-1">{t.profitDesc}</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>{t.regularKpi}</span>
              <Users className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">312</div>
            <p className="text-[11px] text-slate-400 mt-1">{t.regularDesc}</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-xs">
            <div className="flex justify-between items-center text-xs font-bold text-rose-600 uppercase tracking-wider">
              <span>{t.riskKpi}</span>
              <UserX className="w-4 h-4 text-rose-500" />
            </div>
            <div className="flex items-baseline space-x-2 mt-2">
              <span className="text-2xl sm:text-3xl font-black text-rose-700 tracking-tight">48</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">{t.riskDesc}</p>
          </div>
        </div>

        {/* 4 DEAD SIMPLE BUSINESS GRAPHS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Graph 1: Sales Only */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col">
            <h3 className="text-sm font-bold text-[#002970] mb-6">{t.graph1}</h3>
            
            <div className="flex items-end justify-between h-44 px-2 border-b border-slate-100 pb-2">
              <div className="flex flex-col items-center w-1/6 justify-end space-y-2">
                <div className="flex items-end justify-center h-36 w-full"><div className="w-5 bg-[#00BAF2] rounded-t-sm" style={{ height: '85px' }}></div></div>
                <span className="text-[10px] text-slate-400 font-bold">APR</span>
              </div>
              <div className="flex flex-col items-center w-1/6 justify-end space-y-2">
                <div className="flex items-end justify-center h-36 w-full"><div className="w-5 bg-[#00BAF2] rounded-t-sm" style={{ height: '60px' }}></div></div>
                <span className="text-[10px] text-slate-400 font-bold">MAY</span>
              </div>
              <div className="flex flex-col items-center w-1/6 justify-end space-y-2">
                <div className="flex items-end justify-center h-36 w-full"><div className="w-5 bg-[#00BAF2] rounded-t-sm" style={{ height: '95px' }}></div></div>
                <span className="text-[10px] text-slate-400 font-bold">JUN</span>
              </div>
              <div className="flex flex-col items-center w-1/6 justify-end space-y-2">
                <div className="flex items-end justify-center h-36 w-full"><div className="w-5 bg-[#00BAF2] rounded-t-sm" style={{ height: '115px' }}></div></div>
                <span className="text-[10px] text-slate-400 font-bold">JUL</span>
              </div>
              <div className="flex flex-col items-center w-1/6 justify-end space-y-2">
                <div className="flex items-end justify-center h-36 w-full"><div className="w-5 bg-[#00BAF2] rounded-t-sm" style={{ height: '130px' }}></div></div>
                <span className="text-[10px] text-slate-400 font-bold">AUG</span>
              </div>
              <div className="flex flex-col items-center w-1/6 justify-end space-y-2">
                <div className="flex items-end justify-center h-36 w-full"><div className="w-5 bg-[#002970] rounded-t-sm" style={{ height: '125px' }}></div></div>
                <span className="text-[10px] text-[#002970] font-black">SEP</span>
              </div>
            </div>
            
            <div className="flex justify-center flex-wrap gap-x-6 gap-y-2 mt-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <span className="flex items-center"><span className="w-2.5 h-2.5 bg-[#00BAF2] rounded-xs mr-1.5"></span> {t.legendSales}</span>
              <span className="flex items-center"><span className="w-2.5 h-2.5 bg-[#002970] rounded-xs mr-1.5"></span> {t.legendCurrent}</span>
            </div>
          </div>

          {/* Graph 2: Customer Visits */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col">
            <h3 className="text-sm font-bold text-[#002970] mb-6">{t.graph2}</h3>
            
            <div className="flex items-end justify-between h-44 px-2 border-b border-slate-100 pb-2">
              <div className="flex flex-col items-center w-1/6 justify-end space-y-2">
                <div className="flex items-end justify-center h-36 w-full"><div className="w-5 bg-indigo-400 rounded-t-sm" style={{ height: '70px' }}></div></div>
                <span className="text-[10px] text-slate-400 font-bold">APR</span>
              </div>
              <div className="flex flex-col items-center w-1/6 justify-end space-y-2">
                <div className="flex items-end justify-center h-36 w-full"><div className="w-5 bg-indigo-400 rounded-t-sm" style={{ height: '50px' }}></div></div>
                <span className="text-[10px] text-slate-400 font-bold">MAY</span>
              </div>
              <div className="flex flex-col items-center w-1/6 justify-end space-y-2">
                <div className="flex items-end justify-center h-36 w-full"><div className="w-5 bg-indigo-400 rounded-t-sm" style={{ height: '85px' }}></div></div>
                <span className="text-[10px] text-slate-400 font-bold">JUN</span>
              </div>
              <div className="flex flex-col items-center w-1/6 justify-end space-y-2">
                <div className="flex items-end justify-center h-36 w-full"><div className="w-5 bg-indigo-400 rounded-t-sm" style={{ height: '110px' }}></div></div>
                <span className="text-[10px] text-slate-400 font-bold">JUL</span>
              </div>
              <div className="flex flex-col items-center w-1/6 justify-end space-y-2">
                <div className="flex items-end justify-center h-36 w-full"><div className="w-5 bg-indigo-400 rounded-t-sm" style={{ height: '130px' }}></div></div>
                <span className="text-[10px] text-slate-400 font-bold">AUG</span>
              </div>
              <div className="flex flex-col items-center w-1/6 justify-end space-y-2">
                <div className="flex items-end justify-center h-36 w-full"><div className="w-5 bg-[#002970] rounded-t-sm" style={{ height: '120px' }}></div></div>
                <span className="text-[10px] text-[#002970] font-black">SEP</span>
              </div>
            </div>

            <div className="flex justify-center flex-wrap gap-x-6 gap-y-2 mt-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <span className="flex items-center"><span className="w-2.5 h-2.5 bg-indigo-400 rounded-xs mr-1.5"></span> {t.legendActive}</span>
              <span className="flex items-center"><span className="w-2.5 h-2.5 bg-[#002970] rounded-xs mr-1.5"></span> {t.legendCurrent}</span>
            </div>
          </div>

          {/* Graph 3: Profit & Loss */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col relative">
            <h3 className="text-sm font-bold text-[#002970] mb-6">{t.graph3}</h3>
            
            <div className="flex items-end justify-between h-44 px-2 border-b border-slate-100 pb-2">
              {/* APR (Profit) */}
              <div className="flex flex-col items-center w-1/6 justify-end space-y-2">
                <div className="flex items-end justify-center h-36 w-full"><div className="w-5 bg-emerald-400 rounded-t-sm" style={{ height: '50px' }}></div></div>
                <span className="text-[10px] text-slate-400 font-bold">APR</span>
              </div>
              {/* MAY (Loss) */}
              <div className="flex flex-col items-center w-1/6 justify-end space-y-2">
                <div className="flex items-end justify-center h-36 w-full"><div className="w-5 bg-rose-500 rounded-t-sm" style={{ height: '25px' }}></div></div>
                <span className="text-[10px] text-slate-400 font-bold">MAY</span>
              </div>
              {/* JUN (Profit) */}
              <div className="flex flex-col items-center w-1/6 justify-end space-y-2">
                <div className="flex items-end justify-center h-36 w-full"><div className="w-5 bg-emerald-400 rounded-t-sm" style={{ height: '40px' }}></div></div>
                <span className="text-[10px] text-slate-400 font-bold">JUN</span>
              </div>
              {/* JUL (Profit) */}
              <div className="flex flex-col items-center w-1/6 justify-end space-y-2">
                <div className="flex items-end justify-center h-36 w-full"><div className="w-5 bg-emerald-400 rounded-t-sm" style={{ height: '70px' }}></div></div>
                <span className="text-[10px] text-slate-400 font-bold">JUL</span>
              </div>
              {/* AUG (Profit) */}
              <div className="flex flex-col items-center w-1/6 justify-end space-y-2">
                <div className="flex items-end justify-center h-36 w-full"><div className="w-5 bg-emerald-400 rounded-t-sm" style={{ height: '90px' }}></div></div>
                <span className="text-[10px] text-slate-400 font-bold">AUG</span>
              </div>
              {/* SEP (Profit - Current Month) */}
              <div className="flex flex-col items-center w-1/6 justify-end space-y-2">
                <div className="flex items-end justify-center h-36 w-full"><div className="w-5 bg-[#002970] rounded-t-sm" style={{ height: '85px' }}></div></div>
                <span className="text-[10px] text-[#002970] font-black">SEP</span>
              </div>
            </div>

            <div className="flex justify-center flex-wrap gap-x-6 gap-y-2 mt-4 mb-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <span className="flex items-center"><span className="w-2.5 h-2.5 bg-emerald-400 rounded-xs mr-1.5"></span> {t.legendProfit}</span>
              <span className="flex items-center"><span className="w-2.5 h-2.5 bg-rose-500 rounded-xs mr-1.5"></span> {t.legendLoss}</span>
              <span className="flex items-center"><span className="w-2.5 h-2.5 bg-[#002970] rounded-xs mr-1.5"></span> {t.legendCurrent}</span>
            </div>
            
            {/* NET PROFIT CALCULATION */}
            <div className="absolute top-6 right-6 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
               <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wide block leading-none mb-1">{t.netProfitText}</span>
               <span className="text-sm font-black text-emerald-800 leading-none">₹1,48,000</span>
            </div>
          </div>

          {/* Graph 4: Regular vs At Risk Customers */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col">
            <h3 className="text-sm font-bold text-[#002970] mb-6">{t.graph4}</h3>
            
            <div className="flex items-end justify-between h-44 px-2 border-b border-slate-100 pb-2">
              <div className="flex flex-col items-center w-1/6 justify-end space-y-2">
                <div className="flex items-end space-x-1.5 justify-center h-36 w-full">
                  <div className="w-3.5 bg-indigo-400 rounded-t-sm" style={{ height: '60px' }}></div>
                  <div className="w-3.5 bg-amber-400 rounded-t-sm" style={{ height: '25px' }}></div>
                </div>
                <span className="text-[10px] text-slate-400 font-bold">APR</span>
              </div>
              <div className="flex flex-col items-center w-1/6 justify-end space-y-2">
                <div className="flex items-end space-x-1.5 justify-center h-36 w-full">
                  <div className="w-3.5 bg-indigo-400 rounded-t-sm" style={{ height: '40px' }}></div>
                  <div className="w-3.5 bg-amber-400 rounded-t-sm" style={{ height: '35px' }}></div>
                </div>
                <span className="text-[10px] text-slate-400 font-bold">MAY</span>
              </div>
              <div className="flex flex-col items-center w-1/6 justify-end space-y-2">
                <div className="flex items-end space-x-1.5 justify-center h-36 w-full">
                  <div className="w-3.5 bg-indigo-400 rounded-t-sm" style={{ height: '70px' }}></div>
                  <div className="w-3.5 bg-amber-400 rounded-t-sm" style={{ height: '20px' }}></div>
                </div>
                <span className="text-[10px] text-slate-400 font-bold">JUN</span>
              </div>
              <div className="flex flex-col items-center w-1/6 justify-end space-y-2">
                <div className="flex items-end space-x-1.5 justify-center h-36 w-full">
                  <div className="w-3.5 bg-indigo-400 rounded-t-sm" style={{ height: '95px' }}></div>
                  <div className="w-3.5 bg-amber-400 rounded-t-sm" style={{ height: '30px' }}></div>
                </div>
                <span className="text-[10px] text-slate-400 font-bold">JUL</span>
              </div>
              <div className="flex flex-col items-center w-1/6 justify-end space-y-2">
                <div className="flex items-end space-x-1.5 justify-center h-36 w-full">
                  <div className="w-3.5 bg-indigo-400 rounded-t-sm" style={{ height: '115px' }}></div>
                  <div className="w-3.5 bg-amber-400 rounded-t-sm" style={{ height: '35px' }}></div>
                </div>
                <span className="text-[10px] text-slate-400 font-bold">AUG</span>
              </div>
              <div className="flex flex-col items-center w-1/6 justify-end space-y-2">
                <div className="flex items-end space-x-1.5 justify-center h-36 w-full">
                  <div className="w-3.5 bg-[#002970] rounded-t-sm" style={{ height: '100px' }}></div>
                  <div className="w-3.5 bg-rose-600 rounded-t-sm" style={{ height: '48px' }}></div>
                </div>
                <span className="text-[10px] text-[#002970] font-black">SEP</span>
              </div>
            </div>

            <div className="flex justify-center flex-wrap gap-x-6 gap-y-2 mt-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <span className="flex items-center"><span className="w-2.5 h-2.5 bg-indigo-400 rounded-xs mr-1.5"></span> {t.legendRegular}</span>
              <span className="flex items-center"><span className="w-2.5 h-2.5 bg-amber-400 rounded-xs mr-1.5"></span> {t.legendRisk}</span>
              <span className="flex items-center"><span className="w-2.5 h-2.5 bg-[#002970] rounded-xs mr-1.5"></span> {t.legendCurrent}</span>
            </div>
          </div>

        </div>
          

        {/* 2-COLUMN SECTION: LIVE LOGS & APPROVALS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          <div className="lg:col-span-5 bg-[#001D52] text-slate-200 p-5 rounded-2xl shadow-md border border-[#00BAF2]/30 flex flex-col h-[600px]">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
              <div className="flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-[#00BAF2]" />
                <span className="text-xs font-bold uppercase tracking-wider text-white">{t.logsTitle}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 font-mono text-[12px] pr-2 py-4">
              {telemetryLogs.map((log) => {
                const nodeText = t[log.nodeKey as keyof typeof t] as string || log.nodeKey;
                const msgText = (t[log.messageKey as keyof typeof t] as string)?.replace('{name}', log.customerName || '') || log.messageKey;
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
                <div className="text-center text-slate-500 py-10">{t.emptyLogs}</div>
              )}
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                <h2 className="text-lg font-bold text-[#002970]">{t.approvalTitle}</h2>
              </div>
            </div>

            <div className="space-y-3.5">
              {incidents.map((incident) => (
                <div key={incident.id} className={`p-5 rounded-2xl border transition-all ${incident.status === 'active' ? 'bg-white border-amber-300 shadow-sm ring-1 ring-amber-300/50' : 'bg-white/70 border-slate-200 opacity-75'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-mono font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">{t.atRiskBadge}</span>
                      <h3 className="text-base font-bold text-slate-900 mt-2">
                        {incident.customerName} {t.daysAgo1} {incident.daysAway} {t.daysAgo2}
                      </h3>
                    </div>
                    <span className="text-xs text-slate-400">
                      {incident.timestamp === 'Just now' ? t.justNow : incident.timestamp}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 my-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold uppercase">{t.spend1}</span>
                      <span className="text-lg font-black text-slate-800">₹{incident.lifetimeSpend}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold uppercase">{t.spend2}</span>
                      <span className="text-lg font-black text-emerald-600">{incident.discount}% {t.discountLabel}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    {incident.status === 'active' ? (
                      <button onClick={() => handleOpenHITL(incident)} className="w-full py-3 bg-[#002970] text-white rounded-xl text-sm font-bold shadow-md cursor-pointer hover:bg-blue-900">
                        {t.approvalReviewBtn}
                      </button>
                    ) : (
                      <span className="text-emerald-600 text-xs font-bold flex items-center"><CheckCircle2 className="w-4 h-4 mr-1" /> {t.offerSent}</span>
                    )}
                  </div>
                </div>
              ))}
              {incidents.length === 0 && (
                <div className="text-center bg-white border border-slate-200 rounded-2xl py-12 text-slate-500 text-sm">
                  {t.emptyApprovals}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CUSTOMER HISTORY TABLE */}
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
                    const statusText = tx.status === 'APPROVED' ? t.statusApproved : tx.status === 'REJECTED' ? t.statusRejected : t.statusPending;
                    return (
                      <tr key={`${tx.id}-${index}`} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-5 font-mono font-medium text-slate-700">{tx.id}</td>
                        <td className="py-3.5 px-5 font-bold text-slate-900">{tx.customer}</td>
                        <td className="py-3.5 px-5 font-extrabold text-slate-800">{tx.amount}% {t.offLabel}</td>
                        <td className="py-3.5 px-5">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase ${tx.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' : tx.status === 'REJECTED' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
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

      {/* DEAD SIMPLE APPROVAL MODAL */}
      {isHITLModalOpen && selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
            
            <div className="bg-[#001D52] px-6 py-4 text-white flex justify-between items-center border-b border-[#00BAF2]/30">
              <h3 className="font-bold text-sm">{t.modalTitle}</h3>
              <button onClick={() => setIsHITLModalOpen(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <p className="text-sm text-slate-700">
                  <span className="font-bold text-[#002970]">{selectedIncident.customerName}</span> 
                  {lang === 'EN' ? ` hasn't visited in ` : ` `}
                  <span className="font-bold text-rose-600">{selectedIncident.daysAway} {lang === 'EN' ? 'days' : 'दिनों'}</span>
                  {lang === 'EN' ? `. They usually spend around ` : ` से नहीं आए हैं। वे आमतौर पर `}
                  <span className="font-bold text-emerald-600">₹{selectedIncident.lifetimeSpend}</span>
                  {lang === 'EN' ? ` at your shop.` : ` खर्च करते हैं।`}
                </p>
              </div>

              <div className="bg-[#E5DDD5] p-4 rounded-2xl border border-stone-300">
                <div className="bg-white p-3.5 rounded-xl rounded-tl-none shadow-xs max-w-sm text-xs text-slate-800">
                  <p>
                    {lang === 'EN' ? 
                      `Hi ${selectedIncident.customerName}! We miss seeing you at the shop. Show this message at the counter with code ` : 
                      `नमस्ते ${selectedIncident.customerName}! हमें आपकी कमी खल रही है। अपनी अगली खरीदारी पर ${selectedIncident.discount}% की छूट पाने के लिए काउंटर पर यह कोड दिखाएं: `}
                    <span className="bg-blue-100 text-[#002970] font-mono font-bold px-1 rounded">{selectedIncident.promoCode}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button disabled={isProcessingApproval} onClick={() => handleDecision('REJECTED')} className="flex-1 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer">
                  {t.modalSkip}
                </button>
                <button disabled={isProcessingApproval} onClick={() => handleDecision('APPROVED')} className="flex-1 py-3 rounded-xl bg-[#002970] hover:bg-[#001D52] text-white text-xs font-bold shadow-md cursor-pointer flex justify-center items-center">
                  <Smartphone className="w-4 h-4 mr-2 text-[#00BAF2]" />
                  {isProcessingApproval ? (lang === 'EN' ? 'Sending...' : 'भेजा जा रहा है...') : t.modalSend}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}