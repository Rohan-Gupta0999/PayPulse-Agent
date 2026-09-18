"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Store,
  ArrowRight,
  UploadCloud,
  BrainCircuit,
  ShieldCheck,
  Send,
  Sparkles,
  CheckCircle2,
  Database,
  Cpu,
  Lock,
  PauseCircle,
  FileSpreadsheet,
  AlertTriangle,
  Smartphone,
  Check,
} from "lucide-react";

export default function Page() {
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="min-h-screen bg-[#fafbfc] text-slate-900 flex flex-col font-sans selection:bg-[#00BAF2]/20 selection:text-[#002970] scroll-smooth relative overflow-x-hidden">
      
      {/* High-Definition Cursor-Reactive Dot Canvas */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(#002970_1.15px,transparent_1.15px)] [background-size:22px_22px] opacity-[0.12]" />

      {/* Reactive cursor illumination layer */}
      <div
        className="fixed inset-0 pointer-events-none bg-[radial-gradient(#00BAF2_1.5px,transparent_1.5px)] [background-size:22px_22px] opacity-100"
        style={{
          maskImage: `radial-gradient(280px circle at ${mousePos.x}px ${mousePos.y}px, black 25%, transparent 80%)`,
          WebkitMaskImage: `radial-gradient(280px circle at ${mousePos.x}px ${mousePos.y}px, black 25%, transparent 80%)`,
        }}
      />

      {/* Ambient specular glow */}
      <div
        className="fixed inset-0 pointer-events-none transition-opacity duration-300"
        style={{
          background: `radial-gradient(420px circle at ${mousePos.x}px ${mousePos.y}px, rgba(0, 186, 242, 0.085), transparent 80%)`,
        }}
      />

      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_900px_at_50%_-10%,rgba(0,186,242,0.06),transparent)]" />
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_700px_at_90%_75%,rgba(0,41,112,0.03),transparent)]" />

      {/* macOS Liquid Glass Top Bar */}
      <header className="sticky top-0 z-50 bg-white/40 backdrop-blur-2xl backdrop-saturate-200 border-b border-white/50 px-6 lg:px-12 py-3.5 flex justify-between items-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9),0_6px_24px_-4px_rgba(0,41,112,0.04)] transition-all">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 bg-gradient-to-br from-[#00BAF2] to-[#0090bf] rounded-2xl flex items-center justify-center shadow-[0_2px_8px_rgba(0,186,242,0.35)]">
            <Store className="text-white w-5 h-5" />
          </div>
          <span className="text-xl font-black tracking-tight text-[#002970]">PayPulse</span>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href="/login"
            className="inline-flex items-center space-x-2 px-4 py-2 bg-[#002970]/90 hover:bg-[#002970] text-white text-xs font-bold rounded-xl shadow-[0_2px_10px_rgba(0,41,112,0.2)] backdrop-blur-md transition-all cursor-pointer active:scale-95"
          >
            <span>Launch Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#00BAF2]" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 lg:px-12 relative z-10">
        <section className="min-h-[calc(100vh-4.5rem)] flex flex-col justify-center items-center text-center max-w-3xl mx-auto space-y-6 pb-20 pt-4 -translate-y-5 sm:-translate-y-8">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white/70 backdrop-blur-md border border-blue-200/70 text-xs font-bold text-[#002970] shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#00BAF2]" />
            <span>Autonomous AI Retail Retention & Merchant Intelligence</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[#002970] leading-tight">
            Turn Raw POS Ledgers Into <br />
            <span className="text-[#00BAF2]">Automatic Footfall & Profit</span>
          </h1>

          <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
            <Link
              href="/login"
              className="w-full sm:w-auto px-7 py-3.5 bg-[#002970] hover:bg-[#001D52] text-white text-sm font-black rounded-2xl shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-95"
            >
              <span>Launch Dashboard</span>
              <ArrowRight className="w-4 h-4 text-[#00BAF2]" />
            </Link>
            <a
              href="#agents-explained"
              className="w-full sm:w-auto px-6 py-3.5 bg-white/80 hover:bg-white backdrop-blur-md border border-slate-200 text-slate-700 text-sm font-bold rounded-2xl shadow-xs transition-colors text-center cursor-pointer"
            >
              How The AI Agents Work ↓
            </a>
          </div>
        </section>

        {/* Visual Multi-Agent Architecture */}
        <section id="agents-explained" className="space-y-8 pt-16 pb-20 scroll-mt-20">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-800 text-[11px] font-black uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              <span>Multi-Agent Architecture</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#002970]">
              The 4 AI Agents Powering PayPulse
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
              How autonomous agents collaborate asynchronously to safeguard merchant margins and drive customer lifetime value.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Visual Card 1: Monitor Agent */}
            <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200/90 shadow-sm hover:border-[#00BAF2] transition-all flex flex-col justify-between space-y-5 group">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 bg-blue-50 text-[#00BAF2] rounded-2xl flex items-center justify-center border border-blue-100 shadow-2xs">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <span className="px-2.5 py-0.5 bg-blue-50 text-[#002970] border border-blue-200/60 rounded-full text-[10px] font-mono font-bold uppercase">
                    Agent 1 · Monitor Sentinel
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-black text-[#002970]">The Monitor Agent</h3>
                  <p className="text-xs font-semibold text-slate-500">Autonomous POS Ledger Sentinel</p>
                </div>
              </div>

              {/* Visual Component: Live POS Ledger Scanner */}
              <div className="bg-slate-900 rounded-2xl p-3.5 text-white font-mono text-[11px] space-y-2.5 shadow-inner border border-slate-800">
                <div className="flex items-center justify-between text-[10px] text-slate-400 border-b border-slate-800 pb-2">
                  <span className="flex items-center space-x-1.5">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-[#00BAF2]" />
                    <span>store_ledger.csv</span>
                  </span>
                  <span className="text-emerald-400 flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Delta Active</span>
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between bg-slate-800/60 px-2.5 py-1.5 rounded-lg">
                    <span className="text-slate-300">...8901 • Aarav S.</span>
                    <span className="text-emerald-400 font-bold">Active Regular</span>
                  </div>
                  <div className="flex items-center justify-between bg-rose-500/15 border border-rose-500/30 px-2.5 py-1.5 rounded-lg text-rose-300">
                    <span className="flex items-center space-x-1.5">
                      <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                      <span>...4567 • Diya C. (54d away)</span>
                    </span>
                    <span className="text-rose-400 font-bold uppercase text-[10px]">Flagged Churned</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Card 2: Strategist Agent */}
            <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200/90 shadow-sm hover:border-purple-400 transition-all flex flex-col justify-between space-y-5 group">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center border border-purple-100 shadow-2xs">
                    <BrainCircuit className="w-5 h-5" />
                  </div>
                  <span className="px-2.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200/60 rounded-full text-[10px] font-mono font-bold uppercase">
                    Agent 2 · Strategist Engine
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-black text-[#002970]">The Strategist Agent</h3>
                  <p className="text-xs font-semibold text-slate-500">Unit-Economic Optimization & Copy Engine</p>
                </div>
              </div>

              {/* Visual Component: Gemini Prompt & Coupon Card */}
              <div className="bg-gradient-to-br from-purple-50/80 to-indigo-50/50 rounded-2xl p-3.5 border border-purple-100 text-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1 text-purple-700 text-[10px] font-bold">
                    <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                    <span>Gemini Dynamic Sizing</span>
                  </div>
                  <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded-md border border-purple-200 text-purple-600 font-bold">
                    Margin Safe: 68%
                  </span>
                </div>

                <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-purple-100 shadow-2xs">
                  <div>
                    <div className="text-[10px] text-slate-400">Target Customer LTV</div>
                    <div className="font-bold text-slate-800 text-xs">₹15,193 (High Patron)</div>
                  </div>
                  <div className="px-2.5 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-mono font-black text-xs rounded-lg shadow-xs flex items-center space-x-1">
                    <span>VIP20</span>
                    <span className="text-purple-200">• 20% OFF</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-[10px] text-purple-900 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  <span>Personalized bilingual message ready (English + Hindi)</span>
                </div>
              </div>
            </div>

            {/* Visual Card 3: HITL Gatekeeper */}
            <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200/90 shadow-sm hover:border-amber-400 transition-all flex flex-col justify-between space-y-5 group">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center border border-amber-100 shadow-2xs">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200/60 rounded-full text-[10px] font-mono font-bold uppercase">
                    Agent 3 · LangGraph Interrupt
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-black text-[#002970]">The Human-in-the-Loop Gatekeeper</h3>
                  <p className="text-xs font-semibold text-slate-500">Governance & Merchant Control Boundary</p>
                </div>
              </div>

              {/* Visual Component: State Machine Interrupt Card */}
              <div className="bg-gradient-to-br from-amber-50/70 to-orange-50/40 rounded-2xl p-3.5 border border-amber-200/80 text-xs space-y-2.5">
                <div className="flex items-center justify-between text-[10px] font-bold text-amber-800">
                  <span className="flex items-center space-x-1.5">
                    <PauseCircle className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                    <span>Workflow Paused: interrupt()</span>
                  </span>
                  <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-amber-200 text-amber-700">
                    Awaiting Decision
                  </span>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-amber-100 shadow-2xs flex items-center justify-between">
                  <div className="text-[11px]">
                    <span className="font-bold text-slate-800">Rohan Mehta</span>
                    <span className="text-slate-400 ml-1.5">(15% Comeback Offer)</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="px-2.5 py-1 bg-slate-900 text-white text-[10px] font-bold rounded-lg flex items-center space-x-1 shadow-xs">
                      <Check className="w-3 h-3 text-[#00BAF2]" />
                      <span>Approve</span>
                    </span>
                    <span className="px-2 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-lg">
                      Skip
                    </span>
                  </div>
                </div>

                <p className="text-[10px] text-amber-900 font-medium">
                  Zero unauthorized messages. Total merchant oversight maintained.
                </p>
              </div>
            </div>

            {/* Visual Card 4: Dispatcher & Feedback Agent */}
            <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200/90 shadow-sm hover:border-emerald-400 transition-all flex flex-col justify-between space-y-5 group">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-100 shadow-2xs">
                    <Send className="w-5 h-5" />
                  </div>
                  <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-full text-[10px] font-mono font-bold uppercase">
                    Agent 4 · Cloud Dispatcher
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-black text-[#002970]">The Dispatcher & Feedback Agent</h3>
                  <p className="text-xs font-semibold text-slate-500">Multi-Channel Delivery & Campaign Auditor</p>
                </div>
              </div>

              {/* Visual Component: Live WhatsApp Preview & Supabase Sync */}
              <div className="bg-slate-900 rounded-2xl p-3.5 text-white text-xs space-y-2.5 border border-slate-800 shadow-inner">
                <div className="flex items-center justify-between text-[10px] border-b border-slate-800 pb-2">
                  <span className="flex items-center space-x-1.5 text-emerald-400 font-bold">
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>WhatsApp Cloud API</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Status: Delivered ✓✓</span>
                </div>

                <div className="bg-emerald-950/40 border border-emerald-500/20 p-2.5 rounded-xl space-y-1">
                  <p className="text-[11px] text-emerald-100 leading-tight">
                    "Namaste Rohan! We noticed it's been a while. Here is <strong>15% OFF</strong> on your next visit with coupon <strong>LOYAL15</strong>!"
                  </p>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1">
                  <span>Supabase Audit Log:</span>
                  <span className="text-emerald-400 font-bold">CAMPAIGN_APPROVED</span>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* Bottom Callout Banner */}
        <section className="bg-gradient-to-r from-[#002970] to-[#001D52] text-white p-8 sm:p-10 rounded-3xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6 mb-20 relative overflow-hidden">
          <div className="space-y-1 text-center sm:text-left relative z-10">
            <h3 className="text-xl sm:text-2xl font-black tracking-tight">Experience PayPulse Live</h3>
            <p className="text-xs sm:text-sm text-blue-200 max-w-md">
              Upload your weekly ledger, observe real-time pipeline telemetry, and review retention campaigns.
            </p>
          </div>
          <Link
            href="/login"
            className="px-6 py-3.5 bg-[#00BAF2] hover:bg-[#00a3d4] text-[#002970] text-xs font-black rounded-2xl shadow-md transition-transform active:scale-95 flex items-center space-x-2 shrink-0 cursor-pointer relative z-10"
          >
            <span>Launch Operator Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </section>
      </main>

      {/* Professional Multi-Column Footer */}
      <footer className="border-t border-slate-200/80 bg-white/80 backdrop-blur-lg text-slate-600 pt-14 pb-8 relative z-10">
        <div className="max-w-7xl w-full mx-auto px-6 lg:px-12 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pb-10 border-b border-slate-100">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 bg-[#00BAF2] rounded-xl flex items-center justify-center shadow-xs">
                  <Store className="text-white w-4 h-4" />
                </div>
                <span className="text-lg font-black tracking-tight text-[#002970]">PayPulse</span>
              </div>
              <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                Autonomous AI retail intelligence and retention operating system. Converting raw transaction ledgers into dynamic retention campaigns and verifiable store profit.
              </p>
              <div className="inline-flex items-center space-x-2 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-[11px] font-semibold text-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>All Agent Systems Operational</span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <h4 className="font-black uppercase tracking-wider text-slate-900 text-[11px]">Architecture</h4>
              <ul className="space-y-2 text-slate-500">
                <li className="flex items-center space-x-1.5 hover:text-[#002970] transition-colors">
                  <Cpu className="w-3.5 h-3.5 text-[#00BAF2]" />
                  <span>LangGraph Orchestrator</span>
                </li>
                <li className="flex items-center space-x-1.5 hover:text-[#002970] transition-colors">
                  <Database className="w-3.5 h-3.5 text-[#00BAF2]" />
                  <span>Supabase / PostgreSQL</span>
                </li>
                <li className="flex items-center space-x-1.5 hover:text-[#002970] transition-colors">
                  <Sparkles className="w-3.5 h-3.5 text-[#00BAF2]" />
                  <span>Gemini Strategist Node</span>
                </li>
                <li className="flex items-center space-x-1.5 hover:text-[#002970] transition-colors">
                  <Send className="w-3.5 h-3.5 text-[#00BAF2]" />
                  <span>Meta WhatsApp Cloud API</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3 text-xs">
              <h4 className="font-black uppercase tracking-wider text-slate-900 text-[11px]">Capabilities</h4>
              <ul className="space-y-2 text-slate-500">
                <li className="hover:text-[#002970] transition-colors">7-Day POS Ledger Ingestion</li>
                <li className="hover:text-[#002970] transition-colors">Delta Churn Detection</li>
                <li className="hover:text-[#002970] transition-colors">Dynamic Margin Sizing</li>
                <li className="hover:text-[#002970] transition-colors">Human-in-the-Loop Gate</li>
                <li className="hover:text-[#002970] transition-colors">Historical Performance Snapshots</li>
              </ul>
            </div>

            <div className="space-y-3 text-xs">
              <h4 className="font-black uppercase tracking-wider text-slate-900 text-[11px]">Security & Governance</h4>
              <ul className="space-y-2 text-slate-500">
                <li className="flex items-center space-x-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Merchant-Gated Approval</span>
                </li>
                <li className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Immutable Audit Ledger</span>
                </li>
                <li className="flex items-center space-x-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                  <span>Isolated Data Partitioning</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
            <p>© 2026 PayPulse Technologies Inc. All rights reserved.</p>
            <div className="flex items-center space-x-6 text-slate-500">
              <span className="hover:text-slate-700 cursor-pointer">Privacy Policy</span>
              <span>•</span>
              <span className="hover:text-slate-700 cursor-pointer">Terms of Service</span>
              <span>•</span>
              <span className="hover:text-slate-700 cursor-pointer">Security Protocol</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}