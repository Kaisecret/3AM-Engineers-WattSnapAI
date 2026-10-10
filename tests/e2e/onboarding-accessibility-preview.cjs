const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const baseURL = process.env.ONBOARDING_PREVIEW_URL || 'http://127.0.0.1:3001';
const screenshots = path.join(os.tmpdir(), 'wattsnap-onboarding-preview');
async function open(page, route) { await page.goto(`${baseURL}${route}`, { waitUntil: 'domcontentloaded', timeout: 60000 }); }
async function noOverflow(page, name) { assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, name); }
async function artwork(page) {
  await page.evaluate(async () => {
    const images = [...document.images].filter(image => image.getBoundingClientRect().width > 0 && !image.closest('dialog:not([open])'));
    for (const image of images) image.loading = 'eager';
    await Promise.all(images.map(image => image.decode()));
  });
}
async function textContrast(page, selector) {
  const results = await page.locator(selector).evaluateAll(elements => elements.map(element => {
    const rgb = color => color.match(/[\d.]+/g)?.slice(0, 3).map(Number);
    const luminance = channels => channels.map(value => value / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
    let background = element; while (background.parentElement && getComputedStyle(background).backgroundColor === 'rgba(0, 0, 0, 0)') background = background.parentElement;
    const style = getComputedStyle(element); const surface = getComputedStyle(background).backgroundColor;
    const a = luminance(rgb(style.color)); const b = luminance(rgb(surface) ?? [255, 255, 255]);
    return { text: element.textContent.slice(0, 50), ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05), target: parseFloat(style.fontSize) >= 24 || (parseFloat(style.fontSize) >= 18.66 && Number(style.fontWeight) >= 700) ? 3 : 4.5 };
  }));
  for (const result of results) assert(result.ratio >= result.target, `contrast ${JSON.stringify(result)}`);
}

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
    for (const route of ['/intro', '/setup', '/onboarding', '/login', '/dashboard', '/bills/new', '/appliances/new', '/tips']) {
      await open(page, route);
      await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
      if (route === '/bills/new') { await page.getByRole('button', { name: 'Type it', exact: true }).click(); await page.getByRole('heading', { name: 'Enter your bill details', exact: true }).waitFor(); }
      if (route === '/appliances/new') { await page.getByRole('button', { name: 'Add device', exact: true }).click(); await page.getByRole('button', { name: 'Enter manually', exact: true }).click(); await page.getByRole('heading', { name: 'Review your appliance', exact: true }).waitFor(); }
      if (route === '/intro') await page.waitForFunction(() => !!document.querySelector('.intro-controls button:not(:disabled)'));
      await noOverflow(page, `dark ${route}`);
      if (route === '/setup') { await page.getByText('0/5 Completed', { exact: true }).waitFor(); await textContrast(page, '.setup-heading h2, .setup-status, .setup-step-label'); }
      await artwork(page);
      await page.screenshot({ path: path.join(screenshots, `dark-${route.slice(1).replaceAll('/', '-')}-390.png`), fullPage: true });
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
      await textContrast(page, '.setup-heading h2, .setup-status, .setup-step-label');
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
    await open(page, '/onboarding');
    await page.getByLabel('Household name', { exact: true }).waitFor();
    await page.evaluate(() => { navigator.geolocation.getCurrentPosition = (_, denied) => denied({ code: 1 }); });
    await page.getByRole('button', { name: 'Try preview', exact: false }).click();
    await page.getByRole('button', { name: 'Use my current location', exact: true }).click();
    await page.getByText('Location permission was declined.', { exact: false }).waitFor();
    assert.equal(await page.getByLabel('Province', { exact: true }).isEnabled(), true);
    assert.equal(lookups, 1, 'denial does not send coordinates');
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
