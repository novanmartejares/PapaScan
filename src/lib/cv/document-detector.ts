import { Point, RectCrop } from '@/types';

export interface DetectedDocument {
  rect: RectCrop;
  corners: [Point, Point, Point, Point]; // [TL, TR, BR, BL]
  confidence: number; // 0.0 to 1.0
  isDocumentDetected: boolean;
}

/**
 * Smart Document Detection Engine
 * Uses adaptive luminance segmentation, gradient ray-casting, and morphology
 * to accurately isolate paper documents from background surfaces (tables, desks, floors).
 */
export function detectDocumentBounds(
  source: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement
): DetectedDocument {
  const srcWidth = 'videoWidth' in source ? source.videoWidth || 1280 : source.width;
  const srcHeight = 'videoHeight' in source ? source.videoHeight || 720 : source.height;

  // Fallback default (5% margin)
  const fallbackRect: RectCrop = {
    x: Math.round(srcWidth * 0.05),
    y: Math.round(srcHeight * 0.05),
    width: Math.round(srcWidth * 0.9),
    height: Math.round(srcHeight * 0.9),
  };

  const fallbackCorners: [Point, Point, Point, Point] = [
    { x: fallbackRect.x, y: fallbackRect.y },
    { x: fallbackRect.x + fallbackRect.width, y: fallbackRect.y },
    { x: fallbackRect.x + fallbackRect.width, y: fallbackRect.y + fallbackRect.height },
    { x: fallbackRect.x, y: fallbackRect.y + fallbackRect.height },
  ];

  if (typeof document === 'undefined' || srcWidth < 40 || srcHeight < 40) {
    return {
      rect: fallbackRect,
      corners: fallbackCorners,
      confidence: 0,
      isDocumentDetected: false,
    };
  }

  try {
    // 1. Downscale to fixed detection resolution for speed (< 10ms execution)
    const MAX_DIM = 360;
    const scale = Math.min(1.0, MAX_DIM / Math.max(srcWidth, srcHeight));
    const detW = Math.max(40, Math.round(srcWidth * scale));
    const detH = Math.max(40, Math.round(srcHeight * scale));

    const detCanvas = document.createElement('canvas');
    detCanvas.width = detW;
    detCanvas.height = detH;
    const ctx = detCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      return { rect: fallbackRect, corners: fallbackCorners, confidence: 0, isDocumentDetected: false };
    }

    ctx.drawImage(source, 0, 0, detW, detH);
    const imgData = ctx.getImageData(0, 0, detW, detH);
    const data = imgData.data;
    const totalPixels = detW * detH;

    // 2. Grayscale & Histogram
    const gray = new Uint8Array(totalPixels);
    const hist = new Int32Array(256);

    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      // Perceptual luminance
      const luma = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      gray[p] = luma;
      hist[luma]++;
    }

    // 3. Otsu's Thresholding to separate paper from background
    let sumTotal = 0;
    for (let t = 0; t < 256; t++) {
      sumTotal += t * hist[t];
    }

    let weightBackground = 0;
    let sumBackground = 0;
    let maxVariance = 0;
    let otsuThreshold = 128;

    for (let t = 0; t < 256; t++) {
      weightBackground += hist[t];
      if (weightBackground === 0) continue;

      const weightForeground = totalPixels - weightBackground;
      if (weightForeground === 0) break;

      sumBackground += t * hist[t];
      const meanBackground = sumBackground / weightBackground;
      const meanForeground = (sumTotal - sumBackground) / weightForeground;

      const varianceBetween =
        weightBackground * weightForeground * Math.pow(meanBackground - meanForeground, 2);

      if (varianceBetween > maxVariance) {
        maxVariance = varianceBetween;
        otsuThreshold = t;
      }
    }

    // 4. Compute Sobel Edge Magnitude
    const gradient = new Uint8Array(totalPixels);
    for (let y = 1; y < detH - 1; y++) {
      const rowOffset = y * detW;
      for (let x = 1; x < detW - 1; x++) {
        const idx = rowOffset + x;
        const gx =
          gray[idx + 1] -
          gray[idx - 1] +
          ((gray[idx + 1 + detW] - gray[idx - 1 + detW]) >> 1) +
          ((gray[idx + 1 - detW] - gray[idx - 1 - detW]) >> 1);
        const gy =
          gray[idx + detW] -
          gray[idx - detW] +
          ((gray[idx + detW + 1] - gray[idx - detW + 1]) >> 1) +
          ((gray[idx + detW - 1] - gray[idx - detW - 1]) >> 1);
        gradient[idx] = Math.min(255, Math.abs(gx) + Math.abs(gy));
      }
    }

    // 5. Inward Boundary Ray-Casting
    // Sample rays from borders toward center to find sudden paper edges
    const NUM_RAYS = 15;
    const topEdges: number[] = [];
    const bottomEdges: number[] = [];
    const leftEdges: number[] = [];
    const rightEdges: number[] = [];

    const GRADIENT_THRESHOLD = 32;

    // Scan Vertical rays (Top -> Center & Bottom -> Center)
    for (let r = 1; r <= NUM_RAYS; r++) {
      const x = Math.round((detW * r) / (NUM_RAYS + 1));

      // Top scan down
      let foundTop = -1;
      for (let y = 3; y < Math.round(detH * 0.45); y++) {
        const idx = y * detW + x;
        if (gradient[idx] >= GRADIENT_THRESHOLD || gray[idx] >= otsuThreshold) {
          foundTop = y;
          break;
        }
      }
      if (foundTop !== -1) topEdges.push(foundTop);

      // Bottom scan up
      let foundBottom = -1;
      for (let y = detH - 4; y > Math.round(detH * 0.55); y--) {
        const idx = y * detW + x;
        if (gradient[idx] >= GRADIENT_THRESHOLD || gray[idx] >= otsuThreshold) {
          foundBottom = y;
          break;
        }
      }
      if (foundBottom !== -1) bottomEdges.push(foundBottom);
    }

    // Scan Horizontal rays (Left -> Center & Right -> Center)
    for (let r = 1; r <= NUM_RAYS; r++) {
      const y = Math.round((detH * r) / (NUM_RAYS + 1));
      const rowOffset = y * detW;

      // Left scan right
      let foundLeft = -1;
      for (let x = 3; x < Math.round(detW * 0.45); x++) {
        const idx = rowOffset + x;
        if (gradient[idx] >= GRADIENT_THRESHOLD || gray[idx] >= otsuThreshold) {
          foundLeft = x;
          break;
        }
      }
      if (foundLeft !== -1) leftEdges.push(foundLeft);

      // Right scan left
      let foundRight = -1;
      for (let x = detW - 4; x > Math.round(detW * 0.55); x--) {
        const idx = rowOffset + x;
        if (gradient[idx] >= GRADIENT_THRESHOLD || gray[idx] >= otsuThreshold) {
          foundRight = x;
          break;
        }
      }
      if (foundRight !== -1) rightEdges.push(foundRight);
    }

    // Helper: median of numeric array
    const median = (arr: number[], fallback: number): number => {
      if (arr.length === 0) return fallback;
      const sorted = [...arr].sort((a, b) => a - b);
      return sorted[Math.floor(sorted.length / 2)];
    };

    let rayMinY = median(topEdges, Math.round(detH * 0.06));
    let rayMaxY = median(bottomEdges, Math.round(detH * 0.94));
    let rayMinX = median(leftEdges, Math.round(detW * 0.06));
    let rayMaxX = median(rightEdges, Math.round(detW * 0.94));

    // Ensure sensible ordering
    if (rayMaxX <= rayMinX + 20) {
      rayMinX = Math.round(detW * 0.05);
      rayMaxX = Math.round(detW * 0.95);
    }
    if (rayMaxY <= rayMinY + 20) {
      rayMinY = Math.round(detH * 0.05);
      rayMaxY = Math.round(detH * 0.95);
    }

    // 6. Connected Document Paper Mask
    // In typical desk scans, paper has higher luminance than desk surface
    // Count center sample
    let centerPaperCount = 0;
    let centerTotal = 0;
    const cX1 = Math.round(detW * 0.3);
    const cX2 = Math.round(detW * 0.7);
    const cY1 = Math.round(detH * 0.3);
    const cY2 = Math.round(detH * 0.7);

    for (let y = cY1; y <= cY2; y++) {
      const rowOffset = y * detW;
      for (let x = cX1; x <= cX2; x++) {
        centerTotal++;
        if (gray[rowOffset + x] >= otsuThreshold - 15) {
          centerPaperCount++;
        }
      }
    }

    const paperIsBright = centerPaperCount / centerTotal >= 0.45;
    const paperThreshold = paperIsBright ? otsuThreshold - 20 : otsuThreshold + 20;

    // Bounding bounds of paper mask
    let maskMinX = detW;
    let maskMaxX = 0;
    let maskMinY = detH;
    let maskMaxY = 0;
    let paperPixelCount = 0;

    for (let y = 4; y < detH - 4; y++) {
      const rowOffset = y * detW;
      for (let x = 4; x < detW - 4; x++) {
        const val = gray[rowOffset + x];
        const isPaper = paperIsBright ? val >= paperThreshold : val <= paperThreshold;
        if (isPaper) {
          paperPixelCount++;
          if (x < maskMinX) maskMinX = x;
          if (x > maskMaxX) maskMaxX = x;
          if (y < maskMinY) maskMinY = y;
          if (y > maskMaxY) maskMaxY = y;
        }
      }
    }

    // 7. Combine Ray Estimate with Paper Mask Estimate
    let finalMinX = rayMinX;
    let finalMaxX = rayMaxX;
    let finalMinY = rayMinY;
    let finalMaxY = rayMaxY;

    const paperRatio = paperPixelCount / totalPixels;
    const hasSolidPaper = paperRatio >= 0.15 && paperRatio <= 0.95;

    if (hasSolidPaper && maskMaxX > maskMinX + 30 && maskMaxY > maskMinY + 30) {
      // Blend 50/50 with ray edge scan to prevent clipping curved corners
      finalMinX = Math.round(Math.min(rayMinX, maskMinX) * 0.3 + Math.max(rayMinX, maskMinX) * 0.7);
      finalMaxX = Math.round(Math.max(rayMaxX, maskMaxX) * 0.3 + Math.min(rayMaxX, maskMaxX) * 0.7);
      finalMinY = Math.round(Math.min(rayMinY, maskMinY) * 0.3 + Math.max(rayMinY, maskMinY) * 0.7);
      finalMaxY = Math.round(Math.max(rayMaxY, maskMaxY) * 0.3 + Math.min(rayMaxY, maskMaxY) * 0.7);
    }

    // Safety padding (1.5% inset/outset to not clip text)
    const padX = Math.round((finalMaxX - finalMinX) * 0.015);
    const padY = Math.round((finalMaxY - finalMinY) * 0.015);

    finalMinX = Math.max(0, finalMinX - padX);
    finalMaxX = Math.min(detW, finalMaxX + padX);
    finalMinY = Math.max(0, finalMinY - padY);
    finalMaxY = Math.min(detH, finalMaxY + padY);

    const detWidth = finalMaxX - finalMinX;
    const detHeight = finalMaxY - finalMinY;

    // Check detection plausibility
    const coverage = (detWidth * detHeight) / totalPixels;
    const isValidDocument =
      coverage >= 0.12 &&
      coverage <= 0.98 &&
      detWidth >= detW * 0.25 &&
      detHeight >= detH * 0.25;

    if (!isValidDocument) {
      return {
        rect: fallbackRect,
        corners: fallbackCorners,
        confidence: 0.2,
        isDocumentDetected: false,
      };
    }

    // 8. Scale back to original full-resolution image coordinate space
    const invScale = 1 / scale;
    const origX = Math.max(0, Math.min(srcWidth - 20, Math.round(finalMinX * invScale)));
    const origY = Math.max(0, Math.min(srcHeight - 20, Math.round(finalMinY * invScale)));
    const origW = Math.max(20, Math.min(srcWidth - origX, Math.round(detWidth * invScale)));
    const origH = Math.max(20, Math.min(srcHeight - origY, Math.round(detHeight * invScale)));

    const detectedRect: RectCrop = {
      x: origX,
      y: origY,
      width: origW,
      height: origH,
    };

    const detectedCorners: [Point, Point, Point, Point] = [
      { x: origX, y: origY },
      { x: origX + origW, y: origY },
      { x: origX + origW, y: origY + origH },
      { x: origX, y: origY + origH },
    ];

    // Compute confidence based on edge contrast and ray agreement
    const confidence = Math.min(
      0.98,
      Math.max(0.65, (topEdges.length + bottomEdges.length + leftEdges.length + rightEdges.length) / (NUM_RAYS * 4))
    );

    return {
      rect: detectedRect,
      corners: detectedCorners,
      confidence,
      isDocumentDetected: true,
    };
  } catch (err) {
    console.warn('Smart Document Detection warning:', err);
    return {
      rect: fallbackRect,
      corners: fallbackCorners,
      confidence: 0,
      isDocumentDetected: false,
    };
  }
}
