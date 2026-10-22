'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ScannedDocument,
  ScannedPage,
  DocumentCategory,
  ViewMode,
  FilterType,
  CaptureMode,
} from '@/types';
import {
  initDatabase,
  getAllDocuments,
  saveDocument,
  deleteDocument,
  toggleStarred,
  searchDocuments,
} from '@/lib/db';
import { generateInitialDemoDocuments } from '@/lib/db/demo-data';

// Components
import { Header } from '@/components/common/Header';
import { BottomNav } from '@/components/common/BottomNav';
import { DesktopSidebar } from '@/components/common/DesktopSidebar';
import { Toast, ToastMessage } from '@/components/common/Toast';
import { SettingsModal } from '@/components/common/SettingsModal';
import { SearchBar } from '@/components/library/SearchBar';
import { DocumentFilter } from '@/components/library/DocumentFilter';
import { DocumentCard } from '@/components/library/DocumentCard';
import { CamScannerToolsHub } from '@/components/library/CamScannerToolsHub';
import { EmptyState } from '@/components/library/EmptyState';
import { CameraModal } from '@/components/scanner/CameraModal';
import { CropEditorModal } from '@/components/editor/CropEditorModal';
import { DocumentDetailView } from '@/components/detail/DocumentDetailView';
import { ExportModal } from '@/components/detail/ExportModal';
import { MobileSyncModal } from '@/components/scanner/MobileSyncModal';

