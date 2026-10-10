const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const baseURL = process.env.UI_PREVIEW_URL || 'http://127.0.0.1:3002';

async function design(browser) {
  for (const width of [320, 390, 768, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage(); const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${baseURL}/onboarding`, { waitUntil: 'domcontentloaded' });
    const name = page.getByLabel('Household name', { exact: true });
    await name.waitFor(); await name.focus();
    assert.equal(await name.evaluate(input => parseFloat(getComputedStyle(input).outlineWidth) >= 2 && getComputedStyle(input).outlineStyle !== 'none'), true, 'Visible form focus');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${width}px no horizontal overflow`);
    assert.equal(await page.getByRole('navigation', { name: 'Main navigation' }).count(), 1);
    assert.equal(await page.getByRole('img', { name: 'WattSnap', exact: true }).count(), 1);
    assert.deepEqual(errors, []);
    await context.close();
  }
  console.log('PASS: retained branding/navigation, form focus and 320–1440px layout');
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try { await design(browser); } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
