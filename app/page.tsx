"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Activity, AlertCircle, CheckCircle2, TrendingDown, PackageMinus, Send, Play, ArrowLeft, ChevronDown, RotateCcw } from 'lucide-react';

export default function Dashboard() {
  const router = useRouter();

  // Navigation & Scroll State
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Demo State
  const [demoState, setDemoState] = useState('idle');
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

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Hackathon Demo Functions
  const triggerAnomaly = () => {
    setDemoState('detecting');
    
    setTimeout(() => {
      setLogs(prev => [...prev, "[14:42:01] ⚠️ ANOMALY: Tuesday afternoon order volume down 62%."]);
    }, 1000);
    
    setTimeout(() => {
      setLogs(prev => [...prev, "[14:42:02] 🔍 Executing tool: check_inventory_status()..."]);
    }, 2500);

    setTimeout(() => {
      setLogs(prev => [...prev, "[14:42:04] 📦 Found 22 surplus sandwich portions expiring soon."]);
      setLogs(prev => [...prev, "[14:42:05] 🧠 Executing tool: generate_campaign(target='afternoon_regulars')..."]);
    }, 4000);

    setTimeout(() => {
      setLogs(prev => [...prev, "[14:42:07] ⏸️ Campaign drafted. Awaiting merchant approval."]);
      setDemoState('action_required');
    }, 5500);
  };

  const approveAction = () => {
    setLogs(prev => [...prev, "[14:45:00] ✅ Merchant approved action."]);
    setLogs(prev => [...prev, "[14:45:01] 🚀 Executing tool: dispatch_whatsapp_blast(count=85)..."]);
    
    setTimeout(() => {
      setLogs(prev => [...prev, "[15:30:00] 📊 Tracking results: 14 redemptions verified."]);
      setLogs(prev => [...prev, "[15:30:05] 🟢 ISSUE RESOLVED. ₹1,386 revenue recovered."]);
      setDemoState('resolved');
    }, 2500);
  };

  // NEW: Reset functionality to return to idle monitoring
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

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 overflow-x-hidden">
      
      {/* DYNAMIC GLASSMORPHIC NAVBAR */}
      <nav 
        className={`fixed top-0 w-full z-50 transition-transform duration-300 ease-in-out ${
          isNavVisible ? 'translate-y-0' : '-translate-y-full'
        } bg-white/70 backdrop-blur-md border-b border-slate-200/50 px-6 py-4 flex justify-between items-center shadow-sm`}
      >
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => router.back()} 
            className="p-2 hover:bg-slate-200/50 rounded-full text-slate-600 transition-colors"
            title="Go Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div 
            onClick={() => window.location.reload()} 
            className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
            title="Refresh Dashboard"
          >
            <div className="w-8 h-8 bg-[#00BAF2] rounded-md flex items-center justify-center shadow-sm">
              <ShieldCheck className="text-white w-5 h-5" />
            </div>
            <span className="text-xl font-bold text-[#002970] tracking-tight hidden sm:block">
              AI Business Operator
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-4 text-sm font-medium text-slate-600">
          <span className="flex items-center bg-green-50/50 px-3 py-1 rounded-full border border-green-100 backdrop-blur-sm">
            <Activity className="w-4 h-4 text-green-500 mr-2 animate-pulse" /> Agent Active
          </span>
          <div className="h-8 w-8 bg-slate-200/80 rounded-full flex items-center justify-center text-[#002970] font-bold shadow-inner">
            R
          </div>
        </div>
      </nav>

      {/* SECTION 1: LANDING PAGE HERO */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 pt-20">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#00BAF2] opacity-10 blur-[100px] rounded-full"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#002970] opacity-5 blur-[100px] rounded-full"></div>
        </div>

        <div className="max-w-3xl mx-auto space-y-8 animate-fade-in-up">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-600 font-semibold text-sm mb-4 shadow-sm">
            <ShieldCheck className="w-4 h-4 mr-2" />
            Hackathon Prototype 1.0
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold text-[#002970] tracking-tight leading-tight">
            Your business runs. <br />
            <span className="text-[#00BAF2]">AI watches.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Stop staring at dashboards. Your autonomous AI teammate detects payment anomalies, 
            identifies expiring inventory, and launches recovery campaigns—all while you focus on your customers.
          </p>
          
          <button 
            onClick={scrollToDashboard}
            className="mt-8 px-8 py-4 bg-[#002970] hover:bg-[#001D52] text-white rounded-full font-bold text-lg shadow-xl shadow-blue-900/20 transition-transform hover:scale-105 flex items-center mx-auto"
          >
            See Live Demo <ChevronDown className="ml-2 w-5 h-5 animate-bounce" />
          </button>
        </div>
      </section>

      {/* SECTION 2: THE DASHBOARD */}
      <section id="dashboard" className="min-h-screen py-24 px-6 bg-slate-100/50">
        <div className="max-w-7xl mx-auto">
          
          <div className="mb-8 flex justify-between items-end">
            <div>
              <h2 className="text-3xl font-bold text-[#002970]">Command Center</h2>
              <p className="text-slate-500 mt-1">Live monitoring and action terminal</p>
            </div>
            
            {demoState === 'idle' && (
              <button 
                onClick={triggerAnomaly} 
                className="flex items-center text-sm font-semibold bg-white border border-slate-300 hover:border-[#00BAF2] hover:text-[#00BAF2] text-slate-700 py-2 px-4 rounded-full shadow-sm transition-all"
              >
                <Play className="w-4 h-4 mr-2 text-[#00BAF2]" /> Inject Slow Hours Anomaly
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            
            {/* LEFT: THE AGENT BRAIN */}
            <div className="bg-[#002970] rounded-2xl shadow-xl overflow-hidden flex flex-col min-h-[600px] h-full border border-slate-800 relative z-10">
              <div className="bg-[#001D52] px-4 py-3 flex justify-between items-center border-b border-slate-700">
                <span className="text-slate-300 text-sm font-medium flex items-center">
                  <Activity className="w-4 h-4 mr-2 text-[#00BAF2]" /> Agent Activity Stream
                </span>
                <span className="flex space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </span>
              </div>
              <div className="p-5 overflow-y-auto flex-1 font-mono text-sm text-slate-300 space-y-3">
                {logs.map((log, index) => (
                  <div key={index} className="animate-fade-in-up">
                    {log.includes('⚠️') ? <span className="text-yellow-400">{log}</span> : 
                     log.includes('✅') || log.includes('🟢') ? <span className="text-green-400">{log}</span> :
                     log.includes('🚀') || log.includes('🧠') ? <span className="text-[#00BAF2]">{log}</span> :
                     log}
                  </div>
                ))}
                {demoState === 'detecting' && (
                  <div className="flex space-x-1 items-center text-slate-500 mt-2">
                    <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                    <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: MERCHANT COMMAND CENTER */}
            <div className="flex flex-col min-h-[600px] h-full relative z-10">
              {demoState === 'idle' || demoState === 'detecting' ? (
                
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 flex flex-col items-center justify-center h-full text-center">
                  <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6 relative">
                    <ShieldCheck className="w-10 h-10 text-[#00BAF2] relative z-10" />
                    <div className="absolute inset-0 border-4 border-[#00BAF2] rounded-full opacity-20 animate-ping"></div>
                  </div>
                  <h3 className="text-2xl font-bold text-[#002970] mb-3">All Systems Optimal</h3>
                  <p className="text-slate-500 max-w-sm">Your AI teammate is continuously monitoring transactions, inventory, and settlements in the background.</p>
                </div>
              
              ) : demoState === 'action_required' ? (
                
                <div className="bg-white rounded-2xl shadow-2xl border-2 border-yellow-400 p-6 flex flex-col h-full animate-in fade-in zoom-in duration-300">
                  <div className="flex items-center text-yellow-700 mb-4 font-bold bg-yellow-50 px-4 py-2 rounded-full w-max border border-yellow-200 text-sm">
                    <AlertCircle className="w-4 h-4 mr-2" /> Action Required
                  </div>
                  
                  {/* Reduced text-size from 3xl to 2xl to fit better */}
                  <h2 className="text-2xl font-extrabold text-[#002970] mb-4 leading-tight">
                    Tuesday afternoon orders are down 62%
                  </h2>
                  
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-center">
                      <div className="flex items-center mb-1 text-xs font-semibold text-slate-500">
                        <TrendingDown className="w-4 h-4 text-red-500 mr-2" /> Current Volume
                      </div>
                      <p className="font-bold text-xl text-slate-800">11 Orders</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-center">
                      <div className="flex items-center mb-1 text-xs font-semibold text-slate-500">
                        <PackageMinus className="w-4 h-4 text-orange-500 mr-2" /> At-Risk Stock
                      </div>
                      <p className="font-bold text-xl text-slate-800">22 Portions</p>
                    </div>
                  </div>

                  <div className="bg-blue-50/50 border border-blue-100 p-5 rounded-xl flex-1 flex flex-col justify-center mb-5">
                    <h4 className="text-xs font-bold text-blue-600 mb-2 uppercase tracking-wider flex items-center">
                      <ShieldCheck className="w-4 h-4 mr-2" /> AI Recommended Campaign
                    </h4>
                    <p className="text-slate-700 italic font-medium text-base leading-relaxed mb-3">
                      "Craving a quick bite? 🥪 Get our Classic Sandwich + Masala Chai combo for ₹99 today only between 3 PM & 5 PM. Show code: TUEFLASH"
                    </p>
                    <div className="text-xs font-medium text-slate-600 flex items-center bg-white py-2 px-3 rounded-lg border border-slate-200 w-max mt-auto">
                      <Send className="w-3 h-3 mr-2 text-[#00BAF2]" />
                      Targeting 85 past afternoon customers
                    </div>
                  </div>

                  <div className="flex gap-3 mt-auto">
                    <button className="flex-1 py-3 px-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold hover:bg-slate-50 hover:border-slate-300 transition-all text-sm">
                      Edit Offer
                    </button>
                    <button 
                      onClick={approveAction} 
                      className="flex-1 py-3 px-3 rounded-xl bg-[#00BAF2] hover:bg-[#0096c7] text-white font-bold transition-all shadow-lg shadow-[#00BAF2]/30 flex items-center justify-center transform hover:-translate-y-1 text-sm"
                    >
                      Approve & Broadcast
                    </button>
                  </div>
                </div>

              ) : (

                <div className="bg-white rounded-2xl shadow-xl border-2 border-green-400 p-6 flex flex-col items-center justify-center h-full text-center animate-in fade-in zoom-in duration-500">
                  <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-10 h-10 text-green-500" />
                  </div>
                  <h3 className="text-3xl font-extrabold text-[#002970] mb-2">Issue Resolved</h3>
                  <p className="text-slate-600 mb-8 text-base">Campaign successfully drove footfall during slow hours.</p>
                  
                  <div className="w-full bg-slate-50 rounded-2xl border border-slate-100 p-6 flex justify-around items-center mb-8">
                    <div className="text-center">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Redemptions</p>
                      <p className="text-3xl font-black text-slate-800">14</p>
                    </div>
                    <div className="w-px h-12 bg-slate-200"></div>
                    <div className="text-center">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Recovered</p>
                      <p className="text-3xl font-black text-green-500">₹1,386</p>
                    </div>
                  </div>

                  {/* NEW: Button to reset demo to idle state */}
                  <button 
                    onClick={resetToIdle}
                    className="flex items-center px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full font-semibold transition-colors mt-auto"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Resume Monitoring
                  </button>
                </div>

              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}