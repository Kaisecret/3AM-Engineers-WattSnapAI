const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const baseURL = process.env.AUTH_PREVIEW_URL || 'http://127.0.0.1:3000';
const screenshots = path.join(os.tmpdir(), 'wattsnap-auth-preview');

async function checkScreen(page, name) {
  await page.locator('h1').waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => Array.from(document.images).every(image => image.complete && image.naturalWidth > 0));
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, `${name}: horizontal overflow`);
  const controls = await page.locator('.auth-content input:not([type="file"]), .auth-content button, .auth-title').evaluateAll(elements => elements.filter(element => element.getClientRects().length > 0).map(element => {
    const bounds = element.getBoundingClientRect();
    return { tag: element.tagName, left: bounds.left, right: bounds.right, width: bounds.width };
  }));
  assert(controls.every(control => control.width > 0 && control.left >= 0 && control.right <= page.viewportSize().width), `${name}: control outside viewport`);
  await page.screenshot({ path: path.join(screenshots, `${name}.png`), fullPage: true, animations: 'disabled' });
}

async function signup(page, viewport) {
  await page.goto(`${baseURL}/signup`);
  await checkScreen(page, `signup-${viewport}`);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'full name' }).waitFor();
  await page.getByLabel('Full Name', { exact: true }).fill('Maria Santos');
  await page.getByLabel('Email Address', { exact: true }).fill('maria@gmail.com');
  await page.getByLabel('Password', { exact: true }).fill('Sunshine2026!');
  await page.getByRole('button', { name: 'Show password', exact: true }).click();
  assert.equal(await page.locator('#signup-password').getAttribute('type'), 'text');
  await page.getByRole('button', { name: 'Hide password', exact: true }).click();
  await page.locator('#signup-terms').check();
  await page.locator('#signup-submit-button').click();
  await page.getByRole('heading', { name: 'Verify Your Email' }).waitFor();
  assert(await page.getByText('maria@gmail.com', { exact: true }).isVisible());
  assert.equal(await page.locator('#verify-code-button').isDisabled(), true);
  await checkScreen(page, `verify-${viewport}`);
  await page.getByRole('button', { name: 'Go back', exact: true }).click();
  assert.equal(await page.locator('#signup-email').inputValue(), 'maria@gmail.com');
  await page.locator('#signup-submit-button').click();
  await page.getByLabel('Digit 1', { exact: true }).fill('123456');
  assert.deepEqual(await page.locator('.auth-otp-input').evaluateAll(inputs => inputs.map(input => input.value)), ['1', '2', '3', '4', '5', '6']);
  await page.locator('#verify-code-button').click();
  await page.getByRole('button', { name: 'Go back', exact: true }).click();
  await page.waitForTimeout(750);
  assert(await page.getByRole('heading', { name: 'Create Your Account' }).isVisible(), 'Verification should stay cancelled after going back');
  await page.locator('#signup-submit-button').click();
  await page.getByLabel('Digit 1', { exact: true }).fill('123456');
  await page.locator('#verify-code-button').click();
  await page.getByRole('heading', { name: "Let's Set Up Your Profile" }).waitFor();
  assert.equal(await page.locator('#profile-name').inputValue(), 'Maria Santos');
  await checkScreen(page, `profile-empty-${viewport}`);
  if (viewport !== 'desktop') {
    const buttonBounds = await page.locator('#profile-continue-button').boundingBox();
    for (const id of ['profile-name', 'profile-birthdate', 'profile-username']) {
      const inputBounds = await page.locator(`#${id}`).boundingBox();
      const labelBounds = await page.locator(`label[for="${id}"]`).boundingBox();
      assert(Math.abs(inputBounds.width - buttonBounds.width) < 1, `${id}: mobile field should fill the form width`);
      assert(labelBounds.y + labelBounds.height <= inputBounds.y, `${id}: mobile label should sit above its field`);
    }
    assert.equal(await page.locator('.auth-profile-heading .auth-subtitle').isVisible(), false);
    assert.equal(await page.locator('#profile-photo').count(), 0);
  }
  await page.getByLabel('Birth Date', { exact: true }).fill('2000-03-15');
  await page.getByLabel('Username', { exact: true }).fill('mariasantos');
  await checkScreen(page, `profile-${viewport}`);
  await page.locator('#profile-continue-button').click();
  await page.getByRole('heading', { name: 'Welcome to WattSnap!' }).waitFor();
  await checkScreen(page, `welcome-${viewport}`);
  await page.locator('#welcome-get-started').click();
  await page.waitForURL('**/intro');
  await page.getByRole('button', { name: 'Skip', exact: true }).first().click();
  await page.waitForURL('**/setup');
}

