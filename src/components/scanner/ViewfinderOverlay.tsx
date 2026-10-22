'use client';

import React from 'react';

interface ViewfinderOverlayProps {
  aspectRatio?: 'document' | 'id_card';
  guideText?: string;
  stepBadge?: string;
}

export const ViewfinderOverlay: React.FC<ViewfinderOverlayProps> = ({
  aspectRatio = 'document',
  guideText = 'Align document inside the frame & hold steady',
  stepBadge,
}) => {
  const isIdCard = aspectRatio === 'id_card';

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
      {/* Target framing box */}
      <div
        className={`relative w-full border-2 border-white/25 rounded-3xl overflow-hidden shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] transition-all duration-300 ${
          isIdCard ? 'max-w-md aspect-[1.58/1]' : 'max-w-sm aspect-[3/4]'
        }`}
      >
        {/* Corner guide brackets */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-sky-400 rounded-tl-2xl" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-sky-400 rounded-tr-2xl" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-sky-400 rounded-bl-2xl" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-sky-400 rounded-br-2xl" />

        {/* Animated laser scanning bar */}
        <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-sky-400 to-transparent shadow-[0_0_15px_#38bdf8] animate-pulse-scan" />

        {/* Center alignment helper crosshair */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border border-white/20 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-sky-400 rounded-full" />
          </div>
        </div>

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
      <div className="mt-2 px-4 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-white/95 text-xs font-medium text-center shadow-lg">
        {guideText}
      </div>
    </div>
  );
};
