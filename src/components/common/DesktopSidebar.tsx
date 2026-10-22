'use client';

import React from 'react';
import {
  FolderOpen,
  Camera,
  Settings,
  Receipt,
  CreditCard,
  FileText,
  ShieldCheck,
  Upload,
  Smartphone,
} from 'lucide-react';
import { DocumentCategory } from '@/types';

interface DesktopSidebarProps {
  selectedCategory: DocumentCategory;
  onSelectCategory: (cat: DocumentCategory) => void;
  documentCounts: Record<string, number>;
  onOpenScanner: () => void;
  onOpenSettings: () => void;
  onTriggerUpload: () => void;
  onOpenMobileSync?: () => void;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  selectedCategory,
  onSelectCategory,
  documentCounts,
  onOpenScanner,
  onOpenSettings,
  onTriggerUpload,
  onOpenMobileSync,
}) => {
  const categories: Array<{ id: DocumentCategory; label: string; icon: React.ReactNode }> = [
    { id: 'All', label: 'All Documents', icon: <FolderOpen className="w-4 h-4" /> },
    { id: 'Receipts', label: 'Receipts', icon: <Receipt className="w-4 h-4" /> },
    { id: 'IDs', label: 'ID Cards & Badges', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'Contracts', label: 'Contracts & Legal', icon: <FileText className="w-4 h-4" /> },
    { id: 'General', label: 'General Documents', icon: <FolderOpen className="w-4 h-4" /> },
  ];

  return (
    <aside className="w-64 border-r border-slate-800/80 bg-slate-950/60 p-4 flex flex-col justify-between hidden md:flex shrink-0">
      <div className="space-y-6">
        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            onClick={onOpenScanner}
            className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-medium text-sm shadow-lg shadow-sky-500/20 active:scale-95 transition-all"
          >
            <Camera className="w-4 h-4" />
            <span>Scan Document</span>
          </button>

          {/* Scan with Phone QR Button */}
          {onOpenMobileSync && (
            <button
              onClick={onOpenMobileSync}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-sky-500/30 text-sky-300 hover:text-white font-medium text-xs transition-all shadow-sm"
            >
              <Smartphone className="w-3.5 h-3.5 text-sky-400" />
              <span>Scan with Phone (QR)</span>
            </button>
          )}

          <button
            onClick={onTriggerUpload}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 text-slate-200 hover:text-white font-medium text-xs transition-all"
          >
            <Upload className="w-3.5 h-3.5 text-slate-400" />
            <span>Upload Image / File</span>
          </button>
        </div>

        {/* Categories Navigation */}
        <div className="space-y-1">
          <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Categories
          </p>
          {categories.map((cat) => {
            const count = documentCounts[cat.id] || 0;
            const isSelected = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isSelected
                    ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                    : 'text-slate-300 hover:bg-slate-900/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isSelected ? 'text-sky-400' : 'text-slate-400'}>
                    {cat.icon}
                  </span>
                  <span>{cat.label}</span>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    isSelected
                      ? 'bg-sky-500/20 text-sky-300 font-semibold'
                      : 'bg-slate-800/80 text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Footer Info */}
      <div className="pt-4 border-t border-slate-800/80 space-y-3">
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1.5">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>100% Private & Offline</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            All images, crops, OCR, and PDFs are processed strictly inside your device.
          </p>
        </div>

        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-900 hover:text-white transition-colors"
        >
          <Settings className="w-4 h-4 text-slate-400" />
          <span>App Settings</span>
        </button>
      </div>
    </aside>
  );
};
