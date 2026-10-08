const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const baseURL = process.env.ONBOARDING_PREVIEW_URL || 'http://127.0.0.1:3001';
const screenshots = path.join(os.tmpdir(), 'wattsnap-onboarding-preview');
async function open(page, route) { await page.goto(`${baseURL}${route}`, { waitUntil: 'domcontentloaded', timeout: 60000 }); }
async function noOverflow(page, name) { assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, name); }

(async () => {
  await fs.mkdir(screenshots, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  try {
    await open(page, '/intro');
    await page.getByRole('button', { name: 'Get Started', exact: true }).waitFor({ state: 'visible' });
    await page.getByRole('button', { name: 'Get Started', exact: true }).focus();
    await page.keyboard.press('Enter');
    await page.getByRole('heading', { name: 'Know your bill at a glance.' }).waitFor();
    assert.equal(await page.locator('h1').evaluate(element => element === document.activeElement), true, 'screen heading receives focus');
    assert.equal(await page.locator('.intro-hero-bee').count(), 0);
    await open(page, '/settings');
    await page.waitForFunction(() => document.querySelector('.setup-theme-options')?.disabled === false);
    await page.getByRole('radio', { name: 'Dark mode', exact: true }).check();
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('radio', { name: 'Dark mode', exact: true }).waitFor();
    await page.waitForFunction(() => document.querySelector('input[name="theme"]:checked')?.nextElementSibling.textContent === 'Dark mode');
    assert.equal(await page.getByRole('radio', { name: 'Dark mode', exact: true }).isChecked(), true);
    for (const route of ['/intro', '/setup', '/onboarding', '/login']) {
      await open(page, route);
      await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
      await noOverflow(page, `dark ${route}`);
      await page.screenshot({ path: path.join(screenshots, `dark-${route.slice(1)}-390.png`), fullPage: true });
    }
    await open(page, '/settings');
    await page.waitForFunction(() => document.querySelector('.setup-theme-options')?.disabled === false);
    await page.getByRole('radio', { name: 'Light mode', exact: true }).check();
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'light');
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await open(page, '/setup');
      await page.getByText('0/5 Completed', { exact: true }).waitFor();
      await noOverflow(page, `setup at ${width}`);
      const sizes = await page.locator('.setup-list li > a').evaluateAll(items => items.map(item => item.getBoundingClientRect().height));
      assert(sizes.every(height => height >= 48), 'setup touch targets');
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, '/setup');
    await page.evaluate(() => {
      const text = [...document.querySelectorAll('.setup-page .ui-main h1, .setup-page .ui-main h2, .setup-page .ui-main h3, .setup-page .ui-main p, .setup-page .ui-main a, .setup-page .ui-main span')];
      const sizes = text.map(element => parseFloat(getComputedStyle(element).fontSize));
      text.forEach((element, index) => element.style.fontSize = `${sizes[index] * 2}px`);
    });
    await noOverflow(page, 'setup with 200% text');
    await open(page, '/setup');
    await open(page, '/intro');
    await page.waitForFunction(() => !!document.querySelector('.intro-controls button:not(:disabled)'));
    assert.equal(await page.locator('.intro-copy').evaluate(element => getComputedStyle(element).animationName), 'none', 'reduced motion');
    console.log('PASS: keyboard focus, 320–1440px setup, 200% text, touch targets, reduced motion, theme persistence');

    // Synthetic position only. Intercept geocoding so no coordinates leave the test.
    await context.grantPermissions(['geolocation'], { origin: baseURL });
    await context.setGeolocation({ latitude: 10.7501, longitude: 121.9401 });
    let lookups = 0;
    await context.route('https://nominatim.openstreetmap.org/**', async route => {
      lookups++; await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ address: { country_code: 'ph', state: 'Western Visayas', county: 'Antique', town: 'San Jose de Buenavista' } }) });
    });
    await open(page, '/onboarding');
    await page.getByLabel('Household name', { exact: true }).waitFor();
    assert.equal(lookups, 0, 'no location request on mount');
    await page.getByRole('button', { name: 'Try preview', exact: false }).click();
    await page.getByRole('button', { name: 'Use my current location', exact: true }).click();
    await page.getByText('Location suggestion filled in.', { exact: false }).waitFor();
    assert.equal(await page.getByLabel('Province', { exact: true }).inputValue(), 'Antique');
    assert.equal(lookups, 1);
    await open(page, '/setup');
    await page.getByText('0/5 Completed', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => localStorage.getItem('wattsnap-ui-preview-v1')), null, 'lookup does not save or complete setup');
    console.log('PASS: optional synthetic location lookup, correct suggestions, no implicit save');

    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await open(page, '/onboarding');
    await page.getByLabel('Household name', { exact: true }).fill('Offline household');
    await page.getByLabel('Province', { exact: true }).fill('Antique');
    await page.getByLabel('Municipality or city', { exact: true }).fill('San Jose de Buenavista');
    await page.getByRole('button', { name: 'Save household profile', exact: true }).click();
    await open(page, '/setup');
    await page.getByText('1/5 Completed', { exact: true }).waitFor();
    const saved = await page.evaluate(() => localStorage.getItem('wattsnap-ui-preview-v1'));
    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByText('1/5 Completed', { exact: true }).waitFor();
    await page.getByRole('link', { name: 'Review: Complete Household Profile', exact: true }).click();
    await page.getByLabel('Household name', { exact: true }).waitFor();
    assert.equal(await page.getByLabel('Household name', { exact: true }).inputValue(), 'Offline household');
    await page.reload({ waitUntil: 'domcontentloaded' });
    assert.equal(await page.getByLabel('Household name', { exact: true }).inputValue(), 'Offline household');
    await open(page, '/tips');
    await page.getByRole('button', { name: 'Create preview tips', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Create preview tips', exact: true }).isDisabled(), true);
    assert.equal(await page.evaluate(() => localStorage.getItem('wattsnap-ui-preview-v1')), saved);
    await context.setOffline(false);
    await open(page, '/setup');
    await page.getByText('1/5 Completed', { exact: true }).waitFor();
    assert.deepEqual(errors, []);
    console.log('PASS: production offline cold reload, navigation, saved household/progress and reconnect');
  } finally { await context.close(); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
