import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function testTouchDragAndLoupe() {
  console.log('🔍 Testing Touch Dragging, Magnifier Loupe & True Homography Warp...');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.error(`[Browser Error]: ${msg.text()}`);
      errors.push(msg.text());
    }
  });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1000));

  // Open the first document to edit its crop
  const firstCard = await page.$('main [class*="cursor-pointer"]');
  if (firstCard) {
    await firstCard.click();
    console.log('✓ Opened first document detail view');
  }

  await new Promise((r) => setTimeout(r, 800));

  // Click "Adjust Crop & Filter"
  const adjustBtn = await page.$('button ::-p-text(Adjust Crop)');
  if (adjustBtn) {
    await adjustBtn.click();
    console.log('✓ Clicked Adjust Crop button');
  } else {
    // Try finding button containing "Crop"
    const buttons = await page.$$('button');
    for (const b of buttons) {
      const text = await page.evaluate((el) => el.innerText, b);
      if (text.includes('Crop')) {
        await b.click();
        console.log('✓ Found and clicked Crop button');
        break;
      }
    }
  }

  await new Promise((r) => setTimeout(r, 1200));

  // Verify we are in CropEditorModal
  const canvasEl = await page.$('canvas');
  if (!canvasEl) {
    throw new Error('Canvas element not found in Crop Editor');
  }

  const rect = await canvasEl.boundingBox();
  console.log(`✓ Found Crop Canvas at (${rect.x}, ${rect.y}, ${rect.width}x${rect.height})`);

  // Target Top-Right corner handle (approx at x: rect.x + rect.width * 0.9, y: rect.y + rect.height * 0.1)
  const startX = rect.x + rect.width * 0.88;
  const startY = rect.y + rect.height * 0.15;

  console.log(`✓ Moving pointer to corner handle at (${Math.round(startX)}, ${Math.round(startY)})`);
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  console.log('✓ Mouse/Touch down on handle');

  // Drag corner inward to create a noticeable trapezoidal perspective angle
  const targetX = rect.x + rect.width * 0.72;
  const targetY = rect.y + rect.height * 0.28;

  for (let step = 1; step <= 8; step++) {
    const curX = startX + (targetX - startX) * (step / 8);
    const curY = startY + (targetY - startY) * (step / 8);
    await page.mouse.move(curX, curY);
    await new Promise((r) => setTimeout(r, 30));
  }

  console.log(`✓ Dragged corner to (${Math.round(targetX)}, ${Math.round(targetY)})`);

  // Verify that the Loupe Magnifier is visible in DOM
  const loupeSelector = '[class*="ring-4 ring-sky-400"]';
  await page.waitForSelector(loupeSelector, { timeout: 3000 });
  console.log('✓ Verified: Zoomed circular magnifier loupe is actively rendered!');

  const screenshotDir = path.resolve('test-screenshots');
  await page.screenshot({ path: path.join(screenshotDir, 'mobile-loupe-active-drag.png') });
  console.log('✓ Captured mobile-loupe-active-drag.png');

  // Release touch / mouse
  await page.mouse.up();
  await new Promise((r) => setTimeout(r, 500));

  // Toggle to "Flattened Preview" to test Homography Warp
  const previewTab = await page.$('button ::-p-text(Flattened Preview)');
  if (previewTab) {
    await previewTab.click();
    console.log('✓ Clicked "Flattened Preview" tab');
  } else {
    const allBtns = await page.$$('button');
    for (const b of allBtns) {
      const text = await page.evaluate((el) => el.innerText, b);
      if (text.includes('Flattened Preview')) {
        await b.click();
        console.log('✓ Clicked Flattened Preview button');
        break;
      }
    }
  }

  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(screenshotDir, 'mobile-homography-flattened-preview.png') });
  console.log('✓ Captured mobile-homography-flattened-preview.png');

  await browser.close();

  if (errors.length === 0) {
    console.log('\n🎉 ALL TOUCH DRAG & LOUPE MAGNIFIER VERIFICATIONS PASSED WITH ZERO ERRORS!');
  } else {
    console.warn(`⚠️ Completed with ${errors.length} error(s):`, errors);
  }
}

testTouchDragAndLoupe().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
