const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const baseURL = process.env.UI_PREVIEW_URL || 'http://127.0.0.1:3000';
const screenshots = path.join(os.tmpdir(), 'wattsnap-advisory-preparation-preview');
const householdKey = 'wattsnap-ui-preview-v1', advisoryKey = 'wattsnap-advisories-ui-preview-v1';
const seed = { name: 'Preview household', provider: 'anteco', location: 'Payao, San Jose de Buenavista, Antique', locality: { province: 'Antique', municipality: 'San Jose de Buenavista', barangay: 'Payao' }, budget: 1800, bills: [], appliances: [] };
const titles = ['Charge phones and power banks', 'Prepare flashlights or emergency lights', 'Unplug sensitive appliances', 'Keep the refrigerator closed', 'Store drinking water'];
const modal = page => page.locator('dialog.adv-dialog[open]');
const checklist = page => modal(page).getByRole('region', { name: 'Brownout ready checklist', exact: true });
async function ready(page) { await page.waitForFunction(() => { const button = document.querySelector('.aw-source-views button'); return button && !button.disabled; }); }
async function records(page) { return page.evaluate(key => JSON.parse(localStorage.getItem(key)), advisoryKey); }
async function setRecords(page, value) { await page.evaluate(({ key, value }) => { localStorage.setItem(key, JSON.stringify(value)); window.dispatchEvent(new Event('wattsnap-advisories-change')); }, { key: advisoryKey, value }); }
async function openCard(page, title) { await page.getByRole('button', { name: `View ${title}, Affected`, exact: true }).click(); await modal(page).getByRole('heading', { name: title, exact: true }).waitFor(); }
async function assertLayout(page) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'Page fits the viewport');
  assert.equal(await modal(page).evaluate(element => element.scrollWidth <= element.clientWidth + 1), true, 'Dialog fits the viewport');
  const bounds = await modal(page).boundingBox(); assert.ok(bounds.x >= -1 && bounds.y >= -1 && bounds.x + bounds.width <= page.viewportSize().width + 1 && bounds.y + bounds.height <= page.viewportSize().height + 1, 'Dialog stays inside the viewport');
  assert.equal(await page.locator('[data-nextjs-dialog]').count(), 0, 'No framework error overlay');
}
async function flow(browser, viewport, name) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  await context.addInitScript(({ key, seed }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(seed)); }, { key: householdKey, seed });
  const page = await context.newPage(); page.setDefaultTimeout(20000); page.setDefaultNavigationTimeout(45000);
  await page.clock.setFixedTime(new Date('2026-10-07T04:00:00Z'));
  const errors = [], consoleErrors = [], apiRequests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/')) apiRequests.push(request.url()); });
  await page.goto(`${baseURL}/advisories/new`);
  await page.getByRole('button', { name: 'Scheduled sample', exact: true }).click();
  await page.getByRole('heading', { name: 'Confirm your review', exact: true }).waitFor();
  await page.getByLabel('Review title (optional)', { exact: true }).fill('First preparation sample');
  await page.getByRole('checkbox', { name: 'I checked the original and these fields, and kept missing or uncertain values unknown.', exact: true }).check();
  await page.getByRole('button', { name: 'Save reviewed advisory', exact: true }).click(); await page.locator('.aw-saved').waitFor();
  const first = (await records(page))[0];
  await page.getByRole('link', { name: 'View saved advisory', exact: true }).click(); await ready(page);
  await checklist(page).waitFor();
  assert.equal(await checklist(page).getByRole('checkbox').count(), 5);
  for (const title of titles) assert.equal(await checklist(page).getByRole('checkbox', { name: title, exact: true }).isChecked(), false);
  await checklist(page).getByRole('checkbox').nth(0).check(); await checklist(page).getByRole('checkbox').nth(4).check();
  await modal(page).getByRole('button', { name: 'Done', exact: true }).click();
  assert.equal(await page.getByRole('heading', { name: "You're all set!", exact: true }).count(), 0, 'Partial progress cannot show completion');
  await page.getByRole('button', { name: 'Review match', exact: true }).click(); await checklist(page).waitFor();
  assert.equal(await checklist(page).getByRole('checkbox').nth(0).isChecked(), true);
  assert.equal(await checklist(page).getByRole('checkbox').nth(4).isChecked(), true, 'Reopening retains this advisory’s progress');
  await checklist(page).scrollIntoViewIfNeeded(); await assertLayout(page);
  await checklist(page).screenshot({ path: path.join(screenshots, `${name}-checklist.png`) });
  const second = { ...first, id: `${first.id}-second`, details: { ...first.details, title: 'Second preparation sample' } };
  await setRecords(page, [first, second]);
  await modal(page).getByRole('button', { name: 'Close advisory details', exact: true }).click();
  await openCard(page, second.details.title); await checklist(page).waitFor();
  assert.equal(await checklist(page).getByRole('checkbox', { checked: true }).count(), 0, 'A different advisory starts with its own checklist');
  await modal(page).getByRole('button', { name: 'Done', exact: true }).click();
  await openCard(page, first.details.title); await checklist(page).waitFor();
  for (const title of titles) await checklist(page).getByRole('checkbox', { name: title, exact: true }).check();
  assert.equal(await checklist(page).getByRole('checkbox', { checked: true }).count(), 5);
  await modal(page).getByRole('button', { name: 'Done', exact: true }).click();
  await modal(page).getByRole('heading', { name: "You're all set!", exact: true }).waitFor();
  const art = modal(page).locator('img.adv-complete-art');
  assert.match(await art.getAttribute('src'), /All%20Set%20Icon\.png/);
  await art.evaluate(image => image.decode()); assert.equal(await art.evaluate(image => image.naturalWidth > 0), true, 'The requested All Set Icon loads');
  assert.equal(await modal(page).locator('.adv-complete-content').evaluate(element => parseFloat(getComputedStyle(element).paddingTop) >= 52), true, 'Completion header keeps its top spacing on desktop and phone');
  assert.equal(await modal(page).getByRole('button', { name: 'Back to advisories', exact: true }).evaluate(button => button === document.activeElement), true, 'Keyboard focus reaches the completion action');
  await assertLayout(page); await page.screenshot({ path: path.join(screenshots, `${name}-all-set.png`) });
  await modal(page).getByRole('button', { name: 'Review my checklist', exact: true }).click(); await checklist(page).waitFor();
  await checklist(page).getByRole('checkbox').nth(4).uncheck(); await modal(page).getByRole('button', { name: 'Done', exact: true }).click();
  assert.equal(await page.getByRole('heading', { name: "You're all set!", exact: true }).count(), 0, 'Unchecking removes readiness completion');
  await openCard(page, first.details.title);
  await checklist(page).getByRole('checkbox').nth(4).check(); await modal(page).getByRole('button', { name: 'Done', exact: true }).click();
  await modal(page).getByRole('button', { name: 'Back to advisories', exact: true }).click();
  await openCard(page, first.details.title); await checklist(page).waitFor();
  const corrected = { ...first, revision: 2, details: { ...first.details, reason: 'Corrected sample' } };
  await setRecords(page, [corrected, second]);
  await modal(page).getByText('Review 2 ·', { exact: false }).waitFor();
  assert.equal(await checklist(page).getByRole('checkbox', { checked: true }).count(), 0, 'A corrected review cannot inherit a completed checklist');
  await page.evaluate(({ key, seed }) => { localStorage.setItem(key, JSON.stringify({ ...seed, provider: 'akelco' })); window.dispatchEvent(new Event('wattsnap-preview-change')); }, { key: householdKey, seed });
  await modal(page).getByRole('heading', { name: 'Not Listed', exact: true }).waitFor(); assert.equal(await checklist(page).count(), 0, 'A changed household cannot use the earlier checklist');
  await modal(page).getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('group', { name: 'Advisory source view' }).getByRole('button', { name: 'Samples', exact: true }).click();
  const affected = page.locator('.adv-card-button').filter({ has: page.locator('.adv-status-affected') }).first();
  await affected.click(); await checklist(page).waitFor(); assert.equal(await checklist(page).getByRole('checkbox', { checked: true }).count(), 0, 'Gallery samples have separate progress');
  await modal(page).getByRole('button', { name: 'Done', exact: true }).click();
  for (const status of ['possibly-affected', 'not-listed']) {
    await page.locator('.adv-card-button').filter({ has: page.locator(`.adv-status-${status}`) }).first().click();
    assert.equal(await checklist(page).count(), 0, `${status} does not claim an affected-user preparation flow`);
    await modal(page).getByRole('button', { name: 'Done', exact: true }).click();
  }
  await page.getByRole('tab', { name: /^History/ }).click(); await page.locator('.adv-card-button').first().click();
  assert.equal(await checklist(page).count(), 0, 'Restoration updates have no preparation checklist');
  assert.deepEqual(await records(page), [corrected, second], 'Checking preparation never changes advisory originals or fields');
  assert.deepEqual(errors, []); assert.deepEqual(consoleErrors, []); assert.deepEqual(apiRequests, []);
  await context.close(); console.log(`PASS ${name}: inline checklist, completion gating, All Set Icon, review isolation, correction/location resets, sample separation, focus, and responsive layout`);
}
(async () => {
  await fs.mkdir(screenshots, { recursive: true }); const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try { await flow(browser, { width: 1440, height: 1000 }, 'desktop'); await flow(browser, { width: 390, height: 844 }, 'mobile'); await flow(browser, { width: 320, height: 740 }, 'small-phone'); }
  finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
