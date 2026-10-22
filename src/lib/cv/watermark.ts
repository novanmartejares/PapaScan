import { WatermarkOptions } from '@/types';

/**
 * CamScanner Anti-Counterfeit Security Watermark Engine
 * Renders diagonal repeating or single-center watermarks onto document pages.
 */
export async function applySecurityWatermark(
  sourceImageUrl: string,
  options: WatermarkOptions
): Promise<{ processedImageUrl: string; thumbnailUrl: string }> {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = sourceImageUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create canvas 2d context');

  // Draw base document
  ctx.drawImage(img, 0, 0);

  const { text, opacity, color, fontSize, rotation, tile } = options;
  if (!text || !text.trim()) {
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    return { processedImageUrl: dataUrl, thumbnailUrl: dataUrl };
  }

  ctx.save();
  ctx.globalAlpha = Math.max(0.08, Math.min(0.85, opacity));
  ctx.fillStyle = color;
  ctx.font = `bold ${fontSize}px sans-serif, system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const rad = (rotation * Math.PI) / 180;

  if (tile) {
    // Repeating staggered tile across full page
    ctx.rotate(rad);

    // Diagonal dimension coverage
    const diag = Math.hypot(canvas.width, canvas.height);
    const stepX = Math.max(200, fontSize * text.length * 0.9);
    const stepY = Math.max(90, fontSize * 2.8);

    for (let y = -diag; y <= diag * 1.5; y += stepY) {
      const offsetX = (Math.floor(y / stepY) % 2) * (stepX / 2);
      for (let x = -diag; x <= diag * 1.5; x += stepX) {
        ctx.fillText(text.trim().toUpperCase(), x + offsetX, y);
      }
    }
  } else {
    // Single centered large watermark stamp
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(rad);
    ctx.fillText(text.trim().toUpperCase(), 0, 0);
  }

  ctx.restore();

  const processedImageUrl = canvas.toDataURL('image/jpeg', 0.93);

  // Generate thumbnail
  const thumbCanvas = document.createElement('canvas');
  const scale = Math.min(1.0, 320 / Math.max(canvas.width, canvas.height));
  thumbCanvas.width = Math.round(canvas.width * scale);
  thumbCanvas.height = Math.round(canvas.height * scale);
  const thumbCtx = thumbCanvas.getContext('2d');
  if (thumbCtx) {
    thumbCtx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
  }
  const thumbnailUrl = thumbCanvas.toDataURL('image/jpeg', 0.85);

  return { processedImageUrl, thumbnailUrl };
}
