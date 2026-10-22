'use client';

import React from 'react';
import { Search, X, Sparkles } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  placeholder?: string;
  hasOcrSearchIndicator?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  onClear,
  placeholder = 'Search title or extracted OCR text...',
  hasOcrSearchIndicator = true,
}) => {
  return (
    <div className="relative w-full">
      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
        <Search className="w-4 h-4" />
      </div>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/80 transition-all shadow-inner"
      />

      {value && (
        <button
          onClick={onClear}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {hasOcrSearchIndicator && (
        <div className="flex items-center gap-1.5 mt-1.5 px-2 text-[11px] text-slate-400">
          <Sparkles className="w-3 h-3 text-sky-400" />
          <span>Full-text search enabled across all extracted OCR content</span>
        </div>
      )}
    </div>
  );
};
