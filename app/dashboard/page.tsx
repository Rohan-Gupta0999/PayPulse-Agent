"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Activity,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Zap,
  RefreshCw,
  LogOut,
  Bell,
  ArrowUpRight,
  Check,
  X,
  Smartphone,
  ShieldAlert,
  Sparkles,
  Layers,
  FileCheck,
  Database,
  Terminal,
  Clock
} from 'lucide-react';

interface TelemetryLog {
  id: string;
  timestamp: string;
  node: 'Monitor' | 'Strategist' | 'Gateway' | 'Dispatch';
  message: string;
  status: 'running' | 'interrupted' | 'completed' | 'info';
}

interface Incident {
  id: string;
  threadId: string;
  timestamp: string;
  channel: string;
  dropRate: string;
  impactRevenue: string;
  discount: number;
  promoCode: string;
  targetCount: number;
  status: 'active' | 'resolved';
  dpdpVerified: boolean;
}

interface NotificationItem {
  id: string;
  title: string;
  desc: string;
  time: string;
  unread: boolean;
  type: 'alert' | 'success' | 'info';
}

export default function MerchantDashboard() {
  const router = useRouter();

  // State Management
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isHITLModalOpen, setIsHITLModalOpen] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'recovered' | 'anomalies'>('all');

  // Notification Drawer State
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'notif-1',
      title: 'Action Required: UPI Category Drop',
      desc: '34% conversion variance detected. Promo QUICK15 awaiting manual sign-off.',
      time: 'Just now',
      unread: true,
      type: 'alert'
    },
    {
      id: 'notif-2',
      title: 'WhatsApp Cloud Broadcast Completed',
      desc: '18 messages successfully delivered via secondary ICICI routing rail.',
      time: '24m ago',
      unread: true,
      type: 'success'
    },
    {
      id: 'notif-3',
      title: 'T+0 Settlement Dispatched',
      desc: '₹84,200 credited to primary merchant account with zero bounce rate.',
      time: '1h ago',
      unread: false,
      type: 'info'
    }
  ]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  // Live SSE-style Telemetry Logs
  const [telemetryLogs, setTelemetryLogs] = useState<TelemetryLog[]>([
    {
      id: 'log-1',
      timestamp: '11:42:01',
      node: 'Monitor',
      message: 'Rolling window evaluated: 34% drop detected in UPI checkout rail.',
      status: 'completed'
    },
    {
      id: 'log-2',
      timestamp: '11:42:03',
      node: 'Strategist',
      message: 'Gemini 2.0 Flash synthesized re-engagement payload (15% cap, QUICK15).',
      status: 'completed'
    },
    {
      id: 'log-3',
      timestamp: '11:42:04',
      node: 'Gateway',
      message: 'interrupt() triggered on thread_id: th_8042_upi. Awaiting merchant authorization.',
      status: 'interrupted'
    }
  ]);

  // Active Incidents mapped to LangGraph Checkpoints
  const [incidents, setIncidents] = useState<Incident[]>([
    {
      id: 'INC-8042',
      threadId: 'th_8042_upi',
      timestamp: 'Just now',
      channel: 'UPI / Afternoon Food Category',
      dropRate: '-34%',
      impactRevenue: '₹3,200',
      discount: 15,
      promoCode: 'QUICK15',
      targetCount: 42,
      status: 'active',
      dpdpVerified: true
    },
    {
      id: 'INC-8039',
      threadId: 'th_8039_hdfc',
      timestamp: '11:14 AM',
      channel: 'HDFC Netbanking Gateway',
      dropRate: '-48%',
      impactRevenue: '₹1,500',
      discount: 10,
      promoCode: 'RETRY10',
      targetCount: 18,
      status: 'resolved',
      dpdpVerified: true
    }
  ]);

  const triggerRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  // Open HITL Approval Gateway
  const handleOpenHITL = (incident: Incident) => {
    setSelectedIncident(incident);
    setIsHITLModalOpen(true);
  };

  // Human Authorizes State Machine Execution
  const handleAuthorizeResume = () => {
    if (!selectedIncident) return;

    // Transition incident to resolved
    setIncidents((prev) =>
      prev.map((inc) =>
        inc.id === selectedIncident.id ? { ...inc, status: 'resolved' } : inc
      )
    );

    // Append telemetry progression
    const newLog: TelemetryLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      node: 'Dispatch',
      message: `Command(resume=True) accepted for ${selectedIncident.threadId}. Meta WhatsApp API dispatched ${selectedIncident.targetCount} templates.`,
      status: 'completed'
    };

    setTelemetryLogs((prev) => [newLog, ...prev]);
    setIsHITLModalOpen(false);
  };

  const transactions = [
    {
      id: 'TXN-90412',
      customer: 'Rahul Verma',
      channel: 'GPay (UPI)',
      amount: '₹420.00',
      status: 'Recovered',
      auditHash: '0x8f2a...c10b',
      time: '2 mins ago'
    },
    {
      id: 'TXN-90411',
      customer: 'Ananya Sharma',
      channel: 'Paytm Wallet',
      amount: '₹1,240.00',
      status: 'Success',
      auditHash: '0x3e1d...99aa',
      time: '7 mins ago'
    },
    {
      id: 'TXN-90410',
      customer: 'Devansh K.',
      channel: 'HDFC Netbanking',
      amount: '₹890.00',
      status: 'Recovered',
      auditHash: '0x7c9b...ff42',
      time: '14 mins ago'
    },
    {
      id: 'TXN-90409',
      customer: 'Pooja Iyer',
      channel: 'PhonePe (UPI)',
      amount: '₹310.00',
      status: 'Success',
      auditHash: '0x1b4f...ee20',
      time: '22 mins ago'
    },
    {
      id: 'TXN-90408',
      customer: 'Siddharth Rao',
      channel: 'Axis Gateway',
      amount: '₹2,100.00',
      status: 'Failed',
      auditHash: '0x99dd...12cc',
      time: '31 mins ago'
    }
  ];

  const filteredTransactions = transactions.filter((tx) => {
    if (filterType === 'recovered') return tx.status === 'Recovered';
    if (filterType === 'anomalies') return tx.status === 'Failed';
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col selection:bg-[#00BAF2]/20 selection:text-[#002970]">
      
      {/* Background Dot Texture */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(#00BAF2_1.2px,transparent_1.2px)] [background-size:24px_24px] opacity-[0.08]" />

      {/* iOS-LEVEL LIQUID GLASS COMMAND BAR */}
      <header className="sticky top-0 z-40 bg-white/45 backdrop-blur-3xl backdrop-saturate-[220%] border-b border-white/60 px-6 lg:px-10 py-3 flex justify-between items-center shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.85),0_8px_32px_0_rgba(0,29,82,0.06)] transition-all">
        
        {/* Brand Logo & Name */}
        <div 
          onClick={() => router.push('/')}
          className="flex items-center space-x-2.5 cursor-pointer select-none group"
          title="Back to Landing"
        >
          <div className="w-8 h-8 bg-[#00BAF2] rounded-2xl flex items-center justify-center shadow-[0_4px_12px_rgba(0,186,242,0.35),inset_0_1px_1px_rgba(255,255,255,0.6)] group-hover:scale-105 transition-transform duration-200">
            <ShieldCheck className="text-white w-5 h-5 drop-shadow-xs" />
          </div>
          <span className="text-xl font-black tracking-tight text-[#002970] drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">
            PayPulse
          </span>
        </div>

        {/* iOS Frosted Glass Action Controls */}
        <div className="flex items-center space-x-2 sm:space-x-2.5">
          {/* Refresh Button */}
          <button
            onClick={triggerRefresh}
            className="p-2 text-slate-600 hover:text-[#002970] bg-white/50 hover:bg-white/80 active:bg-white/95 backdrop-blur-2xl rounded-full transition-all duration-200 border border-white/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] cursor-pointer"
            title="Refresh stream"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#00BAF2]' : ''}`} />
          </button>

          {/* Notification Indicator with Glass Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              className={`relative p-2 text-slate-600 hover:text-[#002970] bg-white/50 hover:bg-white/80 active:bg-white/95 backdrop-blur-2xl rounded-full transition-all duration-200 border border-white/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] cursor-pointer ${
                isNotificationOpen ? 'ring-2 ring-[#00BAF2]' : ''
              }`}
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full ring-2 ring-white shadow-xs animate-pulse" />
              )}
            </button>

            {/* Glassmorphic Dropdown Panel */}
            {isNotificationOpen && (
              <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white/90 backdrop-blur-3xl border border-white/80 rounded-3xl shadow-[0_20px_50px_rgba(0,41,112,0.15)] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                
                {/* Panel Header */}
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-black text-[#002970]">Operational Alerts</span>
                    {unreadCount > 0 && (
                      <span className="text-[10px] bg-[#00BAF2] text-white font-bold px-2 py-0.5 rounded-full shadow-xs">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button 
                      onClick={markAllAsRead}
                      className="text-[11px] font-semibold text-[#00BAF2] hover:text-[#002970] transition-colors cursor-pointer"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                {/* Notifications List */}
                <div className="divide-y divide-slate-100/80 max-h-80 overflow-y-auto">
                  {notifications.map((n) => (
                    <div 
                      key={n.id}
                      className={`p-3.5 hover:bg-slate-50/90 transition-colors cursor-pointer flex items-start space-x-3 ${
                        n.unread ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      <div className="mt-0.5">
                        {n.type === 'alert' && (
                          <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                            !
                          </div>
                        )}
                        {n.type === 'success' && (
                          <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs">
                            ✓
                          </div>
                        )}
                        {n.type === 'info' && (
                          <div className="w-6 h-6 rounded-full bg-blue-100 text-[#002970] flex items-center justify-center text-xs font-semibold">
                            i
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-xs truncate ${n.unread ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                            {n.title}
                          </p>
                          <span className="text-[10px] text-slate-400 shrink-0 ml-2">{n.time}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug line-clamp-2">
                          {n.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Panel Footer */}
                <div className="p-3 text-center bg-slate-50/80 border-t border-slate-100">
                  <span className="text-[10px] text-slate-400 font-medium">
                    All notifications are signed via tamper-proof audit trails
                  </span>
                </div>

              </div>
            )}
          </div>

          {/* Logout */}
          <button
            onClick={() => router.push('/login')}
            className="p-2 text-slate-600 hover:text-rose-600 bg-white/50 hover:bg-rose-50/80 active:bg-rose-100/90 backdrop-blur-2xl rounded-full transition-all duration-200 border border-white/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(225,29,72,0.1)] cursor-pointer"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* DASHBOARD CONTENT */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 lg:px-10 py-8 space-y-8 relative z-10">
        
        {/* HEADER SUMMARY */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#002970]">
              Autonomous Operations Terminal
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Active telemetry stream monitoring payment drop-offs and orchestrating automated recovery.
            </p>
          </div>
        </div>

      {/* 4 CORE KPI METRIC CARDS (CURSOR REACTIVE / HOVER ENLARGED) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          
          {/* Tile 1: Monitored GMV Today */}
          <div className="group relative bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-[#00BAF2]/70 hover:shadow-[0_16px_36px_rgba(0,186,242,0.12)] hover:scale-[1.03] hover:-translate-y-1 transition-all duration-300 ease-out cursor-pointer z-10 hover:z-20">
            <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-[#002970] transition-colors">
              <span>Monitored GMV Today</span>
              <div className="p-1.5 rounded-lg bg-slate-100 group-hover:bg-[#00BAF2]/15 text-[#00BAF2] transition-colors">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            
            <div className="flex items-baseline space-x-2 mt-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight group-hover:text-[#002970] transition-colors">
                ₹2,84,310
              </span>
              <span className="text-xs font-bold text-emerald-600 flex items-center bg-emerald-50 px-1.5 py-0.5 rounded-md">
                <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> +14.2%
              </span>
            </div>
            
            <p className="text-[11px] text-slate-400 font-medium mt-1">
              1,280 checkout attempts audited
            </p>

            {/* CURSOR REACTIVE DETAILS (Smooth Accordion Reveal) */}
            <div className="max-h-0 opacity-0 group-hover:max-h-28 group-hover:opacity-100 transition-all duration-300 ease-in-out overflow-hidden pt-0 group-hover:pt-3 border-t-0 group-hover:border-t border-slate-100 mt-2 space-y-1.5 text-[11px]">
              <div className="flex justify-between text-slate-500">
                <span>Peak Traffic Rail:</span>
                <span className="font-bold text-[#002970]">UPI (₹1.92L)</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Card & Netbanking:</span>
                <span className="font-bold text-slate-700">₹92,310</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Avg Session Value:</span>
                <span className="font-bold text-emerald-600">₹222 / order</span>
              </div>
            </div>
          </div>

          {/* Tile 2: Recovered by PayPulse */}
          <div className="group relative bg-white p-5 rounded-2xl border border-blue-200/90 shadow-xs hover:border-[#00BAF2] hover:shadow-[0_16px_36px_rgba(0,41,112,0.12)] hover:scale-[1.03] hover:-translate-y-1 transition-all duration-300 ease-out cursor-pointer overflow-hidden z-10 hover:z-20">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#00BAF2]/10 to-transparent pointer-events-none rounded-bl-full group-hover:scale-125 transition-transform duration-300" />
            <div className="flex justify-between items-center text-xs font-bold text-[#002970] uppercase tracking-wider">
              <span className="flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#00BAF2]" />
                <span>Recovered by PayPulse</span>
              </span>
              <span className="text-[10px] font-bold text-[#00BAF2] bg-blue-50 px-1.5 py-0.5 rounded">
                +28% saved
              </span>
            </div>
            
            <div className="flex items-baseline space-x-2 mt-2">
              <span className="text-2xl sm:text-3xl font-black text-[#002970] tracking-tight">
                ₹18,450
              </span>
            </div>
            
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              85 drop-offs converted via templates
            </p>

            {/* CURSOR REACTIVE DETAILS */}
            <div className="max-h-0 opacity-0 group-hover:max-h-28 group-hover:opacity-100 transition-all duration-300 ease-in-out overflow-hidden pt-0 group-hover:pt-3 border-t-0 group-hover:border-t border-slate-100 mt-2 space-y-1.5 text-[11px]">
              <div className="flex justify-between text-slate-500">
                <span>Incentive Cost Spent:</span>
                <span className="font-bold text-slate-700">₹1,840</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Net Recovered Yield:</span>
                <span className="font-bold text-emerald-600">₹16,610 (10.0x ROI)</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Avg Decision Latency:</span>
                <span className="font-bold text-[#00BAF2]">140ms</span>
              </div>
            </div>
          </div>

          {/* Tile 3: Gateway Success Ratio */}
          <div className="group relative bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-400 hover:shadow-[0_16px_36px_rgba(16,185,129,0.12)] hover:scale-[1.03] hover:-translate-y-1 transition-all duration-300 ease-out cursor-pointer z-10 hover:z-20">
            <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-emerald-800 transition-colors">
              <span>Gateway Success Ratio</span>
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            
            <div className="flex items-baseline space-x-2 mt-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                98.4%
              </span>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                +1.8% vs benchmark
              </span>
            </div>
            
            <p className="text-[11px] text-slate-400 font-medium mt-1">
              Rolling deterministic SQL monitor
            </p>

            {/* CURSOR REACTIVE DETAILS */}
            <div className="max-h-0 opacity-0 group-hover:max-h-28 group-hover:opacity-100 transition-all duration-300 ease-in-out overflow-hidden pt-0 group-hover:pt-3 border-t-0 group-hover:border-t border-slate-100 mt-2 space-y-1.5 text-[11px]">
              <div className="flex justify-between text-slate-500">
                <span>Total Failures:</span>
                <span className="font-bold text-rose-500">20 drops</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Auto-rerouted Rails:</span>
                <span className="font-bold text-slate-700">14 sessions</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Uptime Health:</span>
                <span className="font-bold text-emerald-600">99.98%</span>
              </div>
            </div>
          </div>

          {/* Tile 4: DPDP Opt-In Audience */}
          <div className="group relative bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-indigo-400 hover:shadow-[0_16px_36px_rgba(99,102,241,0.12)] hover:scale-[1.03] hover:-translate-y-1 transition-all duration-300 ease-out cursor-pointer z-10 hover:z-20">
            <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-indigo-800 transition-colors">
              <span>DPDP Opt-In Audience</span>
              <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            
            <div className="flex items-baseline space-x-2 mt-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                4,120
              </span>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md">
                100% Consent
              </span>
            </div>
            
            <p className="text-[11px] text-slate-400 font-medium mt-1">
              Filtered against Section 6 logs
            </p>

            {/* CURSOR REACTIVE DETAILS */}
            <div className="max-h-0 opacity-0 group-hover:max-h-28 group-hover:opacity-100 transition-all duration-300 ease-in-out overflow-hidden pt-0 group-hover:pt-3 border-t-0 group-hover:border-t border-slate-100 mt-2 space-y-1.5 text-[11px]">
              <div className="flex justify-between text-slate-500">
                <span>Verified Opt-Ins:</span>
                <span className="font-bold text-emerald-600">4,120 / 4,120</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Revoked / Opt-Out:</span>
                <span className="font-bold text-slate-400">0 records</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Meta Safety Index:</span>
                <span className="font-bold text-[#00BAF2]">Green (0.01% spam)</span>
              </div>
            </div>
          </div>

        </div>
        {/* 2-COLUMN SECTION: LIVE TELEMETRY STREAM & ACTIVE HITL INTERVENTIONS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: SSE Live Telemetry Stream Console (5 Cols) */}
          <div className="lg:col-span-5 bg-[#001D52] text-slate-200 p-5 rounded-2xl shadow-md border border-[#00BAF2]/30 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center space-x-2">
                  <Terminal className="w-4 h-4 text-[#00BAF2]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-white">
                    Agent Telemetry Stream (SSE)
                  </span>
                </div>
                <span className="flex items-center space-x-1.5 text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>State Stream Active</span>
                </span>
              </div>

              <div className="space-y-2.5 font-mono text-[11px] max-h-[310px] overflow-y-auto pr-1">
                {telemetryLogs.map((log) => (
                  <div 
                    key={log.id} 
                    className={`p-2.5 rounded-lg border leading-relaxed ${
                      log.status === 'interrupted'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                        : 'bg-white/5 border-white/5 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <span className="text-[#00BAF2] font-bold">Node: {log.node}</span>
                      <span>{log.timestamp}</span>
                    </div>
                    <p>{log.message}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 text-[10px] text-slate-400 flex justify-between items-center mt-3">
              <span>Unidirectional EventSource (HTTP 200)</span>
              <span className="text-emerald-400">Zero Socket Overhead</span>
            </div>
          </div>

          {/* RIGHT: Active Anomaly & HITL Decision Gate (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                <h2 className="text-lg font-bold text-[#002970]">
                  Human-in-the-Loop Gateways
                </h2>
              </div>
              <span className="text-xs text-slate-500">1 Incident awaiting authorization</span>
            </div>

            <div className="space-y-3.5">
              {incidents.map((incident) => (
                <div
                  key={incident.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    incident.status === 'active'
                      ? 'bg-white border-amber-300 shadow-sm ring-1 ring-amber-300/50'
                      : 'bg-white/70 border-slate-200 opacity-75'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono font-bold text-slate-500">{incident.id}</span>
                        <span className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                          {incident.threadId}
                        </span>
                        <span
                          className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md ${
                            incident.status === 'active'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {incident.status === 'active' ? 'State Paused at interrupt()' : 'Graph Finished'}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 mt-1">{incident.channel}</h3>
                    </div>

                    <span className="text-xs text-slate-400">{incident.timestamp}</span>
                  </div>

                  {/* Incident Impact Metrics */}
                  <div className="grid grid-cols-3 gap-3 my-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold uppercase">Drop Deviation</span>
                      <span className="text-base font-black text-rose-600">{incident.dropRate}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold uppercase">At-Risk GMV</span>
                      <span className="text-base font-black text-slate-800">{incident.impactRevenue}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold uppercase">Target Audience</span>
                      <span className="text-base font-black text-slate-800">{incident.targetCount} buyers</span>
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center space-x-2 text-[11px] text-slate-500">
                      <span className="inline-flex items-center text-emerald-600 font-semibold">
                        <Check className="w-3.5 h-3.5 mr-0.5" /> DPDP Opt-In Verified
                      </span>
                      <span>•</span>
                      <span className="font-mono text-slate-700">Code: {incident.promoCode} ({incident.discount}%)</span>
                    </div>

                    {incident.status === 'active' ? (
                      <button
                        onClick={() => handleOpenHITL(incident)}
                        className="inline-flex items-center space-x-1.5 px-4 py-2 bg-[#002970] hover:bg-[#001D52] text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                      >
                        <ShieldAlert className="w-3.5 h-3.5 text-[#00BAF2]" />
                        <span>Review & Authorize</span>
                      </button>
                    ) : (
                      <span className="inline-flex items-center space-x-1 text-emerald-600 text-xs font-semibold">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Campaign Dispatched</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* AUDIT & TRANSACTION STREAM TABLE */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#002970]">Immutable Transaction & Audit Ledger</h2>
              <p className="text-xs text-slate-400 mt-0.5">Checkpointed state execution and verified recovery records</p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  filterType === 'all'
                    ? 'bg-[#002970] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All (5)
              </button>
              <button
                onClick={() => setFilterType('recovered')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  filterType === 'recovered'
                    ? 'bg-[#00BAF2] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Recovered (2)
              </button>
              <button
                onClick={() => setFilterType('anomalies')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  filterType === 'anomalies'
                    ? 'bg-rose-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Failed (1)
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200/70">
                  <th className="py-3 px-5">Session ID</th>
                  <th className="py-3 px-5">Customer</th>
                  <th className="py-3 px-5">Payment Channel</th>
                  <th className="py-3 px-5">Amount</th>
                  <th className="py-3 px-5">State</th>
                  <th className="py-3 px-5">Tamper-Evident Hash</th>
                  <th className="py-3 px-5 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-5 font-mono font-medium text-slate-700">{tx.id}</td>
                    <td className="py-3.5 px-5 font-bold text-slate-900">{tx.customer}</td>
                    <td className="py-3.5 px-5 text-slate-600">{tx.channel}</td>
                    <td className="py-3.5 px-5 font-extrabold text-slate-800">{tx.amount}</td>
                    <td className="py-3.5 px-5">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                          tx.status === 'Recovered'
                            ? 'bg-[#00BAF2]/15 text-[#007ba1] border border-[#00BAF2]/30'
                            : tx.status === 'Success'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 font-mono text-slate-400 text-[11px]">{tx.auditHash}</td>
                    <td className="py-3.5 px-5 text-right text-slate-400 font-medium">{tx.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>

      </main>

      {/* HUMAN-IN-THE-LOOP (HITL) APPROVAL MODAL */}
      {isHITLModalOpen && selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-150">
            
            {/* Modal Header */}
            <div className="bg-[#001D52] px-6 py-4 text-white flex justify-between items-center border-b border-[#00BAF2]/30">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 bg-[#00BAF2] rounded-lg flex items-center justify-center shadow-md">
                  <ShieldAlert className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm leading-tight text-white">Human Authorization Gate</h3>
                  <p className="text-[10px] font-mono text-slate-300">thread_id: {selectedIncident.threadId}</p>
                </div>
              </div>
              <button
                onClick={() => setIsHITLModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              
              {/* Compliance & Financial Cap Validations */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-emerald-50/70 border border-emerald-200 p-3 rounded-xl">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">DPDP Act 2023 Check</span>
                  <span className="text-emerald-700 font-bold flex items-center mt-1">
                    <Check className="w-3.5 h-3.5 mr-1" />
                    {selectedIncident.targetCount}/{selectedIncident.targetCount} Consent Verified
                  </span>
                </div>
                <div className="bg-blue-50/70 border border-blue-200 p-3 rounded-xl">
                  <span className="text-[10px] font-bold text-[#002970] uppercase tracking-wider block">Safety Guardrail</span>
                  <span className="text-slate-800 font-bold flex items-center mt-1">
                    <Check className="w-3.5 h-3.5 mr-1 text-[#00BAF2]" />
                    {selectedIncident.discount}% Cap (Max allowable: 20%)
                  </span>
                </div>
              </div>

              {/* Meta WhatsApp Template Preview Bubble */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <span className="flex items-center">
                    <Smartphone className="w-3 h-3 mr-1 text-[#00BAF2]" /> Meta Approved Template:
                  </span>
                  <code className="text-[#002970]">reengage_churn_v1</code>
                </div>

                <div className="bg-[#E5DDD5] p-4 rounded-2xl border border-stone-300">
                  <div className="bg-white p-3.5 rounded-xl rounded-tl-none shadow-xs max-w-sm text-xs text-slate-800 leading-relaxed relative">
                    <p>
                      Hi! We noticed you encountered an issue completing your transaction. Use code{' '}
                      <span className="bg-blue-100 text-[#002970] font-mono font-black px-1.5 py-0.5 rounded">
                        {selectedIncident.promoCode}
                      </span>{' '}
                      to get <strong className="text-rose-600">{selectedIncident.discount}% OFF</strong> within the next 30 minutes!
                    </p>
                    <span className="text-[9px] text-slate-400 block text-right mt-1.5 font-medium">11:42 AM</span>
                  </div>
                </div>
              </div>

              {/* Meta Cost Estimate Box */}
              <div className="flex justify-between items-center bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Audience Size</span>
                  <strong className="text-slate-800">{selectedIncident.targetCount} Drop-off Customers</strong>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Meta Estimated Cost</span>
                  <strong className="text-[#002970] text-sm">
                    ₹{(selectedIncident.targetCount * 0.863).toFixed(2)}
                  </strong>
                  <span className="text-[10px] text-slate-400 block">(@ ₹0.863/msg)</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsHITLModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Reject & Abort
                </button>
                <button
                  type="button"
                  onClick={handleAuthorizeResume}
                  className="flex-1 py-2.5 rounded-xl bg-[#002970] hover:bg-[#001D52] text-white text-xs font-bold transition-all shadow-md flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4 text-[#00BAF2]" />
                  <span>Authorize & Resume Agent</span>
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* DASHBOARD BOTTOM BAR */}
      <footer className="w-full bg-[#001D52] text-slate-300 text-xs py-3 px-6 lg:px-10 border-t border-[#00BAF2]/20 flex flex-col sm:flex-row justify-between items-center gap-2 mt-auto">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>PayPulse State-Orchestration Node v2.4 Active</span>
        </div>
        <div className="text-slate-400 text-center sm:text-right">
          © 2026 PayPulse. Engine Thread ID: <code className="text-[#00BAF2]">th_8042_upi</code>
        </div>
      </footer>

    </div>
  );
}