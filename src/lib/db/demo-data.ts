import { ScannedDocument, ScannedPage } from '@/types';

/**
 * Creates high-resolution realistic canvas-rendered sample document images
 * so PapaScan has rich demo documents out-of-the-box.
 */
function createReceiptCanvas(): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 880;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Paper background with warm subtle texture
  ctx.fillStyle = '#fbfbfa';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle border / shadow
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

  // Header
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 24px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('PAPA BISTRO & CO.', 300, 60);

  ctx.font = '14px monospace';
  ctx.fillStyle = '#475569';
  ctx.fillText('108 Ocean Boulevard, Harbour City', 300, 85);
  ctx.fillText('Tel: (555) 727-2722 | Tax ID: US-992144', 300, 105);

  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(30, 130);
  ctx.lineTo(570, 130);
  ctx.stroke();
  ctx.setLineDash([]);

  // Meta
  ctx.textAlign = 'left';
  ctx.font = '13px monospace';
  ctx.fillStyle = '#334155';
  ctx.fillText('RECEIPT #: PB-882910', 40, 160);
  ctx.fillText('DATE: Oct 22, 2026  12:45 PM', 40, 185);
  ctx.fillText('SERVER: Sarah K. (Table 4)', 40, 210);

  ctx.beginPath();
  ctx.moveTo(30, 230);
  ctx.lineTo(570, 230);
  ctx.stroke();

  // Line items
  const items = [
    { qty: '2x', name: 'Smoked Salmon Benedict', price: '$36.00' },
    { qty: '1x', name: 'Artisan Sourdough Toast', price: '$8.50' },
    { qty: '2x', name: 'Iced Pistachio Latte', price: '$14.00' },
    { qty: '1x', name: 'Cold Pressed Orange Juice', price: '$7.50' },
    { qty: '1x', name: 'House Berry Tartlet', price: '$9.00' }
  ];

  let y = 270;
  ctx.font = 'bold 13px monospace';
  ctx.fillText('QTY  DESCRIPTION', 40, y);
  ctx.textAlign = 'right';
  ctx.fillText('AMOUNT', 560, y);
  ctx.textAlign = 'left';

  y += 20;
  ctx.font = '13px monospace';

  items.forEach(item => {
    y += 28;
    ctx.fillText(`${item.qty}  ${item.name}`, 40, y);
    ctx.textAlign = 'right';
    ctx.fillText(item.price, 560, y);
    ctx.textAlign = 'left';
  });

  y += 40;
  ctx.beginPath();
  ctx.setLineDash([4, 4]);
  ctx.moveTo(30, y);
  ctx.lineTo(570, y);
  ctx.stroke();
  ctx.setLineDash([]);

  // Subtotal, Tax, Total
  y += 30;
  ctx.fillText('Subtotal:', 340, y);
  ctx.textAlign = 'right';
  ctx.fillText('$75.00', 560, y);
  ctx.textAlign = 'left';

  y += 25;
  ctx.fillText('State Tax (8.25%):', 340, y);
  ctx.textAlign = 'right';
  ctx.fillText('$6.19', 560, y);
  ctx.textAlign = 'left';

  y += 35;
  ctx.font = 'bold 18px monospace';
  ctx.fillText('TOTAL DUE:', 340, y);
  ctx.textAlign = 'right';
  ctx.fillText('$81.19', 560, y);
  ctx.textAlign = 'left';

  // Payment footer
  y += 50;
  ctx.font = '12px monospace';
  ctx.fillStyle = '#64748b';
  ctx.textAlign = 'center';
  ctx.fillText('PAID WITH APPLE PAY (VISA •••• 4421)', 300, y);
  ctx.fillText('AUTH CODE: 928371 | TRANSACTION APPROVED', 300, y + 20);

  // Barcode representation
  y += 55;
  const barcodeWidth = 360;
  const barcodeX = 120;
  for (let b = 0; b < barcodeWidth; b += 4) {
    const isBar = (b * 7 + 13) % 11 > 3;
    if (isBar) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(barcodeX + b, y, (b % 5 === 0 ? 3 : 2), 45);
    }
  }

  y += 65;
  ctx.font = '11px monospace';
  ctx.fillStyle = '#64748b';
  ctx.fillText('* THANK YOU FOR DINING WITH US *', 300, y);

  return canvas.toDataURL('image/jpeg', 0.92);
}

