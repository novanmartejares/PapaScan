'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Point } from '@/types';

interface LoupeMagnifierProps {
  sourceImage: HTMLImageElement | null;
  activeCorner: Point | null; // Coordinate in image space
  cornerLabel?: string;       // e.g. "Top-Left (TL)"
  containerOffset: Point;     // Screen client coordinates (pointer position)
  zoom?: number;
  size?: number;
}

export const LoupeMagnifier: React.FC<LoupeMagnifierProps> = ({
  sourceImage,
  activeCorner,
  cornerLabel = 'Corner Handle',
  containerOffset,
  zoom = 3.2,
  size = 124,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!sourceImage || !activeCorner || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, size, size);

    // Circular clip mask
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
    ctx.clip();

    // Dark backdrop
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, size, size);

    // Source coordinates corresponding to the zoomed box
    const sw = size / zoom;
    const sh = size / zoom;
    const sx = activeCorner.x - sw / 2;
    const sy = activeCorner.y - sh / 2;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(sourceImage, sx, sy, sw, sh, 0, 0, size, size);

    // Circular inner vignette
    const vignette = ctx.createRadialGradient(
      size / 2,
      size / 2,
      size / 2 - 18,
      size / 2,
      size / 2,
      size / 2
    );
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.65)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, size, size);

    // Precision Crosshairs & Reticle
    const center = size / 2;
    const len = 22;
    const gap = 6;

    // Sub-pixel alignment lines
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;

    // Horizontal crosshair with ticks
    ctx.beginPath();
    ctx.moveTo(center - len, center);
    ctx.lineTo(center - gap, center);
    ctx.moveTo(center + gap, center);
    ctx.lineTo(center + len, center);
    ctx.stroke();

    // Vertical crosshair with ticks
    ctx.beginPath();
    ctx.moveTo(center, center - len);
    ctx.lineTo(center, center - gap);
    ctx.moveTo(center, center + gap);
    ctx.lineTo(center, center + len);
    ctx.stroke();

    // Calibrated measurement ticks
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
    ctx.lineWidth = 1;
    [-14, 14].forEach((offset) => {
      // Horizontal ticks
      ctx.beginPath();
      ctx.moveTo(center + offset, center - 3);
      ctx.lineTo(center + offset, center + 3);
      ctx.stroke();
      // Vertical ticks
      ctx.beginPath();
      ctx.moveTo(center - 3, center + offset);
      ctx.lineTo(center + 3, center + offset);
      ctx.stroke();
    });

    // Outer target ring
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(center, center, gap + 1, 0, Math.PI * 2);
    ctx.stroke();

    // Inner bright center pip
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(center, center, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }, [sourceImage, activeCorner, zoom, size]);

  if (!activeCorner || !mounted) return null;

  // Viewport width and height boundary safety
  const winWidth = typeof window !== 'undefined' ? window.innerWidth : 390;
  const winHeight = typeof window !== 'undefined' ? window.innerHeight : 844;

  const loupeX = Math.max(12, Math.min(winWidth - size - 12, containerOffset.x - size / 2));

  // If touch is near top (< 180px), flip loupe below finger; otherwise position cleanly above
  const isNearTop = containerOffset.y < size + 50;
  const loupeY = isNearTop
    ? Math.min(winHeight - size - 12, containerOffset.y + 40)
    : Math.max(16, containerOffset.y - size - 35);

  const content = (
    <div
      style={{
        left: `${loupeX}px`,
        top: `${loupeY}px`,
        width: size,
        height: size,
      }}
      className="fixed pointer-events-none z-[9999] rounded-full shadow-[0_16px_50px_rgba(0,0,0,0.9)] ring-4 ring-sky-400 border-2 border-white/95 overflow-hidden select-none animate-in fade-in zoom-in-95 duration-100"
    >
      <canvas ref={canvasRef} width={size} height={size} className="w-full h-full" />

      {/* Floating Coordinate & Corner Tag Badge */}
      <div className="absolute bottom-1.5 inset-x-0 flex flex-col items-center pointer-events-none">
        <span className="px-2 py-0.5 rounded-full bg-slate-950/90 backdrop-blur-md text-[9px] font-mono font-bold text-sky-300 border border-sky-500/40 shadow-md">
          {Math.round(activeCorner.x)}, {Math.round(activeCorner.y)}
        </span>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};
