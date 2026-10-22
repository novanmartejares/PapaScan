'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  Star,
  Share2,
  FileDown,
  Edit2,
  Check,
  Crop,
  Layers,
  FileText,
  Plus,
  PenTool,
  ShieldCheck,
  Eraser,
  Sparkles,
} from 'lucide-react';
import { ScannedDocument, ScannedPage, DocumentCategory } from '@/types';
import { PageReorderStrip } from './PageReorderStrip';
import { OCRPanel } from './OCRPanel';
import { ExportModal } from './ExportModal';
import { SignatureModal } from './SignatureModal';
import { WatermarkModal } from './WatermarkModal';
import { RedactionModal } from './RedactionModal';

interface DocumentDetailViewProps {
  document: ScannedDocument;
  onBack: () => void;
  onUpdateDocument: (doc: ScannedDocument) => void;
  onDeleteDocument: (docId: string) => void;
  onAddPage: () => void;
  onEditPageCrop: (pageIndex: number) => void;
}

export const DocumentDetailView: React.FC<DocumentDetailViewProps> = ({
  document: initialDoc,
  onBack,
  onUpdateDocument,
  onDeleteDocument,
  onAddPage,
  onEditPageCrop,
}) => {
  const [doc, setDoc] = useState<ScannedDocument>(initialDoc);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'pages' | 'ocr'>('pages');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(doc.title);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [isWatermarkModalOpen, setIsWatermarkModalOpen] = useState(false);
  const [isRedactionModalOpen, setIsRedactionModalOpen] = useState(false);

  const activePage = doc.pages[activePageIndex] || doc.pages[0];

  // Save Title
  const handleSaveTitle = () => {
    if (!titleInput.trim()) return;
    const updated = { ...doc, title: titleInput.trim(), updatedAt: Date.now() };
    setDoc(updated);
    onUpdateDocument(updated);
    setIsEditingTitle(false);
  };

  // Toggle Star
  const handleToggleStar = () => {
    const updated = { ...doc, starred: !doc.starred, updatedAt: Date.now() };
    setDoc(updated);
    onUpdateDocument(updated);
  };

  // Change Category
  const handleChangeCategory = (cat: Exclude<DocumentCategory, 'All'>) => {
    const updated = { ...doc, category: cat, updatedAt: Date.now() };
    setDoc(updated);
    onUpdateDocument(updated);
  };

  // Move Page in Array
  const handleMovePage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= doc.pages.length) return;
    const newPages = [...doc.pages];
    const [moved] = newPages.splice(fromIndex, 1);
    newPages.splice(toIndex, 0, moved);

    const updated = { ...doc, pages: newPages, updatedAt: Date.now() };
    setDoc(updated);
    setActivePageIndex(toIndex);
    onUpdateDocument(updated);
  };

  // Delete single page
  const handleDeletePage = (index: number) => {
    if (doc.pages.length <= 1) return;
    const newPages = doc.pages.filter((_, idx) => idx !== index);
    const newActive = Math.min(activePageIndex, newPages.length - 1);
    const updated = { ...doc, pages: newPages, updatedAt: Date.now() };
    setDoc(updated);
    setActivePageIndex(newActive);
    onUpdateDocument(updated);
  };

  // Save OCR text back to page
  const handleSaveOcrText = (text: string) => {
    const newPages = [...doc.pages];
    if (newPages[activePageIndex]) {
      newPages[activePageIndex] = { ...newPages[activePageIndex], ocrText: text };
      const updated = { ...doc, pages: newPages, updatedAt: Date.now() };
      setDoc(updated);
      onUpdateDocument(updated);
    }
  };

  // Save signed page
  const handleSaveSignedPage = (newProcessedImageUrl: string, newThumbnailUrl: string) => {
    const newPages = [...doc.pages];
    if (newPages[activePageIndex]) {
      newPages[activePageIndex] = {
        ...newPages[activePageIndex],
        processedImageUrl: newProcessedImageUrl,
        thumbnailUrl: newThumbnailUrl,
      };
      const updated = { ...doc, pages: newPages, updatedAt: Date.now() };
      setDoc(updated);
      onUpdateDocument(updated);
    }
  };

  // Save watermarked page
  const handleSaveWatermarkedPage = (newProcessedImageUrl: string, newThumbnailUrl: string) => {
    const newPages = [...doc.pages];
    if (newPages[activePageIndex]) {
      newPages[activePageIndex] = {
        ...newPages[activePageIndex],
        processedImageUrl: newProcessedImageUrl,
        thumbnailUrl: newThumbnailUrl,
      };
      const updated = { ...doc, pages: newPages, updatedAt: Date.now() };
      setDoc(updated);
      onUpdateDocument(updated);
    }
  };

  // Save redacted page
  const handleSaveRedactedPage = (newProcessedImageUrl: string, newThumbnailUrl: string) => {
    const newPages = [...doc.pages];
    if (newPages[activePageIndex]) {
      newPages[activePageIndex] = {
        ...newPages[activePageIndex],
        processedImageUrl: newProcessedImageUrl,
        thumbnailUrl: newThumbnailUrl,
      };
      const updated = { ...doc, pages: newPages, updatedAt: Date.now() };
      setDoc(updated);
      onUpdateDocument(updated);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col pb-20 safe-top">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={onBack}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
              title="Back to library"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {/* Editable Title */}
            {isEditingTitle ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                  autoFocus
                  className="px-2.5 py-1 text-sm font-bold bg-slate-900 border border-sky-500 rounded-lg text-white focus:outline-none"
                />
                <button
                  onClick={handleSaveTitle}
                  className="p-1.5 rounded-lg bg-sky-500 text-white hover:bg-sky-400"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 min-w-0">
                <h2 className="font-bold text-base text-slate-100 truncate">{doc.title}</h2>
                <button
                  onClick={() => setIsEditingTitle(true)}
                  className="p-1 rounded-lg text-slate-500 hover:text-slate-300 transition-colors"
                  title="Rename document"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleToggleStar}
              className={`p-2 rounded-xl transition-colors ${
                doc.starred
                  ? 'text-amber-400 bg-amber-400/10'
                  : 'text-slate-400 hover:text-amber-400 hover:bg-slate-900'
              }`}
              title="Star document"
            >
              <Star className={`w-5 h-5 ${doc.starred ? 'fill-amber-400' : ''}`} />
            </button>

            <button
              onClick={() => setIsExportModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-semibold text-xs shadow-md shadow-sky-500/20 active:scale-95 transition-all"
            >
              <FileDown className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6 w-full space-y-6">
        {/* Category & Tags Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-900">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Category:</span>
            <select
              value={doc.category}
              onChange={(e) =>
                handleChangeCategory(e.target.value as Exclude<DocumentCategory, 'All'>)
              }
              className="bg-slate-900 border border-slate-800 text-xs font-semibold text-sky-400 rounded-lg px-2.5 py-1 focus:outline-none focus:border-sky-500"
            >
              <option value="Receipts">Receipts</option>
              <option value="IDs">IDs</option>
              <option value="Contracts">Contracts</option>
              <option value="General">General</option>
            </select>
          </div>

          <div className="text-xs text-slate-500">
            Updated {new Date(doc.updatedAt).toLocaleDateString()}
          </div>
        </div>

        {/* Tab switch: Pages vs OCR */}
        <div className="flex items-center p-1 rounded-2xl bg-slate-900/80 border border-slate-800 max-w-sm mx-auto">
          <button
            onClick={() => setActiveTab('pages')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'pages'
                ? 'bg-sky-500 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Pages ({doc.pages.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('ocr')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'ocr'
                ? 'bg-sky-500 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Extract Text (OCR)</span>
          </button>
        </div>

        {/* Active Page Image Preview Card */}
        {activePage && (
          <div className="relative rounded-3xl bg-slate-900/40 border border-slate-800/80 p-4 sm:p-6 flex flex-col items-center gap-3">
            <div className="relative max-w-md w-full aspect-[3/4] bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activePage.processedImageUrl}
                alt={`Page ${activePageIndex + 1}`}
                className="w-full h-full object-contain"
              />
            </div>

            {/* CamScanner Pro Document Tools Bar */}
            <div className="w-full max-w-md space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  CamScanner Pro Tools
                </span>
                <span className="text-[10px] text-slate-500 font-medium">Instant AI Editing</span>
              </div>
              <div className="w-full flex items-center justify-between gap-1.5 p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl overflow-x-auto">
                <button
                  onClick={() => setIsSignatureModalOpen(true)}
                  className="flex-1 min-w-[76px] py-2 px-2 rounded-xl flex flex-col items-center gap-1 hover:bg-slate-800 text-slate-300 hover:text-white transition-all active:scale-95"
                  title="Add digital transparent signature"
                >
                  <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                    <PenTool className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold">Sign</span>
                </button>

                <button
                  onClick={() => setIsWatermarkModalOpen(true)}
                  className="flex-1 min-w-[76px] py-2 px-2 rounded-xl flex flex-col items-center gap-1 hover:bg-slate-800 text-slate-300 hover:text-white transition-all active:scale-95"
                  title="Apply confidential or security watermark"
                >
                  <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold">Watermark</span>
                </button>

                <button
                  onClick={() => setIsRedactionModalOpen(true)}
                  className="flex-1 min-w-[76px] py-2 px-2 rounded-xl flex flex-col items-center gap-1 hover:bg-slate-800 text-slate-300 hover:text-white transition-all active:scale-95"
                  title="Redact or whiteout sensitive information"
                >
                  <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400">
                    <Eraser className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold">Redact</span>
                </button>

                <button
                  onClick={() => onEditPageCrop(activePageIndex)}
                  className="flex-1 min-w-[76px] py-2 px-2 rounded-xl flex flex-col items-center gap-1 hover:bg-slate-800 text-slate-300 hover:text-white transition-all active:scale-95"
                  title="Crop, rotate, and apply lighting filters"
                >
                  <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400">
                    <Crop className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold">Crop / Filter</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tabs Content */}
        {activeTab === 'pages' ? (
          <div className="p-4 rounded-3xl bg-slate-900/40 border border-slate-800/80 space-y-4">
            <PageReorderStrip
              pages={doc.pages}
              activePageIndex={activePageIndex}
              onSelectPage={setActivePageIndex}
              onMovePage={handleMovePage}
              onDeletePage={handleDeletePage}
              onEditPageCrop={onEditPageCrop}
              onAddPage={onAddPage}
            />
          </div>
        ) : (
          <div className="p-4 rounded-3xl bg-slate-900/40 border border-slate-800/80">
            {activePage && (
              <OCRPanel
                imageSrc={activePage.processedImageUrl}
                initialText={activePage.ocrText || ''}
                onSaveOcrText={handleSaveOcrText}
              />
            )}
          </div>
        )}
      </main>

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        document={doc}
      />

      {/* Signature Modal */}
      {activePage && (
        <SignatureModal
          isOpen={isSignatureModalOpen}
          onClose={() => setIsSignatureModalOpen(false)}
          pageImageUrl={activePage.processedImageUrl}
          onSaveSignedPage={handleSaveSignedPage}
        />
      )}

      {/* CamScanner Anti-Theft Watermark Modal */}
      {activePage && (
        <WatermarkModal
          isOpen={isWatermarkModalOpen}
          onClose={() => setIsWatermarkModalOpen(false)}
          pageImageUrl={activePage.processedImageUrl}
          onSaveWatermarkedPage={handleSaveWatermarkedPage}
        />
      )}

      {/* CamScanner Redaction / Eraser Modal */}
      {activePage && (
        <RedactionModal
          isOpen={isRedactionModalOpen}
          onClose={() => setIsRedactionModalOpen(false)}
          pageImageUrl={activePage.processedImageUrl}
          onSaveRedactedPage={handleSaveRedactedPage}
        />
      )}
    </div>
  );
};
