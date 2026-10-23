import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function testChallengingBackgrounds() {
  const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: true });
  const page = await browser.newPage();

  const testResults = await page.evaluate(() => {
    function fitLineRansac(points, isVertical, dimLimit, maxIterations = 60, threshold = 3.5) {
      if (points.length < 4) return null;
      let bestLine = null;
      let maxInliers = 0;
      let bestInlierIndices = [];

      for (let iter = 0; iter < maxIterations; iter++) {
        const i1 = Math.floor(Math.random() * points.length);
        let i2 = Math.floor(Math.random() * points.length);
        if (i1 === i2) continue;

        const p1 = points[i1];
        const p2 = points[i2];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.hypot(dx, dy);

        if (dist < dimLimit * 0.10) continue;

        if (isVertical) {
          if (Math.abs(dy) < 5 || Math.abs(dx / dy) > 0.75) continue;
        } else {
          if (Math.abs(dx) < 5 || Math.abs(dy / dx) > 0.75) continue;
        }

        const a = -dy / dist;
        const b = dx / dist;
        const c = -(a * p1.x + b * p1.y);

        let inlierCount = 0;
        const inliers = [];

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

      const inlierPoints = bestInlierIndices.map((idx) => points[idx]);
      if (isVertical) {
        let sumY = 0, sumX = 0, sumYY = 0, sumYX = 0;
        const n = inlierPoints.length;
        for (const pt of inlierPoints) {
          sumY += pt.y; sumX += pt.x; sumYY += pt.y * pt.y; sumYX += pt.y * pt.x;
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
          sumX += pt.x; sumY += pt.y; sumXX += pt.x * pt.x; sumXY += pt.x * pt.y;
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

    function intersectLines(l1, l2) {
      const d = l1.a * l2.b - l2.a * l1.b;
      if (Math.abs(d) < 1e-4) return null;
      return {
        x: (l1.b * l2.c - l2.b * l1.c) / d,
        y: (l2.a * l1.c - l1.a * l2.c) / d,
      };
    }

    function runDetection(canvas) {
      const W = canvas.width, H = canvas.height;
      const MAX_DIM = 360;
      const scale = Math.min(1.0, MAX_DIM / Math.max(W, H));
      const detW = Math.round(W * scale);
      const detH = Math.round(H * scale);

      const detCanvas = document.createElement('canvas');
      detCanvas.width = detW;
      detCanvas.height = detH;
      const detCtx = detCanvas.getContext('2d');
      detCtx.drawImage(canvas, 0, 0, detW, detH);

      const imgData = detCtx.getImageData(0, 0, detW, detH);
      const d = imgData.data;
      const total = detW * detH;

      const luma = new Uint8Array(total);
      const chroma = new Uint8Array(total);
      const paperScore = new Uint8Array(total);

      for (let i = 0, p = 0; i < d.length; i += 4, p++) {
        const r = d[i], g = d[i + 1], b = d[i + 2];
        const yVal = (0.299 * r + 0.587 * g + 0.114 * b) | 0;
        const cDiff = Math.max(Math.abs(r - g), Math.abs(r - b), Math.abs(g - b));
        const neutrality = Math.max(0, 255 - 4 * cDiff);
        luma[p] = yVal;
        chroma[p] = cDiff;
        paperScore[p] = ((yVal * 0.55) + (neutrality * 0.45)) | 0;
      }

      // Sobel
      const grad = new Uint8Array(total);
      for (let y = 1; y < detH - 1; y++) {
        const row = y * detW;
        for (let x = 1; x < detW - 1; x++) {
          const idx = row + x;
          const gx = Math.abs(luma[idx + 1] - luma[idx - 1]) + Math.abs(chroma[idx + 1] - chroma[idx - 1]);
          const gy = Math.abs(luma[idx + detW] - luma[idx - detW]) + Math.abs(chroma[idx + detW] - chroma[idx - detW]);
          grad[idx] = Math.min(255, gx + gy);
        }
      }

      const NUM_RAYS = 25;
      const topPts = [];
      const botPts = [];
      const leftPts = [];
      const rightPts = [];

      // Top scan down
      for (let r = 1; r <= NUM_RAYS; r++) {
        const x = Math.round((detW * (r + 1)) / (NUM_RAYS + 3));
        let bestY = -1;
        let bestVal = 18;

        for (let y = 3; y < Math.round(detH * 0.48); y++) {
          const idx = y * detW + x;
          const g = grad[idx];
          if (g > bestVal) {
            const innerIdx = (y + 4) * detW + x;
            if (innerIdx < total && paperScore[innerIdx] >= paperScore[idx] - 12) {
              bestVal = g;
              bestY = y;
            }
          }
        }
        if (bestY !== -1) topPts.push({ x, y: bestY });
      }

      // Bottom scan up
      for (let r = 1; r <= NUM_RAYS; r++) {
        const x = Math.round((detW * (r + 1)) / (NUM_RAYS + 3));
        let bestY = -1;
        let bestVal = 18;

        for (let y = detH - 4; y > Math.round(detH * 0.52); y--) {
          const idx = y * detW + x;
          const g = grad[idx];
          if (g > bestVal) {
            const innerIdx = (y - 4) * detW + x;
            if (innerIdx >= 0 && paperScore[innerIdx] >= paperScore[idx] - 12) {
              bestVal = g;
              bestY = y;
            }
          }
        }
        if (bestY !== -1) botPts.push({ x, y: bestY });
      }

      // Left scan right
      for (let r = 1; r <= NUM_RAYS; r++) {
        const y = Math.round((detH * (r + 1)) / (NUM_RAYS + 3));
        const row = y * detW;
        let bestX = -1;
        let bestVal = 18;

        for (let x = 3; x < Math.round(detW * 0.48); x++) {
          const idx = row + x;
          const g = grad[idx];
          if (g > bestVal) {
            const innerIdx = row + x + 4;
            if (innerIdx < total && paperScore[innerIdx] >= paperScore[idx] - 12) {
              bestVal = g;
              bestX = x;
            }
          }
        }
        if (bestX !== -1) leftPts.push({ x: bestX, y });
      }

      // Right scan left
      for (let r = 1; r <= NUM_RAYS; r++) {
        const y = Math.round((detH * (r + 1)) / (NUM_RAYS + 3));
        const row = y * detW;
        let bestX = -1;
        let bestVal = 18;

        for (let x = detW - 4; x > Math.round(detW * 0.52); x--) {
          const idx = row + x;
          const g = grad[idx];
          if (g > bestVal) {
            const innerIdx = row + x - 4;
            if (innerIdx >= 0 && paperScore[innerIdx] >= paperScore[idx] - 12) {
              bestVal = g;
              bestX = x;
            }
          }
        }
        if (bestX !== -1) rightPts.push({ x: bestX, y });
      }

      const topL = fitLineRansac(topPts, false, detW);
      const botL = fitLineRansac(botPts, false, detW);
      const leftL = fitLineRansac(leftPts, true, detH);
      const rightL = fitLineRansac(rightPts, true, detH);

      if (!topL || !botL || !leftL || !rightL) {
        return { success: false, reason: 'Line fit failed' };
      }

      const tl = intersectLines(topL, leftL);
      const tr = intersectLines(topL, rightL);
      const br = intersectLines(botL, rightL);
      const bl = intersectLines(botL, leftL);

      if (!tl || !tr || !br || !bl) {
        return { success: false, reason: 'Intersection failed' };
      }

      const invScale = 1 / scale;
      return {
        success: true,
        corners: [
          { x: Math.round(tl.x * invScale), y: Math.round(tl.y * invScale) },
          { x: Math.round(tr.x * invScale), y: Math.round(tr.y * invScale) },
          { x: Math.round(br.x * invScale), y: Math.round(br.y * invScale) },
          { x: Math.round(bl.x * invScale), y: Math.round(bl.y * invScale) },
        ],
      };
    }

    // Test 3: Light Wood Desk (#c8a882)
    const c1 = document.createElement('canvas');
    c1.width = 1000; c1.height = 1200;
    const ctx1 = c1.getContext('2d');
    ctx1.fillStyle = '#c8a882';
    ctx1.fillRect(0, 0, 1000, 1200);
    ctx1.fillStyle = '#f8fafc';
    ctx1.fillRect(150, 140, 700, 920);

    const res3 = runDetection(c1);

    // Test 4: Shadow Gradient across Document
    const c2 = document.createElement('canvas');
    c2.width = 1000; c2.height = 1200;
    const ctx2 = c2.getContext('2d');
    ctx2.fillStyle = '#2d2d2d';
    ctx2.fillRect(0, 0, 1000, 1200);

    ctx2.fillStyle = '#ffffff';
    ctx2.fillRect(200, 150, 600, 900);

    // Add diagonal shadow gradient across top
    const grad = ctx2.createLinearGradient(0, 0, 1000, 1200);
    grad.addColorStop(0, 'rgba(0,0,0,0.6)');
    grad.addColorStop(0.5, 'rgba(0,0,0,0.1)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx2.fillStyle = grad;
    ctx2.fillRect(0, 0, 1000, 1200);

    const res4 = runDetection(c2);

    return { res3, res4 };
  });

  console.log('Light wood desk result:', testResults.res3);
  console.log('Shadow gradient result:', testResults.res4);
  await browser.close();
}

testChallengingBackgrounds();
