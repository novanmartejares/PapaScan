'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Sparkles,
  Copy,
  Check,
  Loader2,
  RefreshCw,
  Search,
  Save,
  Download,
} from 'lucide-react';
import { extractTextFromImage, OCRProgress } from '@/lib/ocr/engine';

interface OCRPanelProps {
  imageSrc: string;
  initialText?: string;
  onSaveOcrText: (text: string) => void;
}

export const OCRPanel: React.FC<OCRPanelProps> = ({
  imageSrc,
  initialText = '',
  onSaveOcrText,
}) => {
  const [extractedText, setExtractedText] = useState(initialText);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<OCRProgress>({ status: '', progress: 0 });
  const [copied, setCopied] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');

  // Sync initialText when page or document selection changes
  useEffect(() => {
    setExtractedText(initialText);
  }, [initialText]);

  // Start OCR Extraction
  const handleStartOCR = async () => {
    setIsProcessing(true);
    setProgress({ status: 'Initializing Tesseract OCR engine...', progress: 0.1 });

    try {
      const text = await extractTextFromImage(imageSrc, (p) => {
        setProgress(p);
      });

      setExtractedText(text);
      onSaveOcrText(text);
    } catch (err) {
      console.error('OCR failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Copy to clipboard
  const handleCopy = async () => {
    if (!extractedText) return;
    try {
      await navigator.clipboard.writeText(extractedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Clipboard copy error:', e);
    }
  };

  // Download as TXT file
  const handleDownloadTxt = () => {
    if (!extractedText) return;
    const blob = new Blob([extractedText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `papascan-ocr-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Top action row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-100">Client-Side OCR</h4>
            <p className="text-[11px] text-slate-400">
              Extracts text privately in your browser using Tesseract.js
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {extractedText && (
            <>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                title="Copy text to clipboard"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>

              <button
                onClick={handleDownloadTxt}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                title="Download extracted text as .txt file"
              >
                <Download className="w-3.5 h-3.5 text-sky-400" />
                <span>Export .TXT</span>
              </button>
            </>
          )}

          <button
            onClick={handleStartOCR}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-sky-500/20 active:scale-95 transition-all disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Extracting...</span>
              </>
            ) : extractedText ? (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Re-Extract Text</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Extract Text</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Progress Bar while OCR is running */}
      {isProcessing && (
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-sky-500/30 space-y-2 animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-xs">
            <span className="text-sky-300 font-medium capitalize">
              {progress.status || 'Extracting characters...'}
            </span>
            <span className="text-sky-400 font-bold">
              {Math.round((progress.progress || 0) * 100)}%
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full transition-all duration-200"
              style={{ width: `${Math.max(5, (progress.progress || 0) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Extracted text display & editor */}
      {extractedText ? (
        <div className="space-y-2">
          {/* Quick search filter in text */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Find inside extracted text..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="relative rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden">
            <textarea
              value={extractedText}
              onChange={(e) => {
                setExtractedText(e.target.value);
                onSaveOcrText(e.target.value);
              }}
              rows={10}
              className="w-full p-4 bg-transparent text-slate-200 text-xs sm:text-sm font-mono leading-relaxed focus:outline-none resize-y"
              placeholder="Extracted OCR text will appear here..."
            />
          </div>

          <p className="text-[11px] text-slate-400">
            You can edit or format the recognized text above. Changes are auto-saved to your document.
          </p>
        </div>
      ) : !isProcessing ? (
        <div className="p-8 rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 text-center space-y-2">
          <FileText className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-xs font-medium text-slate-300">No text extracted yet</p>
          <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
            Click &quot;Extract Text&quot; to run on-device optical character recognition on this page.
          </p>
        </div>
      ) : null}
    </div>
  );
};
