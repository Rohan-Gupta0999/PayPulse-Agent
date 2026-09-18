"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Store, ArrowRight, Lock, Mail } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("merchant@paypulse.in");
  const [password, setPassword] = useState("••••••••••••");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Smooth transition straight into the dashboard
    setTimeout(() => {
      router.push("/dashboard");
    }, 400);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col justify-center items-center px-4 relative selection:bg-[#00BAF2]/20 selection:text-[#002970]">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(#00BAF2_1.2px,transparent_1.2px)] [background-size:24px_24px] opacity-[0.08]" />

      <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-3xl p-8 sm:p-10 shadow-lg relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2 mb-8">
          <div className="w-12 h-12 bg-[#00BAF2] rounded-2xl flex items-center justify-center shadow-md mb-1">
            <Store className="text-white w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-[#002970]">PayPulse</h1>
          <p className="text-xs text-slate-500">Sign in to your merchant operator account</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Email Address</label>
            <div className="relative flex items-center">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00BAF2] focus:bg-white transition-all"
                placeholder="merchant@paypulse.in"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Password</label>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00BAF2] focus:bg-white transition-all"
                placeholder="••••••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3.5 bg-[#002970] hover:bg-[#001D52] disabled:opacity-70 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-95"
          >
            {isLoading ? (
              <span>Authenticating Session...</span>
            ) : (
              <>
                <span>Sign In & Enter Dashboard</span>
                <ArrowRight className="w-4 h-4 text-[#00BAF2]" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400">
            Demo credentials pre-filled · Click Sign In to proceed
          </p>
        </div>
      </div>
    </div>
  );
}