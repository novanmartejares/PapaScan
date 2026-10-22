'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  ShieldCheck,
  Check,
  Loader2,
  Grid,
  Square,
  Sparkles,
} from 'lucide-react';
import { WatermarkOptions } from '@/types';
import { applySecurityWatermark } from '@/lib/cv/watermark';

interface WatermarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageImageUrl: string;
  onSaveWatermarkedPage: (newProcessedImageUrl: string, newThumbnailUrl: string) => void;
}

const PRESET_TEXTS = [
  'CONFIDENTIAL',
  'DO NOT COPY',
  'FOR VERIFICATION ONLY',
  'OFFICIAL SAMPLE',
  'INTERNAL USE ONLY',
];

const PRESET_COLORS = [
  { label: 'Navy Blue', hex: '#1e3a8a' },
  { label: 'Crimson', hex: '#dc2626' },
  { label: 'Slate Gray', hex: '#475569' },
  { label: 'Emerald', hex: '#047857' },
];

export const WatermarkModal: React.FC<WatermarkModalProps> = ({
  isOpen,
  onClose,
  pageImageUrl,
  onSaveWatermarkedPage,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [text, setText] = useState('CONFIDENTIAL');
  const [opacity, setOpacity] = useState(0.28);
  const [color, setColor] = useState('#1e3a8a');
  const [tile, setTile] = useState(true);
  const [rotation, setRotation] = useState(-28);
  const [fontSize, setFontSize] = useState(36);
  const [isProcessing, setIsProcessing] = useState(false);

  // Redraw preview canvas
  const renderPreview = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !pageImageUrl) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw base document
      ctx.drawImage(img, 0, 0);

      if (!text.trim()) return;

      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.fillStyle = color;
      ctx.font = `bold ${fontSize}px sans-serif, system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const rad = (rotation * Math.PI) / 180;

      if (tile) {
        ctx.rotate(rad);
        const diag = Math.hypot(canvas.width, canvas.height);
        const stepX = Math.max(220, fontSize * text.length * 0.95);
        const stepY = Math.max(90, fontSize * 2.8);

        for (let y = -diag; y <= diag * 1.5; y += stepY) {
          const offsetX = (Math.floor(y / stepY) % 2) * (stepX / 2);
          for (let x = -diag; x <= diag * 1.5; x += stepX) {
            ctx.fillText(text.trim().toUpperCase(), x + offsetX, y);
          }
        }
      } else {
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(rad);
        ctx.fillText(text.trim().toUpperCase(), 0, 0);
      }

      ctx.restore();
    };
    img.src = pageImageUrl;
  }, [pageImageUrl, text, opacity, color, tile, rotation, fontSize]);

  useEffect(() => {
    if (isOpen) {
      renderPreview();
    }
  }, [isOpen, renderPreview]);

  if (!isOpen) return null;

  const handleApply = async () => {
    setIsProcessing(true);
    try {
      const options: WatermarkOptions = {
        text,
        opacity,
        color,
        fontSize,
        rotation,
        tile,
      };

      const result = await applySecurityWatermark(pageImageUrl, options);
      onSaveWatermarkedPage(result.processedImageUrl, result.thumbnailUrl);
      onClose();
    } catch (err) {
      console.error('Failed to apply watermark:', err);
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
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Anti-Theft Watermark</h3>
              <p className="text-xs text-slate-400">Protect confidential scans from unauthorized reuse</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Live Preview Screen */}
          <div className="relative w-full max-h-52 bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center p-2">
            <canvas
              ref={canvasRef}
              className="max-h-48 max-w-full object-contain rounded-lg shadow"
            />
          </div>

          {/* Quick Presets */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Quick Security Presets
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_TEXTS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => setText(preset)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    text === preset
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Text Input */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Watermark Text
            </label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. FOR VISA APPLICATION ONLY"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Color & Style Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Stamp Color
              </label>
              <div className="flex items-center gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => setColor(c.hex)}
                    style={{ backgroundColor: c.hex }}
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${
                      color === c.hex
                        ? 'border-white scale-110 shadow-lg'
                        : 'border-transparent opacity-80 hover:opacity-100'
                    }`}
                    title={c.label}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Pattern Layout
              </label>
              <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800">
                <button
                  onClick={() => setTile(true)}
                  className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-xs font-semibold transition-all ${
                    tile ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Grid className="w-3.5 h-3.5" />
                  <span>Repeating Tile</span>
                </button>
                <button
                  onClick={() => setTile(false)}
                  className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-xs font-semibold transition-all ${
                    !tile ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>Center</span>
                </button>
              </div>
            </div>
          </div>

          {/* Opacity Slider */}
          <div>
            <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
              <span>Watermark Opacity</span>
              <span className="font-mono text-amber-400">{Math.round(opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.10"
              max="0.65"
              step="0.02"
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              className="w-full accent-amber-400"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={isProcessing || !text.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition-all disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Applying Watermark...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Apply & Burn Watermark</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
