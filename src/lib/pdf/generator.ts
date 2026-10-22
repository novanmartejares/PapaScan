import jsPDF from 'jspdf';
import { ScannedPage, PDFExportOptions } from '@/types';

/**
 * Compresses an image dataUrl or image element to a given quality level
 */
async function compressImage(
  dataUrl: string,
  qualityLevel: 'high' | 'medium' | 'low'
): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let scale = 1.0;
      let q = 0.92;

      if (qualityLevel === 'medium') {
        scale = Math.min(1.0, 1600 / Math.max(img.width, img.height));
        q = 0.75;
      } else if (qualityLevel === 'low') {
        scale = Math.min(1.0, 1000 / Math.max(img.width, img.height));
        q = 0.55;
      }

      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({ dataUrl, width: img.width, height: img.height });
        return;
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const compressedUrl = canvas.toDataURL('image/jpeg', q);
      resolve({ dataUrl: compressedUrl, width: canvas.width, height: canvas.height });
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/**
 * Generates a compiled multi-page PDF from scanned pages
 */
export async function generateMultiPagePDF(
  pages: ScannedPage[],
  options: PDFExportOptions,
  docTitle = 'PapaScan-Document'
): Promise<{ blob: Blob; url: string; filename: string }> {
  if (pages.length === 0) {
    throw new Error('Cannot generate PDF with zero pages');
  }

  // Pre-compress pages according to quality level
  const processedPages = await Promise.all(
    pages.map((p) => compressImage(p.processedImageUrl, options.quality))
  );

  let pdf: jsPDF | null = null;

  for (let i = 0; i < processedPages.length; i++) {
    const { dataUrl, width, height } = processedPages[i];
    const isLandscape = width > height;

    if (options.pageSize === 'auto') {
      // Auto: PDF page matches image aspect ratio exactly
      // Convert pixels to points (72 pt per inch, typical 96/150 dpi)
      const ptWidth = Math.round((width / 96) * 72);
      const ptHeight = Math.round((height / 96) * 72);

      if (i === 0) {
        pdf = new jsPDF({
          orientation: isLandscape ? 'landscape' : 'portrait',
          unit: 'pt',
          format: [ptWidth, ptHeight],
        });
      } else {
        pdf?.addPage([ptWidth, ptHeight], isLandscape ? 'landscape' : 'portrait');
      }

      pdf?.addImage(dataUrl, 'JPEG', 0, 0, ptWidth, ptHeight, undefined, 'FAST');
    } else {
      // Standard A4 or Letter
      const format = options.pageSize === 'letter' ? 'letter' : 'a4';
      const orientation =
        options.orientation === 'auto'
          ? isLandscape
            ? 'landscape'
            : 'portrait'
          : options.orientation;

      if (i === 0) {
        pdf = new jsPDF({
          orientation,
          unit: 'pt',
          format,
        });
      } else {
        pdf?.addPage(format, orientation);
      }

      if (!pdf) continue;

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const margin = options.margin;
      const availWidth = pageWidth - margin * 2;
      const availHeight = pageHeight - margin * 2;

      // Fit image maintaining aspect ratio
      const imgRatio = width / height;
      const availRatio = availWidth / availHeight;

      let drawWidth = availWidth;
      let drawHeight = availHeight;

      if (imgRatio > availRatio) {
        // Limited by width
        drawWidth = availWidth;
        drawHeight = availWidth / imgRatio;
      } else {
        // Limited by height
        drawHeight = availHeight;
        drawWidth = availHeight * imgRatio;
      }

      const posX = margin + (availWidth - drawWidth) / 2;
      const posY = margin + (availHeight - drawHeight) / 2;

      pdf.addImage(dataUrl, 'JPEG', posX, posY, drawWidth, drawHeight, undefined, 'FAST');
    }
  }

  if (!pdf) {
    throw new Error('Failed to create PDF');
  }

  const blob = pdf.output('blob');
  const url = URL.createObjectURL(blob);
  const cleanTitle = docTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${cleanTitle}.pdf`;

  return { blob, url, filename };
}

/**
 * Triggers native mobile sharing if supported, or file download fallback
 */
export async function shareOrDownloadPDF(
  blob: Blob,
  filename: string,
  title: string
): Promise<'shared' | 'downloaded'> {
  const file = new File([blob], filename, { type: 'application/pdf' });

  if (
    typeof navigator !== 'undefined' &&
    navigator.canShare &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({
        files: [file],
        title,
        text: `Scanned document: ${title}`,
      });
      return 'shared';
    } catch (err: unknown) {
      // User cancelled share or share failed; fallback to download
      if ((err as Error)?.name === 'AbortError') {
        return 'shared';
      }
    }
  }

  // Fallback direct download
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return 'downloaded';
}
