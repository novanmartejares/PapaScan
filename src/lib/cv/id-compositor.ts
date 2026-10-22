/**
 * Composites Front and Back ID cards onto a single standard A4 document page.
 * Creates an official-style 2-sided ID photocopy suitable for printing and PDF export.
 */
export async function compositeIDCardsToA4Page(
  frontImageUrl: string,
  backImageUrl: string,
  documentTitle = 'ID Card Copy'
): Promise<{ processedImageUrl: string; thumbnailUrl: string; width: number; height: number }> {
  // Load both images
  const [frontImg, backImg] = await Promise.all([
    loadImage(frontImageUrl),
    loadImage(backImageUrl),
  ]);

  // Standard A4 Canvas at 150 DPI: 1240 x 1754 pixels
  const a4Width = 1240;
  const a4Height = 1754;

  const canvas = document.createElement('canvas');
  canvas.width = a4Width;
  canvas.height = a4Height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create A4 canvas context');

  // 1. Crisp white paper background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, a4Width, a4Height);

  // Subtle clean document border
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(40, 40, a4Width - 80, a4Height - 80);

  // 2. Official Header
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('IDENTIFICATION CREDENTIAL COPY', a4Width / 2, 95);

  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#64748b';
  const dateStr = new Date().toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  ctx.fillText(`DUAL-SIDED CARD VERIFICATION RECORD • SCANNED ON ${dateStr.toUpperCase()}`, a4Width / 2, 125);

  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(80, 145);
  ctx.lineTo(a4Width - 80, 145);
  ctx.stroke();

  // 3. Card placement geometry
  // Standard ID-1 card aspect ratio: 85.6mm x 53.98mm = 1.586
  const targetCardWidth = 840;
  const targetCardHeight = Math.round(targetCardWidth / 1.586); // ~530px
  const cardX = (a4Width - targetCardWidth) / 2;

  // Vertical placement: Front at y=230, Back at y=950
  const frontY = 220;
  const backY = 940;

  // Draw Card Helper
  const drawCard = (img: HTMLImageElement, x: number, y: number, label: string) => {
    // Card Label Header
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, x + 4, y - 14);

    // Subtle drop shadow
    ctx.save();
    ctx.shadowColor = 'rgba(15, 23, 42, 0.15)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 10;

    // Card background clipping path with rounded corners (r=18px)
    const r = 18;
    ctx.beginPath();
    ctx.roundRect(x, y, targetCardWidth, targetCardHeight, r);
    ctx.fillStyle = '#f8fafc';
    ctx.fill();
    ctx.restore();

    // Clip & draw card image
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, targetCardWidth, targetCardHeight, r);
    ctx.clip();

    ctx.drawImage(img, x, y, targetCardWidth, targetCardHeight);

    // Subtle inner border
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  };

  // Draw Front Card
  drawCard(frontImg, cardX, frontY, 'FRONT SIDE');

  // Subtle separator line
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(120, 840);
  ctx.lineTo(a4Width - 120, 840);
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw Back Card
  drawCard(backImg, cardX, backY, 'BACK SIDE');

  // 4. Footer & Security Watermark
  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PapaScan Document Engine • 100% On-Device Offline Privacy • ISO/IEC 7810 ID-1 Standard Compliant', a4Width / 2, 1640);

  // Corner Registration Marks (Photocopy Alignment Marks)
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1;
  const markLen = 20;

  // Top-Left
  ctx.beginPath();
  ctx.moveTo(50, 60); ctx.lineTo(50 + markLen, 60);
  ctx.moveTo(60, 50); ctx.lineTo(60, 50 + markLen);
  ctx.stroke();

  // Top-Right
  ctx.beginPath();
  ctx.moveTo(a4Width - 50, 60); ctx.lineTo(a4Width - 50 - markLen, 60);
  ctx.moveTo(a4Width - 60, 50); ctx.lineTo(a4Width - 60, 50 + markLen);
  ctx.stroke();

  // Bottom-Left
  ctx.beginPath();
  ctx.moveTo(50, a4Height - 60); ctx.lineTo(50 + markLen, a4Height - 60);
  ctx.moveTo(60, a4Height - 50); ctx.lineTo(60, a4Height - 50 - markLen);
  ctx.stroke();

  // Bottom-Right
  ctx.beginPath();
  ctx.moveTo(a4Width - 50, a4Height - 60); ctx.lineTo(a4Width - 50 - markLen, a4Height - 60);
  ctx.moveTo(a4Width - 60, a4Height - 50); ctx.lineTo(a4Width - 60, a4Height - 50 - markLen);
  ctx.stroke();

  // Generate outputs
  const processedImageUrl = canvas.toDataURL('image/jpeg', 0.94);

  // Thumbnail
  const thumbCanvas = document.createElement('canvas');
  const thumbScale = 320 / Math.max(a4Width, a4Height);
  thumbCanvas.width = Math.round(a4Width * thumbScale);
  thumbCanvas.height = Math.round(a4Height * thumbScale);
  const thumbCtx = thumbCanvas.getContext('2d');
  if (thumbCtx) {
    thumbCtx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
  }
  const thumbnailUrl = thumbCanvas.toDataURL('image/jpeg', 0.85);

  return {
    processedImageUrl,
    thumbnailUrl,
    width: a4Width,
    height: a4Height,
  };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
