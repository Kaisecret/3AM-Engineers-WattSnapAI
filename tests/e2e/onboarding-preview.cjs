const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const baseURL = process.env.ONBOARDING_PREVIEW_URL || 'http://127.0.0.1:3000';
const screenshots = path.join(os.tmpdir(), 'wattsnap-onboarding-preview');

async function introduction(browser, width, height) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(60000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${baseURL}/intro`);
  await page.getByRole('button', { name: 'Get Started', exact: true }).click();
  await page.getByRole('heading', { name: 'Know your bill at a glance.' }).waitFor();
  await page.reload();
  await page.getByRole('heading', { name: 'Know your bill at a glance.' }).waitFor();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.getByRole('heading', { name: 'Smarter energy. Easier days.' }).waitFor();
  for (let index = 0; index < 4; index++) {
    await page.getByRole('button', { name: new RegExp(`^Screen ${index + 1}:`) }).click();
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `screen ${index + 1} overflow at ${width}`);
    assert.equal(await page.locator('.intro-dots [aria-current="step"]').count(), 1);
    const buttons = await page.locator('.intro-page button').evaluateAll(items => items.map(item => ({ width: item.getBoundingClientRect().width, height: item.getBoundingClientRect().height })));
    assert(buttons.every(item => item.width >= 44 && item.height >= 48), `navigation touch targets: ${JSON.stringify(buttons)}`);
    await page.screenshot({ path: path.join(screenshots, `intro-${index + 1}-${width}.png`), fullPage: true });
  }
  await page.getByRole('button', { name: 'Finish introduction and set up your home' }).click();
  await page.waitForURL('**/setup**');
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('wattsnap-intro-v1')).status), 'completed');
  await page.goto(`${baseURL}/intro`);
  await page.getByRole('button', { name: 'Skip', exact: true }).first().click();
  await page.waitForURL('**/setup**');
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('wattsnap-intro-v1')).status), 'skipped');
  assert.deepEqual(errors, []);
  await context.close();
  console.log(`PASS: introduction navigation, refresh, skip, completion and ${width}px layout`);
}

async function returningUserFlow(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(60000);
  // Signed-out visitors go straight to login; the introduction is shown after creating an account.
  await page.goto(`${baseURL}/welcome`);
  await page.waitForURL('**/login');
  await page.getByLabel('Email or Username', { exact: true }).fill('onboarding-test@example.com');
  await page.getByLabel('Password', { exact: true }).fill('LocalPreview2026!');
  await page.locator('#login-submit-button').click();
  await page.waitForURL('**/dashboard');
  await page.goto(`${baseURL}/welcome`);
  await page.waitForURL('**/dashboard');
  await page.goto(`${baseURL}/settings`);
  await page.locator('.st-logout-button').click();
  await page.locator('.lo-dialog[open] .lo-confirm').click();
  await page.waitForURL('**/login');
  assert.equal(await page.evaluate(() => localStorage.getItem('wattsnap-preview-session-v1')), null);
  await page.goto(`${baseURL}/welcome`);
  await page.waitForURL('**/login');
  await page.evaluate(() => localStorage.removeItem('wattsnap-intro-v1'));
  await page.goto(`${baseURL}/welcome`);
  await page.waitForURL('**/login');
  assert.equal(await page.evaluate(() => localStorage.getItem('wattsnap-intro-v1')), null, 'known returning identity bypasses intro even without an intro marker');
  await context.close();
  console.log('PASS: first visit, returning signed-in/signed-out entry and logout preservation');
}

(async () => {
  await fs.mkdir(screenshots, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const [width, height] of [[1440, 900], [390, 844], [320, 740]]) await introduction(browser, width, height);
    await returningUserFlow(browser);
    console.log(`Screenshots: ${screenshots}`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
