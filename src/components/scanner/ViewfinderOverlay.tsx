'use client';

import React from 'react';
import { Sparkles, CheckCircle2, Zap, Lock, Crop } from 'lucide-react';
import { Point } from '@/types';

interface ViewfinderOverlayProps {
  aspectRatio?: 'document' | 'id_card';
  guideText?: string;
  stepBadge?: string;
  isDocumentDetected?: boolean;
  isDocumentLocked?: boolean;
  takeOnlyDocument?: boolean;
  smartShootEnabled?: boolean;
  autoCapture?: boolean;
  autoCaptureProgress?: number; // 0 to 100
  liveCorners?: [Point, Point, Point, Point] | null;
  videoDimensions?: { width: number; height: number };
}

export const ViewfinderOverlay: React.FC<ViewfinderOverlayProps> = ({
  aspectRatio = 'document',
  guideText = 'Align document inside the frame & hold steady',
  stepBadge,
  isDocumentDetected = false,
  isDocumentLocked = false,
  takeOnlyDocument = true,
  smartShootEnabled = true,
  autoCapture = false,
  autoCaptureProgress = 0,
  liveCorners = null,
  videoDimensions,
}) => {
  const isIdCard = aspectRatio === 'id_card';
  const hasDetected = isDocumentDetected && smartShootEnabled && !isIdCard;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
      {/* Real-time live-detected quadrilateral outline */}
      {liveCorners && videoDimensions && smartShootEnabled && !isIdCard && (
        <svg
          viewBox={`0 0 ${videoDimensions.width} ${videoDimensions.height}`}
          className="absolute inset-0 w-full h-full pointer-events-none z-20"
          preserveAspectRatio="xMidYMid slice"
        >
          {/* Shaded polygon interior */}
          <polygon
            points={`${liveCorners[0].x},${liveCorners[0].y} ${liveCorners[1].x},${liveCorners[1].y} ${liveCorners[2].x},${liveCorners[2].y} ${liveCorners[3].x},${liveCorners[3].y}`}
            fill={
              isDocumentLocked
                ? 'rgba(16, 185, 129, 0.28)'
                : autoCapture && autoCaptureProgress > 0
                ? 'rgba(16, 185, 129, 0.22)'
                : 'rgba(251, 191, 36, 0.16)'
            }
            stroke={isDocumentLocked || (autoCapture && autoCaptureProgress > 0) ? '#10b981' : '#f59e0b'}
            strokeWidth={isDocumentLocked ? '4.5' : '4'}
            strokeDasharray={isDocumentLocked || (autoCapture && autoCaptureProgress > 0) ? 'none' : '10, 6'}
            className="transition-all duration-150"
          />

          {/* 4 Interactive Corner Dots */}
          {liveCorners.map((pt, idx) => (
            <g key={idx}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r="10"
                fill={isDocumentLocked || (autoCapture && autoCaptureProgress > 0) ? '#10b981' : '#f59e0b'}
                stroke="#ffffff"
                strokeWidth="2.5"
                className={isDocumentLocked ? '' : 'animate-pulse'}
              />
              <circle
                cx={pt.x}
                cy={pt.y}
                r={isDocumentLocked ? '16' : '18'}
                fill="none"
                stroke={
                  isDocumentLocked
                    ? 'rgba(16, 185, 129, 0.85)'
                    : autoCapture && autoCaptureProgress > 0
                    ? 'rgba(16, 185, 129, 0.6)'
                    : 'rgba(251, 191, 36, 0.5)'
                }
                strokeWidth={isDocumentLocked ? '3' : '2'}
              />
            </g>
          ))}
        </svg>
      )}

      {/* Target framing box */}
      <div
        className={`relative w-full overflow-hidden shadow-[0_0_0_9999px_rgba(0,0,0,0.58)] transition-all duration-300 rounded-3xl ${
          hasDetected
            ? isDocumentLocked
              ? 'border-2 border-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.65)]'
              : autoCapture && autoCaptureProgress > 0
              ? 'border-2 border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.5)]'
              : 'border-2 border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.45)]'
            : 'border-2 border-white/25'
        } ${isIdCard ? 'max-w-md aspect-[1.58/1]' : 'max-w-sm aspect-[3/4]'}`}
      >
        {/* Corner guide brackets */}
        <div
          className={`absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 rounded-tl-2xl transition-colors duration-200 ${
            hasDetected
              ? isDocumentLocked || (autoCapture && autoCaptureProgress > 0)
                ? 'border-emerald-400'
                : 'border-amber-400'
              : 'border-sky-400'
          }`}
        />
        <div
          className={`absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 rounded-tr-2xl transition-colors duration-200 ${
            hasDetected
              ? isDocumentLocked || (autoCapture && autoCaptureProgress > 0)
                ? 'border-emerald-400'
                : 'border-amber-400'
              : 'border-sky-400'
          }`}
        />
        <div
          className={`absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 rounded-bl-2xl transition-colors duration-200 ${
            hasDetected
              ? isDocumentLocked || (autoCapture && autoCaptureProgress > 0)
                ? 'border-emerald-400'
                : 'border-amber-400'
              : 'border-sky-400'
          }`}
        />
        <div
          className={`absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 rounded-br-2xl transition-colors duration-200 ${
            hasDetected
              ? isDocumentLocked || (autoCapture && autoCaptureProgress > 0)
                ? 'border-emerald-400'
                : 'border-amber-400'
              : 'border-sky-400'
          }`}
        />

        {/* Animated laser scanning bar */}
        <div
          className={`absolute inset-x-0 h-1 bg-gradient-to-r transition-colors duration-200 ${
            hasDetected
              ? autoCapture && autoCaptureProgress > 0
                ? 'from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#10b981]'
                : 'from-transparent via-amber-400 to-transparent shadow-[0_0_15px_#f59e0b]'
              : 'from-transparent via-sky-400 to-transparent shadow-[0_0_15px_#38bdf8]'
          } animate-pulse-scan`}
        />

        {/* Center alignment helper crosshair */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={`w-8 h-8 border rounded-full flex items-center justify-center transition-colors duration-200 ${
              hasDetected
                ? autoCapture && autoCaptureProgress > 0
                  ? 'border-emerald-400/50'
                  : 'border-amber-400/40'
                : 'border-white/20'
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                hasDetected
                  ? autoCapture && autoCaptureProgress > 0
                    ? 'bg-emerald-400 scale-125'
                    : 'bg-amber-400'
                  : 'bg-sky-400'
              }`}
            />
          </div>
        </div>

        {/* Smart Document Detected / Locked floating pill badge */}
        {hasDetected ? (
          <div className="absolute top-3 inset-x-0 flex justify-center">
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full backdrop-blur-md border shadow-lg transition-all ${
                isDocumentLocked
                  ? 'bg-emerald-950/95 border-emerald-400 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.7)] scale-105'
                  : autoCapture && autoCaptureProgress > 0
                  ? 'bg-emerald-950/90 border-emerald-400 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                  : 'bg-slate-950/90 border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.4)]'
              }`}
            >
              {isDocumentLocked ? (
                <Lock className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
              ) : (
                <span
                  className={`w-2 h-2 rounded-full ${
                    autoCapture && autoCaptureProgress > 0 ? 'bg-emerald-400 animate-ping' : 'bg-amber-400 animate-ping'
                  }`}
                />
              )}
              <span className="text-[11px] font-bold">
                {isDocumentLocked
                  ? takeOnlyDocument
                    ? '🔒 DOCUMENT LOCKED • TAKING DOCUMENT ONLY'
                    : '🔒 DOCUMENT LOCKED • READY'
                  : autoCapture && autoCaptureProgress > 0
                  ? `⚡ CamScanner Locking (${autoCaptureProgress}%)`
                  : '⚡ CamScanner AI: Document Detected'}
              </span>
            </div>
          </div>
        ) : (
          !isIdCard && (
            <div className="absolute top-3 inset-x-0 flex justify-center">
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-slate-300 text-[10px] font-semibold">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>CamScanner Smart Scan Active</span>
              </div>
            </div>
          )
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
            ? isDocumentLocked
              ? 'bg-emerald-950/90 border-emerald-400 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
              : autoCapture && autoCaptureProgress > 0
              ? 'bg-emerald-950/85 border-emerald-500/50 text-emerald-200'
              : 'bg-amber-950/85 border-amber-500/50 text-amber-200'
            : 'bg-black/75 border-white/10 text-white/95'
        }`}
      >
        {hasDetected
          ? isDocumentLocked
            ? takeOnlyDocument
              ? '🔒 Document Locked — Tap Shutter to extract ONLY the document'
              : '🔒 Document Locked — Tap Shutter to capture'
            : autoCapture
            ? '✓ Document steady — holding for auto-capture'
            : '✓ Document sides detected — Tap shutter to scan'
          : guideText}
      </div>
    </div>
  );
};
