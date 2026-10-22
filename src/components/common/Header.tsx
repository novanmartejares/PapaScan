'use client';

import React from 'react';
import { ScanLine, Search, LayoutGrid, List, Sparkles, Smartphone } from 'lucide-react';

interface HeaderProps {
  viewTitle?: string;
  isSearching: boolean;
  onToggleSearch: () => void;
  viewMode: 'grid' | 'list';
  onToggleViewMode: () => void;
  onOpenScanner: () => void;
  onOpenMobileSync?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  viewTitle = 'PapaScan',
  isSearching,
  onToggleSearch,
  viewMode,
  onToggleViewMode,
  onOpenScanner,
  onOpenMobileSync,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 safe-top">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20 ring-1 ring-white/20">
            <ScanLine className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                {viewTitle}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                CamScanner Pro
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">by Novan • Smart Scanner</p>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Scan with Phone Button (Desktop) */}
          {onOpenMobileSync && (
            <button
              onClick={onOpenMobileSync}
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-sky-500/30 text-sky-300 font-semibold text-xs transition-all shadow-sm"
              title="Use your phone camera to scan"
            >
              <Smartphone className="w-3.5 h-3.5 text-sky-400" />
              <span>Scan with Phone</span>
            </button>
          )}

          <button
            onClick={onToggleSearch}
            className={`p-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/70 transition-all ${
              isSearching ? 'bg-sky-500/15 text-sky-400 ring-1 ring-sky-500/30' : ''
            }`}
            title="Search documents"
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
          </button>

          <button
            onClick={onToggleViewMode}
            className="p-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/70 transition-all hidden sm:flex"
            title={viewMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
            aria-label="Toggle view mode"
          >
            {viewMode === 'grid' ? <List className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
          </button>

          <button
            onClick={onOpenScanner}
            className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-medium text-sm shadow-md shadow-sky-500/20 active:scale-95 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>New Scan</span>
          </button>
        </div>
      </div>
    </header>
  );
};
