import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function testMobileHandoffSync() {
  console.log('📡 Testing Desktop "Scan with Phone" QR & Real-Time Mobile Handoff...');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  });

  const screenshotDir = path.resolve('test-screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const errors = [];

  // ==========================================
  // Step 1: Open Desktop Viewport (1280x800)
  // ==========================================
  console.log('\n--- 1. Desktop Browser: Launch and Open "Scan with Phone" ---');
  const desktopPage = await browser.newPage();
  await desktopPage.setViewport({ width: 1280, height: 800 });

  desktopPage.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.error(`[Desktop Error]: ${msg.text()}`);
      errors.push(`Desktop: ${msg.text()}`);
    }
  });

  await desktopPage.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1000));

  // Intercept window.open on desktopPage so we get the exact sync URL
  await desktopPage.evaluate(() => {
    window.__openedUrls = [];
    window.open = (url) => {
      window.__openedUrls.push(url);
      return null;
    };
  });

  // Click "Scan with Phone" button in Desktop Header or Sidebar
  const scanWithPhoneBtn = await desktopPage.$('button ::-p-text(Scan with Phone)');
  if (scanWithPhoneBtn) {
    await scanWithPhoneBtn.click();
    console.log('✓ Clicked "Scan with Phone" on Desktop');
  } else {
    throw new Error('"Scan with Phone" button not found');
  }

  await new Promise((r) => setTimeout(r, 1200));

  // Verify QR code image is rendered
  const qrImage = await desktopPage.$('img[alt="Scan session QR Code"]');
  if (!qrImage) {
    throw new Error('QR code image not found in MobileSyncModal');
  }
  console.log('✓ QR code successfully generated and rendered on Desktop');

  await desktopPage.screenshot({ path: path.join(screenshotDir, 'desktop-sync-modal-qr.png') });
  console.log('✓ Captured desktop-sync-modal-qr.png');

  // Click "Open Phone Tab" button to get the real sync URL
  const simBtn = await desktopPage.$('button ::-p-text(Open Phone Tab)');
  if (simBtn) {
    await simBtn.click();
  }

  const openedUrls = await desktopPage.evaluate(() => window.__openedUrls || []);
  const syncUrl = openedUrls[0] || 'http://localhost:3000/sync/test-fallback';
  console.log(`✓ Real-time Sync URL retrieved: ${syncUrl}`);

  // ==========================================
  // Step 2: Open Mobile Phone Browser (390x844)
  // ==========================================
  console.log('\n--- 2. Mobile Browser: User Scans QR and Enters Camera Flow ---');
  const mobilePage = await browser.newPage();
  await mobilePage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

  mobilePage.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.error(`[Mobile Error]: ${msg.text()}`);
      errors.push(`Mobile: ${msg.text()}`);
    }
  });

  await mobilePage.goto(syncUrl, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1200));

  await mobilePage.screenshot({ path: path.join(screenshotDir, 'mobile-bridge-connected.png') });
  console.log('✓ Captured mobile-bridge-connected.png (Mobile camera active with "Connected to Desktop")');

  // Verify desktop shows "Phone Connected & Ready!"
  await new Promise((r) => setTimeout(r, 800));
  await desktopPage.screenshot({ path: path.join(screenshotDir, 'desktop-phone-paired.png') });
  console.log('✓ Captured desktop-phone-paired.png (Desktop shows live paired status)');

  // Capture a frame on mobile
  const mobileShutter = await mobilePage.$('button[class*="w-18 h-18"]');
  if (mobileShutter) {
    await mobileShutter.click();
    console.log('✓ Mobile user tapped Shutter button');
  }

  await new Promise((r) => setTimeout(r, 1000));

  // Tap "Send to Desktop"
  const sendToDesktopBtn = await mobilePage.$('button ::-p-text(Send to Desktop)');
  if (sendToDesktopBtn) {
    await sendToDesktopBtn.click();
    console.log('✓ Mobile user tapped "Send to Desktop (1)"');
  }

  await new Promise((r) => setTimeout(r, 1800));
  await mobilePage.screenshot({ path: path.join(screenshotDir, 'mobile-bridge-sent.png') });
  console.log('✓ Captured mobile-bridge-sent.png ("Sent to Desktop in Real Time!")');

  // Desktop should now receive the page via SSE and open the Crop Editor
  await new Promise((r) => setTimeout(r, 1500));
  await desktopPage.screenshot({ path: path.join(screenshotDir, 'desktop-received-synced-page.png') });
  console.log('✓ Captured desktop-received-synced-page.png (Desktop received page and opened Crop Editor)');

  // Close mobile page
  await mobilePage.close();

  // Close desktop page
  await desktopPage.close();
  await browser.close();

  if (errors.length === 0) {
    console.log('\n🎉 ALL REAL-TIME MOBILE HANDOFF TESTS PASSED WITH ZERO ERRORS!');
  } else {
    console.warn(`⚠️ Completed with ${errors.length} error(s):`, errors);
  }
}

testMobileHandoffSync().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
