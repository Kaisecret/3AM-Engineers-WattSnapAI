const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const baseURL = process.env.ONBOARDING_PREVIEW_URL || 'http://127.0.0.1:3000';
const screenshots = path.join(os.tmpdir(), 'wattsnap-onboarding-preview');

async function open(page, route) { await page.goto(`${baseURL}${route}`, { waitUntil: 'domcontentloaded', timeout: 60000 }); }
async function login(page, email) {
  await open(page, '/login');
  await page.getByLabel('Email or Username', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill('SyntheticPreview2026!');
  await page.locator('#login-submit-button').click();
  await page.waitForURL('**/dashboard', { waitUntil: 'domcontentloaded' });
}
async function count(page, expected) {
  await open(page, '/setup');
  await page.getByText(`${expected}/5 Completed`, { exact: true }).waitFor();
  console.log(`Verified ${expected}/5 setup steps`);
}

(async () => {
  await fs.mkdir(screenshots, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const alphaKey = 'wattsnap-ui-preview-v1:household:alpha%40example.com';
  try {
    await open(page, '/intro');
    const legacy = { name: 'Existing guest household', budget: 4321, bills: [], appliances: [] };
    await page.evaluate(data => localStorage.setItem('wattsnap-ui-preview-v1', JSON.stringify(data)), legacy);
    await login(page, 'alpha@example.com');
    await count(page, 0);
    for (const route of ['/bills/new', '/appliances/new', '/tips']) await open(page, route);
    await count(page, 0);

    await open(page, '/appliances/new');
    await page.getByRole('button', { name: 'Enter manually', exact: true }).click();
    await page.getByRole('radio', { name: 'Fan', exact: true }).check();
    await page.getByLabel('Rated power', { exact: true }).fill('60');
    await page.getByLabel('Hours per day', { exact: true }).fill('8');
    await page.getByLabel('Quantity', { exact: true }).fill('1');
    await page.getByLabel('Days in this period', { exact: true }).fill('30');
    await page.getByRole('checkbox', { name: 'I checked the power', exact: false }).check();
    await page.getByRole('button', { name: 'Save appliance', exact: true }).click();
    await page.getByRole('heading', { name: 'Appliance added!', exact: true }).waitFor();
    await count(page, 1);

    await page.getByRole('link', { name: 'Start: Complete Household Profile', exact: true }).click();
    await page.getByLabel('Household name', { exact: true }).fill('Alpha household');
    await page.getByLabel('Province', { exact: true }).fill('Antique');
    await page.getByLabel('Municipality or city', { exact: true }).fill('San Jose de Buenavista');
    await page.getByRole('button', { name: 'Save household profile', exact: true }).click();
    await count(page, 2);
    await open(page, '/dashboard');
    await page.locator('.setup-progress-card').getByText('2/5 Completed', { exact: true }).waitFor();
    assert.equal(await page.locator('.setup-progress-card progress').getAttribute('value'), '2');
    assert.equal(await page.evaluate(() => document.querySelector('.ws-greeting').nextElementSibling.classList.contains('setup-progress-card')), true);
    await page.getByRole('link', { name: 'Continue Setup', exact: true }).click();
    await page.waitForURL('**/setup#setup-provider', { waitUntil: 'domcontentloaded' });
    await page.getByRole('link', { name: 'Start: Select Electricity Provider', exact: true }).click();
    await page.getByRole('radio', { name: 'ANTECO', exact: false }).check();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByRole('button', { name: 'Save household', exact: true }).click();
    await count(page, 3);

    await open(page, '/bills/new');
    await page.getByRole('button', { name: 'Type it', exact: true }).click();
    await page.getByLabel('Billing month', { exact: true }).fill('2026-09');
    await page.getByLabel('Energy used', { exact: true }).fill('210');
    await page.getByLabel('Amount due', { exact: true }).fill('2480');
    await page.getByLabel('Due date', { exact: true }).fill('2026-10-15');
    await page.getByRole('button', { name: /Exact billing period/ }).click();
    await page.getByLabel('Period start', { exact: true }).fill('2026-09-01');
    await page.getByLabel('Period end', { exact: true }).fill('2026-09-30');
    await page.getByRole('checkbox', { name: 'I reviewed all the values above.', exact: false }).check();
    await page.evaluate(() => {
      window.setupOriginalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) { if (key.startsWith('wattsnap-ui-preview-v1')) throw new DOMException('Synthetic quota test', 'QuotaExceededError'); return window.setupOriginalSetItem.call(this, key, value); };
    });
    await page.getByRole('button', { name: 'Save to history', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'could not be saved' }).waitFor();
    assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).bills.length, alphaKey), 0);
    await page.evaluate(() => { Storage.prototype.setItem = window.setupOriginalSetItem; });
    await page.getByRole('button', { name: 'Save to history', exact: true }).click();
    await page.getByRole('heading', { name: 'Added to your history!' }).waitFor();
    await count(page, 4);
    await open(page, '/tips');
    await page.getByRole('button', { name: 'Create preview tips', exact: true }).click();
    await page.getByRole('button', { name: 'I’ve reviewed these tips', exact: true }).waitFor();
    await count(page, 4);
    await open(page, '/tips');
    await page.getByRole('button', { name: 'I’ve reviewed these tips', exact: true }).click();
    await count(page, 5);
    await page.getByRole('button', { name: 'Got it', exact: true }).click();
    await page.reload();
    await page.getByText('5/5 Completed', { exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Got it', exact: true }).count(), 0);
    await open(page, '/dashboard');
    await page.getByRole('link', { name: 'Home setup complete', exact: true }).waitFor();
    assert.equal(await page.locator('.setup-progress-card').count(), 0);
    await count(page, 5);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: path.join(screenshots, 'setup-complete-390.png'), fullPage: true });

    const savedAlpha = await page.evaluate(key => localStorage.getItem(key), alphaKey);
    await context.setOffline(true);
    await page.getByText('5/5 Completed', { exact: true }).waitFor();
    await context.setOffline(false);
    await login(page, 'beta@example.com');
    await count(page, 0);
    assert.equal(await page.evaluate(key => localStorage.getItem(key), alphaKey), savedAlpha);
    await login(page, 'alpha@example.com');
    await count(page, 5);
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('wattsnap-ui-preview-v1'))), legacy);
    await open(page, '/settings');
    await page.locator('.st-logout-button').click();
    await page.locator('.lo-dialog[open] .lo-confirm').click();
    await page.waitForURL('**/login', { waitUntil: 'domcontentloaded' });
    assert.equal(await page.evaluate(key => localStorage.getItem(key), alphaKey), savedAlpha);
    await login(page, 'alpha@example.com');
    await count(page, 5);
    assert.deepEqual(errors, []);
    console.log('PASS: real saves, out-of-order completion, failed storage, explicit tips review, refresh, identity isolation, legacy preservation and logout/login');
  } finally { await context.close(); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
