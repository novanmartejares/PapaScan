import { Point } from '@/types';
import { distance } from './geometry';

/**
 * Solves an 8x8 linear system using Gaussian elimination with partial pivoting.
 * Used to compute the 8 degrees-of-freedom for homography transformation.
 */
function solve8x8(A: number[][], b: number[]): number[] | null {
  const n = 8;
  const M: number[][] = A.map((row, i) => [...row, b[i]]);

  for (let i = 0; i < n; i++) {
    // Partial pivoting: find maximum entry in column i
    let maxRow = i;
    let maxVal = Math.abs(M[i][i]);
    for (let r = i + 1; r < n; r++) {
      if (Math.abs(M[r][i]) > maxVal) {
        maxVal = Math.abs(M[r][i]);
        maxRow = r;
      }
    }

    if (maxVal < 1e-11) {
      return null; // Singular or near-singular matrix
    }

    // Swap row i with maxRow
    if (maxRow !== i) {
      const temp = M[i];
      M[i] = M[maxRow];
      M[maxRow] = temp;
    }

    // Eliminate column i below diagonal
    for (let r = i + 1; r < n; r++) {
      const factor = M[r][i] / M[i][i];
      for (let c = i; c <= n; c++) {
        M[r][c] -= factor * M[i][c];
      }
    }
  }

  // Back-substitution
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = M[i][n];
    for (let c = i + 1; c < n; c++) {
      sum -= M[i][c] * x[c];
    }
    x[i] = sum / M[i][i];
  }

  return x;
}

/**
 * Computes 3x3 homography matrix H mapping destination coordinates (u, v)
 * to source coordinates (x, y) via backward mapping.
 *
 * (x', y', w')^T = H * (u, v, 1)^T
 * x = x' / w', y = y' / w'
 */
export function getPerspectiveMatrix(
  dstCorners: [Point, Point, Point, Point],
  srcCorners: [Point, Point, Point, Point]
): number[] | null {
  const A: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < 4; i++) {
    const u = dstCorners[i].x;
    const v = dstCorners[i].y;
    const x = srcCorners[i].x;
    const y = srcCorners[i].y;

    // x equation: m00*u + m01*v + m02 - m20*u*x - m21*v*x = x
    A.push([u, v, 1, 0, 0, 0, -u * x, -v * x]);
    b.push(x);

    // y equation: m10*u + m11*v + m12 - m20*u*y - m21*v*y = y
    A.push([0, 0, 0, u, v, 1, -u * y, -v * y]);
    b.push(y);
  }

  const h = solve8x8(A, b);
  if (!h) return null;

  // 3x3 homography matrix in row-major order:
  // [h0, h1, h2]
  // [h3, h4, h5]
  // [h6, h7, 1.0]
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1.0];
}

/**
 * Calculates optimal rectangular destination dimensions [width, height]
 * given 4 quadrilateral corner points [TL, TR, BR, BL] in the source image.
 */
