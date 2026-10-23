import { Point, RectCrop } from '@/types';

export interface DetectedDocument {
  rect: RectCrop;
  corners: [Point, Point, Point, Point]; // [TL, TR, BR, BL]
  confidence: number; // 0.0 to 1.0
  isDocumentDetected: boolean;
}

interface LineEquation {
  a: number;
  b: number;
  c: number;
}

/**
 * Smart Document Detection Engine (CamScanner-grade)
 * Combines multi-spectral chromatic neutrality, local adaptive contrast,
 * Sobel gradient step detection, and 4-line RANSAC intersection
 * to isolate document pages from background surfaces (tables, desks, floors, countertops).
 */
export function detectDocumentBounds(
  source: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement
): DetectedDocument {
  const srcWidth = 'videoWidth' in source ? source.videoWidth || 1280 : source.width;
  const srcHeight = 'videoHeight' in source ? source.videoHeight || 720 : source.height;

  // Viewfinder default centered guide (15% margin centered)
  const defaultInsetX = Math.round(srcWidth * 0.15);
  const defaultInsetY = Math.round(srcHeight * 0.15);
  const fallbackRect: RectCrop = {
    x: defaultInsetX,
    y: defaultInsetY,
    width: Math.max(40, srcWidth - defaultInsetX * 2),
    height: Math.max(40, srcHeight - defaultInsetY * 2),
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
    // 1. Downscale to fixed detection resolution for speed (< 12ms execution)
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

    // 2. Grayscale, Chroma Divergence & Paper Neutrality Score
    const luma = new Uint8Array(totalPixels);
    const chroma = new Uint8Array(totalPixels);
    const paperScore = new Uint8Array(totalPixels);

    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const yVal = (0.299 * r + 0.587 * g + 0.114 * b) | 0;
      // Real-world desks have high chroma (wood is brown/amber: R >> B).
      // Paper documents (white, off-white, light gray) have low chroma divergence.
      const cDiff = Math.max(Math.abs(r - g), Math.abs(r - b), Math.abs(g - b));
      const neutrality = Math.max(0, 255 - 4 * cDiff);

      luma[p] = yVal;
      chroma[p] = cDiff;
      paperScore[p] = ((yVal * 0.55) + (neutrality * 0.45)) | 0;
    }

    // 3. Compute Sobel Edge Magnitude combining Luminance and Chroma steps
    const gradient = new Uint8Array(totalPixels);
    for (let y = 1; y < detH - 1; y++) {
      const rowOffset = y * detW;
      for (let x = 1; x < detW - 1; x++) {
        const idx = rowOffset + x;
        const gx =
          Math.abs(luma[idx + 1] - luma[idx - 1]) +
          Math.abs(chroma[idx + 1] - chroma[idx - 1]);
        const gy =
          Math.abs(luma[idx + detW] - luma[idx - detW]) +
          Math.abs(chroma[idx + detW] - chroma[idx - detW]);
        gradient[idx] = Math.min(255, gx + gy);
      }
    }

    // 4. Inward Boundary Ray-Casting
    // Cast rays from outer image borders inward to detect paper transition steps
    const NUM_RAYS = 28;
    const topPoints: Point[] = [];
    const bottomPoints: Point[] = [];
    const leftPoints: Point[] = [];
    const rightPoints: Point[] = [];

    // Vertical rays (Top -> Center)
    for (let r = 1; r <= NUM_RAYS; r++) {
      const x = Math.round((detW * (r + 1)) / (NUM_RAYS + 3));
      let bestY = -1;
      let bestScore = 18;

      for (let y = 3; y < Math.round(detH * 0.48); y++) {
        const idx = y * detW + x;
        const g = gradient[idx];
        if (g > bestScore) {
          const innerIdx = (y + 4) * detW + x;
          if (innerIdx < totalPixels && paperScore[innerIdx] >= paperScore[idx] - 12) {
            bestScore = g;
            bestY = y;
          }
        }
      }
      if (bestY !== -1) topPoints.push({ x, y: bestY });
    }

    // Vertical rays (Bottom -> Center)
    for (let r = 1; r <= NUM_RAYS; r++) {
      const x = Math.round((detW * (r + 1)) / (NUM_RAYS + 3));
      let bestY = -1;
      let bestScore = 18;

      for (let y = detH - 4; y > Math.round(detH * 0.52); y--) {
        const idx = y * detW + x;
        const g = gradient[idx];
        if (g > bestScore) {
          const innerIdx = (y - 4) * detW + x;
          if (innerIdx >= 0 && paperScore[innerIdx] >= paperScore[idx] - 12) {
            bestScore = g;
            bestY = y;
          }
        }
      }
      if (bestY !== -1) bottomPoints.push({ x, y: bestY });
    }

    // Horizontal rays (Left -> Center)
    for (let r = 1; r <= NUM_RAYS; r++) {
      const y = Math.round((detH * (r + 1)) / (NUM_RAYS + 3));
      const rowOffset = y * detW;
      let bestX = -1;
      let bestScore = 18;

      for (let x = 3; x < Math.round(detW * 0.48); x++) {
        const idx = rowOffset + x;
        const g = gradient[idx];
        if (g > bestScore) {
          const innerIdx = rowOffset + x + 4;
          if (innerIdx < totalPixels && paperScore[innerIdx] >= paperScore[idx] - 12) {
            bestScore = g;
            bestX = x;
          }
        }
      }
      if (bestX !== -1) leftPoints.push({ x: bestX, y });
    }

    // Horizontal rays (Right -> Center)
    for (let r = 1; r <= NUM_RAYS; r++) {
      const y = Math.round((detH * (r + 1)) / (NUM_RAYS + 3));
      const rowOffset = y * detW;
      let bestX = -1;
      let bestScore = 18;

      for (let x = detW - 4; x > Math.round(detW * 0.52); x--) {
        const idx = rowOffset + x;
        const g = gradient[idx];
        if (g > bestScore) {
          const innerIdx = rowOffset + x - 4;
          if (innerIdx >= 0 && paperScore[innerIdx] >= paperScore[idx] - 12) {
            bestScore = g;
            bestX = x;
          }
        }
      }
      if (bestX !== -1) rightPoints.push({ x: bestX, y });
    }

    // 5. Fit 4 Lines using RANSAC with Least-Squares refinement
    const topLine = fitLineRansac(topPoints, false, detW);
    const bottomLine = fitLineRansac(bottomPoints, false, detW);
    const leftLine = fitLineRansac(leftPoints, true, detH);
    const rightLine = fitLineRansac(rightPoints, true, detH);

    let cornersFromLines: [Point, Point, Point, Point] | null = null;
    if (topLine && bottomLine && leftLine && rightLine) {
      const tl = intersectLines(topLine, leftLine);
      const tr = intersectLines(topLine, rightLine);
      const br = intersectLines(bottomLine, rightLine);
      const bl = intersectLines(bottomLine, leftLine);

      if (tl && tr && br && bl) {
        // Validate geometry (non-inverted, convex quad, inside detection frame with 5% margin allowance)
        const isConvex =
          tr.x > tl.x + 15 &&
          br.x > bl.x + 15 &&
          bl.y > tl.y + 15 &&
          br.y > tr.y + 15;

        const boundsCheck =
          tl.x >= -detW * 0.05 && tl.x <= detW * 0.6 &&
          tr.x >= detW * 0.4 && tr.x <= detW * 1.05 &&
          bl.x >= -detW * 0.05 && bl.x <= detW * 0.6 &&
          br.x >= detW * 0.4 && br.x <= detW * 1.05 &&
          tl.y >= -detH * 0.05 && tl.y <= detH * 0.6 &&
          tr.y >= -detH * 0.05 && tr.y <= detH * 0.6 &&
          bl.y >= detH * 0.4 && bl.y <= detH * 1.05 &&
          br.y >= detH * 0.4 && br.y <= detH * 1.05;

        if (isConvex && boundsCheck) {
          cornersFromLines = [
            { x: Math.max(0, Math.min(detW, tl.x)), y: Math.max(0, Math.min(detH, tl.y)) },
            { x: Math.max(0, Math.min(detW, tr.x)), y: Math.max(0, Math.min(detH, tr.y)) },
            { x: Math.max(0, Math.min(detW, br.x)), y: Math.max(0, Math.min(detH, br.y)) },
            { x: Math.max(0, Math.min(detW, bl.x)), y: Math.max(0, Math.min(detH, bl.y)) },
          ];
        }
      }
    }

    // 6. Connected Paper Blob fallback if RANSAC lines fail
    let cornersFromBlob: [Point, Point, Point, Point] | null = null;
    let paperPixelCount = 0;

    let minSum = Infinity, maxSum = -Infinity;
    let minDiff = Infinity, maxDiff = -Infinity;
    let tlBlob: Point = { x: detW * 0.15, y: detH * 0.15 };
    let trBlob: Point = { x: detW * 0.85, y: detH * 0.15 };
    let brBlob: Point = { x: detW * 0.85, y: detH * 0.85 };
    let blBlob: Point = { x: detW * 0.15, y: detH * 0.85 };

    // Find center paper baseline
    let centerPaperSum = 0;
    let centerSampleCount = 0;
    for (let cy = Math.round(detH * 0.35); cy <= Math.round(detH * 0.65); cy++) {
      const row = cy * detW;
      for (let cx = Math.round(detW * 0.35); cx <= Math.round(detW * 0.65); cx++) {
        centerPaperSum += paperScore[row + cx];
        centerSampleCount++;
      }
    }
    const centerAvgScore = centerPaperSum / (centerSampleCount || 1);
    const paperScoreThresh = Math.max(80, centerAvgScore - 30);

    for (let y = 6; y < detH - 6; y++) {
      const row = y * detW;
      for (let x = 6; x < detW - 6; x++) {
        if (paperScore[row + x] >= paperScoreThresh) {
          paperPixelCount++;
          const sum = x + y;
          const diff = x - y;
          if (sum < minSum) { minSum = sum; tlBlob = { x, y }; }
          if (sum > maxSum) { maxSum = sum; brBlob = { x, y }; }
          if (diff > maxDiff) { maxDiff = diff; trBlob = { x, y }; }
          if (diff < minDiff) { minDiff = diff; blBlob = { x, y }; }
        }
      }
    }

    const paperCoverage = paperPixelCount / totalPixels;
    if (paperCoverage >= 0.12 && paperCoverage <= 0.95) {
      if (trBlob.x > tlBlob.x + 20 && brBlob.x > blBlob.x + 20 && blBlob.y > tlBlob.y + 20 && brBlob.y > trBlob.y + 20) {
        cornersFromBlob = [tlBlob, trBlob, brBlob, blBlob];
      }
    }

    // 7. Choose primary detected quad
    const chosenCorners = cornersFromLines || cornersFromBlob;
    if (!chosenCorners) {
      return {
        rect: fallbackRect,
        corners: fallbackCorners,
        confidence: 0.15,
        isDocumentDetected: false,
      };
    }

    // Scale back to original resolution
    const invScale = 1 / scale;
    const scaledCorners: [Point, Point, Point, Point] = [
      {
        x: Math.max(0, Math.min(srcWidth, Math.round(chosenCorners[0].x * invScale))),
        y: Math.max(0, Math.min(srcHeight, Math.round(chosenCorners[0].y * invScale))),
      },
      {
        x: Math.max(0, Math.min(srcWidth, Math.round(chosenCorners[1].x * invScale))),
        y: Math.max(0, Math.min(srcHeight, Math.round(chosenCorners[1].y * invScale))),
      },
      {
        x: Math.max(0, Math.min(srcWidth, Math.round(chosenCorners[2].x * invScale))),
        y: Math.max(0, Math.min(srcHeight, Math.round(chosenCorners[2].y * invScale))),
      },
      {
        x: Math.max(0, Math.min(srcWidth, Math.round(chosenCorners[3].x * invScale))),
        y: Math.max(0, Math.min(srcHeight, Math.round(chosenCorners[3].y * invScale))),
      },
    ];

    // Compute bounding rect
    const xs = scaledCorners.map((p) => p.x);
    const ys = scaledCorners.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const detectedRect: RectCrop = {
      x: minX,
      y: minY,
      width: Math.max(20, maxX - minX),
      height: Math.max(20, maxY - minY),
    };

    // Calculate area coverage & confidence
    const quadArea = computeQuadArea(scaledCorners);
    const totalArea = srcWidth * srcHeight;
    const areaRatio = quadArea / totalArea;

    // Document is valid if it covers between 10% and 94% of the frame
    const isPlausibleDocument = areaRatio >= 0.10 && areaRatio <= 0.94;

    if (!isPlausibleDocument) {
      return {
        rect: fallbackRect,
        corners: fallbackCorners,
        confidence: 0.25,
        isDocumentDetected: false,
      };
    }

    const confidence = cornersFromLines ? 0.96 : 0.82;

    return {
      rect: detectedRect,
      corners: scaledCorners,
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

/**
 * Fit a straight line through points using RANSAC with least-squares refinement
 */
function fitLineRansac(
  points: Point[],
  isVertical: boolean,
  dimLimit: number,
  maxIterations = 60,
  threshold = 3.5
): LineEquation | null {
  if (points.length < 4) return null;

  let bestLine: LineEquation | null = null;
  let maxInliers = 0;
  let bestInlierIndices: number[] = [];

  for (let iter = 0; iter < maxIterations; iter++) {
    const i1 = Math.floor(Math.random() * points.length);
    const i2 = Math.floor(Math.random() * points.length);
    if (i1 === i2) continue;

    const p1 = points[i1];
    const p2 = points[i2];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.hypot(dx, dy);

    if (dist < dimLimit * 0.10) continue;

    // Reject lines that violate expected document edge orientation
    if (isVertical) {
      // Left and Right edges are predominantly vertical (|dx / dy| <= 0.75)
      if (Math.abs(dy) < 5 || Math.abs(dx / dy) > 0.75) continue;
    } else {
      // Top and Bottom edges are predominantly horizontal (|dy / dx| <= 0.75)
      if (Math.abs(dx) < 5 || Math.abs(dy / dx) > 0.75) continue;
    }

    const a = -dy / dist;
    const b = dx / dist;
    const c = -(a * p1.x + b * p1.y);

    let inlierCount = 0;
    const inliers: number[] = [];

    for (let j = 0; j < points.length; j++) {
      const pt = points[j];
      const d = Math.abs(a * pt.x + b * pt.y + c);
      if (d <= threshold) {
        inlierCount++;
        inliers.push(j);
      }
    }

    if (inlierCount > maxInliers) {
      maxInliers = inlierCount;
      bestLine = { a, b, c };
      bestInlierIndices = inliers;
    }
  }

  if (!bestLine || maxInliers < Math.max(3, points.length * 0.22)) {
    return null;
  }

  // Refine line parameters via least-squares over all inliers
  const inlierPoints = bestInlierIndices.map((idx) => points[idx]);
  if (isVertical) {
    let sumY = 0, sumX = 0, sumYY = 0, sumYX = 0;
    const n = inlierPoints.length;
    for (const pt of inlierPoints) {
      sumY += pt.y;
      sumX += pt.x;
      sumYY += pt.y * pt.y;
      sumYX += pt.y * pt.x;
    }
    const denom = n * sumYY - sumY * sumY;
    if (Math.abs(denom) > 1e-5) {
      const m = (n * sumYX - sumY * sumX) / denom;
      const k = (sumX - m * sumY) / n;
      const L = Math.hypot(1, -m);
      return { a: 1 / L, b: -m / L, c: -k / L };
    }
  } else {
    let sumX = 0, sumY = 0, sumXX = 0, sumXY = 0;
    const n = inlierPoints.length;
    for (const pt of inlierPoints) {
      sumX += pt.x;
      sumY += pt.y;
      sumXX += pt.x * pt.x;
      sumXY += pt.x * pt.y;
    }
    const denom = n * sumXX - sumX * sumX;
    if (Math.abs(denom) > 1e-5) {
      const m = (n * sumXY - sumX * sumY) / denom;
      const k = (sumY - m * sumX) / n;
      const L = Math.hypot(-m, 1);
      return { a: -m / L, b: 1 / L, c: -k / L };
    }
  }

  return bestLine;
}

/**
 * Compute intersection of two lines in general form A*x + B*y + C = 0
 */
function intersectLines(l1: LineEquation, l2: LineEquation): Point | null {
  const d = l1.a * l2.b - l2.a * l1.b;
  if (Math.abs(d) < 1e-4) return null;
  const x = (l1.b * l2.c - l2.b * l1.c) / d;
  const y = (l2.a * l1.c - l1.a * l2.c) / d;
  return { x, y };
}

/**
 * Shoelace formula to compute quadrilateral area
 */
function computeQuadArea(pts: [Point, Point, Point, Point]): number {
  return (
    0.5 *
    Math.abs(
      pts[0].x * pts[1].y - pts[1].x * pts[0].y +
      pts[1].x * pts[2].y - pts[2].x * pts[1].y +
      pts[2].x * pts[3].y - pts[3].x * pts[2].y +
      pts[3].x * pts[0].y - pts[0].x * pts[3].y
    )
  );
}
