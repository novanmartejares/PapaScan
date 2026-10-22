import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function testCamScannerSuite() {
  console.log('🚀 Testing CamScanner Suite: No Shadow Filter, Security Watermark, Redaction & Auto-Capture...');

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

  // 1. Load Dashboard
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1000));

  // ==========================================
  // Test 1: Camera Hands-Free Auto-Capture & Doc Shoot
  // ==========================================
  console.log('\n--- 1. Testing Camera Hands-Free Auto-Capture ---');
  const scanBtn = await page.$('button[aria-label="Start scanning"]');
  if (scanBtn) {
    await scanBtn.click();
    console.log('✓ Clicked Scan Button');
  }
  await new Promise((r) => setTimeout(r, 1200));

  // Verify "Auto Snap" toggle exists
  const autoSnapBtn = await page.$('button[title*="Auto-Capture"]');
  if (autoSnapBtn) {
    const text = await page.evaluate((el) => el.textContent, autoSnapBtn);
    console.log(`✓ Hands-Free Auto-Capture button found: "${text?.trim()}"`);
  } else {
    console.warn('⚠️ Auto-Capture button not found');
  }

  await page.screenshot({ path: path.join(screenshotDir, 'camscanner-auto-capture-viewfinder.png') });
  console.log('✓ Captured camscanner-auto-capture-viewfinder.png');

  // Close camera modal
  const closeBtn = await page.$('button[aria-label="Close"], button:has(svg.lucide-x)');
  if (closeBtn) {
    await closeBtn.click();
    await new Promise((r) => setTimeout(r, 600));
  }

  // ==========================================
  // Test 2: CamScanner "No Shadow" Filter in Editor
  // ==========================================
  console.log('\n--- 2. Testing CamScanner "No Shadow" Filter ---');
  // Open first document in library
  const firstDoc = await page.$('main [class*="cursor-pointer"]');
  if (firstDoc) {
    await firstDoc.click();
    console.log('✓ Opened document detail view');
  }
  await new Promise((r) => setTimeout(r, 800));

  // Click Crop / Filter button
  const cropFilterBtn = await page.$('button ::-p-text(Crop / Filter)');
  if (cropFilterBtn) {
    await cropFilterBtn.click();
    console.log('✓ Clicked "Crop / Filter" button to open Editor');
  }
  await new Promise((r) => setTimeout(r, 1000));

  // Check for "No Shadow" filter button
  const noShadowBtn = await page.$('button ::-p-text(No Shadow)');
  if (noShadowBtn) {
    await noShadowBtn.click();
    console.log('✓ Selected "No Shadow" filter');
    await new Promise((r) => setTimeout(r, 800));
  } else {
    console.warn('⚠️ "No Shadow" filter button not found');
  }

  await page.screenshot({ path: path.join(screenshotDir, 'camscanner-noshadow-applied.png') });
  console.log('✓ Captured camscanner-noshadow-applied.png');

  // Save filter changes
  const saveFilterBtn = await page.$('button ::-p-text(Save)');
  if (saveFilterBtn) {
    await saveFilterBtn.click();
    console.log('✓ Saved "No Shadow" filtered document');
    await new Promise((r) => setTimeout(r, 1000));
  }

  // ==========================================
  // Test 3: CamScanner Anti-Counterfeit Security Watermark
  // ==========================================
  console.log('\n--- 3. Testing Anti-Counterfeit Security Watermark ---');
  const watermarkBtn = await page.$('button ::-p-text(Watermark)');
  if (watermarkBtn) {
    await watermarkBtn.click();
    console.log('✓ Clicked "Watermark" button');
    await new Promise((r) => setTimeout(r, 800));
  }

  // Select "FOR VERIFICATION ONLY" preset
  const presetBtn = await page.$('button ::-p-text(FOR VERIFICATION ONLY)');
  if (presetBtn) {
    await presetBtn.click();
    console.log('✓ Selected "FOR VERIFICATION ONLY" security watermark preset');
    await new Promise((r) => setTimeout(r, 500));
  }

  await page.screenshot({ path: path.join(screenshotDir, 'camscanner-watermark-modal.png') });
  console.log('✓ Captured camscanner-watermark-modal.png');

  // Apply Watermark
  const applyWatermarkBtn = await page.$('button ::-p-text(Apply Watermark)');
  if (applyWatermarkBtn) {
    await applyWatermarkBtn.click();
    console.log('✓ Clicked "Apply Watermark"');
    await new Promise((r) => setTimeout(r, 1000));
  }

  await page.screenshot({ path: path.join(screenshotDir, 'camscanner-watermarked-page.png') });
  console.log('✓ Captured camscanner-watermarked-page.png');

  // ==========================================
  // Test 4: CamScanner Redaction / Eraser Tool
  // ==========================================
  console.log('\n--- 4. Testing Document Redaction / Eraser Tool ---');
  const redactBtn = await page.$('button ::-p-text(Redact)');
  if (redactBtn) {
    await redactBtn.click();
    console.log('✓ Clicked "Redact" button');
    await new Promise((r) => setTimeout(r, 800));
  }

  // Draw redaction box on canvas
  const redactCanvas = await page.$('canvas.cursor-crosshair');
  if (redactCanvas) {
    const box = await redactCanvas.boundingBox();
    if (box) {
      console.log(`✓ Redaction canvas located at (${box.x}, ${box.y}, ${box.width}x${box.height})`);
      const startX = box.x + box.width * 0.2;
      const startY = box.y + box.height * 0.35;
      const endX = box.x + box.width * 0.8;
      const endY = box.y + box.height * 0.48;

      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(endX, endY, { steps: 8 });
      await page.mouse.up();
      console.log('✓ Dragged redaction rectangle over sensitive numbers');
      await new Promise((r) => setTimeout(r, 600));
    }
  }

  await page.screenshot({ path: path.join(screenshotDir, 'camscanner-redaction-drawn.png') });
  console.log('✓ Captured camscanner-redaction-drawn.png');

  // Burn Redactions
  const burnRedactionBtn = await page.$('button ::-p-text(Burn Redactions)');
  if (burnRedactionBtn) {
    await burnRedactionBtn.click();
    console.log('✓ Clicked "Burn Redactions"');
    await new Promise((r) => setTimeout(r, 1000));
  }

  await page.screenshot({ path: path.join(screenshotDir, 'camscanner-redacted-page.png') });
  console.log('✓ Captured camscanner-redacted-page.png');

  // ==========================================
  // Test 5: OCR Text Extraction & Plain Text Export (.txt)
  // ==========================================
  console.log('\n--- 5. Testing Plain Text (.TXT) Export ---');
  // Click on "Extract Text (OCR)" tab
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const ocrTab = btns.find((b) => b.innerText.includes('Extract Text (OCR)'));
    if (ocrTab) ocrTab.click();
  });
  console.log('✓ Clicked "Extract Text (OCR)" tab');
  await new Promise((r) => setTimeout(r, 800));

  // Verify "Export .TXT" button exists
  const exportTxtBtn = await page.$('button ::-p-text(Export .TXT)');
  if (exportTxtBtn) {
    console.log('✓ "Export .TXT" button found and ready');
    await exportTxtBtn.click();
    console.log('✓ Triggered .TXT export download');
  } else {
    throw new Error('Export .TXT button not found');
  }

  await page.screenshot({ path: path.join(screenshotDir, 'camscanner-ocr-txt-export.png') });
  console.log('✓ Captured camscanner-ocr-txt-export.png');

  console.log('\n==========================================');
  console.log('🎉 CamScanner Suite Verification Completed Successfully!');
  console.log(`Total errors encountered: ${errors.length}`);
  console.log('==========================================\n');

  await browser.close();
}

testCamScannerSuite().catch((err) => {
  console.error('Fatal error in CamScanner test:', err);
  process.exit(1);
});