export function calculateRectifiedDimensions(
  corners: [Point, Point, Point, Point],
  maxDimension = 2048
): { width: number; height: number } {
  const [tl, tr, br, bl] = corners;

  // Top and bottom edge euclidean lengths
  const topWidth = distance(tl, tr);
  const bottomWidth = distance(bl, br);
  // Left and right edge euclidean lengths
  const leftHeight = distance(tl, bl);
  const rightHeight = distance(tr, br);

  // Use maximum opposing edge lengths to preserve maximum spatial resolution
  let width = Math.round(Math.max(topWidth, bottomWidth));
  let height = Math.round(Math.max(leftHeight, rightHeight));

  // Sanity lower bound
  width = Math.max(120, width);
  height = Math.max(120, height);

  // Scale down if exceeds max output dimension
  if (width > maxDimension || height > maxDimension) {
    const scale = Math.min(maxDimension / width, maxDimension / height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  return { width, height };
}

/**
 * Performs true 4-point perspective transformation (homography warp) on an HTML5 Canvas.
 * Takes an angled trapezoidal selection and flattens it into a rectified, rectangular document.
 * Uses backward mapping with sub-pixel bilinear interpolation for ultra-crisp text.
 */
export function warpPerspective(
  sourceCanvasOrImage: HTMLCanvasElement | HTMLImageElement,
  corners: [Point, Point, Point, Point],
  maxOutputDimension = 2048
): HTMLCanvasElement {
  const { width: targetWidth, height: targetHeight } = calculateRectifiedDimensions(
    corners,
    maxOutputDimension
  );

  // Prepare source canvas context
  let srcCanvas: HTMLCanvasElement;
  let srcCtx: CanvasRenderingContext2D;

  if (sourceCanvasOrImage instanceof HTMLCanvasElement) {
    srcCanvas = sourceCanvasOrImage;
    const ctx = srcCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Could not obtain 2D canvas context');
    srcCtx = ctx;
  } else {
    srcCanvas = document.createElement('canvas');
    srcCanvas.width = sourceCanvasOrImage.naturalWidth || sourceCanvasOrImage.width;
    srcCanvas.height = sourceCanvasOrImage.naturalHeight || sourceCanvasOrImage.height;
    const ctx = srcCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Could not obtain 2D canvas context');
    srcCtx = ctx;
    srcCtx.drawImage(sourceCanvasOrImage, 0, 0);
  }

  const srcWidth = srcCanvas.width;
  const srcHeight = srcCanvas.height;
  const srcImgData = srcCtx.getImageData(0, 0, srcWidth, srcHeight);
  const srcPixels = srcImgData.data;

  // Destination canvas
  const dstCanvas = document.createElement('canvas');
  dstCanvas.width = targetWidth;
  dstCanvas.height = targetHeight;
  const dstCtx = dstCanvas.getContext('2d');
  if (!dstCtx) throw new Error('Could not obtain destination 2D context');

  const dstImgData = dstCtx.createImageData(targetWidth, targetHeight);
  const dstPixels = dstImgData.data;

  // Rectangular destination corners: [TL, TR, BR, BL]
  const dstCorners: [Point, Point, Point, Point] = [
    { x: 0, y: 0 },
    { x: targetWidth, y: 0 },
    { x: targetWidth, y: targetHeight },
    { x: 0, y: targetHeight },
  ];

  // Homography matrix H mapping (u, v) in dst -> (x, y) in src
  const H = getPerspectiveMatrix(dstCorners, corners);
  if (!H) {
    // Graceful fallback: draw directly
    dstCtx.drawImage(srcCanvas, 0, 0, targetWidth, targetHeight);
    return dstCanvas;
  }

  const [h0, h1, h2, h3, h4, h5, h6, h7, h8] = H;

  // Backward mapping with bilinear sampling across destination coordinates
  for (let v = 0; v < targetHeight; v++) {
    const vOffset = v * targetWidth;
    for (let u = 0; u < targetWidth; u++) {
      const w = h6 * u + h7 * v + h8;
      if (Math.abs(w) < 1e-10) continue;

      const invW = 1.0 / w;
      const x = (h0 * u + h1 * v + h2) * invW;
      const y = (h3 * u + h4 * v + h5) * invW;

      // Clamp within safe source boundaries for sub-pixel sampling
      const safeX = Math.max(0, Math.min(srcWidth - 1.0001, x));
      const safeY = Math.max(0, Math.min(srcHeight - 1.0001, y));

      const x0 = Math.floor(safeX);
      const y0 = Math.floor(safeY);
      const x1 = Math.min(srcWidth - 1, x0 + 1);
      const y1 = Math.min(srcHeight - 1, y0 + 1);

      const fx = safeX - x0;
      const fy = safeY - y0;
      const f00 = (1 - fx) * (1 - fy);
      const f10 = fx * (1 - fy);
      const f01 = (1 - fx) * fy;
      const f11 = fx * fy;

      const idx00 = (y0 * srcWidth + x0) * 4;
      const idx10 = (y0 * srcWidth + x1) * 4;
      const idx01 = (y1 * srcWidth + x0) * 4;
      const idx11 = (y1 * srcWidth + x1) * 4;

      const r =
        (srcPixels[idx00] * f00 +
          srcPixels[idx10] * f10 +
          srcPixels[idx01] * f01 +
          srcPixels[idx11] * f11) |
        0;
      const g =
        (srcPixels[idx00 + 1] * f00 +
          srcPixels[idx10 + 1] * f10 +
          srcPixels[idx01 + 1] * f01 +
          srcPixels[idx11 + 1] * f11) |
        0;
      const b =
        (srcPixels[idx00 + 2] * f00 +
          srcPixels[idx10 + 2] * f10 +
          srcPixels[idx01 + 2] * f01 +
          srcPixels[idx11 + 2] * f11) |
        0;
      const a =
        (srcPixels[idx00 + 3] * f00 +
          srcPixels[idx10 + 3] * f10 +
          srcPixels[idx01 + 3] * f01 +
          srcPixels[idx11 + 3] * f11) |
        0;

      const dstIdx = (vOffset + u) * 4;
      dstPixels[dstIdx] = r;
      dstPixels[dstIdx + 1] = g;
      dstPixels[dstIdx + 2] = b;
      dstPixels[dstIdx + 3] = a;
    }
  }

  dstCtx.putImageData(dstImgData, 0, 0);
  return dstCanvas;
}
