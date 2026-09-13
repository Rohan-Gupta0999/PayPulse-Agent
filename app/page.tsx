"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Activity,
  AlertCircle,
  CheckCircle2,
  TrendingDown,
  PackageMinus,
  Send,
  Play,
  Mail,
  RotateCcw,
  ChevronDown,
  X
} from 'lucide-react';

export default function Dashboard() {
  const router = useRouter();

  // Navigation & Scroll State
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Demo State
  const [demoState, setDemoState] = useState('idle');

  // Contact Support Popup State
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState('Payment issue');
  const [issueDescription, setIssueDescription] = useState('');

  const [logs, setLogs] = useState<string[]>([
    "[10:00:00] AI Agent initialized.",
    "[10:00:05] Monitoring transaction streams...",
    "[10:15:00] Reconciled 42 morning settlements successfully."
  ]);

  // Handle Dynamic Navbar Scroll Logic
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const halfScreenHeight = window.innerHeight / 2;

      if (currentScrollY > halfScreenHeight) {
        if (currentScrollY > lastScrollY) {
          setIsNavVisible(false);
        } else {
          setIsNavVisible(true);
        }
      } else {
        setIsNavVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const triggerAnomaly = () => {
    setDemoState('detecting');
    setLogs(prev => [...prev, "[15:28:10] ⚠️ Anomaly Detected: 34% drop in food order conversions."]);
    setTimeout(() => {
      setDemoState('action_required');
      setLogs(prev => [...prev, "[15:28:12] 🚀 Agent Proposal: Auto-generate 15% discount code for afternoon snack buyers."]);
    }, 1500);
  };

  const approveAction = () => {
    setTimeout(() => {
      setLogs(prev => [...prev, "[15:30:05] ✅ ISSUE RESOLVED. ₹1,500 Revenue Recovered."]);
      setDemoState('resolved');
    }, 2500);
  };

  // Reset functionality to return to idle monitoring
  const resetToIdle = () => {
    setDemoState('idle');
    setLogs([
      "[10:00:00] AI Agent initialized.",
      "[10:00:05] Monitoring transaction streams...",
      "[10:15:00] Reconciled 42 morning settlements successfully."
    ]);
  };

  const scrollToDashboard = () => {
    document.getElementById('dashboard')?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToTop = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 overflow-x-hidden flex flex-col justify-between">
      
      {/* DYNAMIC GLASSMORPHIC NAVBAR */}
      <nav
        className={`fixed top-0 w-full z-50 transition-transform duration-300 ease-in-out ${
          isNavVisible ? 'translate-y-0' : '-translate-y-full'
        } bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-6 lg:px-12 py-3.5 flex justify-between items-center shadow-sm`}
      >
        {/* Brand Logo & Name */}
        <div
          onClick={() => window.location.reload()}
          className="flex items-center space-x-2.5 cursor-pointer select-none group"
          title="Refresh Dashboard"
        >
          <div className="w-8 h-8 bg-[#00BAF2] rounded-xl flex items-center justify-center shadow-md shadow-[#00BAF2]/25 group-hover:scale-105 transition-transform">
            <ShieldCheck className="text-white w-5 h-5" />
          </div>
          <span className="text-xl font-black tracking-tight text-[#002970]">
            PayPulse
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => router.push('/login?mode=login')}
            className="px-5 py-2 rounded-full border border-slate-200 text-xs md:text-sm font-semibold text-slate-700 hover:bg-slate-100/80 transition-all duration-150"
          >
            Login
          </button>
          <button
            onClick={() => router.push('/login?mode=signup')}
            className="px-5 py-2 rounded-full bg-[#00BAF2] hover:bg-[#009fd0] text-white text-xs md:text-sm font-semibold transition-all duration-150 shadow-md shadow-[#00BAF2]/25"
          >
            Sign Up
          </button>
        </div>
      </nav>
     {/* SECTION 1: LANDING PAGE HERO */}
      <section className="relative min-h-[90vh] flex items-center justify-center pt-24 pb-16 px-6 text-center overflow-hidden">
        {/* Soft, Eye-Soothing Dotted Grid with Radial Fade */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(#00BAF2_1.2px,transparent_1.2px)] [background-size:24px_24px] opacity-[0.14] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_45%,#000_70%,transparent_100%)]" />
        
        {/* Calming Center Ambient Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[350px] bg-gradient-to-tr from-[#00BAF2]/15 via-blue-100/30 to-transparent blur-3xl pointer-events-none rounded-full" />

        <div className="relative max-w-5xl mx-auto space-y-7 z-10">
          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[1.08] text-center">
            <span className="block text-[#002970] whitespace-nowrap">
              Your business runs.
            </span>
            <span className="block text-[#00BAF2] whitespace-nowrap drop-shadow-[0_4px_20px_rgba(0,186,242,0.25)]">
              PayPulse watches.
            </span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-slate-600 font-normal max-w-2xl mx-auto leading-relaxed">
            Autonomous anomaly detection, instant merchant recovery proposals, and seamless payment operations.
          </p>

          <div className="pt-2">
            <button
              onClick={scrollToDashboard}
              className="px-9 py-4 bg-[#002970] hover:bg-[#001D52] text-white rounded-full font-bold text-base md:text-lg transition-all duration-200 shadow-xl shadow-[#002970]/25 hover:shadow-2xl hover:-translate-y-0.5 inline-flex items-center space-x-2.5 cursor-pointer"
            >
              <span>See Live Demo</span>
              <ChevronDown className="w-5 h-5 animate-bounce" />
            </button>
          </div>
        </div>
      </section>

      {/* SECTION 2: THE DASHBOARD */}
      <section id="dashboard" className="min-h-screen py-20 px-6 lg:px-12 max-w-7xl mx-auto w-full">
        <div className="mb-8 flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold text-[#002970]">AI Operations Command</h2>
            <p className="text-slate-500 mt-1">Autonomous monitoring active across transaction endpoints.</p>
          </div>

          {demoState === 'idle' && (
            <button
              onClick={triggerAnomaly}
              className="flex items-center px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-medium transition-colors shadow-sm"
            >
              <Play className="w-4 h-4 mr-2" />
              Trigger Anomaly Demo
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* LEFT: THE AGENT BRAIN */}
          <div className="bg-[#002970] rounded-2xl overflow-hidden shadow-xl border border-slate-800 flex flex-col h-[450px]">
            <div className="bg-[#001D52] px-5 py-3.5 flex justify-between items-center border-b border-slate-700/50">
              <span className="text-slate-300 text-xs font-mono font-bold flex items-center space-x-2">
                <Activity className="w-4 h-4 text-[#00BAF2] animate-pulse" />
                <span>AGENT EXECUTION LOGS</span>
              </span>
              <span className="flex space-x-1.5">
                <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
              </span>
            </div>

            <div className="p-5 font-mono text-sm space-y-3 overflow-y-auto flex-1 text-slate-200">
              {logs.map((log, index) => (
                <div key={index} className="leading-relaxed">
                  {log.includes('⚠️') ? <span className="text-amber-300 font-semibold">{log}</span> :
                   log.includes('✅') || log.includes('🚀') ? <span className="text-emerald-400 font-semibold">{log}</span> :
                   log}
                </div>
              ))}
              {demoState === 'detecting' && (
                <div className="flex space-x-2 items-center text-slate-400">
                  <div className="w-2 h-2 bg-[#00BAF2] rounded-full animate-ping"></div>
                  <span>Analyzing payload streams...</span>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: MERCHANT COMMAND CENTER */}
          <div className="flex flex-col min-h-[450px] bg-white rounded-2xl border border-slate-200 p-6 shadow-xl justify-center">
            {demoState === 'idle' || demoState === 'detecting' ? (
              <div className="text-center space-y-4 py-8">
                <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto relative">
                  <ShieldCheck className="w-10 h-10" />
                  <div className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-ping opacity-25"></div>
                </div>
                <h3 className="text-2xl font-bold text-slate-800">All Systems Nominal</h3>
                <p className="text-slate-500 max-w-sm mx-auto text-sm">
                  PayPulse is actively monitoring transaction health. No action required.
                </p>
              </div>
            ) : demoState === 'action_required' ? (
              <div className="space-y-6">
                <div className="flex items-center space-x-3 text-amber-600 bg-amber-50 p-4 rounded-xl border border-amber-200">
                  <AlertCircle className="w-6 h-6 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-sm">Action Recommended</h4>
                    <p className="text-xs text-amber-700">Drop in orders detected in last 30 minutes.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="flex justify-between items-center text-xs text-slate-500 mb-1">
                      <span>Conversion Drop</span>
                      <TrendingDown className="w-4 h-4 text-rose-500" />
                    </div>
                    <p className="text-2xl font-extrabold text-slate-800">-34%</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="flex justify-between items-center text-xs text-slate-500 mb-1">
                      <span>Abandoned Carts</span>
                      <PackageMinus className="w-4 h-4 text-amber-500" />
                    </div>
                    <p className="text-2xl font-extrabold text-slate-800">48 Items</p>
                  </div>
                </div>

                <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-100 space-y-2">
                  <h4 className="text-xs font-bold text-[#002970] flex items-center space-x-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#00BAF2]" />
                    <span>Agent Recovery Strategy</span>
                  </h4>
                  <p className="text-slate-700 text-xs italic">
                    "Craving a quick bite? Use code QUICK15 for 15% off next order."
                  </p>
                  <div className="text-xs text-slate-500 flex items-center space-x-1">
                    <Send className="w-3 h-3 text-[#00BAF2]" />
                    <span>Targeting 85 past afternoon buyers</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button className="flex-1 py-3 border border-slate-300 rounded-xl text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors">
                    Edit Offer
                  </button>
                  <button
                    onClick={approveAction}
                    className="flex-1 py-3 bg-[#00BAF2] hover:bg-[#00a3d4] text-white rounded-xl text-sm font-semibold transition-colors shadow-md"
                  >
                    Approve & Broadcast
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-6 py-6">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-slate-800">Strategy Executed!</h3>
                  <p className="text-slate-600 text-sm mt-1">Snack promo successfully delivered to 85 customers.</p>
                </div>

                <div className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-around items-center">
                  <div className="text-center">
                    <p className="text-xs text-slate-500 font-medium">Revenue Recovered</p>
                    <p className="text-3xl font-extrabold text-emerald-600">₹1,500</p>
                  </div>
                  <div className="w-px h-10 bg-slate-200"></div>
                  <div className="text-center">
                    <p className="text-xs text-slate-500 font-medium">Conversions Restored</p>
                    <p className="text-3xl font-extrabold text-[#002970]">+28%</p>
                  </div>
                </div>

                <button
                  onClick={resetToIdle}
                  className="flex items-center mx-auto px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Resume Monitoring
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

{/* FOOTER SECTION */}
      <footer className="w-full bg-[#001D52] text-slate-200 font-sans mt-auto border-t border-[#00BAF2]/30 shadow-inner">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-5">
          
          {/* TOP SECTION: 4 COLUMNS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-4 border-b border-white/10">
            
            {/* COLUMN 1: BRAND */}
            <div className="space-y-2.5">
              <div className="flex items-center space-x-2.5">
                <div className="w-7 h-7 bg-[#00BAF2] rounded-lg flex items-center justify-center shadow-md shadow-[#00BAF2]/25">
                  <ShieldCheck className="text-white w-4 h-4" />
                </div>
                <span className="text-lg font-bold tracking-tight text-white">
                  PayPulse
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed max-w-[240px]">
                Intelligent payment monitoring and autonomous revenue recovery.
              </p>
            </div>

            {/* COLUMN 2: PRODUCT (Modes & Pricing Removed) */}
            <div>
              <h4 className="text-xs font-bold text-[#00BAF2] uppercase tracking-wider mb-2.5">
                Product
              </h4>
              <ul className="space-y-2 text-xs font-medium text-slate-300">
                {['How it works', 'Features'].map((item) => (
                  <li key={item}>
                    <a
                      href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                      onClick={(e) => {
                        e.preventDefault();
                        scrollToDashboard();
                      }}
                      className="hover:text-white transition-colors inline-block hover:translate-x-1 transform duration-150"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* COLUMN 3: COMPANY */}
            <div>
              <h4 className="text-xs font-bold text-[#00BAF2] uppercase tracking-wider mb-2.5">
                Company
              </h4>
              <ul className="space-y-2 text-xs font-medium text-slate-300">
                <li>
                  <a
                    href="#"
                    onClick={scrollToTop}
                    className="hover:text-white transition-colors inline-block hover:translate-x-1 transform duration-150 cursor-pointer"
                  >
                    About
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    className="hover:text-white transition-colors inline-block hover:translate-x-1 transform duration-150"
                  >
                    Careers
                  </a>
                </li>
              </ul>
            </div>

            {/* COLUMN 4: LEGAL & RIGHT-ALIGNED CONTACT SUPPORT */}
            <div className="flex justify-between items-start gap-4">
              <div className="shrink-0">
                <h4 className="text-xs font-bold text-[#00BAF2] uppercase tracking-wider mb-2.5">
                  Legal
                </h4>
                <ul className="space-y-2 text-xs font-medium text-slate-300">
                  {['Privacy policy', 'Terms of service'].map((item) => (
                    <li key={item}>
                      <a
                        href="#"
                        onClick={(e) => e.preventDefault()}
                        className="hover:text-white transition-colors inline-block hover:translate-x-1 transform duration-150 whitespace-nowrap"
                      >
                        {item}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Contact Support Button - Aligned with Privacy Policy row */}
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsSupportOpen(true)}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#00BAF2]/15 hover:bg-[#00BAF2]/25 border border-[#00BAF2]/40 hover:border-[#00BAF2] text-white rounded-full transition-all duration-150 shadow-sm group text-xs font-semibold cursor-pointer whitespace-nowrap translate-x-3 hover:translate-x-4"
                >
                  <Mail className="w-3.5 h-3.5 text-[#00BAF2] group-hover:scale-110 transition-transform" />
                  <span>Contact Support</span>
                </button>
              </div>
            </div>

          </div>

          {/* BOTTOM SECTION: COMPACT COPYRIGHT */}
          <div className="pt-3 text-center">
            <p className="text-[11px] text-slate-400">
              © 2026 PayPulse. Made with precision in India.
            </p>
          </div>

        </div>
      </footer>
      
      {/* CONTACT SUPPORT POPUP MODAL */}
      {isSupportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden relative">
            
            {/* Modal Header */}
            <div className="bg-[#001D52] px-6 py-5 text-white flex justify-between items-center border-b border-[#00BAF2]/30">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 bg-[#00BAF2] rounded-lg flex items-center justify-center shadow-md">
                  <Mail className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight text-white">Contact Support</h3>
                  <p className="text-xs text-slate-300">How can we help you today?</p>
                </div>
              </div>
              <button
                onClick={() => setIsSupportOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              
              {/* Option Cards */}
              <div className="space-y-2">
                {[
                  {
                    title: 'Payment issue',
                    desc: 'Payment failed, pending, or settlement problem'
                  },
                  {
                    title: 'Account / Login',
                    desc: 'Sign in, sign up, or account related issue'
                  },
                  {
                    title: 'Dashboard / AI Agent',
                    desc: 'Monitoring, alerts, campaigns, or dashboard issue'
                  },
                  {
                    title: 'Other issue',
                    desc: 'Anything else you need help with'
                  }
                ].map((opt) => (
                  <div
                    key={opt.title}
                    onClick={() => setSelectedIssue(opt.title)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      selectedIssue === opt.title
                        ? 'border-[#00BAF2] bg-blue-50/50 shadow-sm ring-1 ring-[#00BAF2]'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <p className={`text-xs font-bold ${selectedIssue === opt.title ? 'text-[#002970]' : 'text-slate-800'}`}>
                      {opt.title}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {opt.desc}
                    </p>
                  </div>
                ))}
              </div>

              {/* Issue Description Field */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Describe your issue
                </label>
                <textarea
                  rows={3}
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  placeholder="Tell us what went wrong..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-[#00BAF2] focus:ring-1 focus:ring-[#00BAF2] bg-slate-50 resize-none text-slate-800"
                />
              </div>

              {/* Send Request Button */}
              <button
                type="button"
                onClick={() => {
                  alert('Thank you! Your request has been logged.');
                  setIsSupportOpen(false);
                  setIssueDescription('');
                }}
                className="w-full py-2.5 bg-[#002970] hover:bg-[#001D52] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>Send Request</span>
                <Send className="w-3.5 h-3.5 text-[#00BAF2]" />
              </button>

              {/* Support Details Info Box */}
              <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center text-[11px] text-slate-500 gap-1 bg-slate-50 p-2.5 rounded-xl">
                <div>
                  <span className="font-semibold text-slate-700">Support Email: </span>
                  <a 
                    href="https://mail.google.com/mail/?view=cm&fs=1&to=paypulseagent@gmail.com&su=PayPulse%20Support%20Request" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[#00BAF2] font-semibold hover:underline"
                  >
                    paypulseagent@gmail.com
                  </a>
                </div>
                <div className="text-slate-400">
                  Response time: <span className="text-emerald-600 font-medium">Within 24 hours</span>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}