'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Eraser,
  Undo2,
  Trash2,
  Check,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import { RedactionArea } from '@/types';
import { applyDocumentRedactions } from '@/lib/cv/redaction';

interface RedactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageImageUrl: string;
  onSaveRedactedPage: (newProcessedImageUrl: string, newThumbnailUrl: string) => void;
}

export const RedactionModal: React.FC<RedactionModalProps> = ({
  isOpen,
  onClose,
  pageImageUrl,
  onSaveRedactedPage,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);
  const [redactions, setRedactions] = useState<RedactionArea[]>([]);
  const [currentStyle, setCurrentStyle] = useState<'whiteout' | 'blackout'>('whiteout');
  const [isProcessing, setIsProcessing] = useState(false);

  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [currentDragBox, setCurrentDragBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  // Coordinate conversion scale
  const scaleRef = useRef({ scale: 1, offsetX: 0, offsetY: 0 });

  // Load Image
  useEffect(() => {
    if (!isOpen || !pageImageUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImageObj(img);
      setRedactions([]);
      setCurrentDragBox(null);
    };
    img.src = pageImageUrl;
  }, [isOpen, pageImageUrl]);

  // Redraw canvas
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !imageObj) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    ctx.resetTransform();
    ctx.scale(dpr, dpr);

    const scale = Math.min((rect.width - 24) / imageObj.width, (rect.height - 24) / imageObj.height);
    const displayW = imageObj.width * scale;
    const displayH = imageObj.height * scale;
    const offsetX = (rect.width - displayW) / 2;
    const offsetY = (rect.height - displayH) / 2;

    scaleRef.current = { scale, offsetX, offsetY };

    // 1. Draw image
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.drawImage(imageObj, offsetX, offsetY, displayW, displayH);

    // 2. Draw existing redactions
    redactions.forEach((r) => {
      const rx = r.x * scale + offsetX;
      const ry = r.y * scale + offsetY;
      const rw = r.width * scale;
      const rh = r.height * scale;

      ctx.save();
      if (r.style === 'whiteout') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(rx, ry, rw, rh);
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1;
        ctx.strokeRect(rx, ry, rw, rh);
      } else {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(rx, ry, rw, rh);
        if (rw > 50 && rh > 14) {
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 9px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('REDACTED', rx + rw / 2, ry + rh / 2);
        }
      }
      ctx.restore();
    });

    // 3. Draw active dragging box
    if (currentDragBox) {
      const bx = currentDragBox.x * scale + offsetX;
      const by = currentDragBox.y * scale + offsetY;
      const bw = currentDragBox.width * scale;
      const bh = currentDragBox.height * scale;

      ctx.save();
      ctx.fillStyle = currentStyle === 'whiteout' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(15, 23, 42, 0.7)';
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(bx, by, bw, bh);
      ctx.restore();
    }
  }, [imageObj, redactions, currentDragBox, currentStyle]);

  useEffect(() => {
    redraw();
    const handleResize = () => redraw();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [redraw]);

  // Pointer event handlers for drawing redactions
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !imageObj) return;

    const rect = canvas.getBoundingClientRect();
    const { scale, offsetX, offsetY } = scaleRef.current;

    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    // Convert to image coordinates
    const imgX = (clientX - offsetX) / scale;
    const imgY = (clientY - offsetY) / scale;

    if (imgX < 0 || imgX > imageObj.width || imgY < 0 || imgY > imageObj.height) return;

    canvas.setPointerCapture(e.pointerId);
    setIsDragging(true);
    setDragStart({ x: imgX, y: imgY });
    setCurrentDragBox({ x: imgX, y: imgY, width: 0, height: 0 });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging || !dragStart || !imageObj || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const { scale, offsetX, offsetY } = scaleRef.current;

    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const imgX = Math.max(0, Math.min(imageObj.width, (clientX - offsetX) / scale));
    const imgY = Math.max(0, Math.min(imageObj.height, (clientY - offsetY) / scale));

    const x = Math.min(dragStart.x, imgX);
    const y = Math.min(dragStart.y, imgY);
    const width = Math.abs(imgX - dragStart.x);
    const height = Math.abs(imgY - dragStart.y);

    setCurrentDragBox({ x, y, width, height });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    setIsDragging(false);

    if (currentDragBox && currentDragBox.width > 6 && currentDragBox.height > 6) {
      setRedactions((prev) => [
        ...prev,
        {
          x: Math.round(currentDragBox.x),
          y: Math.round(currentDragBox.y),
          width: Math.round(currentDragBox.width),
          height: Math.round(currentDragBox.height),
          style: currentStyle,
        },
      ]);
    }

    setDragStart(null);
    setCurrentDragBox(null);
  };

  // Undo last redaction
  const handleUndo = () => {
    setRedactions((prev) => prev.slice(0, prev.length - 1));
  };

  // Clear all redactions
  const handleClear = () => {
    setRedactions([]);
  };

  if (!isOpen) return null;

  const handleApply = async () => {
    setIsProcessing(true);
    try {
      const result = await applyDocumentRedactions(pageImageUrl, redactions);
      onSaveRedactedPage(result.processedImageUrl, result.thumbnailUrl);
      onClose();
    } catch (err) {
      console.error('Failed to apply redactions:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Eraser className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Redact / Eraser Tool</h3>
              <p className="text-xs text-slate-400">Drag to erase or blackout sensitive information</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-2">
          {/* Style Selector */}
          <div className="flex items-center p-0.5 rounded-xl bg-slate-900 border border-slate-800">
            <button
              onClick={() => setCurrentStyle('whiteout')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                currentStyle === 'whiteout'
                  ? 'bg-sky-500 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Paper Whiteout
            </button>
            <button
              onClick={() => setCurrentStyle('blackout')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                currentStyle === 'blackout'
                  ? 'bg-slate-800 text-white shadow border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Blackout Bar
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleUndo}
              disabled={redactions.length === 0}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition-colors"
              title="Undo last redaction"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleClear}
              disabled={redactions.length === 0}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 disabled:opacity-40 transition-colors"
              title="Clear all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Canvas Area */}
        <div
          ref={containerRef}
          className="relative flex-1 bg-slate-950 min-h-[300px] max-h-[50vh] flex items-center justify-center p-2 touch-none overflow-hidden select-none"
        >
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="w-full h-full cursor-crosshair"
          />

          {redactions.length === 0 && !isDragging && (
            <div className="absolute bottom-3 inset-x-0 flex justify-center pointer-events-none">
              <span className="px-3 py-1 rounded-full bg-black/75 backdrop-blur-md text-[11px] text-slate-300 border border-white/10 shadow">
                Drag over private text or numbers to redact
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            {redactions.length} redaction{redactions.length === 1 ? '' : 's'} added
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={isProcessing || redactions.length === 0}
              className="flex items-center gap-1.5 py-2 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-500/20 active:scale-95 transition-all disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Redacting...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Burn Redactions</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
