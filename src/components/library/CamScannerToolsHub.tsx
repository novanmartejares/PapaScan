'use client';

import React from 'react';
import {
  Sparkles,
  Zap,
  CreditCard,
  Sun,
  ShieldCheck,
  Eraser,
  PenTool,
  FileText,
  ChevronRight,
} from 'lucide-react';

interface CamScannerToolsHubProps {
  onOpenSmartScan: () => void;
  onOpenIdCardScan: () => void;
  onOpenWatermark: () => void;
  onOpenRedaction: () => void;
  onOpenSignature: () => void;
  onOpenOCR: () => void;
  onOpenNoShadow: () => void;
}

export const CamScannerToolsHub: React.FC<CamScannerToolsHubProps> = ({
  onOpenSmartScan,
  onOpenIdCardScan,
  onOpenWatermark,
  onOpenRedaction,
  onOpenSignature,
  onOpenOCR,
  onOpenNoShadow,
}) => {
  return (
    <div className="rounded-3xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-emerald-500/30 p-4 sm:p-5 shadow-2xl relative overflow-hidden backdrop-blur-xl">
      {/* Decorative Glow Accent */}
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-3.5 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/20">
            <Sparkles className="w-5 h-5 fill-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-white tracking-wide uppercase">
                CamScanner Pro Suite
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse">
                AI ACTIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Flagship smart camera capture &amp; document tools
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400 font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>7 Pro Features Ready</span>
        </div>
      </div>

      {/* 2 Featured Hero Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3 relative z-10">
        {/* Smart Scan Hero Card */}
        <button
          onClick={onOpenSmartScan}
          className="group text-left p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/40 to-slate-900 border border-emerald-500/40 hover:border-emerald-400 hover:bg-emerald-950/60 transition-all flex items-center justify-between gap-3 shadow-md hover:shadow-emerald-500/10 active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6 fill-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-extrabold text-white group-hover:text-emerald-300 transition-colors">
                  Smart Scan (Hands-Free)
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                  AUTO
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                Real-time paper edge lock &amp; auto-snap ring
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 transition-transform shrink-0" />
        </button>

        {/* 2-Sided ID Card Hero Card */}
        <button
          onClick={onOpenIdCardScan}
          className="group text-left p-3.5 rounded-2xl bg-gradient-to-r from-indigo-950/40 to-slate-900 border border-indigo-500/40 hover:border-indigo-400 hover:bg-indigo-950/60 transition-all flex items-center justify-between gap-3 shadow-md hover:shadow-indigo-500/10 active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30 group-hover:scale-110 transition-transform">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-extrabold text-white group-hover:text-indigo-300 transition-colors">
                  2-Sided ID Card
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300">
                  A4 COMPOSITE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                Front &amp; Back auto-combined into 1 page
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-1 transition-transform shrink-0" />
        </button>
      </div>

      {/* 5 Quick Pro Feature Action Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 relative z-10">
        {/* No-Shadow Studio */}
        <button
          onClick={onOpenNoShadow}
          className="group flex flex-col items-center gap-1.5 p-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 transition-all text-center active:scale-95"
          title="Eliminates phone and hand shadows"
        >
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/30 group-hover:scale-110 transition-transform">
            <Sun className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-bold text-slate-200 group-hover:text-amber-300">
            No Shadow
          </span>
          <span className="text-[9px] text-slate-400 font-medium -mt-1">
            Studio Light
          </span>
        </button>

        {/* Security Watermark */}
        <button
          onClick={onOpenWatermark}
          className="group flex flex-col items-center gap-1.5 p-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-sky-500/40 transition-all text-center active:scale-95"
          title="Apply anti-counterfeit stamps"
        >
          <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center border border-sky-500/30 group-hover:scale-110 transition-transform">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-bold text-slate-200 group-hover:text-sky-300">
            Watermark
          </span>
          <span className="text-[9px] text-slate-400 font-medium -mt-1">
            Anti-Theft
          </span>
        </button>

        {/* Redaction / Eraser */}
        <button
          onClick={onOpenRedaction}
          className="group flex flex-col items-center gap-1.5 p-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-rose-500/40 transition-all text-center active:scale-95"
          title="Blackout or whiteout private numbers"
        >
          <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center border border-rose-500/30 group-hover:scale-110 transition-transform">
            <Eraser className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-bold text-slate-200 group-hover:text-rose-300">
            Redaction
          </span>
          <span className="text-[9px] text-slate-400 font-medium -mt-1">
            Privacy Eraser
          </span>
        </button>

        {/* Sign Document */}
        <button
          onClick={onOpenSignature}
          className="group flex flex-col items-center gap-1.5 p-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/40 transition-all text-center active:scale-95"
          title="Draw or place transparent digital signature"
        >
          <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center border border-purple-500/30 group-hover:scale-110 transition-transform">
            <PenTool className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-bold text-slate-200 group-hover:text-purple-300">
            Sign Doc
          </span>
          <span className="text-[9px] text-slate-400 font-medium -mt-1">
            Digital Signature
          </span>
        </button>

        {/* OCR to TXT */}
        <button
          onClick={onOpenOCR}
          className="group flex flex-col items-center gap-1.5 p-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 transition-all text-center active:scale-95 col-span-2 sm:col-span-1"
          title="Extract text and export as .TXT"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/30 group-hover:scale-110 transition-transform">
            <FileText className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-bold text-slate-200 group-hover:text-emerald-300">
            OCR to TXT
          </span>
          <span className="text-[9px] text-slate-400 font-medium -mt-1">
            Plain Text
          </span>
        </button>
      </div>
    </div>
  );
};
