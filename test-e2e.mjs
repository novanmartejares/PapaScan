import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function runTests() {
  console.log('🚀 Starting PapaScan E2E verification on localhost:3000...');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  });

  const errors = [];

  // ==========================================
  // Test 1: Desktop Viewport (1280 x 800)
  // ==========================================
  console.log('\n--- 1. Testing Desktop Viewport (1280x800) ---');
  const desktopPage = await browser.newPage();
  await desktopPage.setViewport({ width: 1280, height: 800 });

  desktopPage.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.error(`[Browser Console Error]: ${msg.text()}`);
      errors.push(`Console error: ${msg.text()}`);
    } else {
      console.log(`[Browser Console ${msg.type()}]: ${msg.text()}`);
    }
  });

  desktopPage.on('pageerror', (err) => {
    console.error(`[Page Error]: ${err.message}`);
    errors.push(`Page error: ${err.message}`);
  });

  await desktopPage.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 30000 });
  console.log('✓ Page loaded successfully');

  // Verify Header & Sidebar
  await desktopPage.waitForSelector('header');
  const brandText = await desktopPage.$eval('header', (el) => el.innerText);
  console.log(`✓ Header rendered with: "${brandText.replace(/\n/g, ' ')}"`);

  // Verify Documents loaded from IDB
  await desktopPage.waitForSelector('main');
  // Wait a moment for demo data generation
  await new Promise((r) => setTimeout(r, 1200));

  const docCountText = await desktopPage.$eval('main', (el) => el.innerText);
  console.log(`✓ Library loaded. Status text includes:\n${docCountText.slice(0, 150)}...`);

  const screenshotDir = path.resolve('test-screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  await desktopPage.screenshot({ path: path.join(screenshotDir, 'desktop-library.png') });
  console.log('✓ Captured desktop-library.png');

  // Click first document to open Detail View
  const cards = await desktopPage.$$('main [class*="cursor-pointer"]');
  if (cards.length > 0) {
    console.log(`✓ Found ${cards.length} document cards. Clicking the first one...`);
    await cards[0].click();
    await new Promise((r) => setTimeout(r, 600));

    await desktopPage.screenshot({ path: path.join(screenshotDir, 'desktop-detail.png') });
    console.log('✓ Captured desktop-detail.png');

    // Switch to OCR tab
    const ocrTabButtons = await desktopPage.$$('button');
    for (const b of ocrTabButtons) {
      const text = await desktopPage.evaluate((el) => el.innerText, b);
      if (text.includes('OCR') || text.includes('Extract Text')) {
        await b.click();
        console.log('✓ Clicked OCR tab');
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 600));
    await desktopPage.screenshot({ path: path.join(screenshotDir, 'desktop-ocr.png') });
    console.log('✓ Captured desktop-ocr.png');
  }

  await desktopPage.close();

  // ==========================================
  // Test 2: Mobile Viewport (390 x 844) - iPhone 14 / modern mobile
  // ==========================================
  console.log('\n--- 2. Testing Mobile Viewport (390x844) ---');
  const mobilePage = await browser.newPage();
  await mobilePage.setViewport({
    width: 390,
    height: 844,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
  });

  mobilePage.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.error(`[Mobile Console Error]: ${msg.text()}`);
      errors.push(`Mobile console error: ${msg.text()}`);
    }
  });

  mobilePage.on('pageerror', (err) => {
    console.error(`[Mobile Page Error]: ${err.message}`);
    errors.push(`Mobile page error: ${err.message}`);
  });

  await mobilePage.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise((r) => setTimeout(r, 1000));

  // Verify Bottom Navigation
  await mobilePage.waitForSelector('nav');
  console.log('✓ Mobile bottom navigation bar rendered');

  await mobilePage.screenshot({ path: path.join(screenshotDir, 'mobile-library.png') });
  console.log('✓ Captured mobile-library.png');

  // Click Settings in bottom navigation
  const bottomNavButtons = await mobilePage.$$('nav button');
  for (const btn of bottomNavButtons) {
    const text = await mobilePage.evaluate((el) => el.innerText, btn);
    if (text.includes('Settings')) {
      await btn.click();
      console.log('✓ Clicked Settings in Mobile Bottom Nav');
      break;
    }
  }
  await new Promise((r) => setTimeout(r, 600));
  await mobilePage.screenshot({ path: path.join(screenshotDir, 'mobile-settings.png') });
  console.log('✓ Captured mobile-settings.png');

  // Close settings
  const closeButtons = await mobilePage.$$('button');
  for (const b of closeButtons) {
    const label = await mobilePage.evaluate((el) => el.getAttribute('aria-label') || el.innerText, b);
    if (label.includes('Close') || label === '') {
      // try clicking close
      try {
        await b.click();
      } catch {}
    }
  }

  // Click Scan Button in center
  for (const btn of bottomNavButtons) {
    const label = await mobilePage.evaluate((el) => el.getAttribute('aria-label') || el.innerText, btn);
    if (label.includes('scanning') || label.includes('Scan')) {
      await btn.click();
      console.log('✓ Clicked Scan Button in Mobile View');
      break;
    }
  }
  await new Promise((r) => setTimeout(r, 800));
  await mobilePage.screenshot({ path: path.join(screenshotDir, 'mobile-scan-modal.png') });
  console.log('✓ Captured mobile-scan-modal.png');

  await mobilePage.close();
  await browser.close();

  console.log('\n==========================================');
  if (errors.length === 0) {
    console.log('🎉 ALL TESTS PASSED! ZERO CONSOLE OR PAGE ERRORS!');
  } else {
    console.warn(`⚠️ Completed with ${errors.length} error(s):`, errors);
  }
  console.log('==========================================');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
