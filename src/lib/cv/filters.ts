import { FilterType } from '@/types';

/**
 * Creates a new canvas clone
 */
export function cloneCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = source.width;
  c.height = source.height;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.drawImage(source, 0, 0);
  }
  return c;
}

/**
 * Rotates a canvas by 90, 180, or 270 degrees clockwise
 */
export function rotateCanvas(source: HTMLCanvasElement, angle: 90 | 180 | 270): HTMLCanvasElement {
  const result = document.createElement('canvas');
  const ctx = result.getContext('2d');
  if (!ctx) return source;

  if (angle === 90) {
    result.width = source.height;
    result.height = source.width;
    ctx.translate(result.width, 0);
    ctx.rotate((90 * Math.PI) / 180);
  } else if (angle === 180) {
    result.width = source.width;
    result.height = source.height;
    ctx.translate(result.width, result.height);
    ctx.rotate((180 * Math.PI) / 180);
  } else if (angle === 270) {
    result.width = source.height;
    result.height = source.width;
    ctx.translate(0, result.height);
    ctx.rotate((270 * Math.PI) / 180);
  }

  ctx.drawImage(source, 0, 0);
  return result;
}

/**
 * Bradley-Roth Adaptive Thresholding using Integral Image (O(N) performance).
 * Removes lighting unevenness, camera shadows, and produces crisp B&W text.
 */
