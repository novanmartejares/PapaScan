'use client';

import React, { useState } from 'react';
import {
  X,
  FileDown,
  Share2,
  Image as ImageIcon,
  Check,
  Loader2,
  Sparkles,
  Layers,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ScannedDocument, PDFExportOptions } from '@/types';
import { generateMultiPagePDF, shareOrDownloadPDF } from '@/lib/pdf/generator';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: ScannedDocument;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  document: doc,
}) => {
  const [quality, setQuality] = useState<'high' | 'medium' | 'low'>('medium');
  const [pageSize, setPageSize] = useState<'auto' | 'a4' | 'letter'>('auto');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle PDF Export & Share
  const handleExportPDF = async (action: 'download' | 'share') => {
    setIsExporting(true);
    setExportSuccess(null);

    try {
      const options: PDFExportOptions = {
        quality,
        pageSize,
        orientation: 'auto',
        margin: pageSize === 'auto' ? 0 : 15,
      };

      const { blob, filename } = await generateMultiPagePDF(doc.pages, options, doc.title);

      if (action === 'share') {
        const result = await shareOrDownloadPDF(blob, filename, doc.title);
        setExportSuccess(result === 'shared' ? 'Document shared!' : 'PDF downloaded!');
      } else {
        // Direct download
        const link = window.document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);
        setExportSuccess('PDF downloaded!');
      }

      // Celebrate with confetti
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch {}
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Download individual JPEGs
  const handleDownloadImages = () => {
    doc.pages.forEach((page, idx) => {
      const link = window.document.createElement('a');
      link.href = page.processedImageUrl;
      link.download = `${doc.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_page_${idx + 1}.jpg`;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
    });
    setExportSuccess(`Downloaded ${doc.pages.length} image(s)!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <FileDown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Export Document</h3>
              <p className="text-xs text-slate-400 truncate max-w-[200px]">{doc.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quality selector */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            PDF Resolution & Compression
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'high', label: 'High', desc: 'Original DPI' },
              { id: 'medium', label: 'Medium', desc: '150 DPI (Balanced)' },
              { id: 'low', label: 'Compact', desc: 'Email / Web' },
            ].map((q) => (
              <button
                key={q.id}
                onClick={() => setQuality(q.id as 'high' | 'medium' | 'low')}
                className={`p-3 rounded-2xl border text-center transition-all ${
                  quality === q.id
                    ? 'bg-sky-500/15 border-sky-500 text-sky-300 font-bold shadow'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="text-xs font-bold">{q.label}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{q.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Page size format */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Page Layout Format
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'auto', label: 'Auto Fitted' },
              { id: 'a4', label: 'Standard A4' },
              { id: 'letter', label: 'US Letter' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPageSize(p.id as 'auto' | 'a4' | 'letter')}
                className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                  pageSize === p.id
                    ? 'bg-sky-500/15 border-sky-500 text-sky-300 font-semibold'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Success indicator */}
        {exportSuccess && (
          <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{exportSuccess}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-2">
          <button
            onClick={() => handleExportPDF('share')}
            disabled={isExporting}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-sky-500/25 active:scale-98 transition-all disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Compiling Multi-Page PDF...</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span>Share PDF (Native Web Share)</span>
              </>
            )}
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleExportPDF('download')}
              disabled={isExporting}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
            >
              <FileDown className="w-4 h-4 text-sky-400" />
              <span>Download PDF</span>
            </button>

            <button
              onClick={handleDownloadImages}
              disabled={isExporting}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
            >
              <ImageIcon className="w-4 h-4 text-sky-400" />
              <span>Save as Images</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
