import { SignatureOverlayData } from '@/types';

/**
 * Removes background from an uploaded signature photo/scan so only the ink remains transparent.
 * Eliminates paper color, shadows, and uneven notepad lighting with anti-aliased alpha blending.
 */
export function removeSignatureBackground(
  sourceCanvasOrImage: HTMLCanvasElement | HTMLImageElement,
  inkColor: 'original' | 'navy' | 'black' | 'blue' = 'navy',
  sensitivity = 20
): HTMLCanvasElement {
  let srcCanvas: HTMLCanvasElement;
  let srcCtx: CanvasRenderingContext2D;

  if (sourceCanvasOrImage instanceof HTMLCanvasElement) {
    srcCanvas = sourceCanvasOrImage;
    const ctx = srcCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Could not get 2D context');
    srcCtx = ctx;
  } else {
    srcCanvas = document.createElement('canvas');
    srcCanvas.width = sourceCanvasOrImage.naturalWidth || sourceCanvasOrImage.width;
    srcCanvas.height = sourceCanvasOrImage.naturalHeight || sourceCanvasOrImage.height;
    const ctx = srcCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Could not get 2D context');
    srcCtx = ctx;
    srcCtx.drawImage(sourceCanvasOrImage, 0, 0);
  }

  const w = srcCanvas.width;
  const h = srcCanvas.height;
  const imgData = srcCtx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // 1. Analyze paper brightness histogram (find 90th percentile luminance)
  const hist = new Int32Array(256);
  for (let i = 0; i < data.length; i += 4) {
    const luma = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) | 0;
    hist[luma]++;
  }

  let accum = 0;
  const total = w * h;
  let paperWhite = 220;
  for (let i = 255; i >= 0; i--) {
    accum += hist[i];
    if (accum >= total * 0.2) {
      paperWhite = Math.max(180, i);
      break;
    }
  }

  // Thresholds
  const whiteCutoff = Math.max(160, paperWhite - sensitivity);
  const blackCutoff = Math.max(40, whiteCutoff - 90);

  // Target ink RGB
  let targetR = 15;
  let targetG = 23;
  let targetB = 42;

  if (inkColor === 'navy') {
    targetR = 30; targetG = 58; targetB = 138; // #1e3a8a
  } else if (inkColor === 'blue') {
    targetR = 37; targetG = 99; targetB = 235; // #2563eb
  } else if (inkColor === 'black') {
    targetR = 10; targetG = 10; targetB = 10; // #0a0a0a
  }

  // 2. Compute smooth alpha for each pixel
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;

    if (luma >= whiteCutoff) {
      // Background paper -> pure transparent
      data[i + 3] = 0;
    } else if (luma <= blackCutoff) {
      // Solid ink -> full opacity
      data[i + 3] = 255;
      if (inkColor !== 'original') {
        data[i] = targetR;
        data[i + 1] = targetG;
        data[i + 2] = targetB;
      }
    } else {
      // Anti-aliased transition edge
      const t = (whiteCutoff - luma) / (whiteCutoff - blackCutoff);
      data[i + 3] = Math.round(255 * t);
      if (inkColor !== 'original') {
        data[i] = targetR;
        data[i + 1] = targetG;
        data[i + 2] = targetB;
      }
    }
  }

  const outCanvas = document.createElement('canvas');
  outCanvas.width = w;
  outCanvas.height = h;
  const outCtx = outCanvas.getContext('2d');
  if (outCtx) {
    outCtx.putImageData(imgData, 0, 0);
  }
  return outCanvas;
}

/**
 * Permanently burns/stamps a transparent signature overlay onto a document page.
 * Updates both full-resolution page image and thumbnail image.
 */
export async function burnSignatureOntoPage(
  pageImageUrl: string,
  signatureOverlay: SignatureOverlayData
): Promise<{ processedImageUrl: string; thumbnailUrl: string }> {
  return new Promise((resolve, reject) => {
    const baseImg = new Image();
    baseImg.crossOrigin = 'anonymous';

    baseImg.onload = () => {
      const sigImg = new Image();
      sigImg.crossOrigin = 'anonymous';

      sigImg.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = baseImg.width;
        canvas.height = baseImg.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to obtain canvas context'));
          return;
        }

        // Draw base document
        ctx.drawImage(baseImg, 0, 0);

        // Convert percentage coordinates to pixels
        const sigX = (signatureOverlay.x / 100) * canvas.width;
        const sigY = (signatureOverlay.y / 100) * canvas.height;
        const sigW = (signatureOverlay.width / 100) * canvas.width;
        const sigH = (signatureOverlay.height / 100) * canvas.height;

        // Draw transformed signature
        ctx.save();
        ctx.translate(sigX + sigW / 2, sigY + sigH / 2);
        if (signatureOverlay.rotation) {
          ctx.rotate((signatureOverlay.rotation * Math.PI) / 180);
        }
        ctx.drawImage(sigImg, -sigW / 2, -sigH / 2, sigW, sigH);
        ctx.restore();

        const processedImageUrl = canvas.toDataURL('image/jpeg', 0.94);

        // Thumbnail
        const thumbCanvas = document.createElement('canvas');
        const thumbScale = Math.min(1.0, 320 / Math.max(canvas.width, canvas.height));
        thumbCanvas.width = Math.round(canvas.width * thumbScale);
        thumbCanvas.height = Math.round(canvas.height * thumbScale);
        const thumbCtx = thumbCanvas.getContext('2d');
        if (thumbCtx) {
          thumbCtx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
        }
        const thumbnailUrl = thumbCanvas.toDataURL('image/jpeg', 0.85);

        resolve({ processedImageUrl, thumbnailUrl });
      };

      sigImg.onerror = reject;
      sigImg.src = signatureOverlay.dataUrl;
    };

    baseImg.onerror = reject;
    baseImg.src = pageImageUrl;
  });
}
