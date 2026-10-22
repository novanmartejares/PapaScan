import { RedactionArea } from '@/types';

/**
 * CamScanner Document Redaction & Whiteout Eraser Engine
 * Permanently erases or blackouts sensitive data from document pages.
 */
export async function applyDocumentRedactions(
  sourceImageUrl: string,
  redactions: RedactionArea[]
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

  // Draw base page
  ctx.drawImage(img, 0, 0);

  if (redactions.length === 0) {
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    return { processedImageUrl: dataUrl, thumbnailUrl: dataUrl };
  }

  redactions.forEach((r) => {
    ctx.save();
    if (r.style === 'whiteout') {
      // Clean paper whiteout
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(r.x, r.y, r.width, r.height);

      // Subtle edge blending
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 1;
      ctx.strokeRect(r.x, r.y, r.width, r.height);
    } else {
      // Security Blackout Bar
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(r.x, r.y, r.width, r.height);

      // Add "REDACTED" text if the box is wide enough
      if (r.width > 65 && r.height > 16) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('REDACTED', r.x + r.width / 2, r.y + r.height / 2);
      }
    }
    ctx.restore();
  });

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
