"use client";

import React, { useState, useRef } from "react";
import { Upload, CheckCircle2, AlertCircle, Loader2, MessageCircle, Sparkles } from "lucide-react";
import { UploadResult, NewCustomer, sendWelcomeMessage, sendBulkWelcomeMessages } from "../agentService";

interface CsvUploadZoneProps {
  merchantId: number;
  lang: "EN" | "HI";
  t: Record<string, string>;
  weeksCapital: string; // Accepts from Navbar
  onUploadComplete: (result: UploadResult) => void;
}

type UploadState = "idle" | "uploading" | "success" | "error";

export default function CsvUploadZone({ merchantId, lang, t, weeksCapital, onUploadComplete }: CsvUploadZoneProps) {
  const [state, setState] = useState<UploadState>("idle");
  const [summary, setSummary] = useState<UploadResult["summary"] | null>(null);
  const [newCustomers, setNewCustomers] = useState<NewCustomer[]>([]);
  const [showNewCustomers, setShowNewCustomers] = useState(false);
  const [sentKeys, setSentKeys] = useState<Set<string>>(new Set());
  const [sendingKeys, setSendingKeys] = useState<Set<string>>(new Set());
  const [isSendingAll, setIsSendingAll] = useState(false);
  const [allSent, setAllSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      setErrorMsg("Only .csv files are allowed.");
      setState("error"); return;
    }
    setState("uploading");
    setErrorMsg("");

    const formData = new FormData();
    formData.append("file", file);
    // Send typed capital to backend to persist
    if (weeksCapital && !isNaN(parseFloat(weeksCapital))) {
      formData.append("weekly_capital", weeksCapital);
    }

    try {
      const res = await fetch(`http://localhost:8000/api/upload/ledger/${merchantId}`, { method: "POST", body: formData });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || t.uploadError);
      
      const result: UploadResult = await res.json();
      setSummary(result.summary);
      setNewCustomers(result.new_customers_list || []);
      setState("success");
      onUploadComplete(result);
    } catch (e: any) {
      setErrorMsg(e.message || t.uploadError);
      setState("error");
    }
  };

  const reset = (e: React.MouseEvent) => {
    e.stopPropagation(); setState("idle"); setSummary(null); setNewCustomers([]);
    setShowNewCustomers(false); setSentKeys(new Set()); setSendingKeys(new Set());
    setIsSendingAll(false); setAllSent(false); setErrorMsg("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendBulk = async () => {
    if (newCustomers.length === 0) return;
    setIsSendingAll(true);
    try {
      await sendBulkWelcomeMessages(merchantId, newCustomers.map(c => ({ customer_id: c.id, customer_name: c.name, phone_number: c.phone_number, amount_spent: c.amount_spent })));
      setAllSent(true);
      setSentKeys(new Set(newCustomers.map((c, i) => String(c.id || i))));
    } catch (err) {} finally { setIsSendingAll(false); }
  };

  const totalCustomerVisits = summary?.total_customers ?? ((summary?.regular_customers ?? 0) + newCustomers.length);
  const newCount = summary?.new_customers ?? newCustomers.length;
  const regularCount = Math.max(0, totalCustomerVisits - newCount);

  return (
    <div
      className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all ${state !== "uploading" && state !== "success" ? "cursor-pointer border-slate-300 bg-white hover:border-[#00BAF2]" : state === "success" ? "border-emerald-400 bg-emerald-50/40 cursor-default" : "border-slate-300 bg-white cursor-default"}`}
      onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
      onDragOver={(e) => e.preventDefault()}
      onClick={() => state === "idle" && fileInputRef.current?.click()}
    >
      <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />

      {state === "idle" && (
        <>
          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100"><Upload className="w-7 h-7 text-[#00BAF2]" /></div>
          <p className="text-base font-bold text-[#002970]">{t.uploadTitle}</p>
          <p className="text-xs text-slate-500 mt-1">{t.uploadSubtitle}</p>
          <span className="mt-5 inline-block px-5 py-2.5 bg-[#002970] text-white text-xs font-bold rounded-xl shadow-sm">{t.uploadBtn}</span>
        </>
      )}

      {state === "uploading" && (
        <><Loader2 className="w-12 h-12 text-[#00BAF2] mx-auto mb-4 animate-spin" /><p className="text-base font-bold text-[#002970]">Reading your ledger...</p></>
      )}

      {state === "success" && summary && (
        <div onClick={(e) => e.stopPropagation()}>
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <p className="text-base font-bold text-emerald-700">{t.uploadSuccess}</p>
          <div className="mt-3 inline-flex items-center gap-2 px-5 py-2 bg-white border border-slate-200 rounded-full text-xs font-semibold shadow-xs">
            <span><strong className="text-slate-900">{totalCustomerVisits}</strong> {lang === "EN" ? "Total Customers" : "कुल ग्राहक"}</span><span className="text-slate-300">•</span>
            <span><strong className="text-emerald-600">{newCount}</strong> {lang === "EN" ? "New Customers" : "नए ग्राहक"}</span><span className="text-slate-300">•</span>
            <span><strong className="text-[#002970]">{regularCount}</strong> {lang === "EN" ? "Regular Customers" : "नियमित ग्राहक"}</span>
          </div>
          {newCustomers.length > 0 && (
            <div className="mt-4 border-t border-slate-100 pt-4 flex flex-col items-center">
              <button onClick={handleSendBulk} disabled={isSendingAll || allSent} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 ${allSent ? "bg-emerald-100 text-emerald-800" : "bg-emerald-600 text-white"}`}>
                {isSendingAll ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Sending...</span></> : allSent ? <><CheckCircle2 className="w-3.5 h-3.5" /><span>Sent ✅</span></> : <><MessageCircle className="w-3.5 h-3.5" /><span>Send WhatsApp Greeting to {newCount} New Customers</span></>}
              </button>
            </div>
          )}
          <div className="mt-4"><button onClick={reset} className="text-[11px] text-slate-400 underline">Upload a different file</button></div>
        </div>
      )}

      {state === "error" && (
        <><AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" /><p className="text-base font-bold text-rose-700">{errorMsg}</p><button onClick={reset} className="mt-5 px-5 py-2.5 bg-rose-600 text-white text-xs font-bold rounded-xl">Try Again</button></>
      )}
    </div>
  );
}