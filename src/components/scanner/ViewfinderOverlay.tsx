'use client';

import React from 'react';
import { Sparkles, CheckCircle2 } from 'lucide-react';

interface ViewfinderOverlayProps {
  aspectRatio?: 'document' | 'id_card';
  guideText?: string;
  stepBadge?: string;
  isDocumentDetected?: boolean;
  smartShootEnabled?: boolean;
}

export const ViewfinderOverlay: React.FC<ViewfinderOverlayProps> = ({
  aspectRatio = 'document',
  guideText = 'Align document inside the frame & hold steady',
  stepBadge,
  isDocumentDetected = false,
  smartShootEnabled = true,
}) => {
  const isIdCard = aspectRatio === 'id_card';
  const hasDetected = isDocumentDetected && smartShootEnabled && !isIdCard;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
      {/* Target framing box */}
      <div
        className={`relative w-full overflow-hidden shadow-[0_0_0_9999px_rgba(0,0,0,0.58)] transition-all duration-300 rounded-3xl ${
          hasDetected
            ? 'border-2 border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.45)]'
            : 'border-2 border-white/25'
        } ${isIdCard ? 'max-w-md aspect-[1.58/1]' : 'max-w-sm aspect-[3/4]'}`}
      >
        {/* Corner guide brackets */}
        <div
          className={`absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 rounded-tl-2xl transition-colors duration-200 ${
            hasDetected ? 'border-amber-400' : 'border-sky-400'
          }`}
        />
        <div
          className={`absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 rounded-tr-2xl transition-colors duration-200 ${
            hasDetected ? 'border-amber-400' : 'border-sky-400'
          }`}
        />
        <div
          className={`absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 rounded-bl-2xl transition-colors duration-200 ${
            hasDetected ? 'border-amber-400' : 'border-sky-400'
          }`}
        />
        <div
          className={`absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 rounded-br-2xl transition-colors duration-200 ${
            hasDetected ? 'border-amber-400' : 'border-sky-400'
          }`}
        />

        {/* Animated laser scanning bar */}
        <div
          className={`absolute inset-x-0 h-1 bg-gradient-to-r transition-colors duration-200 ${
            hasDetected
              ? 'from-transparent via-amber-400 to-transparent shadow-[0_0_15px_#f59e0b]'
              : 'from-transparent via-sky-400 to-transparent shadow-[0_0_15px_#38bdf8]'
          } animate-pulse-scan`}
        />

        {/* Center alignment helper crosshair */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={`w-8 h-8 border rounded-full flex items-center justify-center transition-colors duration-200 ${
              hasDetected ? 'border-amber-400/40' : 'border-white/20'
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                hasDetected ? 'bg-amber-400' : 'bg-sky-400'
              }`}
            />
          </div>
        </div>

        {/* Smart Document Detected floating pill badge */}
        {hasDetected && (
          <div className="absolute top-3 inset-x-0 flex justify-center">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/85 backdrop-blur-md border border-amber-400/60 shadow-lg">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span className="text-[11px] font-bold text-amber-300">
                Document Detected • Auto-Edge Active
              </span>
            </div>
          </div>
        )}

        {/* ID Card watermark badge inside viewfinder */}
        {isIdCard && (
          <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-black/60 backdrop-blur-md text-[10px] font-bold text-sky-300 border border-sky-500/30">
            ID CARD (85.6 × 54mm)
          </div>
        )}
      </div>

      {/* Step Badge */}
      {stepBadge && (
        <div className="mt-3 px-3 py-1 rounded-full bg-sky-500 text-white text-[11px] font-bold shadow-lg shadow-sky-500/30">
          {stepBadge}
        </div>
      )}

      {/* Guide text */}
      <div
        className={`mt-2.5 px-4 py-1.5 rounded-full backdrop-blur-md border text-xs font-semibold text-center shadow-lg transition-all ${
          hasDetected
            ? 'bg-amber-950/85 border-amber-500/50 text-amber-200'
            : 'bg-black/75 border-white/10 text-white/95'
        }`}
      >
        {hasDetected ? '✓ Document sides detected — Tap shutter to scan' : guideText}
      </div>
    </div>
  );
};
