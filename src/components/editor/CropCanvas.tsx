'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Point } from '@/types';
import { distance } from '@/lib/cv/geometry';
import { LoupeMagnifier } from './LoupeMagnifier';

interface CropCanvasProps {
  imageSrc: string;
  corners: [Point, Point, Point, Point]; // In image coordinates: TL, TR, BR, BL
  onChangeCorners: (corners: [Point, Point, Point, Point]) => void;
  rotation: number;
}

const CORNER_NAMES = [
  'Top-Left (TL)',
  'Top-Right (TR)',
  'Bottom-Right (BR)',
  'Bottom-Left (BL)',
];

const CORNER_SHORT_TAGS = ['TL', 'TR', 'BR', 'BL'];

export const CropCanvas: React.FC<CropCanvasProps> = ({
  imageSrc,
  corners,
  onChangeCorners,
  rotation,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);
  const [activeHandleIndex, setActiveHandleIndex] = useState<number | null>(null);
  const [pointerScreenPos, setPointerScreenPos] = useState<Point>({ x: 0, y: 0 });

  // Store scale & offset from source image coordinates to canvas screen display coordinates
  const transformRef = useRef({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    displayWidth: 0,
    displayHeight: 0,
  });

  // Load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImageObj(img);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Convert source image coordinate -> canvas display coordinate
  const imgToCanvas = useCallback((p: Point): Point => {
    const { scale, offsetX, offsetY } = transformRef.current;
    return {
      x: p.x * scale + offsetX,
      y: p.y * scale + offsetY,
    };
  }, []);

  // Convert canvas display coordinate -> source image coordinate
  const canvasToImg = useCallback((p: Point): Point => {
    const { scale, offsetX, offsetY } = transformRef.current;
    return {
      x: (p.x - offsetX) / scale,
      y: (p.y - offsetY) / scale,
    };
  }, []);

  // Canvas redraw procedure
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !imageObj) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    const width = rect.width;
    const height = rect.height;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.resetTransform();
    ctx.scale(dpr, dpr);

    // Fit image inside container with margin padding
    const imgW = imageObj.width;
    const imgH = imageObj.height;

    const scale = Math.min((width - 32) / imgW, (height - 32) / imgH);
    const displayW = imgW * scale;
    const displayH = imgH * scale;
    const offsetX = (width - displayW) / 2;
    const offsetY = (height - displayH) / 2;

    transformRef.current = {
      scale,
      offsetX,
      offsetY,
      displayWidth: displayW,
      displayHeight: displayH,
    };

    // 1. Draw base photo
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(imageObj, offsetX, offsetY, displayW, displayH);

    // 2. Dim region outside the quadrilateral with semi-transparent dark mask
    const displayCorners = corners.map(imgToCanvas);

    ctx.save();
    ctx.fillStyle = 'rgba(2, 6, 23, 0.65)';
    ctx.beginPath();
    ctx.rect(0, 0, width, height);

    // Polygon cutout
    ctx.moveTo(displayCorners[0].x, displayCorners[0].y);
    ctx.lineTo(displayCorners[1].x, displayCorners[1].y);
    ctx.lineTo(displayCorners[2].x, displayCorners[2].y);
    ctx.lineTo(displayCorners[3].x, displayCorners[3].y);
    ctx.closePath();
    ctx.fill('evenodd');
    ctx.restore();

    // 3. Perspective 3x3 alignment grid inside quadrilateral
    ctx.save();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    for (let i = 1; i <= 2; i++) {
      const t = i / 3;
      // Horizontal interior grid line
      const leftPt = {
        x: displayCorners[0].x * (1 - t) + displayCorners[3].x * t,
        y: displayCorners[0].y * (1 - t) + displayCorners[3].y * t,
      };
      const rightPt = {
        x: displayCorners[1].x * (1 - t) + displayCorners[2].x * t,
        y: displayCorners[1].y * (1 - t) + displayCorners[2].y * t,
      };
      ctx.beginPath();
      ctx.moveTo(leftPt.x, leftPt.y);
      ctx.lineTo(rightPt.x, rightPt.y);
      ctx.stroke();

      // Vertical interior grid line
      const topPt = {
        x: displayCorners[0].x * (1 - t) + displayCorners[1].x * t,
        y: displayCorners[0].y * (1 - t) + displayCorners[1].y * t,
      };
      const bottomPt = {
        x: displayCorners[3].x * (1 - t) + displayCorners[2].x * t,
        y: displayCorners[3].y * (1 - t) + displayCorners[2].y * t,
      };
      ctx.beginPath();
      ctx.moveTo(topPt.x, topPt.y);
      ctx.lineTo(bottomPt.x, bottomPt.y);
      ctx.stroke();
    }
    ctx.restore();

    // 4. Perimeter polygon boundary line
    ctx.save();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(displayCorners[0].x, displayCorners[0].y);
    ctx.lineTo(displayCorners[1].x, displayCorners[1].y);
    ctx.lineTo(displayCorners[2].x, displayCorners[2].y);
    ctx.lineTo(displayCorners[3].x, displayCorners[3].y);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    // 5. Render 4 corner handles with glowing halo and label tags
    displayCorners.forEach((corner, idx) => {
      const isActive = activeHandleIndex === idx;

      ctx.save();
      // Outer neon glow
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = isActive ? 18 : 8;

      // Outer white ring
      ctx.beginPath();
      ctx.arc(corner.x, corner.y, isActive ? 20 : 15, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // Inner cyan core
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(corner.x, corner.y, isActive ? 13 : 9, 0, Math.PI * 2);
      ctx.fillStyle = isActive ? '#0284c7' : '#0ea5e9';
      ctx.fill();

      // Center bright pip
      ctx.beginPath();
      ctx.arc(corner.x, corner.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // Corner Short Tag Badge (TL, TR, BR, BL)
      const tagOffsetDist = isActive ? 30 : 25;
      const angle = (idx * Math.PI) / 2 + Math.PI / 4;
      const tagX = corner.x + Math.sin(angle) * tagOffsetDist;
      const tagY = corner.y - Math.cos(angle) * tagOffsetDist;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
      ctx.lineWidth = 1;
      const tagW = 24;
      const tagH = 16;
      ctx.beginPath();
      ctx.roundRect(tagX - tagW / 2, tagY - tagH / 2, tagW, tagH, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(CORNER_SHORT_TAGS[idx], tagX, tagY);

      ctx.restore();
    });
  }, [imageObj, corners, activeHandleIndex, imgToCanvas]);

  useEffect(() => {
    redraw();
    const handleResize = () => redraw();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [redraw]);

  // Pointer event handlers with generous touch radius
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !imageObj) return;

    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    const TOUCH_HIT_RADIUS = 44; // Finger-friendly touch radius
    let closestIdx = -1;
    let minDistance = TOUCH_HIT_RADIUS;

    corners.forEach((corner, idx) => {
      const disp = imgToCanvas(corner);
      const d = Math.hypot(disp.x - px, disp.y - py);
      if (d < minDistance) {
        minDistance = d;
        closestIdx = idx;
      }
    });

    if (closestIdx !== -1) {
      canvas.setPointerCapture(e.pointerId);
      setActiveHandleIndex(closestIdx);
      setPointerScreenPos({ x: e.clientX, y: e.clientY });

      // Haptic bump if supported
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(25);
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeHandleIndex === null || !imageObj || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    setPointerScreenPos({ x: e.clientX, y: e.clientY });

    // Convert screen coordinates to source image coordinate space
    const imgPoint = canvasToImg({ x: px, y: py });

    // Clamp within source image boundaries
    const clampedX = Math.max(0, Math.min(imageObj.width, imgPoint.x));
    const clampedY = Math.max(0, Math.min(imageObj.height, imgPoint.y));

    const newCorners = [...corners] as [Point, Point, Point, Point];
    newCorners[activeHandleIndex] = {
      x: Math.round(clampedX),
      y: Math.round(clampedY),
    };

    onChangeCorners(newCorners);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeHandleIndex !== null && canvasRef.current) {
      try {
        canvasRef.current.releasePointerCapture(e.pointerId);
      } catch {}
      setActiveHandleIndex(null);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center overflow-hidden touch-none select-none bg-slate-950"
    >
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="w-full h-full cursor-crosshair"
      />

      {/* Loupe magnifier active while user drags any of the 4 corner handles */}
      {activeHandleIndex !== null && imageObj && (
        <LoupeMagnifier
          sourceImage={imageObj}
          activeCorner={corners[activeHandleIndex]}
          cornerLabel={CORNER_NAMES[activeHandleIndex]}
          containerOffset={pointerScreenPos}
          zoom={3.2}
          size={124}
        />
      )}
    </div>
  );
};
