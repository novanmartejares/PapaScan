'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  RotateCw,
  Check,
  Maximize2,
  Loader2,
  ChevronRight,
  Crop as CropIcon,
  FileText,
  Square,
  Smartphone,
} from 'lucide-react';
import { RectCrop, FilterType, ScannedPage, AspectRatioType } from '@/types';
import { getDefaultRectCrop, rotateRectCrop, cropToCorners } from '@/lib/cv/geometry';
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
  const [selectedRatio, setSelectedRatio] = useState<AspectRatioType>('free');

  const [crop, setCrop] = useState<RectCrop>({
    x: 0,
    y: 0,
    width: 800,
    height: 1000,
  });

  const [imgDimensions, setImgDimensions] = useState<{ width: number; height: number }>({
    width: 800,
    height: 1000,
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const processedPagesRef = useRef<ScannedPage[]>([]);

  // When image loads or index changes, compute default rectangular crop box
  useEffect(() => {
    if (!isOpen || rawImages.length === 0) return;

    const currentImgSrc = rawImages[currentIdx];
    if (!currentImgSrc) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImgDimensions({ width: img.width, height: img.height });
      const defaultCrop = getDefaultRectCrop(img.width, img.height, 0.04);
      setCrop(defaultCrop);
      setRotation(0);
      setCurrentFilter(initialFilter);
      setSelectedRatio('free');
    };
    img.src = currentImgSrc;
  }, [isOpen, currentIdx, rawImages, initialFilter]);

  if (!isOpen || rawImages.length === 0) return null;

  const currentImgSrc = rawImages[currentIdx];
  const isLastImage = currentIdx === rawImages.length - 1;

  // Aspect ratio multiplier (width / height)
  const getNumericAspectRatio = (): number | null => {
    const isPortrait = imgDimensions.height >= imgDimensions.width;
    switch (selectedRatio) {
      case 'a4':
        return isPortrait ? 1 / 1.414 : 1.414;
      case '1:1':
        return 1.0;
      case '4:3':
        return isPortrait ? 3 / 4 : 4 / 3;
      case 'original':
        return imgDimensions.width / imgDimensions.height;
      case 'free':
      default:
        return null;
    }
  };

  // Change Aspect Ratio preset and auto-adjust crop box
  const handleSelectRatio = (ratio: AspectRatioType) => {
    setSelectedRatio(ratio);
    if (ratio === 'free') return;

    let targetRatio = 1.0;
    const isPortrait = imgDimensions.height >= imgDimensions.width;
    if (ratio === 'a4') targetRatio = isPortrait ? 1 / 1.414 : 1.414;
    else if (ratio === '1:1') targetRatio = 1.0;
    else if (ratio === '4:3') targetRatio = isPortrait ? 3 / 4 : 4 / 3;
    else if (ratio === 'original') targetRatio = imgDimensions.width / imgDimensions.height;

    // Center crop with target aspect ratio
    const imgW = imgDimensions.width;
    const imgH = imgDimensions.height;
    let newW = imgW * 0.9;
    let newH = newW / targetRatio;

    if (newH > imgH * 0.9) {
      newH = imgH * 0.9;
      newW = newH * targetRatio;
    }

    const newX = (imgW - newW) / 2;
    const newY = (imgH - newH) / 2;

    setCrop({
      x: Math.round(newX),
      y: Math.round(newY),
      width: Math.round(newW),
      height: Math.round(newH),
    });
  };

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

      // Rotate crop box to match new orientation
      const newCrop = rotateRectCrop(crop, img.width, img.height, 90);

      rawImages[currentIdx] = newSrc;
      setImgDimensions({ width: rotatedCanvas.width, height: rotatedCanvas.height });
      setCrop(newCrop);
      setRotation((prev) => (prev + 90) % 360);
    };
    img.src = currentImgSrc;
  };

  // Select full image bounds (1-click reset)
  const handleSelectFullImage = () => {
    setSelectedRatio('free');
    setCrop({
      x: 0,
      y: 0,
      width: imgDimensions.width,
      height: imgDimensions.height,
    });
  };

  // Apply basic rectangular crop & selected filter, then save
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

      // 1. Direct rectangular crop
      const safeCropX = Math.max(0, Math.min(img.width - 20, Math.round(crop.x)));
      const safeCropY = Math.max(0, Math.min(img.height - 20, Math.round(crop.y)));
      const safeCropW = Math.max(20, Math.min(img.width - safeCropX, Math.round(crop.width)));
      const safeCropH = Math.max(20, Math.min(img.height - safeCropY, Math.round(crop.height)));

      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = safeCropW;
      cropCanvas.height = safeCropH;
      const cropCtx = cropCanvas.getContext('2d');
      if (!cropCtx) throw new Error('Could not get 2d context for crop');

      cropCtx.drawImage(
        img,
        safeCropX,
        safeCropY,
        safeCropW,
        safeCropH,
        0,
        0,
        safeCropW,
        safeCropH
      );

      // 2. Filter application
      const filteredCanvas = applyFilter(cropCanvas, currentFilter);
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

      const finalCorners = cropToCorners({
        x: safeCropX,
        y: safeCropY,
        width: safeCropW,
        height: safeCropH,
      });

      const newPage: ScannedPage = {
        id: `page-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        originalImageUrl: currentImgSrc,
        processedImageUrl,
        thumbnailUrl,
        corners: finalCorners,
        cropBox: {
          x: safeCropX,
          y: safeCropY,
          width: safeCropW,
          height: safeCropH,
        },
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
      console.error('Processing error:', err);
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
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Cancel"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Quick Aspect Ratio Presets */}
        <div className="flex items-center gap-1 p-1 rounded-full bg-slate-900 border border-slate-800">
          <button
            onClick={() => handleSelectRatio('free')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
              selectedRatio === 'free'
                ? 'bg-sky-500 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Freeform rectangular crop"
          >
            <CropIcon className="w-3.5 h-3.5" />
            <span>Free</span>
          </button>

          <button
            onClick={() => handleSelectRatio('a4')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
              selectedRatio === 'a4'
                ? 'bg-sky-500 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Document standard A4 ratio"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>A4</span>
          </button>

          <button
            onClick={() => handleSelectRatio('1:1')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
              selectedRatio === '1:1'
                ? 'bg-sky-500 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
            title="1:1 Square ratio"
          >
            <Square className="w-3.5 h-3.5" />
            <span>1:1</span>
          </button>

          <button
            onClick={() => handleSelectRatio('4:3')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
              selectedRatio === '4:3'
                ? 'bg-sky-500 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
            title="4:3 Standard photo ratio"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>4:3</span>
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
            onClick={handleSelectFullImage}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Select Full Image"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Canvas Workspace */}
      <div className="relative flex-1 bg-slate-950 overflow-hidden flex items-center justify-center p-2">
        <CropCanvas
          imageSrc={currentImgSrc}
          crop={crop}
          onChangeCrop={setCrop}
          aspectRatio={getNumericAspectRatio()}
        />

        {/* Intuitive Instruction Hint */}
        <div className="absolute top-3 inset-x-0 flex justify-center pointer-events-none">
          <span className="px-3.5 py-1 rounded-full bg-black/75 backdrop-blur-md text-[11px] text-slate-200 border border-white/10 shadow-lg">
            Drag corners or edges to crop • Drag inside box to move
          </span>
        </div>
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
                <span>Cropping Document...</span>
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
