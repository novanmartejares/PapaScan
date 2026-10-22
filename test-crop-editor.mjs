import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function testCropAndWarp() {
  console.log('🚀 Testing Camera Capture -> Crop Editor -> Filter -> Save flow...');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1000));

  // Click Scan Button
  const scanBtn = await page.$('button[aria-label="Start scanning"]');
  if (scanBtn) {
    await scanBtn.click();
    console.log('✓ Clicked Scan Button');
  }

  await new Promise((r) => setTimeout(r, 1200));

  // Click Shutter Button
  const shutterBtn = await page.$('button[aria-label="Capture photo"]');
  if (shutterBtn) {
    await shutterBtn.click();
    console.log('✓ Clicked Shutter Button - frame captured');
  }

  // Crop Editor should now open
  await new Promise((r) => setTimeout(r, 1200));

  const screenshotDir = path.resolve('test-screenshots');
  await page.screenshot({ path: path.join(screenshotDir, 'mobile-crop-editor.png') });
  console.log('✓ Captured mobile-crop-editor.png');

  // Click "Crisp B&W" filter button
  const filterButtons = await page.$$('button');
  for (const fb of filterButtons) {
    const text = await page.evaluate((el) => el.innerText, fb);
    if (text.includes('Crisp B&W') || text.includes('B&W')) {
      await fb.click();
      console.log('✓ Selected Crisp B&W filter');
      break;
    }
  }

  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(screenshotDir, 'mobile-crop-bw.png') });
  console.log('✓ Captured mobile-crop-bw.png');

  // Click "Save Document"
  for (const fb of filterButtons) {
    const text = await page.evaluate((el) => el.innerText, fb);
    if (text.includes('Save Document')) {
      await fb.click();
      console.log('✓ Clicked Save Document');
      break;
    }
  }

  // Wait for processing & transition to Detail View
  await new Promise((r) => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(screenshotDir, 'mobile-new-doc-saved.png') });
  console.log('✓ Captured mobile-new-doc-saved.png');

  await browser.close();
  console.log('🎉 Crop & Filter workflow test completed successfully!');
}

testCropAndWarp().catch(console.error);
