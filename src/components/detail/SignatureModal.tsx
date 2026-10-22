'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  X,
  PenTool,
  Upload,
  Eraser,
  RotateCcw,
  Check,
  Move,
  Maximize2,
  Sparkles,
  Layers,
  Palette,
} from 'lucide-react';
import { SignatureOverlayData } from '@/types';
import { removeSignatureBackground, burnSignatureOntoPage } from '@/lib/cv/signature';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageImageUrl: string;
  onSaveSignedPage: (newProcessedImageUrl: string, newThumbnailUrl: string) => void;
}

export const SignatureModal: React.FC<SignatureModalProps> = ({
  isOpen,
  onClose,
  pageImageUrl,
  onSaveSignedPage,
}) => {
  // Step: 'create' (draw/upload signature) -> 'place' (drag/resize on page)
  const [step, setStep] = useState<'create' | 'place'>('create');
  const [tab, setTab] = useState<'draw' | 'upload'>('draw');

  // Drawing Canvas State
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [inkColor, setInkColor] = useState<'navy' | 'blue' | 'black'>('navy');
  const [strokeWidth, setStrokeWidth] = useState<number>(3);

  // Uploaded signature state
  const [uploadedRawSrc, setUploadedRawSrc] = useState<string | null>(null);
  const [transparentSigUrl, setTransparentSigUrl] = useState<string | null>(null);
  const [bgSensitivity, setBgSensitivity] = useState<number>(20);

  // Placement state (relative coordinates in %)
  const placementContainerRef = useRef<HTMLDivElement>(null);
  const [sigPosition, setSigPosition] = useState<{ x: number; y: number }>({ x: 50, y: 75 });
  const [sigSize, setSigSize] = useState<{ width: number; height: number }>({ width: 35, height: 15 });
  const [isDraggingSig, setIsDraggingSig] = useState(false);
  const [isResizingSig, setIsResizingSig] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const [isBurning, setIsBurning] = useState(false);

  // Setup drawing canvas
  useEffect(() => {
    if (!isOpen || step !== 'create' || tab !== 'draw') return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = inkColor === 'navy' ? '#1e3a8a' : inkColor === 'blue' ? '#2563eb' : '#0f172a';
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [isOpen, step, tab, inkColor, strokeWidth]);

  // Pointer drawing events
  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.setPointerCapture(e.pointerId);
    setIsDrawing(true);
    setHasDrawn(true);

    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDrawing && drawCanvasRef.current) {
      try {
        drawCanvasRef.current.releasePointerCapture(e.pointerId);
      } catch {}
      setIsDrawing(false);
    }
  };

  const clearDrawing = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  // Process uploaded signature to remove background
  const processUploadedFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      setUploadedRawSrc(src);

      const img = new Image();
      img.onload = () => {
        const transparentCanvas = removeSignatureBackground(img, inkColor, bgSensitivity);
        setTransparentSigUrl(transparentCanvas.toDataURL('image/png'));
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  // When sensitivity changes on uploaded signature
  useEffect(() => {
    if (!uploadedRawSrc) return;
    const img = new Image();
    img.onload = () => {
      const transparentCanvas = removeSignatureBackground(img, inkColor, bgSensitivity);
      setTransparentSigUrl(transparentCanvas.toDataURL('image/png'));
    };
    img.src = uploadedRawSrc;
  }, [bgSensitivity, inkColor, uploadedRawSrc]);

  // Proceed from Creation to Placement step
  const handleProceedToPlace = () => {
    if (tab === 'draw') {
      const canvas = drawCanvasRef.current;
      if (!canvas || !hasDrawn) return;
      const sigData = canvas.toDataURL('image/png');
      setTransparentSigUrl(sigData);
    }
    setStep('place');
  };

  // Placement Drag / Resize Handlers
  const handlePlacementPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    setIsDraggingSig(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleResizePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    setIsResizingSig(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleContainerPointerMove = (e: React.PointerEvent) => {
    const container = placementContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    if (isDraggingSig) {
      const deltaXPercent = ((e.clientX - dragStart.x) / rect.width) * 100;
      const deltaYPercent = ((e.clientY - dragStart.y) / rect.height) * 100;

      setSigPosition((prev) => ({
        x: Math.max(0, Math.min(100 - sigSize.width, prev.x + deltaXPercent)),
        y: Math.max(0, Math.min(100 - sigSize.height, prev.y + deltaYPercent)),
      }));

      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (isResizingSig) {
      const deltaWPercent = ((e.clientX - dragStart.x) / rect.width) * 100;
      const deltaHPercent = ((e.clientY - dragStart.y) / rect.height) * 100;

      setSigSize((prev) => ({
        width: Math.max(15, Math.min(70, prev.width + deltaWPercent)),
        height: Math.max(8, Math.min(40, prev.height + deltaHPercent)),
      }));

      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleContainerPointerUp = () => {
    setIsDraggingSig(false);
    setIsResizingSig(false);
  };

  // Burn and Save Signed Page
  const handleBurnAndSave = async () => {
    if (!transparentSigUrl) return;
    setIsBurning(true);

    try {
      const overlayData: SignatureOverlayData = {
        dataUrl: transparentSigUrl,
        x: sigPosition.x,
        y: sigPosition.y,
        width: sigSize.width,
        height: sigSize.height,
        rotation: 0,
      };

      const result = await burnSignatureOntoPage(pageImageUrl, overlayData);
      onSaveSignedPage(result.processedImageUrl, result.thumbnailUrl);
      onClose();
    } catch (err) {
      console.error('Signature burn error:', err);
    } finally {
      setIsBurning(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <PenTool className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {step === 'create' ? 'Create Signature' : 'Place Signature on Page'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {step === 'create'
                  ? 'Draw or upload transparent signature'
                  : 'Drag & resize overlay onto signature line'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP 1: CREATE SIGNATURE */}
        {step === 'create' && (
          <div className="p-4 space-y-4 overflow-y-auto">
            {/* Draw vs Upload Selector */}
            <div className="flex items-center p-1 rounded-2xl bg-slate-950 border border-slate-800">
              <button
                onClick={() => setTab('draw')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${
                  tab === 'draw'
                    ? 'bg-sky-500 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>Draw Pad</span>
              </button>

              <button
                onClick={() => setTab('upload')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${
                  tab === 'upload'
                    ? 'bg-sky-500 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload & Transparentize</span>
              </button>
            </div>

            {/* TAB: DRAW PAD */}
            {tab === 'draw' && (
              <div className="space-y-3">
                <div className="relative rounded-2xl bg-white overflow-hidden shadow-inner border border-slate-700 aspect-[2/1] touch-none">
                  <canvas
                    ref={drawCanvasRef}
                    width={520}
                    height={260}
                    onPointerDown={startDrawing}
                    onPointerMove={draw}
                    onPointerUp={stopDrawing}
                    onPointerCancel={stopDrawing}
                    className="w-full h-full cursor-crosshair"
                  />
                  {!hasDrawn && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-400 gap-1">
                      <span className="text-xs font-medium">Draw your signature here</span>
                      <span className="text-[10px] text-slate-400">Touch or mouse supported</span>
                    </div>
                  )}
                  {/* Subtle baseline line */}
                  <div className="absolute bottom-8 inset-x-8 border-b border-dashed border-slate-300 pointer-events-none" />
                </div>

                {/* Pen styling controls */}
                <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
                  {/* Color options */}
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-[11px]">Ink:</span>
                    <button
                      onClick={() => setInkColor('navy')}
                      className={`w-6 h-6 rounded-full bg-blue-900 border-2 transition-transform ${
                        inkColor === 'navy' ? 'border-white scale-110' : 'border-transparent'
                      }`}
                      title="Navy Ink"
                    />
                    <button
                      onClick={() => setInkColor('blue')}
                      className={`w-6 h-6 rounded-full bg-blue-600 border-2 transition-transform ${
                        inkColor === 'blue' ? 'border-white scale-110' : 'border-transparent'
                      }`}
                      title="Royal Blue Ink"
                    />
                    <button
                      onClick={() => setInkColor('black')}
                      className={`w-6 h-6 rounded-full bg-slate-900 border-2 transition-transform ${
                        inkColor === 'black' ? 'border-white scale-110' : 'border-transparent'
                      }`}
                      title="Black Ink"
                    />
                  </div>

                  {/* Clear Button */}
                  <button
                    onClick={clearDrawing}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                  >
                    <Eraser className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB: UPLOAD PHOTO & REMOVE BACKGROUND */}
            {tab === 'upload' && (
              <div className="space-y-3">
                {!uploadedRawSrc ? (
                  <label className="flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-slate-800 hover:border-sky-500/50 bg-slate-950/60 hover:bg-sky-500/5 transition-all cursor-pointer text-center">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) processUploadedFile(file);
                      }}
                      className="hidden"
                    />
                    <Upload className="w-8 h-8 text-sky-400 mb-2" />
                    <span className="text-xs font-bold text-slate-200">
                      Upload photo of paper signature
                    </span>
                    <span className="text-[11px] text-slate-500 max-w-xs mt-1">
                      Our CV algorithm automatically removes paper color and produces clean transparent ink.
                    </span>
                  </label>
                ) : (
                  <div className="space-y-3">
                    {/* Checkered Transparent Preview Box */}
                    <div className="relative rounded-2xl overflow-hidden border border-slate-700 aspect-[2/1] flex items-center justify-center bg-[repeating-conic-gradient(#1e293b_0%_25%,#0f172a_0%_50%)] bg-[length:16px_16px]">
                      {transparentSigUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={transparentSigUrl}
                          alt="Transparent Signature"
                          className="max-h-full max-w-full object-contain p-4"
                        />
                      )}
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 text-[9px] font-mono text-emerald-400 border border-emerald-500/30">
                        ✓ Transparent Ink Extracted
                      </span>
                    </div>

                    {/* Sensitivity slider */}
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Background Removal Sensitivity</span>
                        <span className="font-mono text-sky-400">{bgSensitivity}</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="60"
                        value={bgSensitivity}
                        onChange={(e) => setBgSensitivity(Number(e.target.value))}
                        className="w-full accent-sky-500 cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Bottom Next Button */}
            <div className="pt-2">
              <button
                onClick={handleProceedToPlace}
                disabled={tab === 'draw' ? !hasDrawn : !transparentSigUrl}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-sky-500/25 active:scale-98 transition-all disabled:opacity-40"
              >
                <span>Proceed to Place on Page</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: PLACE & BURN SIGNATURE ONTO PAGE */}
        {step === 'place' && (
          <div className="p-4 space-y-4 flex flex-col flex-1 overflow-hidden">
            <div className="text-xs text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Move className="w-3.5 h-3.5 text-sky-400" />
                <span>Drag signature into place • Pull corner handle to resize</span>
              </span>
              <button
                onClick={() => setStep('create')}
                className="text-sky-400 hover:underline text-[11px]"
              >
                Change Signature
              </button>
            </div>

            {/* Interactive Document Page Placement Viewport */}
            <div
              ref={placementContainerRef}
              onPointerMove={handleContainerPointerMove}
              onPointerUp={handleContainerPointerUp}
              onPointerCancel={handleContainerPointerUp}
              className="relative max-w-sm mx-auto aspect-[3/4] bg-slate-950 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl select-none touch-none"
            >
              {/* Base Document Image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pageImageUrl}
                alt="Document page to sign"
                className="w-full h-full object-contain pointer-events-none"
              />

              {/* Draggable & Resizable Signature Box */}
              {transparentSigUrl && (
                <div
                  onPointerDown={handlePlacementPointerDown}
                  style={{
                    left: `${sigPosition.x}%`,
                    top: `${sigPosition.y}%`,
                    width: `${sigSize.width}%`,
                    height: `${sigSize.height}%`,
                  }}
                  className="absolute cursor-move border-2 border-dashed border-sky-400 bg-sky-500/10 rounded-lg p-1 group flex items-center justify-center shadow-lg"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={transparentSigUrl}
                    alt="Signature Overlay"
                    className="w-full h-full object-contain pointer-events-none"
                  />

                  {/* Resize corner handle */}
                  <div
                    onPointerDown={handleResizePointerDown}
                    className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full bg-sky-500 border-2 border-white shadow-md flex items-center justify-center cursor-nwse-resize active:scale-125 transition-transform"
                    title="Drag to resize signature"
                  >
                    <Maximize2 className="w-3 h-3 text-white" />
                  </div>
                </div>
              )}
            </div>

            {/* Save & Apply Button */}
            <div className="pt-2">
              <button
                onClick={handleBurnAndSave}
                disabled={isBurning}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-sm shadow-xl shadow-emerald-500/25 active:scale-98 transition-all disabled:opacity-50"
              >
                {isBurning ? (
                  <span>Stamping Signature...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Apply & Save Signed Document</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
