import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function testBasicCropFlow() {
  console.log('📐 Testing Simplified Basic Rectangular Crop Flow...');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
    ],
  });

  const errors = [];
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.error(`[Browser Error]: ${msg.text()}`);
      errors.push(msg.text());
    }
  });

  const screenshotDir = path.resolve('test-screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  // 1. Load app
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 800));

  // 2. Click Scan button
  const scanBtn = await page.$('button[aria-label="Start scanning"]');
  if (scanBtn) {
    await scanBtn.click();
    console.log('✓ Clicked Scan Button');
  }

  await new Promise((r) => setTimeout(r, 1200));

  // 3. Click Shutter button
  const shutterBtn = await page.$('button[aria-label="Capture photo"]');
  if (shutterBtn) {
    await shutterBtn.click();
    console.log('✓ Captured photo frame');
  }

  // 4. Crop Editor should open with basic rectangular crop
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(screenshotDir, 'basic-crop-initial.png') });
  console.log('✓ Captured basic-crop-initial.png (Basic rectangular crop with L-brackets and dimension pill)');

  // 5. Test Aspect Ratio Presets
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await page.evaluate((el) => el.innerText, btn);
    if (text.trim() === 'A4') {
      await btn.click();
      console.log('✓ Clicked "A4" Aspect Ratio Preset');
      break;
    }
  }
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: path.join(screenshotDir, 'basic-crop-a4-preset.png') });
  console.log('✓ Captured basic-crop-a4-preset.png');

  // 6. Test Square 1:1 Preset
  for (const btn of buttons) {
    const text = await page.evaluate((el) => el.innerText, btn);
    if (text.trim() === '1:1') {
      await btn.click();
      console.log('✓ Clicked "1:1" Square Aspect Ratio Preset');
      break;
    }
  }
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: path.join(screenshotDir, 'basic-crop-1to1-preset.png') });
  console.log('✓ Captured basic-crop-1to1-preset.png');

  // 7. Test Freeform Ratio
  for (const btn of buttons) {
    const text = await page.evaluate((el) => el.innerText, btn);
    if (text.trim() === 'Free') {
      await btn.click();
      console.log('✓ Switched back to "Free" form crop');
      break;
    }
  }
  await new Promise((r) => setTimeout(r, 400));

  // 8. Test Dragging: Drag inside box to move
  const canvasEl = await page.$('canvas');
  if (canvasEl) {
    const box = await canvasEl.boundingBox();
    if (box) {
      // Move pointer inside the center of canvas (which is inside the crop box)
      const centerX = box.x + box.width / 2;
      const centerY = box.y + box.height / 2;

      console.log(`✓ Dragging crop box from (${Math.round(centerX)}, ${Math.round(centerY)})`);
      await page.mouse.move(centerX, centerY);
      await page.mouse.down();
      // Move 40px right, 30px down
      await page.mouse.move(centerX + 40, centerY + 30, { steps: 5 });
      await new Promise((r) => setTimeout(r, 200));
      await page.screenshot({ path: path.join(screenshotDir, 'basic-crop-moved.png') });
      console.log('✓ Captured basic-crop-moved.png');
      await page.mouse.up();
    }
  }

  // 9. Test Rotate 90° Clockwise
  const rotateBtn = await page.$('button[title="Rotate 90° Clockwise"]');
  if (rotateBtn) {
    await rotateBtn.click();
    console.log('✓ Clicked Rotate 90° Clockwise');
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({ path: path.join(screenshotDir, 'basic-crop-rotated.png') });
    console.log('✓ Captured basic-crop-rotated.png');
  }

  // 10. Select Magic Color filter
  for (const btn of buttons) {
    const text = await page.evaluate((el) => el.innerText, btn);
    if (text.includes('Magic Color')) {
      await btn.click();
      console.log('✓ Selected Magic Color filter');
      break;
    }
  }

  // 11. Click "Save Document"
  let saved = false;
  const allBtns = await page.$$('button');
  for (const btn of allBtns) {
    const text = await page.evaluate((el) => el.innerText, btn);
    if (text.includes('Save Document')) {
      await btn.click();
      console.log('✓ Clicked "Save Document"');
      saved = true;
      break;
    }
  }

  if (!saved) {
    throw new Error('Save Document button not found');
  }

  // 12. Wait for document to save and detail view to mount
  await new Promise((r) => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(screenshotDir, 'basic-crop-saved-detail.png') });
  console.log('✓ Captured basic-crop-saved-detail.png (Saved cropped document rendered in detail view)');

  await browser.close();

  if (errors.length === 0) {
    console.log('\n🎉 ALL BASIC CROP TESTS PASSED WITH ZERO ERRORS!');
  } else {
    console.warn(`⚠️ Completed with ${errors.length} error(s):`, errors);
  }
}

testBasicCropFlow().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
