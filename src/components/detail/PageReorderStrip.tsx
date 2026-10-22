'use client';

import React from 'react';
import { ScannedPage } from '@/types';
import {
  ChevronLeft,
  ChevronRight,
  Trash2,
  Crop,
  Plus,
  Layers,
} from 'lucide-react';

interface PageReorderStripProps {
  pages: ScannedPage[];
  activePageIndex: number;
  onSelectPage: (index: number) => void;
  onMovePage: (fromIndex: number, toIndex: number) => void;
  onDeletePage: (index: number) => void;
  onEditPageCrop: (index: number) => void;
  onAddPage: () => void;
}

export const PageReorderStrip: React.FC<PageReorderStripProps> = ({
  pages,
  activePageIndex,
  onSelectPage,
  onMovePage,
  onDeletePage,
  onEditPageCrop,
  onAddPage,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span className="flex items-center gap-1.5 font-semibold text-slate-200">
          <Layers className="w-4 h-4 text-sky-400" />
          <span>Pages ({pages.length})</span>
        </span>
        <span className="text-[11px] text-slate-500">
          Page {activePageIndex + 1} selected
        </span>
      </div>

      {/* Pages strip */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
        {pages.map((page, idx) => {
          const isSelected = activePageIndex === idx;
          const thumbnail = page.thumbnailUrl || page.processedImageUrl;

          return (
            <div
              key={page.id}
              onClick={() => onSelectPage(idx)}
              className={`group relative flex-shrink-0 w-24 rounded-2xl overflow-hidden border-2 transition-all cursor-pointer bg-slate-900 ${
                isSelected
                  ? 'border-sky-400 ring-4 ring-sky-500/20 shadow-lg'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Thumbnail image */}
              <div className="aspect-[3/4] w-full bg-slate-950 overflow-hidden relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumbnail}
                  alt={`Page ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-1.5 left-1.5 bg-black/70 backdrop-blur-xs text-[10px] font-bold text-white px-1.5 py-0.5 rounded">
                  {idx + 1}
                </span>
              </div>

              {/* Action overlay bar */}
              <div className="p-1 bg-slate-950 flex items-center justify-between text-slate-400 text-xs">
                {/* Move Left */}
                <button
                  disabled={idx === 0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMovePage(idx, idx - 1);
                  }}
                  className="p-1 rounded hover:text-white disabled:opacity-20 transition-opacity"
                  title="Move Left"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                {/* Edit Crop */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditPageCrop(idx);
                  }}
                  className="p-1 rounded hover:text-sky-400 transition-colors"
                  title="Edit Crop / Filter"
                >
                  <Crop className="w-3 h-3" />
                </button>

                {/* Delete (only if > 1 page) */}
                <button
                  disabled={pages.length <= 1}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeletePage(idx);
                  }}
                  className="p-1 rounded hover:text-rose-400 disabled:opacity-20 transition-colors"
                  title="Delete page"
                >
                  <Trash2 className="w-3 h-3" />
                </button>

                {/* Move Right */}
                <button
                  disabled={idx === pages.length - 1}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMovePage(idx, idx + 1);
                  }}
                  className="p-1 rounded hover:text-white disabled:opacity-20 transition-opacity"
                  title="Move Right"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {/* Add Page Card */}
        <button
          onClick={onAddPage}
          className="flex-shrink-0 w-24 aspect-[3/4] rounded-2xl border-2 border-dashed border-slate-800 hover:border-sky-500/50 bg-slate-900/40 hover:bg-sky-500/5 transition-all flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-sky-400 group"
        >
          <div className="p-2 rounded-xl bg-slate-800 group-hover:bg-sky-500/20 text-slate-300 group-hover:text-sky-400 transition-colors">
            <Plus className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-semibold">Add Page</span>
        </button>
      </div>
    </div>
  );
};