export default function HomePage() {
  const [documents, setDocuments] = useState<ScannedDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('library');
  const [cardLayout, setCardLayout] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);

  // Active / editing document
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);

  // Modals state
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [initialCameraMode, setInitialCameraMode] = useState<CaptureMode>('single');
  const [isCropEditorOpen, setIsCropEditorOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobileSyncOpen, setIsMobileSyncOpen] = useState(false);
  const [quickShareDoc, setQuickShareDoc] = useState<ScannedDocument | null>(null);

  // Crop editor inputs
  const [pendingRawImages, setPendingRawImages] = useState<string[]>([]);
  const [targetDocIdForAppend, setTargetDocIdForAppend] = useState<string | null>(null);
  const [editingPageIndex, setEditingPageIndex] = useState<number | null>(null);

  // Preferences
  const [defaultFilter, setDefaultFilter] = useState<FilterType>('magic');
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ id: `${Date.now()}`, text, type });
  }, []);

  // Initialize DB and load documents
  const loadDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const docs = await initDatabase();
      setDocuments(docs);
    } catch (err) {
      console.error('Failed to load documents from IDB:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Compute category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      All: documents.length,
      Receipts: 0,
      IDs: 0,
      Contracts: 0,
      General: 0,
    };
    documents.forEach((d) => {
      if (counts[d.category] !== undefined) {
        counts[d.category]++;
      } else {
        counts.General++;
      }
    });
    return counts;
  }, [documents]);

  // Filtered documents list
  const filteredDocuments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return documents.filter((doc) => {
      if (selectedCategory !== 'All' && doc.category !== selectedCategory) {
        return false;
      }
      if (!q) return true;

      // Match title
      if (doc.title.toLowerCase().includes(q)) return true;

      // Match tags
      if (doc.tags.some((t) => t.toLowerCase().includes(q))) return true;

      // Match OCR text
      const hasOcr = doc.pages.some((p) => p.ocrText?.toLowerCase().includes(q));
      if (hasOcr) return true;

      return false;
    });
  }, [documents, selectedCategory, searchQuery]);

  // Active document object
  const activeDocument = useMemo(() => {
    return documents.find((d) => d.id === activeDocumentId) || null;
  }, [documents, activeDocumentId]);

  // Handle camera capture or upload files
  const handleCaptureComplete = (images: string[]) => {
    setIsCameraOpen(false);
    if (images.length === 0) return;

    setPendingRawImages(images);
    setIsCropEditorOpen(true);
  };

  // Trigger file upload from desktop
  const handleTriggerUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = (e: Event) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        const readers = Array.from(files).map(
          (file) =>
            new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = (ev) => resolve(ev.target?.result as string);
              reader.readAsDataURL(file);
            })
        );
        Promise.all(readers).then((dataUrls) => {
          handleCaptureComplete(dataUrls);
        });
      }
    };
    input.click();
  };

  // Save processed pages from CropEditor
  const handleSavePagesFromEditor = async (newPages: ScannedPage[]) => {
    setIsCropEditorOpen(false);

    if (targetDocIdForAppend) {
      // Append pages to existing document
      const existingDoc = documents.find((d) => d.id === targetDocIdForAppend);
      if (existingDoc) {
        let updatedPages = [...existingDoc.pages];
        if (editingPageIndex !== null && newPages.length === 1) {
          // Replace single edited page while preserving existing OCR text
          const prevOcr = updatedPages[editingPageIndex]?.ocrText;
          updatedPages[editingPageIndex] = {
            ...newPages[0],
            ocrText: newPages[0].ocrText || prevOcr,
          };
        } else {
          // Append new pages
          updatedPages = [...updatedPages, ...newPages];
        }

        const updatedDoc: ScannedDocument = {
          ...existingDoc,
          pages: updatedPages,
          updatedAt: Date.now(),
        };

        await saveDocument(updatedDoc);
        setDocuments((prev) => prev.map((d) => (d.id === updatedDoc.id ? updatedDoc : d)));
        showToast('Document updated successfully!');
      }

      setTargetDocIdForAppend(null);
      setEditingPageIndex(null);
    } else {
      // Create new document from captured pages
      const now = Date.now();
      const firstPage = newPages[0];

      // Auto categorize based on aspect ratio
      const isCardAspect =
        firstPage && Math.abs(firstPage.width / firstPage.height - 1.58) < 0.25;

      const newDoc: ScannedDocument = {
        id: `doc-${now}-${Math.random().toString(36).substr(2, 5)}`,
        title: `Scan ${new Date().toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}`,
        category: isCardAspect ? 'IDs' : selectedCategory !== 'All' ? selectedCategory : 'General',
        tags: ['New Scan'],
        createdAt: now,
        updatedAt: now,
        pages: newPages,
        starred: false,
      };

      await saveDocument(newDoc);
      setDocuments((prev) => [newDoc, ...prev]);
      setActiveDocumentId(newDoc.id);
      setViewMode('detail');
      showToast('New document created!');
    }
  };

  // Toggle star
  const handleToggleStar = async (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();
    const newStar = await toggleStarred(docId);
    setDocuments((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, starred: newStar } : d))
    );
    showToast(newStar ? 'Added to favorites' : 'Removed from favorites', 'info');
  };

  // Delete document
  const handleDeleteDocument = async (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this scanned document?')) {
      await deleteDocument(docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      if (activeDocumentId === docId) {
        setViewMode('library');
        setActiveDocumentId(null);
      }
      showToast('Document deleted');
    }
  };

  // Update document from Detail view
  const handleUpdateDocument = async (updatedDoc: ScannedDocument) => {
    await saveDocument(updatedDoc);
    setDocuments((prev) => prev.map((d) => (d.id === updatedDoc.id ? updatedDoc : d)));
  };

  // Add page from Detail view
  const handleAddPageToDocument = (docId: string) => {
    setTargetDocIdForAppend(docId);
    setEditingPageIndex(null);
    setIsCameraOpen(true);
  };

  // Edit crop/filter of single page from Detail view
  const handleEditPageCrop = (pageIndex: number) => {
    if (!activeDocument) return;
    const page = activeDocument.pages[pageIndex];
    if (!page) return;

    setTargetDocIdForAppend(activeDocument.id);
    setEditingPageIndex(pageIndex);
    setPendingRawImages([page.originalImageUrl]);
    setIsCropEditorOpen(true);
  };

  // Reset Demo Data
  const handleResetDemoData = async () => {
    const demoDocs = generateInitialDemoDocuments();
    for (const d of demoDocs) {
      await saveDocument(d);
    }
    const all = await getAllDocuments();
    setDocuments(all);
    setIsSettingsOpen(false);
    showToast('Demo documents restored!');
  };

  // Clear all data
  const handleClearAllData = async () => {
    if (confirm('Delete ALL scanned documents from this device?')) {
      for (const d of documents) {
        await deleteDocument(d.id);
      }
      setDocuments([]);
      setIsSettingsOpen(false);
      setViewMode('library');
      showToast('All local data cleared', 'info');
    }
  };

  // CamScanner Pro Suite Quick Actions
  const handleOpenSmartScan = () => {
    setTargetDocIdForAppend(null);
    setInitialCameraMode('single');
    setIsCameraOpen(true);
  };

  const handleOpenIdCardScan = () => {
    setTargetDocIdForAppend(null);
    setInitialCameraMode('id_card');
    setIsCameraOpen(true);
  };

  const handleOpenWatermark = () => {
    if (documents.length > 0) {
      setActiveDocumentId(documents[0].id);
      setViewMode('detail');
      showToast('Tap "Watermark" in the CamScanner Pro bar below', 'info');
    } else {
      handleTriggerUpload();
    }
  };

  const handleOpenRedaction = () => {
    if (documents.length > 0) {
      setActiveDocumentId(documents[0].id);
      setViewMode('detail');
      showToast('Tap "Redact" in the CamScanner Pro bar below', 'info');
    } else {
      handleTriggerUpload();
    }
  };

  const handleOpenSignature = () => {
    if (documents.length > 0) {
      setActiveDocumentId(documents[0].id);
      setViewMode('detail');
      showToast('Tap "Sign" in the CamScanner Pro bar below', 'info');
    } else {
      handleTriggerUpload();
    }
  };

  const handleOpenOCR = () => {
    if (documents.length > 0) {
      setActiveDocumentId(documents[0].id);
      setViewMode('detail');
      showToast('Tap "Extract Text (OCR)" tab for 1-click .TXT export', 'info');
    } else {
      handleTriggerUpload();
    }
  };

  const handleOpenNoShadow = () => {
    if (documents.length > 0 && documents[0].pages[0]) {
      const page = documents[0].pages[0];
      setTargetDocIdForAppend(documents[0].id);
      setEditingPageIndex(0);
      setPendingRawImages([page.originalImageUrl]);
      setDefaultFilter('noshadow');
      setIsCropEditorOpen(true);
      showToast('CamScanner "No Shadow" filter applied', 'info');
    } else {
      handleTriggerUpload();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col selection:bg-sky-500 selection:text-white">
      {/* Toast notifications */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Render Document Detail View if open */}
      {viewMode === 'detail' && activeDocument ? (
        <DocumentDetailView
          document={activeDocument}
          onBack={() => setViewMode('library')}
          onUpdateDocument={handleUpdateDocument}
          onDeleteDocument={(id) => {
            deleteDocument(id);
            setDocuments((prev) => prev.filter((d) => d.id !== id));
            setViewMode('library');
          }}
          onAddPage={() => handleAddPageToDocument(activeDocument.id)}
          onEditPageCrop={handleEditPageCrop}
        />
      ) : (
        /* Document Library (Home View) */
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <Header
            viewTitle="PapaScan"
            isSearching={isSearchActive}
            onToggleSearch={() => {
              setIsSearchActive((prev) => !prev);
              if (isSearchActive) setSearchQuery('');
            }}
            viewMode={cardLayout}
            onToggleViewMode={() =>
              setCardLayout((prev) => (prev === 'grid' ? 'list' : 'grid'))
            }
            onOpenScanner={() => {
              setTargetDocIdForAppend(null);
              setIsCameraOpen(true);
            }}
            onOpenMobileSync={() => setIsMobileSyncOpen(true)}
          />

          {/* Body: Responsive Sidebar on Desktop + Library Canvas */}
          <div className="flex-1 flex">
            {/* Desktop Sidebar */}
            <DesktopSidebar
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              documentCounts={categoryCounts}
              onOpenScanner={() => {
                setTargetDocIdForAppend(null);
                setIsCameraOpen(true);
              }}
              onOpenMobileSync={() => setIsMobileSyncOpen(true)}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onTriggerUpload={handleTriggerUpload}
            />

            {/* Main Library Viewport */}
            <main className="flex-1 max-w-6xl mx-auto px-4 py-6 w-full space-y-5 pb-24 md:pb-12">
              {/* Search Bar (shown when toggled or if query present) */}
              {(isSearchActive || searchQuery) && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                  <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    onClear={() => setSearchQuery('')}
                  />
                </div>
              )}

              {/* CamScanner Pro Suite Feature Hub */}
              <CamScannerToolsHub
                onOpenSmartScan={handleOpenSmartScan}
                onOpenIdCardScan={handleOpenIdCardScan}
                onOpenWatermark={handleOpenWatermark}
                onOpenRedaction={handleOpenRedaction}
                onOpenSignature={handleOpenSignature}
                onOpenOCR={handleOpenOCR}
                onOpenNoShadow={handleOpenNoShadow}
              />

              {/* Category Pills (Mobile & Tablet) */}
              <div className="md:hidden">
                <DocumentFilter
                  selectedCategory={selectedCategory}
                  onSelectCategory={setSelectedCategory}
                  counts={categoryCounts}
                />
              </div>

              {/* Status bar */}
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>
                  Showing {filteredDocuments.length}{' '}
                  {filteredDocuments.length === 1 ? 'document' : 'documents'}
                </span>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-sky-400 hover:underline"
                  >
                    Clear Search
                  </button>
                )}
              </div>

              {/* Document List / Grid */}
              {isLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((n) => (
                    <div
                      key={n}
                      className="aspect-[3/4] rounded-3xl bg-slate-900/60 border border-slate-800 animate-pulse"
                    />
                  ))}
                </div>
              ) : filteredDocuments.length > 0 ? (
                <div
                  className={
                    cardLayout === 'grid'
                      ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4'
                      : 'flex flex-col gap-2.5'
                  }
                >
                  {filteredDocuments.map((doc) => (
                    <DocumentCard
                      key={doc.id}
                      document={doc}
                      viewMode={cardLayout}
                      onSelect={(selected) => {
                        setActiveDocumentId(selected.id);
                        setViewMode('detail');
                      }}
                      onToggleStar={handleToggleStar}
                      onDelete={handleDeleteDocument}
                      onQuickShare={(e, d) => {
                        e.stopPropagation();
                        setQuickShareDoc(d);
                      }}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  onOpenScanner={() => {
                    setTargetDocIdForAppend(null);
                    setIsCameraOpen(true);
                  }}
                  onTriggerUpload={handleTriggerUpload}
                  isFiltered={searchQuery.length > 0 || selectedCategory !== 'All'}
                />
              )}
            </main>
          </div>

          {/* Bottom Nav for Mobile */}
          <BottomNav
            currentView={viewMode}
            onNavigate={setViewMode}
            onOpenScanner={() => {
              setTargetDocIdForAppend(null);
              setIsCameraOpen(true);
            }}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        </div>
      )}

      {/* Camera Capture Modal */}
      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => {
          setIsCameraOpen(false);
          setTargetDocIdForAppend(null);
        }}
        onCaptureComplete={handleCaptureComplete}
        initialCaptureMode={initialCameraMode}
      />

      {/* Interactive 4-Point Crop & Filter Editor */}
      <CropEditorModal
        isOpen={isCropEditorOpen}
        onClose={() => {
          setIsCropEditorOpen(false);
          setPendingRawImages([]);
          setTargetDocIdForAppend(null);
        }}
        rawImages={pendingRawImages}
        initialFilter={defaultFilter}
        onSavePages={handleSavePagesFromEditor}
      />

      {/* App Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        defaultFilter={defaultFilter}
        onChangeDefaultFilter={setDefaultFilter}
        onResetDemoData={handleResetDemoData}
        onClearAllData={handleClearAllData}
        documentCount={documents.length}
      />

      {/* Mobile Phone Sync Modal */}
      <MobileSyncModal
        isOpen={isMobileSyncOpen}
        onClose={() => setIsMobileSyncOpen(false)}
        onReceivedPages={(images) => {
          setIsMobileSyncOpen(false);
          showToast(`Received ${images.length} page(s) from phone!`);
          handleCaptureComplete(images);
        }}
      />

      {/* Quick Share Export Modal */}
      {quickShareDoc && (
        <ExportModal
          isOpen={!!quickShareDoc}
          onClose={() => setQuickShareDoc(null)}
          document={quickShareDoc}
        />
      )}
    </div>
  );
}