export function applyCrispBW(source: HTMLCanvasElement, sensitivity = 12): HTMLCanvasElement {
  const canvas = cloneCanvas(source);
  const ctx = canvas.getContext('2d');
  if (!ctx) return source;

  const w = canvas.width;
  const h = canvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // 1. Grayscale luminance
  const gray = new Uint8Array(w * h);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    gray[j] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
  }

  // 2. Compute 2D Integral Image (summed area table)
  // Float64 or Uint32 (Uint32 can hold up to 255 * 4000 * 4000 = 4 billion, Uint32 is safe)
  const integral = new Float64Array(w * h);
  for (let x = 0; x < w; x++) {
    let colSum = 0;
    for (let y = 0; y < h; y++) {
      colSum += gray[y * w + x];
      if (x === 0) {
        integral[y * w + x] = colSum;
      } else {
        integral[y * w + x] = integral[y * w + (x - 1)] + colSum;
      }
    }
  }

  // 3. Adaptive thresholding window size (typically 1/8 to 1/16 of width)
  const s = Math.max(16, Math.round(w / 16));
  const sHalf = Math.floor(s / 2);
  const t = (100 - sensitivity) / 100;

  for (let y = 0; y < h; y++) {
    const y1 = Math.max(0, y - sHalf);
    const y2 = Math.min(h - 1, y + sHalf);

    for (let x = 0; x < w; x++) {
      const x1 = Math.max(0, x - sHalf);
      const x2 = Math.min(w - 1, x + sHalf);

      const count = (x2 - x1 + 1) * (y2 - y1 + 1);

      // Sum from integral image
      const a = y1 > 0 && x1 > 0 ? integral[(y1 - 1) * w + (x1 - 1)] : 0;
      const b = y1 > 0 ? integral[(y1 - 1) * w + x2] : 0;
      const c = x1 > 0 ? integral[y2 * w + (x1 - 1)] : 0;
      const d = integral[y2 * w + x2];

      const sum = d - b - c + a;
      const avg = sum / count;

      const idx = (y * w + x) * 4;
      const val = gray[y * w + x];

      // Binarize
      const outputVal = val <= avg * t ? 0 : 255;
      data[idx] = outputVal;
      data[idx + 1] = outputVal;
      data[idx + 2] = outputVal;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/**
 * Magic Color: Normalizes paper background to clean white while boosting ink saturation and sharpness.
 */
export function applyMagicColor(source: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = cloneCanvas(source);
  const ctx = canvas.getContext('2d');
  if (!ctx) return source;

  const w = canvas.width;
  const h = canvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // Step 1: Calculate luminance histogram to find paper background level (90th-95th percentile)
  const hist = new Int32Array(256);
  for (let i = 0; i < data.length; i += 4) {
    const luma = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) | 0;
    hist[luma]++;
  }

  const totalPixels = w * h;
  let accum = 0;
  let whitePoint = 230;
  let blackPoint = 30;

  for (let i = 0; i < 256; i++) {
    accum += hist[i];
    if (accum >= totalPixels * 0.04 && blackPoint === 30) {
      blackPoint = i;
    }
    if (accum >= totalPixels * 0.94) {
      whitePoint = Math.max(i, 200);
      break;
    }
  }

  const range = Math.max(whitePoint - blackPoint, 50);

  // Step 2: Levels stretch and saturation enhancement
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Contrast stretch per channel
    r = Math.min(255, Math.max(0, ((r - blackPoint) / range) * 255));
    g = Math.min(255, Math.max(0, ((g - blackPoint) / range) * 255));
    b = Math.min(255, Math.max(0, ((b - blackPoint) / range) * 255));

    // Slight saturation boost for colored stamps/signatures
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    const satBoost = 1.25;
    r = Math.min(255, Math.max(0, gray + (r - gray) * satBoost));
    g = Math.min(255, Math.max(0, gray + (g - gray) * satBoost));
    b = Math.min(255, Math.max(0, gray + (b - gray) * satBoost));

    // High brightness normalization: if near white, push to clean white
    if (gray > 220) {
      const t = (gray - 220) / 35;
      r = r * (1 - t) + 255 * t;
      g = g * (1 - t) + 255 * t;
      b = b * (1 - t) + 255 * t;
    }

    data[i] = r | 0;
    data[i + 1] = g | 0;
    data[i + 2] = b | 0;
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/**
 * Clean Grayscale with contrast curve
 */
export function applyGrayscale(source: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = cloneCanvas(source);
  const ctx = canvas.getContext('2d');
  if (!ctx) return source;

  const w = canvas.width;
  const h = canvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    const luma = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    // Contrast S-curve
    const normalized = luma / 255;
    const enhanced = normalized < 0.5
      ? 2 * normalized * normalized
      : 1 - 2 * (1 - normalized) * (1 - normalized);
    const finalVal = Math.min(255, Math.max(0, enhanced * 255));

    data[i] = finalVal;
    data[i + 1] = finalVal;
    data[i + 2] = finalVal;
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/**
 * CamScanner Signature "No Shadow" (Shadow Removal & Illumination Equalizer)
 * Estimates 2D background paper illumination surface and normalizes local lighting,
 * eliminating harsh phone, hand, and ceiling lamp shadows while preserving ink & stamps.
 */
export function applyNoShadow(source: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = cloneCanvas(source);
  const ctx = canvas.getContext('2d');
  if (!ctx) return source;

  const w = canvas.width;
  const h = canvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // 1. Grid-based local paper background estimation (16x16 blocks)
  const BLOCK_SIZE = Math.max(16, Math.min(48, Math.round(Math.min(w, h) / 20)));
  const gridCols = Math.ceil(w / BLOCK_SIZE);
  const gridRows = Math.ceil(h / BLOCK_SIZE);
  const bgGrid = new Float32Array(gridCols * gridRows);

  for (let gy = 0; gy < gridRows; gy++) {
    const yStart = gy * BLOCK_SIZE;
    const yEnd = Math.min(h, yStart + BLOCK_SIZE);

    for (let gx = 0; gx < gridCols; gx++) {
      const xStart = gx * BLOCK_SIZE;
      const xEnd = Math.min(w, xStart + BLOCK_SIZE);

      // Collect luminance samples in block
      const lumaSamples: number[] = [];
      for (let y = yStart; y < yEnd; y += 2) {
        const row = y * w;
        for (let x = xStart; x < xEnd; x += 2) {
          const idx = (row + x) * 4;
          const luma = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
          lumaSamples.push(luma);
        }
      }

      // Local background is high percentile (paper without ink)
      if (lumaSamples.length > 0) {
        lumaSamples.sort((a, b) => a - b);
        // 88th percentile
        const pIdx = Math.min(lumaSamples.length - 1, Math.floor(lumaSamples.length * 0.88));
        bgGrid[gy * gridCols + gx] = Math.max(40, lumaSamples[pIdx]);
      } else {
        bgGrid[gy * gridCols + gx] = 200;
      }
    }
  }

  // 2. Normalize full image against smooth interpolated background illumination
  for (let y = 0; y < h; y++) {
    // Vertical interpolation weight
    const gyExact = y / BLOCK_SIZE;
    const gy0 = Math.min(gridRows - 1, Math.floor(gyExact));
    const gy1 = Math.min(gridRows - 1, gy0 + 1);
    const ty = gyExact - gy0;

    const rowOffset = y * w * 4;

    for (let x = 0; x < w; x++) {
      // Horizontal interpolation weight
      const gxExact = x / BLOCK_SIZE;
      const gx0 = Math.min(gridCols - 1, Math.floor(gxExact));
      const gx1 = Math.min(gridCols - 1, gx0 + 1);
      const tx = gxExact - gx0;

      // Bilinear sample of local illumination
      const top = bgGrid[gy0 * gridCols + gx0] * (1 - tx) + bgGrid[gy0 * gridCols + gx1] * tx;
      const bottom = bgGrid[gy1 * gridCols + gx0] * (1 - tx) + bgGrid[gy1 * gridCols + gx1] * tx;
      const localBg = Math.max(35, top * (1 - ty) + bottom * ty);

      const scale = 250 / localBg;
      const idx = rowOffset + x * 4;

      let r = data[idx] * scale;
      let g = data[idx + 1] * scale;
      let b = data[idx + 2] * scale;

      const luma = 0.299 * r + 0.587 * g + 0.114 * b;

      // Clean paper whitening
      if (luma > 218) {
        const factor = (luma - 218) / 37;
        r = r * (1 - factor) + 255 * factor;
        g = g * (1 - factor) + 255 * factor;
        b = b * (1 - factor) + 255 * factor;
      } else if (luma < 95) {
        // Deepen text ink
        const factor = luma / 95;
        r = r * factor;
        g = g * factor;
        b = b * factor;
      }

      data[idx] = Math.min(255, Math.max(0, r | 0));
      data[idx + 1] = Math.min(255, Math.max(0, g | 0));
      data[idx + 2] = Math.min(255, Math.max(0, b | 0));
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/**
 * Filter dispatch helper
 */
export function applyFilter(source: HTMLCanvasElement, filter: FilterType): HTMLCanvasElement {
  switch (filter) {
    case 'magic':
      return applyMagicColor(source);
    case 'noshadow':
      return applyNoShadow(source);
    case 'bw':
      return applyCrispBW(source);
    case 'grayscale':
      return applyGrayscale(source);
    case 'original':
    default:
      return cloneCanvas(source);
  }
}
