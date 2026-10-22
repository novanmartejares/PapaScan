'use client';

import React from 'react';
import { ScannedDocument } from '@/types';
import { FileText, Star, MoreVertical, Calendar, Layers, Share2, Trash2 } from 'lucide-react';

interface DocumentCardProps {
  document: ScannedDocument;
  viewMode: 'grid' | 'list';
  onSelect: (doc: ScannedDocument) => void;
  onToggleStar: (e: React.MouseEvent, docId: string) => void;
  onDelete: (e: React.MouseEvent, docId: string) => void;
  onQuickShare: (e: React.MouseEvent, doc: ScannedDocument) => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  document,
  viewMode,
  onSelect,
  onToggleStar,
  onDelete,
  onQuickShare,
}) => {
  const firstPage = document.pages[0];
  const thumbnail = firstPage?.thumbnailUrl || firstPage?.processedImageUrl;
  const pageCount = document.pages.length;

  const formattedDate = new Date(document.updatedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const categoryColorMap: Record<string, string> = {
    Receipts: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    IDs: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    Contracts: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    General: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  };

  if (viewMode === 'list') {
    return (
      <div
        onClick={() => onSelect(document)}
        className="group flex items-center justify-between p-3 rounded-2xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 transition-all cursor-pointer shadow-sm"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          {/* Thumbnail preview */}
          <div className="w-14 h-16 rounded-xl bg-slate-950 overflow-hidden shrink-0 border border-slate-800 relative flex items-center justify-center">
            {thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumbnail}
                alt={document.title}
                className="w-full h-full object-cover object-top"
              />
            ) : (
              <FileText className="w-6 h-6 text-slate-600" />
            )}
            <span className="absolute bottom-1 right-1 bg-black/70 backdrop-blur-xs text-[9px] font-bold text-white px-1 py-0.2 rounded">
              {pageCount}p
            </span>
          </div>

          {/* Details */}
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm text-slate-100 group-hover:text-sky-400 transition-colors truncate">
                {document.title}
              </h3>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                  categoryColorMap[document.category] || categoryColorMap.General
                }`}
              >
                {document.category}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-slate-500">
                <Calendar className="w-3 h-3" />
                {formattedDate}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={(e) => onToggleStar(e, document.id)}
            className={`p-2 rounded-xl transition-colors ${
              document.starred
                ? 'text-amber-400'
                : 'text-slate-500 hover:text-amber-400'
            }`}
            title="Star document"
          >
            <Star className={`w-4 h-4 ${document.starred ? 'fill-amber-400' : ''}`} />
          </button>
          <button
            onClick={(e) => onQuickShare(e, document)}
            className="p-2 rounded-xl text-slate-500 hover:text-sky-400 transition-colors"
            title="Quick Share PDF"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => onDelete(e, document.id)}
            className="p-2 rounded-xl text-slate-500 hover:text-rose-400 transition-colors"
            title="Delete document"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div
      onClick={() => onSelect(document)}
      className="group flex flex-col rounded-3xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 overflow-hidden transition-all cursor-pointer shadow-sm hover:shadow-xl hover:shadow-sky-500/5 relative"
    >
      {/* Thumbnail Aspect Ratio */}
      <div className="relative aspect-[3/4] bg-slate-950 overflow-hidden border-b border-slate-800/80 flex items-center justify-center">
        {thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnail}
            alt={document.title}
            className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <FileText className="w-12 h-12 text-slate-700" />
        )}

        {/* Page count pill */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-black/60 backdrop-blur-md text-[11px] font-semibold text-white px-2 py-0.8 rounded-full border border-white/10">
          <Layers className="w-3 h-3 text-sky-400" />
          <span>{pageCount} {pageCount === 1 ? 'page' : 'pages'}</span>
        </div>

        {/* Star Button */}
        <button
          onClick={(e) => onToggleStar(e, document.id)}
          className={`absolute top-2.5 right-2.5 p-1.5 rounded-full backdrop-blur-md border border-white/10 transition-colors ${
            document.starred
              ? 'bg-amber-400/20 text-amber-300'
              : 'bg-black/60 text-slate-400 hover:text-amber-400'
          }`}
          title="Star"
        >
          <Star className={`w-3.5 h-3.5 ${document.starred ? 'fill-amber-400' : ''}`} />
        </button>

        {/* Category tag at bottom of preview */}
        <div className="absolute bottom-2.5 left-2.5">
          <span
            className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border backdrop-blur-md ${
              categoryColorMap[document.category] || categoryColorMap.General
            }`}
          >
            {document.category}
          </span>
        </div>
      </div>

      {/* Info footer */}
      <div className="p-3.5 space-y-2">
        <h3 className="font-semibold text-sm text-slate-100 group-hover:text-sky-400 transition-colors line-clamp-1">
          {document.title}
        </h3>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <span className="flex items-center gap-1 text-[11px]">
            <Calendar className="w-3 h-3" />
            {formattedDate}
          </span>

          <div className="flex items-center gap-0.5">
            <button
              onClick={(e) => onQuickShare(e, document)}
              className="p-1 rounded-lg text-slate-500 hover:text-sky-400 transition-colors"
              title="Share"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => onDelete(e, document.id)}
              className="p-1 rounded-lg text-slate-500 hover:text-rose-400 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
