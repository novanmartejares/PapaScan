'use client';

import React from 'react';
import { X, RefreshCw, HardDrive, Smartphone, Shield, Sparkles, Trash2 } from 'lucide-react';
import { FilterType } from '@/types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultFilter: FilterType;
  onChangeDefaultFilter: (filter: FilterType) => void;
  onResetDemoData: () => void;
  onClearAllData: () => void;
  documentCount: number;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  defaultFilter,
  onChangeDefaultFilter,
  onResetDemoData,
  onClearAllData,
  documentCount,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">App Settings</h2>
              <p className="text-xs text-slate-400">PapaScan Preferences & Storage</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Preference */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Default Enhancement Filter
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'magic', label: 'Magic Color', desc: 'Boosted contrast & bright paper' },
              { id: 'bw', label: 'Crisp B&W', desc: 'High-contrast adaptive threshold' },
              { id: 'grayscale', label: 'Grayscale', desc: 'Even tones & smooth shades' },
              { id: 'original', label: 'Original', desc: 'Raw camera pixels' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => onChangeDefaultFilter(f.id as FilterType)}
                className={`p-3 rounded-2xl text-left border transition-all ${
                  defaultFilter === f.id
                    ? 'bg-sky-500/15 border-sky-500/40 text-sky-300'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-bold">{f.label}</div>
                <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">{f.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Storage & Privacy */}
        <div className="space-y-3 pt-2 border-t border-slate-800">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Local Storage & Privacy
          </label>
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-sky-400" />
                IndexedDB Storage
              </span>
              <span className="font-semibold text-white">{documentCount} Documents Saved</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-emerald-400">
              <Shield className="w-3.5 h-3.5" />
              <span>Zero server uploads. 100% offline & private.</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onResetDemoData}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
              <span>Restore Demo Data</span>
            </button>
            <button
              onClick={onClearAllData}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/40 text-rose-300 text-xs font-medium transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Clear All Scans</span>
            </button>
          </div>
        </div>

        {/* About App */}
        <div className="pt-2 border-t border-slate-800 space-y-2 text-center text-xs text-slate-400">
          <p className="font-semibold text-slate-200">PapaScan by Novan</p>
          <p className="text-[11px]">
            Engineered with Next.js App Router, Tesseract OCR, jsPDF & HTML5 Canvas CV.
          </p>
        </div>
      </div>
    </div>
  );
};
