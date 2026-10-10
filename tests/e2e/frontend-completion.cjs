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

async function records(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${baseURL}/dashboard`);
  await page.getByText('No bills yet', { exact: true }).first().waitFor();
  assert.equal(await page.locator('.ws-chart-day').count(), 0, 'No invented history bars');
  assert.equal(await page.locator('.ws-budget-summary').innerText(), 'Set a monthly budget');
  assert.equal(await page.evaluate(() => localStorage.getItem('wattsnap-ui-preview-v1')), null, 'Opening a page does not seed records');
  await page.goto(`${baseURL}/appliances`);
  await page.getByRole('heading', { name: 'No appliances yet' }).waitFor();
  await page.goto(`${baseURL}/advisories`);
  await page.getByRole('heading', { name: 'No saved advisories yet' }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Samples', exact: true }).count(), 0);
  await page.goto(`${baseURL}/bills/new`);
  assert.equal(await page.getByRole('button', { name: /sample/i }).count(), 0);
  await page.getByRole('button', { name: 'Type it', exact: true }).click();
  assert.equal(await page.getByLabel('Energy used', { exact: true }).inputValue(), '');
  assert.deepEqual(errors, []);
  await context.close(); console.log('PASS: honest empty states, no seeding, actual-only charts and manual bill entry');
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try { for (const check of (process.argv.slice(2).length ? process.argv.slice(2) : ['design', 'records'])) await ({ design, records })[check](browser); } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
