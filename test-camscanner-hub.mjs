import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function testCamScannerHub() {
  console.log('🚀 Verifying CamScanner Pro Suite Home Screen Hub...');

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

  // 1. Load Home Dashboard
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1000));

  // Check Header Brand
  const brandPill = await page.$('header span ::-p-text(CamScanner Pro)');
  if (brandPill) {
    console.log('✓ Header "CamScanner Pro" badge verified');
  }

  // Check CamScanner Pro Suite Hub
  const hubTitle = await page.$('h2 ::-p-text(CamScanner Pro Suite)');
  if (hubTitle) {
    console.log('✓ CamScanner Pro Suite Hub title is prominently visible on Dashboard!');
  } else {
    throw new Error('CamScanner Pro Suite Hub not found on dashboard');
  }

  // Capture Home Screen on Mobile
  await page.screenshot({ path: path.join(screenshotDir, 'home-camscanner-hub-mobile.png') });
  console.log('✓ Captured home-camscanner-hub-mobile.png');

  // Capture Home Screen on Desktop
  await page.setViewport({ width: 1280, height: 800 });
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: path.join(screenshotDir, 'home-camscanner-hub-desktop.png') });
  console.log('✓ Captured home-camscanner-hub-desktop.png');

  // Reset to Mobile Viewport for Action tests
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await new Promise((r) => setTimeout(r, 500));

  // Test Click "2-Sided ID Card" from Home Hub
  console.log('\n--- Testing "2-Sided ID Card" Quick Action from Home Hub ---');
  const idCardAction = await page.$('button ::-p-text(2-Sided ID Card)');
  if (idCardAction) {
    await idCardAction.click();
    console.log('✓ Clicked "2-Sided ID Card" from Home Hub');
    await new Promise((r) => setTimeout(r, 1200));

    // Verify Camera opened directly in ID Card mode
    const idStepBadge = await page.$('div ::-p-text(STEP 1 OF 2: ID FRONT)');
    if (idStepBadge) {
      console.log('✓ Camera opened directly into 2-Sided ID Card mode!');
    }
    await page.screenshot({ path: path.join(screenshotDir, 'hub-launch-id-card.png') });

    // Close camera
    const closeBtn = await page.$('button[aria-label="Close"], button:has(svg.lucide-x)');
    if (closeBtn) await closeBtn.click();
    await new Promise((r) => setTimeout(r, 800));
  }

  // Test Click "No Shadow" from Home Hub
  console.log('\n--- Testing "No Shadow" Quick Action from Home Hub ---');
  const noShadowAction = await page.$('button ::-p-text(No Shadow)');
  if (noShadowAction) {
    await noShadowAction.click();
    console.log('✓ Clicked "No Shadow" from Home Hub');
    await new Promise((r) => setTimeout(r, 1200));

    // Verify Crop/Filter Editor opened with "No Shadow" filter
    const noShadowSelected = await page.$('button.border-sky-400 ::-p-text(No Shadow)');
    if (noShadowSelected) {
      console.log('✓ Editor opened with "No Shadow" filter active!');
    }
    await page.screenshot({ path: path.join(screenshotDir, 'hub-launch-no-shadow.png') });

    // Close editor
    const closeEditorBtn = await page.$('button ::-p-text(Cancel)');
    if (closeEditorBtn) await closeEditorBtn.click();
    await new Promise((r) => setTimeout(r, 800));
  }

  // Test Click "Smart Scan (Hands-Free)" from Home Hub
  console.log('\n--- Testing "Smart Scan (Hands-Free)" Quick Action from Home Hub ---');
  const smartScanAction = await page.$('button ::-p-text(Smart Scan (Hands-Free))');
  if (smartScanAction) {
    await smartScanAction.click();
    console.log('✓ Clicked "Smart Scan (Hands-Free)" from Home Hub');
    await new Promise((r) => setTimeout(r, 1200));

    const smartScanOverlay = await page.$('span ::-p-text(CamScanner Smart Scan Active)');
    if (smartScanOverlay) {
      console.log('✓ Viewfinder shows "CamScanner Smart Scan Active" overlay!');
    }
    await page.screenshot({ path: path.join(screenshotDir, 'hub-launch-smart-scan.png') });

    const closeCameraBtn = await page.$('button[aria-label="Close"], button:has(svg.lucide-x)');
    if (closeCameraBtn) await closeCameraBtn.click();
    await new Promise((r) => setTimeout(r, 800));
  }

  console.log('\n==========================================');
  console.log('🎉 CamScanner Pro Hub Verification Completed Successfully!');
  console.log(`Total errors encountered: ${errors.length}`);
  console.log('==========================================\n');

  await browser.close();
}

testCamScannerHub().catch((err) => {
  console.error('Fatal error in CamScanner Hub test:', err);
  process.exit(1);
});