async function reset(page, viewport) {
  await page.goto(`${baseURL}/login`);
  await checkScreen(page, `login-${viewport}`);
  await page.getByRole('link', { name: 'Forgot password?' }).click();
  await checkScreen(page, `forgot-${viewport}`);
  await page.getByLabel('Email Address', { exact: true }).fill('maria@gmail.com');
  await page.locator('#forgot-send-code-button').click();
  await page.getByRole('heading', { name: 'Check Your Email' }).waitFor();
  for (let i = 0; i < 6; i++) await page.getByLabel(`Digit ${i + 1}`, { exact: true }).fill(String(i + 1));
  await page.locator('#verify-code-button').click();
  await page.waitForURL('**/reset-password');
  await checkScreen(page, `reset-${viewport}`);
  await page.getByLabel('New Password', { exact: true }).fill('Sunshine2026!');
  await page.getByLabel('Confirm New Password', { exact: true }).fill('Sunshine2027!');
  assert.equal(await page.locator('#reset-password-button').isDisabled(), true);
  await page.getByLabel('Confirm New Password', { exact: true }).fill('Sunshine2026!');
  await page.locator('#reset-password-button').click();
  await page.getByRole('heading', { name: 'Password Updated!' }).waitFor();
  await checkScreen(page, `reset-done-${viewport}`);
  await page.locator('#reset-back-to-login').click();
  await page.waitForURL('**/login');
  await page.getByLabel('Email or Username', { exact: true }).fill('maria@gmail.com');
  await page.getByLabel('Password', { exact: true }).fill('Sunshine2026!');
  await page.locator('#login-submit-button').click();
  await page.waitForURL('**/dashboard');
}

async function google(page, viewport) {
  await page.goto(`${baseURL}/signup`);
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await checkScreen(page, `google-${viewport}`);
  await page.locator('#google-account-primary').click();
  await page.getByRole('heading', { name: "Let's Set Up Your Profile" }).waitFor();
  assert.equal(await page.locator('#profile-name').inputValue(), 'Maria Santos');
  await page.getByRole('button', { name: 'Go back', exact: true }).click();
  await page.locator('#google-account-other').click();
  await page.locator('#google-other-email').fill('ana@gmail.com', { timeout: 5000 });
  await page.locator('#google-other-name').fill('Ana Reyes');
  await page.locator('#google-other-continue').click();
  await page.getByRole('heading', { name: "Let's Set Up Your Profile" }).waitFor();
  assert.equal(await page.locator('#profile-name').inputValue(), 'Ana Reyes');
  await page.goto(`${baseURL}/login`);
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await page.locator('#google-account-primary').click();
  await page.waitForURL('**/dashboard');
}

(async () => {
  await fs.mkdir(screenshots, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const errors = [];
  try {
    for (const [name, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844], ['small-mobile', 320, 740]]) {
      const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
      page.on('pageerror', error => errors.push(error.message));
      await signup(page, name);
      await reset(page, name);
      await google(page, name);
      await page.close();
      console.log(`PASS: ${name} signup, reset, login, Google, image loading, and layout`);
    }
    assert.deepEqual(errors, [], 'Browser runtime errors');
    console.log(`Screenshots: ${screenshots}`);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
