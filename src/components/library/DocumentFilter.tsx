'use client';

import React from 'react';
import { DocumentCategory } from '@/types';
import { Folder, Receipt, CreditCard, FileText } from 'lucide-react';

interface DocumentFilterProps {
  selectedCategory: DocumentCategory;
  onSelectCategory: (cat: DocumentCategory) => void;
  counts: Record<string, number>;
}

export const DocumentFilter: React.FC<DocumentFilterProps> = ({
  selectedCategory,
  onSelectCategory,
  counts,
}) => {
  const tabs: Array<{ id: DocumentCategory; label: string; icon: React.ReactNode }> = [
    { id: 'All', label: 'All', icon: <Folder className="w-3.5 h-3.5" /> },
    { id: 'Receipts', label: 'Receipts', icon: <Receipt className="w-3.5 h-3.5" /> },
    { id: 'IDs', label: 'IDs', icon: <CreditCard className="w-3.5 h-3.5" /> },
    { id: 'Contracts', label: 'Contracts', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'General', label: 'General', icon: <Folder className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
      {tabs.map((tab) => {
        const isSelected = selectedCategory === tab.id;
        const count = counts[tab.id] || 0;

        return (
          <button
            key={tab.id}
            onClick={() => onSelectCategory(tab.id)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              isSelected
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25 ring-1 ring-sky-400/40'
                : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                isSelected ? 'bg-white/20 text-white font-bold' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
};