function createContractCanvas(): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 650;
  canvas.height = 920;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 20px serif';
  ctx.textAlign = 'center';
  ctx.fillText('NON-DISCLOSURE AGREEMENT', 325, 70);

  ctx.font = 'italic 12px serif';
  ctx.fillStyle = '#475569';
  ctx.fillText('Standard Mutual Confidentiality Terms - Version 3.4', 325, 95);

  ctx.textAlign = 'left';
  ctx.font = '13px serif';
  ctx.fillStyle = '#1e293b';

  const paragraphs = [
    'This Mutual Non-Disclosure Agreement ("Agreement") is made effective as of October 2026, by and between Novan Digital Technologies Inc. ("Disclosing Party") and Strategic Ventures Corp ("Receiving Party").',
    '1. Confidential Information: All technical documents, software source code, specifications, and business plans exchanged between the parties shall be deemed strictly proprietary.',
    '2. Standard of Care: The Receiving Party agrees to protect the Confidential Information using the same degree of care it uses for its own confidential assets of like importance, but not less than reasonable care.',
    '3. Term and Termination: Obligations of confidentiality shall survive for three (3) years from the date of final signature, unless extended by mutual written consent.'
  ];

  let y = 145;
  paragraphs.forEach(p => {
    // Word wrap simple
    const words = p.split(' ');
    let line = '';
    for (const w of words) {
      const testLine = line + w + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > 550) {
        ctx.fillText(line, 50, y);
        line = w + ' ';
        y += 22;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, 50, y);
    y += 35;
  });

  // Signatures
  y = 700;
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('FOR DISCLOSING PARTY:', 50, y);
  ctx.fillText('FOR RECEIVING PARTY:', 360, y);

  y += 50;
  // Signatures scribble
  ctx.strokeStyle = '#1e3a8a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(50, y);
  ctx.bezierCurveTo(90, y - 25, 120, y + 15, 170, y - 10);
  ctx.bezierCurveTo(190, y - 20, 210, y + 5, 230, y);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(360, y);
  ctx.bezierCurveTo(400, y - 30, 440, y + 10, 480, y - 15);
  ctx.bezierCurveTo(510, y - 5, 530, y + 2, 550, y);
  ctx.stroke();

  y += 20;
  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('Authorized Signature: Dr. Novan V.', 50, y);
  ctx.fillText('Authorized Signature: Marcus Sterling', 360, y);

  y += 20;
  ctx.fillText('Title: Chief Executive Officer', 50, y);
  ctx.fillText('Title: Managing Director', 360, y);

  // Official Stamp
  ctx.save();
  ctx.translate(280, 820);
  ctx.rotate(-0.15);
  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 3;
  ctx.strokeRect(-60, -25, 120, 50);
  ctx.font = 'bold 14px sans-serif';
  ctx.fillStyle = '#dc2626';
  ctx.textAlign = 'center';
  ctx.fillText('EXECUTED', 0, -2);
  ctx.font = '10px sans-serif';
  ctx.fillText('OFFICIAL COPY', 0, 14);
  ctx.restore();

  return canvas.toDataURL('image/jpeg', 0.92);
}

