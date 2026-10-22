'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  RotateCw,
  Check,
  Maximize2,
  Sparkles,
  Loader2,
  ChevronRight,
  Eye,
  Crop,
  Layers,
} from 'lucide-react';
import { Point, FilterType, ScannedPage } from '@/types';
import { getDefaultCorners, rotatePoints } from '@/lib/cv/geometry';
import { warpPerspective } from '@/lib/cv/homography';
import { applyFilter, rotateCanvas } from '@/lib/cv/filters';
import { CropCanvas } from './CropCanvas';
import { FilterBar } from './FilterBar';

interface CropEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  rawImages: string[];
  initialFilter?: FilterType;
  onSavePages: (pages: ScannedPage[]) => void;
}

export const CropEditorModal: React.FC<CropEditorModalProps> = ({
  isOpen,
  onClose,
  rawImages,
  initialFilter = 'magic',
  onSavePages,
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [currentFilter, setCurrentFilter] = useState<FilterType>(initialFilter);
  const [rotation, setRotation] = useState<number>(0);
  const [corners, setCorners] = useState<[Point, Point, Point, Point]>([
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 },
  ]);
  const [imgDimensions, setImgDimensions] = useState<{ width: number; height: number }>({
    width: 800,
    height: 1000,
  });

  // Editor mode: 'quad' for dragging 4 corners with loupe, 'preview' for viewing rectified homography warp
  const [editorMode, setEditorMode] = useState<'quad' | 'preview'>('quad');
  const [flattenedPreviewUrl, setFlattenedPreviewUrl] = useState<string | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const processedPagesRef = useRef<ScannedPage[]>([]);

  // When image loads or index changes, compute default corners
  useEffect(() => {
    if (!isOpen || rawImages.length === 0) return;

    const currentImgSrc = rawImages[currentIdx];
    if (!currentImgSrc) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImgDimensions({ width: img.width, height: img.height });
      const defaultQuad = getDefaultCorners(img.width, img.height, 0.05);
      setCorners(defaultQuad);
      setRotation(0);
      setCurrentFilter(initialFilter);
      setEditorMode('quad');
      setFlattenedPreviewUrl(null);
    };
    img.src = currentImgSrc;
  }, [isOpen, currentIdx, rawImages, initialFilter]);

  // Compute live flattened preview when in preview mode or filter changes
  const updateFlattenedPreview = useCallback(async () => {
    if (!rawImages[currentIdx]) return;
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = rawImages[currentIdx];
      });

      // Compute true 4-point homography warp
      const warpedCanvas = warpPerspective(img, corners, 1200);
      // Apply chosen filter
      const filteredCanvas = applyFilter(warpedCanvas, currentFilter);
      setFlattenedPreviewUrl(filteredCanvas.toDataURL('image/jpeg', 0.9));
    } catch (e) {
      console.error('Flattened preview generation failed:', e);
    }
  }, [rawImages, currentIdx, corners, currentFilter]);

  useEffect(() => {
    if (editorMode === 'preview') {
      updateFlattenedPreview();
    }
  }, [editorMode, currentFilter, updateFlattenedPreview]);

  if (!isOpen || rawImages.length === 0) return null;

  const currentImgSrc = rawImages[currentIdx];
  const isLastImage = currentIdx === rawImages.length - 1;

  // Rotate image 90 deg clockwise
  const handleRotateClockwise = () => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);

      const rotatedCanvas = rotateCanvas(c, 90);
      const newSrc = rotatedCanvas.toDataURL('image/jpeg', 0.95);

      // Remap corners
      const newCorners = rotatePoints(corners, img.width, img.height, 90);

      rawImages[currentIdx] = newSrc;
      setImgDimensions({ width: rotatedCanvas.width, height: rotatedCanvas.height });
      setCorners(newCorners);
      if (editorMode === 'preview') {
        updateFlattenedPreview();
      }
    };
    img.src = currentImgSrc;
  };

  // Reset corners to default document quad
  const handleResetCorners = () => {
    setCorners(getDefaultCorners(imgDimensions.width, imgDimensions.height, 0.04));
    if (editorMode === 'preview') {
      updateFlattenedPreview();
    }
  };

  // Apply warp & filter, then advance or save
  const handleApply = async () => {
    setIsProcessing(true);

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = currentImgSrc;
      });

      // 1. Perspective Warp (Homography)
      const warpedCanvas = warpPerspective(img, corners, 1800);

      // 2. Filter application
      const filteredCanvas = applyFilter(warpedCanvas, currentFilter);
      const processedImageUrl = filteredCanvas.toDataURL('image/jpeg', 0.92);

      // 3. Small thumbnail
      const thumbCanvas = document.createElement('canvas');
      const thumbScale = Math.min(1.0, 320 / Math.max(filteredCanvas.width, filteredCanvas.height));
      thumbCanvas.width = Math.round(filteredCanvas.width * thumbScale);
      thumbCanvas.height = Math.round(filteredCanvas.height * thumbScale);
      const thumbCtx = thumbCanvas.getContext('2d');
      if (thumbCtx) {
        thumbCtx.drawImage(filteredCanvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
      }
      const thumbnailUrl = thumbCanvas.toDataURL('image/jpeg', 0.85);

      const newPage: ScannedPage = {
        id: `page-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        originalImageUrl: currentImgSrc,
        processedImageUrl,
        thumbnailUrl,
        corners,
        rotation,
        filter: currentFilter,
        width: filteredCanvas.width,
        height: filteredCanvas.height,
      };

      processedPagesRef.current.push(newPage);

      if (isLastImage) {
        const allPages = [...processedPagesRef.current];
        processedPagesRef.current = [];
        onSavePages(allPages);
      } else {
        setCurrentIdx((prev) => prev + 1);
        setEditorMode('quad');
      }
    } catch (err) {
      console.error('Processing error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col justify-between overflow-hidden select-none safe-top">
      {/* Top action bar */}
      <div className="flex items-center justify-between p-3.5 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80">
        <button
          onClick={onClose}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Cancel"
        >
          <X className="w-5 h-5" />
        </button>

        {/* View Mode Toggle: Quad vs Flattened Preview */}
        <div className="flex items-center p-1 rounded-full bg-slate-900 border border-slate-800">
          <button
            onClick={() => setEditorMode('quad')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              editorMode === 'quad'
                ? 'bg-sky-500 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Crop className="w-3.5 h-3.5" />
            <span>Crop Quad</span>
          </button>

          <button
            onClick={() => {
              setEditorMode('preview');
              updateFlattenedPreview();
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              editorMode === 'preview'
                ? 'bg-sky-500 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Flattened Preview</span>
          </button>
        </div>

        {/* Toolbar: rotate & reset */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleRotateClockwise}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Rotate 90° Clockwise"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetCorners}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Reset to Full Bounds"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Canvas Workspace */}
      <div className="relative flex-1 bg-slate-950 overflow-hidden flex items-center justify-center p-2">
        {editorMode === 'quad' ? (
          <>
            <CropCanvas
              imageSrc={currentImgSrc}
              corners={corners}
              onChangeCorners={setCorners}
              rotation={rotation}
            />

            {/* Instruction Tip */}
            <div className="absolute top-3 inset-x-0 flex justify-center pointer-events-none">
              <span className="px-3.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-[11px] text-slate-200 border border-white/10 shadow-lg">
                Drag corners to align with document edges • Magnifier loupe auto-zooms
              </span>
            </div>
          </>
        ) : (
          <div className="relative max-w-md w-full h-full flex flex-col items-center justify-center p-4">
            {flattenedPreviewUrl ? (
              <div className="relative max-h-full max-w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={flattenedPreviewUrl}
                  alt="Flattened Document Preview"
                  className="max-h-[65vh] w-auto object-contain rounded-2xl"
                />
                <span className="absolute top-2 left-2 px-2.5 py-1 rounded-md bg-black/75 backdrop-blur-md text-[10px] font-mono font-semibold text-emerald-400 border border-emerald-500/30">
                  ✓ Homography Warp Applied
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
                <span className="text-xs">Computing perspective rectification...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom controls: Filter selector + Next/Save button */}
      <div className="bg-slate-950 border-t border-slate-800/80">
        <FilterBar
          currentFilter={currentFilter}
          onChangeFilter={setCurrentFilter}
          isProcessing={isProcessing}
        />

        <div className="p-3 max-w-md mx-auto flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleApply}
            disabled={isProcessing}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-sky-500/25 active:scale-98 transition-all disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Warping Document...</span>
              </>
            ) : isLastImage ? (
              <>
                <Check className="w-4 h-4" />
                <span>Save Document</span>
              </>
            ) : (
              <>
                <span>Next Page ({currentIdx + 1}/{rawImages.length})</span>
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
