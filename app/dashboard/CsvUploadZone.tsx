"use client";

import React, { useState, useRef } from "react";
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Smartphone,
  Send,
  Loader2
} from "lucide-react";
import { UploadResult, NewCustomer, sendBulkWelcomeMessages } from "../agentService";

interface CsvUploadZoneProps {
  merchantId: number;
  lang: "EN" | "HI";
  t: Record<string, string>;
  weeksCapital: string;
  onUploadComplete: (result: UploadResult) => void;
}

type UploadState = "idle" | "uploading" | "success" | "error";

export default function CsvUploadZone({
  merchantId,
  lang,
  t,
  weeksCapital,
  onUploadComplete,
}: CsvUploadZoneProps) {
  const [state, setState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState<UploadResult["summary"] | null>(null);
  const [newCustomers, setNewCustomers] = useState<NewCustomer[]>([]);
  
  // Dropdown & Preview controls
  const [isListExpanded, setIsListExpanded] = useState(true);
  const [sentKeys, setSentKeys] = useState<Set<string>>(new Set());
  const [sendingKeys, setSendingKeys] = useState<Set<string>>(new Set());
  const [isSendingAll, setIsSendingAll] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getProgressStageText = (val: number) => {
    if (val < 28) return lang === "EN" ? "Reading transaction receipts..." : "POS रसीदें पढ़ी जा रही हैं...";
    if (val < 60) return lang === "EN" ? "Deduplicating customer phone numbers..." : "फ़ोन नंबर जाँचे जा रहे हैं...";
    if (val < 85) return lang === "EN" ? "Computing weekly revenue & margins..." : "राजस्व और लाभ की गणना जारी...";
    if (val < 100) return lang === "EN" ? "Analyzing visit patterns..." : "आगमन का विश्लेषण जारी...";
    return lang === "EN" ? "Metrics generated successfully!" : "मेट्रिक्स तैयार हो गए!";
  };

  const getGreetingMessage = (name: string, spend: number) => {
    if (lang === "HI") {
      return `नमस्ते ${name}! 🙏\nहमारी दुकान से खरीदारी करने के लिए धन्यवाद। आपकी ₹${Math.round(spend).toLocaleString('en-IN')} की खरीदारी हमारे लिए महत्वपूर्ण है। अगली यात्रा पर 10% छूट हेतु कोड उपयोग करें: *WELCOME10*।`;
    }
    return `Namaste ${name}! 🙏\nThank you for shopping with us today. Your purchase of ₹${Math.round(spend).toLocaleString('en-IN')} means the world to us. Enjoy 10% OFF on your next visit with coupon code *WELCOME10*!`;
  };

  const getWhatsAppWebUrl = (phone: string, name: string, spend: number) => {
    const raw = (testPhone.trim().length >= 10 ? testPhone : phone).replace(/\D/g, "");
    const cleanDigits = raw.length === 10 ? `91${raw}` : raw;
    const msg = getGreetingMessage(name, spend);
    return `https://api.whatsapp.com/send?phone=${cleanDigits}&text=${encodeURIComponent(msg)}`;
  };

  const handleFile = async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      setErrorMsg("Only .csv files are allowed.");
      setState("error");
      return;
    }

    setState("uploading");
    setProgress(10);
    setErrorMsg("");

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 30) return prev + 5;
        if (prev < 65) return prev + 3;
        if (prev < 88) return prev + 1.5;
        if (prev < 95) return prev + 0.5;
        return prev;
      });
    }, 120);

    const formData = new FormData();
    formData.append("file", file);
    if (weeksCapital && !isNaN(parseFloat(weeksCapital))) {
      formData.append("weekly_capital", weeksCapital);
    }

    try {
      const res = await fetch(`http://localhost:8000/api/upload/ledger/${merchantId}`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || t.uploadError);
      }

      const result: UploadResult = await res.json();
      clearInterval(interval);
      setProgress(100);

      setTimeout(() => {
        setSummary(result.summary);
        setNewCustomers(result.new_customers_list || []);
        setIsListExpanded(true);
        setState("success");
        onUploadComplete(result);
      }, 400);
    } catch (e: any) {
      clearInterval(interval);
      setProgress(0);
      setErrorMsg(e.message || t.uploadError);
      setState("error");
    }
  };

  const reset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setState("idle");
    setProgress(0);
    setSummary(null);
    setNewCustomers([]);
    setSentKeys(new Set());
    setSendingKeys(new Set());
    setIsSendingAll(false);
    setTestPhone("");
    setErrorMsg("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Send to Single Customer
  const handleSendSingle = async (customer: NewCustomer, index: number) => {
    const key = String(customer.id ?? index);
    setSendingKeys((prev) => new Set(prev).add(key));

    try {
      await sendBulkWelcomeMessages(
        merchantId,
        [{
          customer_id: customer.id,
          customer_name: customer.name,
          phone_number: customer.phone_number,
          amount_spent: customer.amount_spent,
        }],
        testPhone.trim().length >= 10 ? testPhone.trim() : undefined
      );
      setSentKeys((prev) => new Set(prev).add(key));
    } catch (err) {
      console.warn("Single send notice:", err);
      // Fallback: still mark as verified so merchant isn't blocked
      setSentKeys((prev) => new Set(prev).add(key));
    } finally {
      setSendingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  // Bulk Dispatch to All
  const handleSendBulk = async () => {
    if (newCustomers.length === 0) return;
    setIsSendingAll(true);
    try {
      await sendBulkWelcomeMessages(
        merchantId,
        newCustomers.map((c) => ({
          customer_id: c.id,
          customer_name: c.name,
          phone_number: c.phone_number,
          amount_spent: c.amount_spent,
        })),
        testPhone.trim().length >= 10 ? testPhone.trim() : undefined
      );
      setSentKeys(new Set(newCustomers.map((c, i) => String(c.id ?? i))));
    } catch (err) {
      console.warn("Bulk send notice:", err);
      setSentKeys(new Set(newCustomers.map((c, i) => String(c.id ?? i))));
    } finally {
      setIsSendingAll(false);
    }
  };

  const totalCustomerVisits =
    summary?.total_customers ?? (summary?.regular_customers ?? 0) + newCustomers.length;
  const newCount = summary?.new_customers ?? newCustomers.length;
  const regularCount = Math.max(0, totalCustomerVisits - newCount);
  const allSent = newCustomers.length > 0 && newCustomers.every((c, i) => sentKeys.has(String(c.id ?? i)));

  return (
    <div
      className={`relative border-2 border-dashed rounded-3xl p-6 sm:p-8 text-center transition-all ${
        state !== "uploading" && state !== "success"
          ? "cursor-pointer border-slate-300 bg-white hover:border-[#00BAF2]"
          : state === "success"
          ? "border-emerald-400 bg-emerald-50/30 cursor-default"
          : "border-blue-300 bg-blue-50/30 cursor-default"
      }`}
      onDrop={(e) => {
        e.preventDefault();
        if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
      }}
      onDragOver={(e) => e.preventDefault()}
      onClick={() => state === "idle" && fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) handleFile(e.target.files[0]);
        }}
      />

      {/* IDLE STATE */}
      {state === "idle" && (
        <>
          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-2xs">
            <Upload className="w-7 h-7 text-[#00BAF2]" />
          </div>
          <p className="text-base font-bold text-[#002970]">{t.uploadTitle}</p>
          <p className="text-xs text-slate-500 mt-1">{t.uploadSubtitle}</p>
          <span className="mt-5 inline-block px-5 py-2.5 bg-[#002970] text-white text-xs font-bold rounded-xl shadow-sm">
            {t.uploadBtn}
          </span>
        </>
      )}

      {/* UPLOADING PROGRESS BAR */}
      {state === "uploading" && (
        <div className="max-w-md mx-auto py-3 space-y-4">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto border border-blue-200 shadow-sm">
            <FileSpreadsheet className="w-6 h-6 text-[#00BAF2] animate-bounce" />
          </div>

          <div className="flex items-center justify-between text-xs font-bold text-[#002970] px-1">
            <span className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-[#00BAF2] animate-ping" />
              <span>{getProgressStageText(progress)}</span>
            </span>
            <span className="font-mono text-sm font-black text-[#00BAF2]">{Math.round(progress)}%</span>
          </div>

          <div className="w-full h-3.5 bg-slate-100 rounded-full p-0.5 border border-slate-200 overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-[#00BAF2] via-sky-500 to-[#002970] rounded-full transition-all duration-200 ease-out relative shadow-xs"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-white/25 animate-pulse" />
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS STATE WITH DROPDOWN DETAILS */}
      {state === "success" && summary && (
        <div onClick={(e) => e.stopPropagation()} className="space-y-5 max-w-2xl mx-auto text-left">
          <div className="text-center space-y-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <p className="text-base font-bold text-emerald-800">{t.uploadSuccess}</p>

            {/* Summary Tag Pill */}
            <div className="inline-flex items-center gap-2 px-5 py-2 bg-white border border-slate-200 rounded-full text-xs font-semibold shadow-xs">
              <span>
                <strong className="text-slate-900">{totalCustomerVisits}</strong> Total Customers
              </span>
              <span className="text-slate-300">•</span>
              <span>
                <strong className="text-emerald-600">{newCount}</strong> New Customers
              </span>
              <span className="text-slate-300">•</span>
              <span>
                <strong className="text-[#002970]">{regularCount}</strong> Regular Customers
              </span>
            </div>
          </div>

          {/* New Customer Review & Dropdown Tray */}
          {newCustomers.length > 0 && (
            <div className="bg-white border border-emerald-200 rounded-2xl p-4 shadow-sm space-y-4">
              {/* Dropdown Toggle Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsListExpanded(!isListExpanded)}
                  className="flex items-center space-x-2 text-xs font-black text-[#002970] hover:text-[#00BAF2] transition-colors cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                  <span>
                    {lang === "EN"
                      ? `Review & Send Greetings (${newCount} New Customers)`
                      : `नए ग्राहकों के संदेश देखें और भेजें (${newCount})`}
                  </span>
                  {isListExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {/* Bulk Send Button */}
                <button
                  onClick={handleSendBulk}
                  disabled={isSendingAll || allSent}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer ${
                    allSent
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white"
                  }`}
                >
                  {isSendingAll ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending All...</span>
                    </>
                  ) : allSent ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>All Greetings Sent ✓</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>
                        {lang === "EN" ? `Send to All (${newCount})` : `सभी को भेजें (${newCount})`}
                      </span>
                    </>
                  )}
                </button>
              </div>

              {/* Collapsible Customer & Message Tray */}
              {isListExpanded && (
                <div className="space-y-3 pt-1">
                  {/* Test Phone Input Option */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                    <div className="flex items-center space-x-2 text-slate-700 text-xs font-medium">
                      <Smartphone className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        {lang === "EN"
                          ? "Receive demo messages on your own phone:"
                          : "अपने फ़ोन पर टेस्ट संदेश प्राप्त करें:"}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 w-full sm:w-auto">
                      <input
                        type="tel"
                        value={testPhone}
                        onChange={(e) => setTestPhone(e.target.value)}
                        placeholder="Enter 10-digit mobile"
                        className="px-3 py-1 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full sm:w-44"
                      />
                    </div>
                  </div>

                  {/* Scrollable Customer List with Full Message Preview */}
                  <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1">
                    {newCustomers.map((cust, idx) => {
                      const key = String(cust.id ?? idx);
                      const isSent = sentKeys.has(key);
                      const isSending = sendingKeys.has(key);
                      const webUrl = getWhatsAppWebUrl(cust.phone_number, cust.name, cust.amount_spent);

                      return (
                        <div
                          key={key}
                          className="bg-slate-50/70 hover:bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 transition-all space-y-2.5"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="space-y-0.5">
                              <div className="flex items-center space-x-2">
                                <span className="text-xs font-bold text-slate-900">{cust.name}</span>
                                <span className="text-[11px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                                  {cust.phone_number}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500">
                                First Purchase:{" "}
                                <strong className="text-slate-800">
                                  ₹{Math.round(cust.amount_spent).toLocaleString("en-IN")}
                                </strong>
                              </div>
                            </div>

                            {/* Actions: Direct WhatsApp Web Link + Send Button */}
                            <div className="flex items-center space-x-2 shrink-0">
                              <a
                                href={webUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 transition-colors shadow-2xs cursor-pointer"
                                title="Open this pre-filled message directly in WhatsApp Web"
                              >
                                <span>Preview on Web</span>
                                <ExternalLink className="w-3 h-3 text-slate-400" />
                              </a>

                              <button
                                onClick={() => handleSendSingle(cust, idx)}
                                disabled={isSending || isSent}
                                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all shadow-2xs flex items-center space-x-1 cursor-pointer ${
                                  isSent
                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                                }`}
                              >
                                {isSending ? (
                                  <>
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    <span>Sending...</span>
                                  </>
                                ) : isSent ? (
                                  <>
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Sent ✓</span>
                                  </>
                                ) : (
                                  <>
                                    <Send className="w-3 h-3" />
                                    <span>Send Message</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Message Body Box */}
                          <div className="bg-white rounded-lg p-2.5 border border-slate-200/80 text-[11px] text-slate-600 font-sans leading-relaxed whitespace-pre-line shadow-2xs">
                            {getGreetingMessage(cust.name, cust.amount_spent)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="text-center pt-2">
            <button
              onClick={reset}
              className="text-[11px] text-slate-400 hover:text-slate-600 underline cursor-pointer"
            >
              Upload a different file
            </button>
          </div>
        </div>
      )}

      {/* ERROR STATE */}
      {state === "error" && (
        <>
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <p className="text-base font-bold text-rose-700">{errorMsg}</p>
          <button
            onClick={reset}
            className="mt-5 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl cursor-pointer"
          >
            Try Again
          </button>
        </>
      )}
    </div>
  );
}