function createIDCardCanvas(): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 420;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // ID Card gradient background
  const grad = ctx.createLinearGradient(0, 0, 640, 420);
  grad.addColorStop(0, '#1e293b');
  grad.addColorStop(1, '#0f172a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Hologram strip
  const holo = ctx.createLinearGradient(0, 0, 0, 420);
  holo.addColorStop(0, 'rgba(56, 189, 248, 0.4)');
  holo.addColorStop(0.5, 'rgba(168, 85, 247, 0.4)');
  holo.addColorStop(1, 'rgba(34, 197, 94, 0.4)');
  ctx.fillStyle = holo;
  ctx.fillRect(15, 0, 20, 420);

  // Header
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('GLOBAL TECH IDENTITY CARD', 60, 45);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px sans-serif';
  ctx.fillText('SECURE ACCESS CREDENTIAL • LEVEL 4 CLEARANCE', 60, 65);

  // Photo box
  ctx.fillStyle = '#334155';
  ctx.fillRect(60, 95, 140, 180);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;
  ctx.strokeRect(60, 95, 140, 180);

  // Avatar placeholder drawing
  ctx.fillStyle = '#64748b';
  ctx.beginPath();
  ctx.arc(130, 160, 35, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(130, 250, 60, Math.PI, Math.PI * 2);
  ctx.fill();

  // Name & details
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('NOVAN VALENTINE', 230, 130);

  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('ROLE / TITLE:', 230, 165);
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('Principal Systems Architect', 230, 185);

  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('ID NUMBER:', 230, 220);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 14px monospace';
  ctx.fillText('NV-902-88194', 230, 240);

  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('EXPIRES:', 420, 220);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 14px monospace';
  ctx.fillText('10/2030', 420, 240);

  // Smart chip graphic
  ctx.fillStyle = '#eab308';
  ctx.fillRect(230, 290, 55, 42);
  ctx.strokeStyle = '#a16207';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(230, 290, 55, 42);

  // Magnetic barcode
  for (let i = 0; i < 300; i += 5) {
    if ((i * 3 + 7) % 8 > 2) {
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(310 + i, 300, 3, 30);
    }
  }

  return canvas.toDataURL('image/jpeg', 0.92);
}

export function generateInitialDemoDocuments(): ScannedDocument[] {
  if (typeof window === 'undefined') return [];

  const receiptUrl = createReceiptCanvas();
  const contractUrl = createContractCanvas();
  const idCardUrl = createIDCardCanvas();

  const now = Date.now();

  const receiptDoc: ScannedDocument = {
    id: 'doc-receipt-demo',
    title: 'Bistro Lunch & Coffee Receipt',
    category: 'Receipts',
    tags: ['Dining', 'Expenses', 'Food'],
    createdAt: now - 1000 * 60 * 60 * 2, // 2 hours ago
    updatedAt: now - 1000 * 60 * 60 * 2,
    starred: true,
    pages: [
      {
        id: 'p-receipt-1',
        originalImageUrl: receiptUrl,
        processedImageUrl: receiptUrl,
        thumbnailUrl: receiptUrl,
        corners: [
          { x: 30, y: 20 },
          { x: 570, y: 20 },
          { x: 570, y: 860 },
          { x: 30, y: 860 }
        ],
        rotation: 0,
        filter: 'magic',
        ocrText: `PAPA BISTRO & CO.\n108 Ocean Boulevard, Harbour City\nRECEIPT #: PB-882910\nDATE: Oct 22, 2026 12:45 PM\nSERVER: Sarah K. (Table 4)\n\n2x Smoked Salmon Benedict $36.00\n1x Artisan Sourdough Toast $8.50\n2x Iced Pistachio Latte $14.00\n1x Cold Pressed Orange Juice $7.50\n1x House Berry Tartlet $9.00\n\nSubtotal: $75.00\nState Tax (8.25%): $6.19\nTOTAL DUE: $81.19\n\nPAID WITH APPLE PAY (VISA •••• 4421)\nAUTH CODE: 928371`,
        width: 600,
        height: 880
      }
    ]
  };

  const contractDoc: ScannedDocument = {
    id: 'doc-contract-demo',
    title: 'Strategic NDA Mutual Agreement',
    category: 'Contracts',
    tags: ['Legal', 'NDA', 'Signed'],
    createdAt: now - 1000 * 60 * 60 * 24 * 3, // 3 days ago
    updatedAt: now - 1000 * 60 * 60 * 24 * 1,
    starred: true,
    pages: [
      {
        id: 'p-contract-1',
        originalImageUrl: contractUrl,
        processedImageUrl: contractUrl,
        thumbnailUrl: contractUrl,
        corners: [
          { x: 20, y: 20 },
          { x: 630, y: 20 },
          { x: 630, y: 900 },
          { x: 20, y: 900 }
        ],
        rotation: 0,
        filter: 'magic',
        ocrText: `NON-DISCLOSURE AGREEMENT\nStandard Mutual Confidentiality Terms - Version 3.4\n\nThis Mutual Non-Disclosure Agreement ("Agreement") is made effective as of October 2026, by and between Novan Digital Technologies Inc. ("Disclosing Party") and Strategic Ventures Corp ("Receiving Party").\n\n1. Confidential Information: All technical documents, software source code, specifications, and business plans exchanged shall be deemed strictly proprietary.\n\n2. Standard of Care: The Receiving Party agrees to protect the Confidential Information using reasonable care.\n\nAuthorized Signature: Dr. Novan V. (CEO)\nAuthorized Signature: Marcus Sterling (Managing Director)\nEXECUTED OFFICIAL COPY`,
        width: 650,
        height: 920
      }
    ]
  };

  const idDoc: ScannedDocument = {
    id: 'doc-id-demo',
    title: 'Global Tech Employee ID Card',
    category: 'IDs',
    tags: ['Work', 'Identity', 'Badge'],
    createdAt: now - 1000 * 60 * 60 * 24 * 8, // 8 days ago
    updatedAt: now - 1000 * 60 * 60 * 24 * 8,
    starred: false,
    pages: [
      {
        id: 'p-id-1',
        originalImageUrl: idCardUrl,
        processedImageUrl: idCardUrl,
        thumbnailUrl: idCardUrl,
        corners: [
          { x: 20, y: 15 },
          { x: 620, y: 15 },
          { x: 620, y: 405 },
          { x: 20, y: 405 }
        ],
        rotation: 0,
        filter: 'magic',
        ocrText: `GLOBAL TECH IDENTITY CARD\nSECURE ACCESS CREDENTIAL • LEVEL 4 CLEARANCE\n\nNOVAN VALENTINE\nROLE: Principal Systems Architect\nID NUMBER: NV-902-88194\nEXPIRES: 10/2030`,
        width: 640,
        height: 420
      }
    ]
  };

  return [receiptDoc, contractDoc, idDoc];
}
