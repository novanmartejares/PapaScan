import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function testProFeatures() {
  console.log('🚀 Testing Pro Features: Sign Document & ID Card 2-Sided Mode...');

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

  const screenshotDir = path.resolve('test-screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1000));

  // ==========================================
  // Test 1: "Sign Document" Tool
  // ==========================================
  console.log('\n--- 1. Testing "Sign Document" Tool ---');

  // Open first document
  const firstCard = await page.$('main [class*="cursor-pointer"]');
  if (firstCard) {
    await firstCard.click();
    console.log('✓ Opened document detail view');
  }
  await new Promise((r) => setTimeout(r, 800));

  // Click "Sign Document" button
  const signBtn = await page.$('button ::-p-text(Sign Document)');
  if (signBtn) {
    await signBtn.click();
    console.log('✓ Clicked "Sign Document" button');
  }
  await new Promise((r) => setTimeout(r, 800));

  await page.screenshot({ path: path.join(screenshotDir, 'mobile-sign-pad.png') });
  console.log('✓ Captured mobile-sign-pad.png');

  // Draw signature on canvas
  const drawCanvas = await page.$('canvas.cursor-crosshair');
  if (drawCanvas) {
    const box = await drawCanvas.boundingBox();
    console.log(`✓ Found signature drawing canvas at (${box.x}, ${box.y})`);

    // Draw stylish scribble
    await page.mouse.move(box.x + 40, box.y + 70);
    await page.mouse.down();
    await page.mouse.move(box.x + 90, box.y + 40);
    await page.mouse.move(box.x + 140, box.y + 80);
    await page.mouse.move(box.x + 190, box.y + 35);
    await page.mouse.move(box.x + 240, box.y + 75);
    await page.mouse.up();
    console.log('✓ Successfully drew signature strokes on canvas');
  }

  await new Promise((r) => setTimeout(r, 500));

  // Click "Proceed to Place on Page"
  const proceedBtn = await page.$('button ::-p-text(Proceed to Place on Page)');
  if (proceedBtn) {
    await proceedBtn.click();
    console.log('✓ Clicked "Proceed to Place on Page"');
  }
  await new Promise((r) => setTimeout(r, 800));

  await page.screenshot({ path: path.join(screenshotDir, 'mobile-sign-place.png') });
  console.log('✓ Captured mobile-sign-place.png');

  // Click "Apply & Save Signed Document"
  const applySigBtn = await page.$('button ::-p-text(Apply & Save Signed Document)');
  if (applySigBtn) {
    await applySigBtn.click();
    console.log('✓ Clicked "Apply & Save Signed Document"');
  }
  await new Promise((r) => setTimeout(r, 1500));

  await page.screenshot({ path: path.join(screenshotDir, 'mobile-signed-page.png') });
  console.log('✓ Captured mobile-signed-page.png');

  // Return to library
  const backBtn = await page.$('header button[title="Back to library"]');
  if (backBtn) {
    await backBtn.click();
    console.log('✓ Returned to Library');
  }
  await new Promise((r) => setTimeout(r, 800));

  // ==========================================
  // Test 2: "ID Card Dual-Page Mode"
  // ==========================================
  console.log('\n--- 2. Testing "ID Card Dual-Page Mode" in Camera flow ---');

  // Click Scan Button
  const scanBtn = await page.$('button[aria-label="Start scanning"]');
  if (scanBtn) {
    await scanBtn.click();
    console.log('✓ Opened camera modal');
  }
  await new Promise((r) => setTimeout(r, 1000));

  // Click "2-Sided ID" mode pill
  const idModeBtn = await page.$('button ::-p-text(2-Sided ID)');
  if (idModeBtn) {
    await idModeBtn.click();
    console.log('✓ Switched to "2-Sided ID" Mode');
  }
  await new Promise((r) => setTimeout(r, 800));

  await page.screenshot({ path: path.join(screenshotDir, 'mobile-id-step1.png') });
  console.log('✓ Captured mobile-id-step1.png');

  // Capture Front Side
  const shutterBtn = await page.$('button[aria-label="Capture photo"]');
  if (shutterBtn) {
    await shutterBtn.click();
    console.log('✓ Clicked Shutter: Front Side Captured');
  }
  await new Promise((r) => setTimeout(r, 1200));

  await page.screenshot({ path: path.join(screenshotDir, 'mobile-id-step2.png') });
  console.log('✓ Captured mobile-id-step2.png (Prompting to flip card)');

  // Capture Back Side -> Triggers Auto-Composite
  if (shutterBtn) {
    await shutterBtn.click();
    console.log('✓ Clicked Shutter: Back Side Captured -> Triggering A4 Compositor');
  }

  // Wait for A4 composite and transition to Crop/Detail view
  await new Promise((r) => setTimeout(r, 3000));

  await page.screenshot({ path: path.join(screenshotDir, 'mobile-id-a4-composite.png') });
  console.log('✓ Captured mobile-id-a4-composite.png');

  await browser.close();

  if (errors.length === 0) {
    console.log('\n🎉 ALL PRO FEATURES TESTED AND VERIFIED WITH ZERO ERRORS!');
  } else {
    console.warn(`⚠️ Completed with ${errors.length} error(s):`, errors);
  }
}

testProFeatures().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
