"use client";

import React, { useState, useRef } from "react";
import { Upload, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { UploadResult } from "../agentService";

interface CsvUploadZoneProps {
  merchantId: number;
  lang: "EN" | "HI";
  t: Record<string, string>;
  weeklyCapital: string;           // Passed from parent (header input)
  onUploadComplete: (result: UploadResult) => void;
}

type UploadState = "idle" | "uploading" | "success" | "error";

export default function CsvUploadZone({
  merchantId,
  lang,
  t,
  weeklyCapital,
  onUploadComplete,
}: CsvUploadZoneProps) {
  const [state, setState] = useState<UploadState>("idle");
  const [summary, setSummary] = useState<UploadResult["summary"] | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      setErrorMsg(lang === "EN" ? "Only .csv files are allowed." : "केवल .csv फ़ाइलें मान्य हैं।");
      setState("error");
      return;
    }

    setState("uploading");
    setErrorMsg("");

    const formData = new FormData();
    formData.append("file", file);
    // Send the merchant's weekly capital alongside the file
    const capitalValue = parseFloat(weeklyCapital.replace(/,/g, "")) || 0;
    formData.append("weekly_capital", String(capitalValue));

    try {
      const res = await fetch(
        `http://localhost:8000/api/upload/ledger/${merchantId}`,
        { method: "POST", body: formData }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || t.uploadError);
      }

      const result: UploadResult = await res.json();
      setSummary(result.summary);
      setState("success");
      onUploadComplete(result);
    } catch (e: any) {
      setErrorMsg(e.message || t.uploadError);
      setState("error");
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const reset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setState("idle");
    setSummary(null);
    setErrorMsg("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const containerCls = [
    "relative border-2 border-dashed rounded-2xl p-8 text-center transition-all",
    state !== "uploading" ? "cursor-pointer" : "cursor-wait",
    isDragOver
      ? "border-[#00BAF2] bg-blue-50 scale-[1.01]"
      : state === "success"
      ? "border-emerald-400 bg-emerald-50/50"
      : state === "error"
      ? "border-rose-400 bg-rose-50/50"
      : "border-slate-300 bg-white hover:border-[#00BAF2] hover:bg-blue-50/20",
  ].join(" ");

  return (
    <div
      className={containerCls}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={() => setIsDragOver(false)}
      onClick={() => state === "idle" && fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {/* ── IDLE ── */}
      {state === "idle" && (
        <>
          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100">
            <Upload className="w-7 h-7 text-[#00BAF2]" />
          </div>
          <p className="text-base font-bold text-[#002970]">{t.uploadTitle}</p>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">{t.uploadSubtitle}</p>
          <span className="mt-5 inline-block px-5 py-2.5 bg-[#002970] text-white text-xs font-bold rounded-xl shadow-sm">
            {t.uploadBtn}
          </span>
          <p className="text-[10px] text-slate-400 mt-4 font-mono">{t.uploadHint}</p>
        </>
      )}

      {/* ── UPLOADING ── */}
      {state === "uploading" && (
        <>
          <Loader2 className="w-12 h-12 text-[#00BAF2] mx-auto mb-4 animate-spin" />
          <p className="text-base font-bold text-[#002970]">
            {lang === "EN" ? "Reading your ledger..." : "खाता-बही पढ़ी जा रही है..."}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {lang === "EN" ? "Updating customer records in Supabase" : "ग्राहक रिकॉर्ड अपडेट हो रहे हैं"}
          </p>
        </>
      )}

      {/* ── SUCCESS ── */}
      {state === "success" && summary && (
        <>
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
          <p className="text-base font-bold text-emerald-700">{t.uploadSuccess}</p>
          {/* Only show Visiting Customers + Need Outreach — perfectly matched with upper metrics */}
          <div className="flex justify-center gap-12 mt-4">
            <div className="text-center">
              <span className="text-2xl font-black text-slate-800">{summary.total_customers ?? summary.total_rows}</span>
              <p className="text-[10px] text-slate-500 uppercase font-bold mt-0.5">
                {lang === "EN" ? "Visiting Customers" : "आए ग्राहक"}
              </p>
            </div>
            <div className="text-center">
              <span className="text-2xl font-black text-emerald-600">{summary.churned_flagged}</span>
              <p className="text-[10px] text-slate-500 uppercase font-bold mt-0.5">
                {lang === "EN" ? "Need Outreach" : "संपर्क ज़रूरी"}
              </p>
            </div>
          </div>
          {summary.churned_flagged === 0 && (
            <p className="text-xs text-slate-500 mt-4 bg-slate-50 px-4 py-2 rounded-xl inline-block">
              {lang === "EN"
                ? "✅ All high-value customers visited recently. No outreach needed."
                : "✅ सभी प्रमुख ग्राहक हाल ही में आए हैं।"}
            </p>
          )}
          <button onClick={reset} className="mt-4 text-[11px] text-slate-400 underline hover:text-slate-600 transition-colors">
            {lang === "EN" ? "Upload a different file" : "दूसरी फ़ाइल अपलोड करें"}
          </button>
        </>
      )}

      {/* ── ERROR ── */}
      {state === "error" && (
        <>
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <p className="text-base font-bold text-rose-700">{t.uploadError}</p>
          {errorMsg && (
            <p className="text-xs text-rose-500 mt-1 max-w-sm mx-auto font-mono">{errorMsg}</p>
          )}
          <button
            onClick={reset}
            className="mt-5 inline-block px-5 py-2.5 bg-rose-600 text-white text-xs font-bold rounded-xl shadow-sm hover:bg-rose-700 transition-colors"
          >
            {lang === "EN" ? "Try Again" : "दोबारा कोशिश करें"}
          </button>
        </>
      )}
    </div>
  );
}
