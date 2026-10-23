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
  Trash2,
  Undo,
} from 'lucide-react';
import { Point, FilterType, ScannedPage } from '@/types';
import { getDefaultCorners, rotatePoints } from '@/lib/cv/geometry';
import { detectDocumentBounds } from '@/lib/cv/document-detector';
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
  initialFilter = 'original',
  onSavePages,
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [imagesList, setImagesList] = useState<string[]>([]);
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
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);
  const processedPagesRef = useRef<ScannedPage[]>([]);

  // Synchronize incoming images
  useEffect(() => {
    if (isOpen) {
      setImagesList(rawImages);
      setCurrentIdx(0);
      processedPagesRef.current = [];
    }
  }, [isOpen, rawImages]);

  // When image loads or index changes, run fuller detection pass on full-resolution photo
  useEffect(() => {
    if (!isOpen || imagesList.length === 0) return;

    const currentImgSrc = imagesList[currentIdx];
    if (!currentImgSrc) return;

    setFlattenedPreviewUrl(null);
    setEditorMode('quad');

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImgDimensions({ width: img.width, height: img.height });

      // Run full-resolution document edge detection
      const detection = detectDocumentBounds(img);
      if (detection.isDocumentDetected && detection.corners) {
        setCorners(detection.corners);
      } else {
        const defaultQuad = getDefaultCorners(img.width, img.height, 0.05);
        setCorners(defaultQuad);
      }

      setRotation(0);
      setCurrentFilter(initialFilter);
    };
    img.src = currentImgSrc;
  }, [isOpen, currentIdx, imagesList, initialFilter]);

  if (!isOpen || imagesList.length === 0) return null;

  const currentImgSrc = imagesList[currentIdx];
  const isLastImage = currentIdx === imagesList.length - 1;

  // Manual Trigger: Re-run Smart Document Detection to re-snap to paper edges
  const handleSmartAutoDetect = () => {
    if (!currentImgSrc) return;
    setIsAutoDetecting(true);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const detection = detectDocumentBounds(img);
      if (detection.isDocumentDetected && detection.corners) {
        setCorners(detection.corners);
      } else {
        setCorners(getDefaultCorners(img.width, img.height, 0.04));
      }
      setIsAutoDetecting(false);

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(25);
      }
    };
    img.src = currentImgSrc;
  };

  // Reset to full bounds
  const handleResetFull = () => {
    const defaultQuad = getDefaultCorners(imgDimensions.width, imgDimensions.height, 0.02);
    setCorners(defaultQuad);
  };

  // 90° Clockwise Rotation
  const handleRotate = () => {
    const nextRotation = (rotation + 90) % 360;
    setRotation(nextRotation);

    const rotatedCorners = rotatePoints(
      corners,
      imgDimensions.width,
      imgDimensions.height,
      90
    );
    setCorners(rotatedCorners);
    setImgDimensions({
      width: imgDimensions.height,
      height: imgDimensions.width,
    });
  };

  // Remove current page from multi-page scan
  const handleRemovePage = () => {
    if (imagesList.length <= 1) {
      onClose();
      return;
    }
    const nextList = imagesList.filter((_, idx) => idx !== currentIdx);
    setImagesList(nextList);
    setCurrentIdx((prev) => Math.min(prev, nextList.length - 1));
  };

  // Toggle perspective warp rectified preview
  const handleTogglePreview = () => {
    if (editorMode === 'preview') {
      setEditorMode('quad');
      return;
    }

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        // Perspective warp homography transformation
        const warped = warpPerspective(img, corners);
        const filtered = applyFilter(warped, currentFilter);
        setFlattenedPreviewUrl(filtered.toDataURL('image/jpeg', 0.9));
        setEditorMode('preview');
      };
      img.src = currentImgSrc;
    } catch (err) {
      console.error('Homography warp preview error:', err);
    }
  };

  // Apply perspective warp & filter, saving only the straightened document
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

      // 1. Perspective Warp: Straighten the document flat via homography
      let warpedCanvas = warpPerspective(img, corners);

      // Apply rotation if needed
      if (rotation > 0) {
        warpedCanvas = rotateCanvas(warpedCanvas, rotation as 90 | 180 | 270);
      }

      // 2. Apply Selected Filter (Original, B&W, Sharpen, No Shadow, Magic Color)
      const filteredCanvas = applyFilter(warpedCanvas, currentFilter);
      const processedImageUrl = filteredCanvas.toDataURL('image/jpeg', 0.92);

      // 3. Generate Thumbnail
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
      }
    } catch (err) {
      console.error('Perspective warp processing error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col justify-between overflow-hidden select-none safe-top">
      {/* Top action bar */}
      <div className="flex items-center justify-between p-3.5 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80">
        <button
          onClick={onClose}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
          title="Cancel"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title & Multi-Page indicator */}
        <div className="flex items-center gap-2">
          <div className="text-center">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5 justify-center">
              <Crop className="w-4 h-4 text-sky-400" />
              <span>Corner Refinement</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              {imagesList.length > 1
                ? `Page ${currentIdx + 1} of ${imagesList.length}`
                : 'Drag 4 corners to straighten document'}
            </p>
          </div>
        </div>

        {/* Re-snap / Rotate / Remove Page / Save */}
        <div className="flex items-center gap-1.5">
          {imagesList.length > 1 && (
            <button
              onClick={handleRemovePage}
              className="p-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
              title="Remove this page"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={handleRotate}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-900 transition-colors"
            title="Rotate 90°"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleTogglePreview}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              editorMode === 'preview'
                ? 'bg-sky-500 text-white border-sky-400 shadow-md shadow-sky-500/20'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white hover:border-slate-700'
            }`}
            title="Preview rectified perspective warp"
            aria-label="Perspective Warp"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="text-[11px] font-bold">
              {editorMode === 'preview' ? 'Edit Quad' : 'Warp'}
            </span>
          </button>

          <button
            onClick={handleApply}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-sky-500/25 active:scale-95 transition-all disabled:opacity-50"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isLastImage ? (
              <>
                <Check className="w-4 h-4" />
                <span>Save Scan</span>
              </>
            ) : (
              <>
                <span>Next Page</span>
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Canvas Workspace */}
      <div className="relative flex-1 w-full h-full overflow-hidden flex items-center justify-center bg-slate-950">
        {editorMode === 'quad' ? (
          <CropCanvas
            imageSrc={currentImgSrc}
            corners={corners}
            onChangeCorners={setCorners}
            rotation={rotation}
          />
        ) : (
          /* Flattened Rectified Preview */
          <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
            <div className="relative max-w-lg max-h-[75vh] w-full h-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 flex items-center justify-center">
              {flattenedPreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={flattenedPreviewUrl}
                  alt="Rectified Perspective Preview"
                  className="w-full h-full object-contain"
                />
              ) : (
                <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
              )}
            </div>
            <div className="mt-2 text-xs font-medium text-emerald-400 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" />
              <span>Perspective Distortion Flattened (Homography Rectified)</span>
            </div>
          </div>
        )}

        {/* Toolbar Floating Controls (Auto-Detect, Full Reset) */}
        {editorMode === 'quad' && (
          <div className="absolute top-3 left-4 z-20 flex items-center gap-2">
            <button
              onClick={handleSmartAutoDetect}
              disabled={isAutoDetecting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 backdrop-blur-md border border-emerald-400/50 text-emerald-300 text-xs font-bold hover:bg-emerald-500/30 transition-all shadow-lg active:scale-95 disabled:opacity-50"
              title="Auto-detect paper boundaries"
            >
              {isAutoDetecting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span>Auto-Detect</span>
            </button>

            <button
              onClick={handleResetFull}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/10 text-slate-300 text-xs font-semibold hover:text-white hover:bg-slate-800 transition-all shadow-lg active:scale-95"
              title="Reset corners to full bounds"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Full Sheet</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter Bar with Original / B&W / Sharpen / No Shadow / Magic Color */}
      <FilterBar
        currentFilter={currentFilter}
        onChangeFilter={(f) => {
          setCurrentFilter(f);
          if (editorMode === 'preview') {
            // Update preview
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              const warped = warpPerspective(img, corners);
              const filtered = applyFilter(warped, f);
              setFlattenedPreviewUrl(filtered.toDataURL('image/jpeg', 0.9));
            };
            img.src = currentImgSrc;
          }
        }}
        isProcessing={isProcessing}
      />
    </div>
  );
};
