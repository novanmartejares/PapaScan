'use client';

import React from 'react';
import { Check, X } from 'lucide-react';
import { ScanBatchItem } from '@/types';

interface BatchTrayProps {
  items: ScanBatchItem[];
  onRemoveItem: (id: string) => void;
  onFinishBatch: () => void;
}

export const BatchTray: React.FC<BatchTrayProps> = ({
  items,
  onRemoveItem,
  onFinishBatch,
}) => {
  if (items.length === 0) return null;

  return (
    <div className="absolute bottom-28 inset-x-4 max-w-md mx-auto z-30 bg-slate-950/85 backdrop-blur-xl border border-slate-800 p-2.5 rounded-2xl shadow-2xl flex items-center justify-between gap-3 animate-in slide-in-from-bottom-3 duration-200">
      {/* Thumbnails list */}
      <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none min-w-0">
        {items.map((item, idx) => (
          <div
            key={item.id}
            className="relative w-12 h-16 rounded-lg bg-slate-900 overflow-hidden border border-slate-700 shrink-0 group"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.rawImage}
              alt={`Batch page ${idx + 1}`}
              className="w-full h-full object-cover"
            />
            <span className="absolute bottom-0.5 left-0.5 bg-black/70 text-[9px] font-bold text-white px-1 rounded">
              {idx + 1}
            </span>
            <button
              onClick={() => onRemoveItem(item.id)}
              className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-rose-500 text-white opacity-80 hover:opacity-100 transition-opacity"
              title="Remove page"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Done button */}
      <button
        onClick={onFinishBatch}
        className="shrink-0 flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs shadow-lg shadow-sky-500/25 active:scale-95 transition-all"
      >
        <Check className="w-4 h-4" />
        <span>Done ({items.length})</span>
      </button>
    </div>
  );
};
