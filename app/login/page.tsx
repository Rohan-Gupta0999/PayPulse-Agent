"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, ArrowLeft, Mail, Lock, User, Building, Eye, EyeOff, ArrowRight } from 'lucide-react';

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');

  const [isSignUp, setIsSignUp] = useState(mode === 'signup');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setIsSignUp(mode === 'signup');
  }, [mode]);

  const [formData, setFormData] = useState({
    name: '',
    businessName: '',
    email: '',
    password: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 100% guaranteed hard redirect to the dashboard
    window.location.href = '/dashboard';
  };

  return (
    <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
      
      {/* HEADER */}
      <div className="bg-[#002970] px-8 py-8 text-center text-white relative">
        <div 
          onClick={() => router.push('/')}
          className="inline-flex items-center space-x-2 cursor-pointer hover:opacity-90 transition-opacity mb-2"
        >
          <div className="w-9 h-9 bg-[#00BAF2] rounded-lg flex items-center justify-center shadow-md">
            <ShieldCheck className="text-white w-6 h-6" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">
            PayPulse-Agent
          </span>
        </div>
        <p className="text-slate-300 text-sm">
          {isSignUp ? "Create your merchant account" : "Welcome back! Login to your portal"}
        </p>
      </div>

      {/* SWITCH TABS (Login / Sign Up) */}
      <div className="flex border-b border-slate-100 bg-slate-50">
        <button
          type="button"
          onClick={() => setIsSignUp(false)}
          className={`flex-1 py-3 text-sm font-bold transition-all border-b-2 ${
            !isSignUp
              ? 'border-[#00BAF2] text-[#002970] bg-white'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Login
        </button>
        <button
          type="button"
          onClick={() => setIsSignUp(true)}
          className={`flex-1 py-3 text-sm font-bold transition-all border-b-2 ${
            isSignUp
              ? 'border-[#00BAF2] text-[#002970] bg-white'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Sign Up
        </button>
      </div>

      {/* FORM */}
      <form onSubmit={handleSubmit} className="p-8 space-y-4">
        {isSignUp && (
          <>
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#00BAF2] focus:bg-white transition-all text-slate-800"
                />
              </div>
            </div>

            {/* Business Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Merchant / Business Name
              </label>
              <div className="relative">
                <Building className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  name="businessName"
                  required
                  placeholder="Cafe Delight"
                  value={formData.businessName}
                  onChange={handleChange}
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#00BAF2] focus:bg-white transition-all text-slate-800"
                />
              </div>
            </div>
          </>
        )}

        {/* Email */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Email Address
          </label>
          <div className="relative">
            <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              name="email"
              required
              placeholder="merchant@paypulse.com"
              value={formData.email}
              onChange={handleChange}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#00BAF2] focus:bg-white transition-all text-slate-800"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Password
            </label>
            {!isSignUp && (
              <a href="#" className="text-xs font-semibold text-[#00BAF2] hover:underline">
                Forgot?
              </a>
            )}
          </div>
          <div className="relative">
            <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              required
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              className="w-full pl-11 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#00BAF2] focus:bg-white transition-all text-slate-800"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

       {/* Submit Button - Guaranteed Direct Click */}
        <button
          type="button"
          onClick={() => {
            window.location.href = '/dashboard';
          }}
          className="w-full py-3.5 px-4 bg-[#002970] hover:bg-[#001D52] text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center space-x-2 mt-4 hover:scale-[1.01] active:scale-[0.98] cursor-pointer"
        >
          <span>{isSignUp ? 'Create Account' : 'Login'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      {/* FOOTER SWITCHER */}
      <div className="px-8 pb-6 text-center text-xs text-slate-500">
        {isSignUp ? (
          <p>
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => setIsSignUp(false)}
              className="font-bold text-[#00BAF2] hover:underline cursor-pointer"
            >
              Login
            </button>
          </p>
        ) : (
          <p>
            Don't have an account yet?{' '}
            <button
              type="button"
              onClick={() => setIsSignUp(true)}
              className="font-bold text-[#00BAF2] hover:underline cursor-pointer"
            >
              Create Account
            </button>
          </p>
        )}
      </div>

    </div>
  );
}

export default function AuthPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-sans text-slate-900">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-[#00BAF2] opacity-15 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] bg-[#002970] opacity-10 blur-[120px] rounded-full"></div>
      </div>

      <button
        onClick={() => router.push('/')}
        className="absolute top-6 left-6 flex items-center text-sm font-semibold text-slate-600 hover:text-[#002970] transition-colors bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-slate-200/60 shadow-sm cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
      </button>

      <Suspense fallback={<div className="text-slate-500">Loading...</div>}>
        <AuthForm />
      </Suspense>
    </div>
  );
}