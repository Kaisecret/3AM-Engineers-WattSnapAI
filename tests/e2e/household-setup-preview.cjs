const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const baseURL = process.env.UI_PREVIEW_URL || 'http://127.0.0.1:3000';
const screenshotDirectory = path.join(os.tmpdir(), 'wattsnap-household-ui-preview');
const storageKey = 'wattsnap-ui-preview-v1';

async function checkLayout(page, name) {
  console.log(`Inspecting ${name}`);
  await page.evaluate(async () => {
    for (const image of document.images) image.loading = 'eager';
    await Promise.all(Array.from(document.images).map(image => image.decode().catch(() => {})));
  });
  assert.equal(await page.locator('[data-nextjs-dialog]').count(), 0, 'No framework error overlay');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'No horizontal overflow');
  assert.deepEqual(await page.locator('img').evaluateAll(images => images.filter(image => !image.complete || image.naturalWidth === 0).map(image => image.src)), [], 'All artwork loads');
  await page.screenshot({ path: path.join(screenshotDirectory, `${name}.png`), fullPage: true });
}

async function householdFlow(browser, viewport, name) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  console.log(`Checking ${name} setup`);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${baseURL}/onboarding`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  console.log(`${name}: setup loaded`);
  await page.getByLabel('Household name', { exact: true }).fill('Santos household');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.locator('#setup-province-error').waitFor();
  assert.equal(await page.locator('#setup-province').getAttribute('aria-invalid'), 'true');
  await page.getByRole('button', { name: 'Try preview' }).click();
  await page.getByRole('dialog').waitFor();
  await checkLayout(page, `${name}-location-permission`);
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('button', { name: 'Try preview' }).evaluate(button => document.activeElement === button), true, 'Focus returns after closing permission preview');
  await page.getByRole('button', { name: 'Try preview' }).click();
  await page.getByRole('button', { name: 'Skip permission & enter manually' }).click();
  await page.getByText('Location permission skipped.', { exact: false }).waitFor();
  await page.getByLabel('Province', { exact: true }).fill('Antique');
  await page.getByLabel('Municipality or city').fill('San Jose de Buenavista');
  await page.getByLabel('Barangay').fill('Payao');
  await checkLayout(page, `${name}-household`);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByText('Example suggestion: ANTECO').waitFor();
  assert.equal(await page.getByRole('radio', { name: 'ANTECO', exact: false }).isChecked(), false, 'Suggestion is not selected automatically');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Choose the provider' }).waitFor();
  await page.getByRole('radio', { name: 'ANTECO', exact: false }).check();
  await checkLayout(page, `${name}-provider`);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('heading', { name: 'Everything look right?' }).waitFor();
  await checkLayout(page, `${name}-review`);
  await page.getByRole('button', { name: 'Save household', exact: true }).click();
  await page.getByRole('heading', { name: 'Welcome home, Santos!' }).waitFor();
  await checkLayout(page, `${name}-saved`);
  assert.equal(await page.getByRole('link', { name: 'Add your first bill' }).getAttribute('href'), '/bills/new');
  await page.reload();
  assert.equal(await page.getByLabel('Household name', { exact: true }).inputValue(), 'Santos household');
  assert.equal(await page.getByLabel('Province', { exact: true }).inputValue(), 'Antique');
  assert.equal(await page.getByLabel('Barangay').inputValue(), 'Payao');

  // Multiple and unknown suggestions keep manual selection available.
  await page.getByLabel('Province', { exact: true }).fill('Iloilo');
  await page.getByLabel('Municipality or city').fill('Iloilo City');
  await page.getByLabel('Barangay').fill('');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByText('Several providers may serve this province').waitFor();
  await page.getByRole('radio', { name: 'MORE Power', exact: false }).check();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Save household', exact: true }).click();
  await page.getByRole('heading', { name: 'Welcome home, Santos!' }).waitFor();
  await page.goto(`${baseURL}/settings`);
  await page.locator('.st-provider-box').getByText('MORE Power', { exact: true }).waitFor();
  await page.getByLabel('Full name', { exact: true }).fill('Reyes household');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await page.reload();
  await page.locator('.st-provider-box').getByText('MORE Power', { exact: true }).waitFor();
  await page.getByRole('link', { name: 'Household setup', exact: false }).click();
  await page.getByLabel('Province', { exact: true }).fill('Cebu');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByText('No provider suggestion for this location').waitFor();
  assert.equal(await page.getByRole('radio').count(), 7, 'Unknown coverage still has manual choices');

  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.getByRole('button', { name: 'Try preview' }).click();
  await page.getByRole('button', { name: 'Use example location' }).click();
  assert.equal(await page.getByLabel('Province', { exact: true }).inputValue(), 'Antique');
  await page.getByText('No device location was requested.', { exact: false }).waitFor();
  await context.setOffline(true);
  await page.getByText('You’re offline.', { exact: true }).waitFor();
  await checkLayout(page, `${name}-offline`);
  await page.getByLabel('Household name', { exact: true }).fill('Offline household');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('radio', { name: 'ANTECO', exact: false }).check();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Save household', exact: true }).click();
  await page.getByRole('heading', { name: 'Welcome home, Offline!' }).waitFor();
  assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).name, storageKey), 'Offline household');
  await context.setOffline(false);
  assert.deepEqual(errors, [], 'No browser runtime errors');
  await context.close();
  console.log(`PASS: ${name} household entry, validation, permission preview, provider confirmation, persistence, settings integration, and offline editing`);
}

async function storageFailure(browser) {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    Storage.prototype.setItem = function () { throw new Error('Storage blocked for test'); };
  });
  const page = await context.newPage();
  await page.goto(`${baseURL}/onboarding`);
  await page.getByRole('button', { name: 'Try preview' }).click();
  await page.getByRole('button', { name: 'Use example location' }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('radio', { name: 'ANTECO', exact: false }).check();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Save household', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'could not be saved' }).waitFor();
  assert.equal(await page.getByText('HOUSEHOLD SAVED', { exact: true }).count(), 0, 'Failed save never claims success');
  await context.close();
  console.log('PASS: browser storage failure leaves the review form available and reports an error');
}

(async () => {
  await fs.mkdir(screenshotDirectory, { recursive: true });
  console.log('Launching headless Chrome');
  const browser = await chromium.launch({ channel: 'chrome', headless: true, timeout: 20000 });
  console.log('Chrome ready');
  try {
    for (const [name, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844], ['small-mobile', 320, 740]]) {
      await householdFlow(browser, { width, height }, name);
    }
    await storageFailure(browser);
    console.log(`Screenshots: ${screenshotDirectory}`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
