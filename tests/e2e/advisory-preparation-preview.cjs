const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const baseURL = process.env.UI_PREVIEW_URL || 'http://127.0.0.1:3000';
const screenshots = path.join(os.tmpdir(), 'wattsnap-advisory-preparation-preview');
const householdKey = 'wattsnap-ui-preview-v1', advisoryKey = 'wattsnap-advisories-ui-preview-v1';
const progressKey = 'wattsnap-advisory-checklists-ui-v1', progressEvent = 'wattsnap-advisory-checklists-change';
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
async function closedWithoutPopup(page) {
  await modal(page).waitFor({ state: 'hidden' });
  assert.equal(await page.locator('dialog[open]').count(), 0, 'The review closes without opening another dialog');
  assert.equal(await page.locator('.adv-preparation-toast').count(), 0, 'No checklist toast is shown');
  assert.equal(await page.getByRole('heading', { name: "You're all set!", exact: true }).count(), 0, 'No completion popup is shown');
}
async function home(page) { await page.goto(`${baseURL}/dashboard`); await page.getByRole('heading', { name: 'Monthly Consumption', exact: true }).waitFor(); await page.waitForFunction(() => !!document.querySelector('.ws-checklist-progress') || !!document.querySelector('.ws-checklist-error')); }
async function artwork(page) { await page.evaluate(async () => { const visible = Array.from(document.images).filter(image => { const box = image.getBoundingClientRect(); return box.width > 0 && box.height > 0; }); for (const image of visible) image.loading = 'eager'; await Promise.race([Promise.all(visible.map(image => image.decode())), new Promise((_, reject) => setTimeout(() => reject(new Error('Artwork did not load')), 20000))]); }); }
async function flow(browser, viewport, name) {
  const context = await browser.newContext({ viewport, reducedMotion: name === 'desktop' ? 'no-preference' : 'reduce' });
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
  await modal(page).getByRole('button', { name: 'Done', exact: true }).click(); await closedWithoutPopup(page);
  await page.getByRole('button', { name: 'Review match', exact: true }).click(); await checklist(page).waitFor();
  await checklist(page).getByRole('checkbox').nth(0).check(); await checklist(page).getByRole('checkbox').nth(4).check();
  const actions = modal(page).locator('.aw-detail-actions'); await actions.scrollIntoViewIfNeeded();
  const closeBounds = await actions.getByRole('button', { name: 'Close', exact: true }).boundingBox(), doneBounds = await actions.getByRole('button', { name: 'Done', exact: true }).boundingBox();
  assert.ok(Math.abs(closeBounds.y - doneBounds.y) < 1 && closeBounds.x + closeBounds.width < doneBounds.x, 'Close and Done sit beside each other');
  await assertLayout(page); await actions.screenshot({ path: path.join(screenshots, `${name}-close-and-done.png`) });
  await modal(page).getByRole('button', { name: 'Done', exact: true }).click();
  await closedWithoutPopup(page);
  assert.equal(await page.getByRole('button', { name: 'Review match', exact: true }).evaluate(button => button === document.activeElement), true, 'Done restores focus to the review trigger');
  await page.getByRole('button', { name: 'Review match', exact: true }).click(); await checklist(page).waitFor();
  assert.equal(await checklist(page).getByRole('checkbox', { checked: true }).count(), 2, 'Closing preserves the two completed items');
  await modal(page).getByRole('button', { name: 'Close', exact: true }).click(); await closedWithoutPopup(page);
  await home(page); const homeCard = () => page.locator('.ws-checklist-progress');
  assert.match(await homeCard().innerText(), /2\/5 Done/); assert.equal(await homeCard().getByRole('progressbar').getAttribute('value'), '2');
  assert.match(await homeCard().getAttribute('href'), new RegExp(`${first.id}.*checklist=1`));
  await artwork(page); await page.evaluate(() => scrollTo(0, 0)); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
  await homeCard().screenshot({ path: path.join(screenshots, `${name}-home-progress.png`) }); await page.evaluate(() => scrollTo(0, 0)); await page.screenshot({ path: path.join(screenshots, `${name}-home-overview.png`) });
  await page.reload(); await homeCard().waitFor(); assert.match(await homeCard().innerText(), /2\/5 Done/, 'Home progress survives a reload');
  await homeCard().click(); await ready(page); await checklist(page).waitFor();
  assert.equal(await checklist(page).getByRole('checkbox').nth(1).evaluate(input => input === document.activeElement), true, 'Home resumes the selected advisory at its first unchecked item');
  for (const title of titles) await checklist(page).getByRole('checkbox', { name: title, exact: true }).check();
  await modal(page).getByRole('button', { name: 'Close', exact: true }).click(); await closedWithoutPopup(page);
  await openCard(page, first.details.title); await checklist(page).waitFor(); assert.equal(await checklist(page).getByRole('checkbox', { checked: true }).count(), 5, 'Close preserves a completed checklist without a confirmation popup');
  await modal(page).getByRole('button', { name: 'Done', exact: true }).click(); await modal(page).getByRole('button', { name: 'Back to advisories', exact: true }).click();
  await page.goto(`${baseURL}/dashboard`); await page.getByRole('heading', { name: 'Monthly Consumption', exact: true }).waitFor();
  await page.locator('.ws-advisory h2').filter({ hasText: '1 saved notice matches your inputs' }).waitFor({ state: 'attached' }); assert.equal(await homeCard().count(), 0, 'The reminder disappears after all five items are checked');
  await page.goto(`${baseURL}/advisories?reviewed=${first.id}&checklist=1`); await ready(page); await checklist(page).waitFor();
  for (const index of [1, 2, 3]) await checklist(page).getByRole('checkbox').nth(index).uncheck();
  if (name === 'mobile') {
    const progressBeforeFailure = await page.evaluate(key => localStorage.getItem(key), progressKey);
    await page.evaluate(key => { const original = Storage.prototype.setItem; window.restoreChecklistStorage = () => { Storage.prototype.setItem = original; }; Storage.prototype.setItem = function(name, value) { if (name === key) throw new DOMException('Blocked for test', 'QuotaExceededError'); return original.call(this, name, value); }; }, progressKey);
    await checklist(page).getByRole('checkbox').nth(1).click(); await modal(page).getByRole('alert').filter({ hasText: 'could not be saved' }).waitFor();
    assert.equal(await checklist(page).getByRole('checkbox').nth(1).isChecked(), false, 'Failed saves keep the last saved count');
    assert.equal(await page.evaluate(key => localStorage.getItem(key), progressKey), progressBeforeFailure);
    await modal(page).getByRole('button', { name: 'Done', exact: true }).click(); await closedWithoutPopup(page);
    await page.evaluate(() => window.restoreChecklistStorage()); await openCard(page, first.details.title); await checklist(page).waitFor(); await modal(page).getByRole('button', { name: 'Retry loading checklist', exact: true }).click();
    await page.evaluate(({ key, event }) => { localStorage.setItem(key, 'broken-checklist-json'); window.dispatchEvent(new Event(event)); }, { key: progressKey, event: progressEvent });
    await modal(page).getByRole('alert').filter({ hasText: 'could not be opened' }).waitFor(); assert.equal(await checklist(page).getByRole('checkbox').first().isDisabled(), true);
    await home(page); assert.equal(await homeCard().count(), 0, 'Unreadable progress never becomes a false 0/5 card');
    assert.equal(await page.evaluate(key => localStorage.getItem(key), progressKey), 'broken-checklist-json', 'Unreadable progress is not overwritten');
    await page.evaluate(({ key, event, value }) => { localStorage.setItem(key, value); window.dispatchEvent(new Event(event)); }, { key: progressKey, event: progressEvent, value: progressBeforeFailure });
    await homeCard().waitFor(); assert.match(await homeCard().innerText(), /2\/5 Done/); await homeCard().click(); await ready(page); await checklist(page).waitFor();
  }
  await modal(page).getByRole('button', { name: 'Close advisory details', exact: true }).click();
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
  await modal(page).getByRole('button', { name: 'Done', exact: true }).focus(); await page.keyboard.press('Enter'); await closedWithoutPopup(page);
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
  await closedWithoutPopup(page);
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
  await page.goto(`${baseURL}/dashboard`); await page.locator('.ws-advisory h2').filter({ hasText: 'Review advisory matches' }).waitFor({ state: 'attached' }); assert.equal(await homeCard().count(), 0, 'A changed household removes the old preparation reminder');
  await page.goto(`${baseURL}/advisories`); await ready(page);
  await page.getByRole('group', { name: 'Advisory source view' }).getByRole('button', { name: 'Samples', exact: true }).click();
  const affected = page.locator('.adv-card-button').filter({ has: page.locator('.adv-status-affected') }).first();
  await affected.click(); await checklist(page).waitFor(); assert.equal(await checklist(page).getByRole('checkbox', { checked: true }).count(), 0, 'Gallery samples have separate progress');
  await modal(page).getByRole('button', { name: 'Done', exact: true }).click(); await closedWithoutPopup(page);
  await affected.click(); await checklist(page).waitFor();
  const savedProgressBeforeSample = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).entries, progressKey);
  await checklist(page).getByRole('checkbox').nth(2).check(); await checklist(page).getByRole('checkbox').nth(3).check();
  assert.match(await checklist(page).locator('h3').innerText(), /2\/5/);
  await modal(page).getByRole('button', { name: 'Done', exact: true }).click(); await closedWithoutPopup(page);
  await home(page); assert.match(await homeCard().innerText(), /2\/5 Done/); assert.match(await homeCard().innerText(), /Sample/);
  assert.match(await homeCard().getAttribute('href'), /sample=sample-gallery-scheduled.*checklist=1/);
  const cardBounds = await homeCard().boundingBox(), greetingBounds = await page.locator('.ws-greeting').boundingBox(), consumptionBounds = await page.locator('.ws-consumption').boundingBox();
  assert.ok(cardBounds.y >= greetingBounds.y + greetingBounds.height && cardBounds.y + cardBounds.height <= consumptionBounds.y, 'The checklist progress card appears directly below the greeting');
  await artwork(page); await page.screenshot({ path: path.join(screenshots, `${name}-sample-home-overview.png`), animations: 'disabled' });
  await page.reload(); await homeCard().waitFor(); assert.match(await homeCard().innerText(), /2\/5 Done/, 'Gallery progress survives leaving Advisories and reloading Home');
  await homeCard().click(); await ready(page); await checklist(page).waitFor();
  assert.equal(await page.getByRole('group', { name: 'Advisory source view' }).getByRole('button', { name: 'Samples', exact: true }).getAttribute('aria-pressed'), 'true');
  assert.equal(await checklist(page).getByRole('checkbox', { checked: true }).count(), 2);
  assert.equal(await checklist(page).getByRole('checkbox').nth(0).evaluate(input => input === document.activeElement), true, 'Home resumes the sample at its first unchecked item');
  if (name === 'mobile') {
    const beforeFailure = await page.evaluate(key => localStorage.getItem(key), progressKey);
    await page.evaluate(key => { const original = Storage.prototype.setItem; window.restoreSampleStorage = () => { Storage.prototype.setItem = original; }; Storage.prototype.setItem = function(name, value) { if (name === key) throw new Error('Sample storage blocked'); return original.call(this, name, value); }; }, progressKey);
    await checklist(page).getByRole('checkbox').nth(1).click(); await modal(page).getByRole('alert').filter({ hasText: 'could not be saved' }).waitFor();
    assert.equal(await checklist(page).getByRole('checkbox').nth(1).isChecked(), false);
    assert.equal(await page.evaluate(key => localStorage.getItem(key), progressKey), beforeFailure);
    await modal(page).getByRole('button', { name: 'Done', exact: true }).click(); await closedWithoutPopup(page);
    await page.evaluate(() => window.restoreSampleStorage());
    await home(page); assert.match(await homeCard().innerText(), /2\/5 Done/);
    await homeCard().click(); await ready(page); await checklist(page).waitFor();
  }
  for (const title of titles) await checklist(page).getByRole('checkbox', { name: title, exact: true }).check();
  await modal(page).getByRole('button', { name: 'Done', exact: true }).click(); await modal(page).getByRole('heading', { name: "You're all set!", exact: true }).waitFor();
  await modal(page).getByRole('button', { name: 'Back to advisories', exact: true }).click();
  await page.goto(`${baseURL}/dashboard`); await page.locator('.ws-advisory h2').filter({ hasText: 'Review advisory matches' }).waitFor({ state: 'attached' });
  assert.equal(await homeCard().count(), 0, 'A completed sample no longer shows an incomplete progress card');
  assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).entries, progressKey), savedProgressBeforeSample, 'Sample checks do not overwrite saved advisory progress');
  await page.goto(`${baseURL}/advisories`); await ready(page);
  await page.getByRole('group', { name: 'Advisory source view' }).getByRole('button', { name: 'Samples', exact: true }).click();
  for (const status of ['possibly-affected', 'not-listed']) {
    await page.locator('.adv-card-button').filter({ has: page.locator(`.adv-status-${status}`) }).first().click();
    assert.equal(await checklist(page).count(), 0, `${status} does not claim an affected-user preparation flow`);
    await modal(page).getByRole('button', { name: 'Done', exact: true }).click();
  }
  await page.getByRole('tab', { name: /^History/ }).click(); await page.locator('.adv-card-button').first().click();
  assert.equal(await checklist(page).count(), 0, 'Restoration updates have no preparation checklist');
  assert.deepEqual(await records(page), [corrected, second], 'Checking preparation never changes advisory originals or fields');
  assert.deepEqual(errors, []); assert.deepEqual(consoleErrors, []); assert.deepEqual(apiRequests, []);
  await context.close(); console.log(`PASS ${name}: footer Close, incomplete Done closes without popups, saved Home progress, resume/reload, completion hiding, All Set Icon, isolated reviews/samples, location/revision resets, focus, and layout${name === 'mobile' ? ', failed storage and recovery' : ''}`);
}
(async () => {
  await fs.mkdir(screenshots, { recursive: true }); const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try { await flow(browser, { width: 1440, height: 1000 }, 'desktop'); await flow(browser, { width: 390, height: 844 }, 'mobile'); await flow(browser, { width: 320, height: 740 }, 'small-phone'); }
  finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
