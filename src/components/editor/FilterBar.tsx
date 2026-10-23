'use client';

import React from 'react';
import { FilterType } from '@/types';
import { Sparkles, Sun, Contrast, Eye, Image as ImageIcon, Zap } from 'lucide-react';

interface FilterBarProps {
  currentFilter: FilterType;
  onChangeFilter: (filter: FilterType) => void;
  isProcessing?: boolean;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  currentFilter,
  onChangeFilter,
  isProcessing = false,
}) => {
  const filters: Array<{
    id: FilterType;
    label: string;
    sublabel: string;
    icon: React.ReactNode;
    color: string;
  }> = [
    {
      id: 'original',
      label: 'Original',
      sublabel: 'Raw Capture',
      icon: <ImageIcon className="w-4 h-4" />,
      color: 'from-sky-400 to-indigo-400',
    },
    {
      id: 'bw',
      label: 'B&W',
      sublabel: 'Crisp Document',
      icon: <Contrast className="w-4 h-4" />,
      color: 'from-white to-slate-400',
    },
    {
      id: 'sharpen',
      label: 'Sharpen',
      sublabel: 'Enhanced Text',
      icon: <Zap className="w-4 h-4" />,
      color: 'from-emerald-400 to-teal-400',
    },
    {
      id: 'noshadow',
      label: 'No Shadow',
      sublabel: 'CamScanner Clear',
      icon: <Sun className="w-4 h-4" />,
      color: 'from-amber-300 to-emerald-400',
    },
    {
      id: 'magic',
      label: 'Magic Color',
      sublabel: 'Vibrant Paper',
      icon: <Sparkles className="w-4 h-4" />,
      color: 'from-amber-400 to-sky-400',
    },
  ];

  return (
    <div className="w-full bg-slate-950/90 backdrop-blur-md border-t border-slate-800/80 p-3 safe-bottom">
      <div className="max-w-md mx-auto flex items-center justify-between gap-2 overflow-x-auto">
        {filters.map((f) => {
          const isSelected = currentFilter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => onChangeFilter(f.id)}
              disabled={isProcessing}
              className={`flex-1 min-w-[76px] py-2 px-2.5 rounded-2xl flex flex-col items-center gap-1 transition-all ${
                isSelected
                  ? 'bg-sky-500/20 border-2 border-sky-400 text-white shadow-lg shadow-sky-500/10'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div
                className={`p-1.5 rounded-xl ${
                  isSelected ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {f.icon}
              </div>
              <span className="text-[11px] font-bold tracking-tight">{f.label}</span>
              <span className="text-[9px] text-slate-500 hidden sm:block">{f.sublabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
