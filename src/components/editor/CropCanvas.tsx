'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Point, RectCrop } from '@/types';
import { LoupeMagnifier } from './LoupeMagnifier';

interface CropCanvasProps {
  imageSrc: string;
  crop: RectCrop;
  onChangeCrop: (crop: RectCrop) => void;
  aspectRatio?: number | null; // width / height ratio, or null for free
}

type HandleType = 'nw' | 'ne' | 'se' | 'sw' | 'n' | 'e' | 's' | 'w' | 'move' | 'new';

const CORNER_NAMES: Record<string, string> = {
  nw: 'Top-Left',
  ne: 'Top-Right',
  se: 'Bottom-Right',
  sw: 'Bottom-Left',
};

const MIN_CROP_DIM = 40; // minimum width/height in image coordinates

export const CropCanvas: React.FC<CropCanvasProps> = ({
  imageSrc,
  crop,
  onChangeCrop,
  aspectRatio = null,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);
  const [activeHandle, setActiveHandle] = useState<HandleType | null>(null);
  const [hoverCursor, setHoverCursor] = useState<string>('default');
  const [pointerScreenPos, setPointerScreenPos] = useState<Point>({ x: 0, y: 0 });

  // Store scale & offset from source image coordinates to canvas screen display coordinates
  const transformRef = useRef({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    displayWidth: 0,
    displayHeight: 0,
  });

  // Track initial drag state
  const dragStartRef = useRef<{
    startImgPos: Point;
    startCrop: RectCrop;
  }>({
    startImgPos: { x: 0, y: 0 },
    startCrop: { x: 0, y: 0, width: 100, height: 100 },
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

    // Compute display rectangle coordinates for the crop box
    const dx1 = Math.round(crop.x * scale + offsetX);
    const dy1 = Math.round(crop.y * scale + offsetY);
    const dw = Math.round(crop.width * scale);
    const dh = Math.round(crop.height * scale);
    const dx2 = dx1 + dw;
    const dy2 = dy1 + dh;

    // 2. Dim outer region with dark semi-transparent mask
    ctx.save();
    ctx.fillStyle = 'rgba(2, 6, 23, 0.68)';
    // Top strip
    ctx.fillRect(0, 0, width, Math.max(0, dy1));
    // Bottom strip
    ctx.fillRect(0, dy2, width, Math.max(0, height - dy2));
    // Left strip
    ctx.fillRect(0, dy1, Math.max(0, dx1), dh);
    // Right strip
    ctx.fillRect(dx2, dy1, Math.max(0, width - dx2), dh);
    ctx.restore();

    // 3. Rule-of-thirds grid inside the crop box
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    ctx.beginPath();
    // 2 horizontal grid lines
    ctx.moveTo(dx1, dy1 + dh / 3);
    ctx.lineTo(dx2, dy1 + dh / 3);
    ctx.moveTo(dx1, dy1 + (dh * 2) / 3);
    ctx.lineTo(dx2, dy1 + (dh * 2) / 3);
    // 2 vertical grid lines
    ctx.moveTo(dx1 + dw / 3, dy1);
    ctx.lineTo(dx1 + dw / 3, dy2);
    ctx.moveTo(dx1 + (dw * 2) / 3, dy1);
    ctx.lineTo(dx1 + (dw * 2) / 3, dy2);
    ctx.stroke();
    ctx.restore();

    // 4. Crop bounding rectangle border
    ctx.save();
    ctx.strokeStyle = '#38bdf8'; // Sky blue border
    ctx.lineWidth = 2;
    ctx.strokeRect(dx1, dy1, dw, dh);
    ctx.restore();

    // 5. Professional Corner L-brackets
    const L_LEN = Math.max(12, Math.min(22, Math.min(dw, dh) / 3));
    const L_THICK = 3.5;
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = L_THICK;
    ctx.lineCap = 'square';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 6;

    // Top-Left (TL)
    ctx.beginPath();
    ctx.moveTo(dx1, dy1 + L_LEN);
    ctx.lineTo(dx1, dy1);
    ctx.lineTo(dx1 + L_LEN, dy1);
    ctx.stroke();

    // Top-Right (TR)
    ctx.beginPath();
    ctx.moveTo(dx2 - L_LEN, dy1);
    ctx.lineTo(dx2, dy1);
    ctx.lineTo(dx2, dy1 + L_LEN);
    ctx.stroke();

    // Bottom-Right (BR)
    ctx.beginPath();
    ctx.moveTo(dx2, dy2 - L_LEN);
    ctx.lineTo(dx2, dy2);
    ctx.lineTo(dx2 - L_LEN, dy2);
    ctx.stroke();

    // Bottom-Left (BL)
    ctx.beginPath();
    ctx.moveTo(dx1 + L_LEN, dy2);
    ctx.lineTo(dx1, dy2);
    ctx.lineTo(dx1, dy2 - L_LEN);
    ctx.stroke();
    ctx.restore();

    // 6. Edge Drag Handles (capsules)
    const BAR_LEN = Math.max(14, Math.min(28, Math.min(dw, dh) / 3));
    const BAR_THICK = 3.5;
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = BAR_THICK;
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 4;

    // Top
    ctx.beginPath();
    ctx.moveTo(dx1 + dw / 2 - BAR_LEN / 2, dy1);
    ctx.lineTo(dx1 + dw / 2 + BAR_LEN / 2, dy1);
    ctx.stroke();

    // Bottom
    ctx.beginPath();
    ctx.moveTo(dx1 + dw / 2 - BAR_LEN / 2, dy2);
    ctx.lineTo(dx1 + dw / 2 + BAR_LEN / 2, dy2);
    ctx.stroke();

    // Left
    ctx.beginPath();
    ctx.moveTo(dx1, dy1 + dh / 2 - BAR_LEN / 2);
    ctx.lineTo(dx1, dy1 + dh / 2 + BAR_LEN / 2);
    ctx.stroke();

    // Right
    ctx.beginPath();
    ctx.moveTo(dx2, dy1 + dh / 2 - BAR_LEN / 2);
    ctx.lineTo(dx2, dy1 + dh / 2 + BAR_LEN / 2);
    ctx.stroke();
    ctx.restore();

    // 7. Dimension Pill Badge
    const badgeText = `${Math.round(crop.width)} × ${Math.round(crop.height)} px`;
    ctx.save();
    ctx.font = '600 11px system-ui, sans-serif';
    const textWidth = ctx.measureText(badgeText).width;
    const badgeW = textWidth + 14;
    const badgeH = 20;
    const badgeX = dx1 + 8;
    const badgeY = dy1 + 8;

    if (dw > badgeW + 16 && dh > badgeH + 16) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 5);
      ctx.fill();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeText, badgeX + badgeW / 2, badgeY + badgeH / 2);
    }
    ctx.restore();
  }, [imageObj, crop]);

  useEffect(() => {
    redraw();
    const handleResize = () => redraw();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [redraw]);

  // Determine which handle (if any) is under the cursor/touch point
  const getHandleAt = useCallback(
    (canvasX: number, canvasY: number): HandleType | null => {
      const { scale, offsetX, offsetY } = transformRef.current;
      const dx1 = crop.x * scale + offsetX;
      const dy1 = crop.y * scale + offsetY;
      const dw = crop.width * scale;
      const dh = crop.height * scale;
      const dx2 = dx1 + dw;
      const dy2 = dy1 + dh;

      const CORNER_RADIUS = 34; // Generous touch target
      const EDGE_MARGIN = 22;

      // 1. Corners
      if (Math.hypot(canvasX - dx1, canvasY - dy1) <= CORNER_RADIUS) return 'nw';
      if (Math.hypot(canvasX - dx2, canvasY - dy1) <= CORNER_RADIUS) return 'ne';
      if (Math.hypot(canvasX - dx2, canvasY - dy2) <= CORNER_RADIUS) return 'se';
      if (Math.hypot(canvasX - dx1, canvasY - dy2) <= CORNER_RADIUS) return 'sw';

      // 2. Edges
      if (
        Math.abs(canvasY - dy1) <= EDGE_MARGIN &&
        canvasX >= dx1 - 10 &&
        canvasX <= dx2 + 10
      )
        return 'n';
      if (
        Math.abs(canvasY - dy2) <= EDGE_MARGIN &&
        canvasX >= dx1 - 10 &&
        canvasX <= dx2 + 10
      )
        return 's';
      if (
        Math.abs(canvasX - dx1) <= EDGE_MARGIN &&
        canvasY >= dy1 - 10 &&
        canvasY <= dy2 + 10
      )
        return 'w';
      if (
        Math.abs(canvasX - dx2) <= EDGE_MARGIN &&
        canvasY >= dy1 - 10 &&
        canvasY <= dy2 + 10
      )
        return 'e';

      // 3. Inside the crop box (move)
      if (canvasX >= dx1 && canvasX <= dx2 && canvasY >= dy1 && canvasY <= dy2) {
        return 'move';
      }

      return null;
    },
    [crop]
  );

  // Update hover cursor
  const handlePointerHover = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeHandle !== null) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    const handle = getHandleAt(px, py);
    let cursor = 'crosshair';
    if (handle === 'nw' || handle === 'se') cursor = 'nwse-resize';
    else if (handle === 'ne' || handle === 'sw') cursor = 'nesw-resize';
    else if (handle === 'n' || handle === 's') cursor = 'ns-resize';
    else if (handle === 'e' || handle === 'w') cursor = 'ew-resize';
    else if (handle === 'move') cursor = 'move';

    setHoverCursor(cursor);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !imageObj) return;

    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    const handle = getHandleAt(px, py) || 'new';
    const imgPos = canvasToImg({ x: px, y: py });

    canvas.setPointerCapture(e.pointerId);
    setActiveHandle(handle);
    setPointerScreenPos({ x: e.clientX, y: e.clientY });

    dragStartRef.current = {
      startImgPos: imgPos,
      startCrop: { ...crop },
    };

    if (handle === 'new') {
      // Start a fresh drag box from click position
      const clampedX = Math.max(0, Math.min(imageObj.width - 20, imgPos.x));
      const clampedY = Math.max(0, Math.min(imageObj.height - 20, imgPos.y));
      onChangeCrop({
        x: Math.round(clampedX),
        y: Math.round(clampedY),
        width: 20,
        height: 20,
      });
      dragStartRef.current.startCrop = {
        x: Math.round(clampedX),
        y: Math.round(clampedY),
        width: 20,
        height: 20,
      };
      setActiveHandle('se');
    }

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(20);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    handlePointerHover(e);

    if (activeHandle === null || !imageObj || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    setPointerScreenPos({ x: e.clientX, y: e.clientY });

    const currentImgPos = canvasToImg({ x: px, y: py });
    const { startImgPos, startCrop } = dragStartRef.current;
    const dx = currentImgPos.x - startImgPos.x;
    const dy = currentImgPos.y - startImgPos.y;

    const imgW = imageObj.width;
    const imgH = imageObj.height;

    let newCrop: RectCrop = { ...startCrop };

    if (activeHandle === 'move') {
      // Move entire crop box within image boundaries
      let newX = startCrop.x + dx;
      let newY = startCrop.y + dy;
      newX = Math.max(0, Math.min(imgW - startCrop.width, newX));
      newY = Math.max(0, Math.min(imgH - startCrop.height, newY));
      newCrop = {
        x: Math.round(newX),
        y: Math.round(newY),
        width: startCrop.width,
        height: startCrop.height,
      };
    } else {
      // Edge & Corner resizing
      let x1 = startCrop.x;
      let y1 = startCrop.y;
      let x2 = startCrop.x + startCrop.width;
      let y2 = startCrop.y + startCrop.height;

      switch (activeHandle) {
        case 'nw':
          x1 = Math.min(x2 - MIN_CROP_DIM, Math.max(0, startCrop.x + dx));
          y1 = Math.min(y2 - MIN_CROP_DIM, Math.max(0, startCrop.y + dy));
          break;
        case 'ne':
          x2 = Math.max(x1 + MIN_CROP_DIM, Math.min(imgW, startCrop.x + startCrop.width + dx));
          y1 = Math.min(y2 - MIN_CROP_DIM, Math.max(0, startCrop.y + dy));
          break;
        case 'se':
          x2 = Math.max(x1 + MIN_CROP_DIM, Math.min(imgW, startCrop.x + startCrop.width + dx));
          y2 = Math.max(y1 + MIN_CROP_DIM, Math.min(imgH, startCrop.y + startCrop.height + dy));
          break;
        case 'sw':
          x1 = Math.min(x2 - MIN_CROP_DIM, Math.max(0, startCrop.x + dx));
          y2 = Math.max(y1 + MIN_CROP_DIM, Math.min(imgH, startCrop.y + startCrop.height + dy));
          break;
        case 'n':
          y1 = Math.min(y2 - MIN_CROP_DIM, Math.max(0, startCrop.y + dy));
          break;
        case 's':
          y2 = Math.max(y1 + MIN_CROP_DIM, Math.min(imgH, startCrop.y + startCrop.height + dy));
          break;
        case 'w':
          x1 = Math.min(x2 - MIN_CROP_DIM, Math.max(0, startCrop.x + dx));
          break;
        case 'e':
          x2 = Math.max(x1 + MIN_CROP_DIM, Math.min(imgW, startCrop.x + startCrop.width + dx));
          break;
      }

      // If aspect ratio is locked, adjust
      if (aspectRatio && aspectRatio > 0) {
        let curW = x2 - x1;
        let curH = y2 - y1;

        if (activeHandle === 'e' || activeHandle === 'w') {
          curH = curW / aspectRatio;
          if (y1 + curH > imgH) {
            curH = imgH - y1;
            curW = curH * aspectRatio;
          }
          y2 = y1 + curH;
        } else {
          curW = curH * aspectRatio;
          if (x1 + curW > imgW) {
            curW = imgW - x1;
            curH = curW / aspectRatio;
          }
          x2 = x1 + curW;
        }
      }

      newCrop = {
        x: Math.round(x1),
        y: Math.round(y1),
        width: Math.round(x2 - x1),
        height: Math.round(y2 - y1),
      };
    }

    onChangeCrop(newCrop);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeHandle !== null && canvasRef.current) {
      try {
        canvasRef.current.releasePointerCapture(e.pointerId);
      } catch {}
      setActiveHandle(null);
    }
  };

  // Determine active corner point for Loupe Magnifier if user is dragging a corner
  const getActiveCornerPoint = (): Point | null => {
    if (!activeHandle || !['nw', 'ne', 'se', 'sw'].includes(activeHandle)) return null;
    switch (activeHandle) {
      case 'nw':
        return { x: crop.x, y: crop.y };
      case 'ne':
        return { x: crop.x + crop.width, y: crop.y };
      case 'se':
        return { x: crop.x + crop.width, y: crop.y + crop.height };
      case 'sw':
        return { x: crop.x, y: crop.y + crop.height };
      default:
        return null;
    }
  };

  const activeCornerPt = getActiveCornerPoint();

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
        style={{ cursor: hoverCursor }}
        className="w-full h-full"
      />

      {/* Floating Loupe Magnifier when dragging corner handles */}
      {activeCornerPt && imageObj && activeHandle && (
        <LoupeMagnifier
          sourceImage={imageObj}
          activeCorner={activeCornerPt}
          cornerLabel={CORNER_NAMES[activeHandle] || 'Corner'}
          containerOffset={pointerScreenPos}
          zoom={3.2}
          size={120}
        />
      )}
    </div>
  );
};
