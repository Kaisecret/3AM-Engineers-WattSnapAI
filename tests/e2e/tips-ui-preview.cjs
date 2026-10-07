const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const baseURL = process.env.UI_PREVIEW_URL || 'http://127.0.0.1:3000';
const screenshots = path.join(os.tmpdir(), 'wattsnap-tips-ui-preview');
const householdKey = 'wattsnap-ui-preview-v1';
const tipsKey = 'wattsnap-tips-ui-preview-v1';
const seed = { name: 'Santos household', provider: 'anteco', location: 'San Jose de Buenavista, Antique', budget: 1800, appliances: [
  { id: 'fridge', name: 'Kitchen refrigerator', kind: 'fridge', watts: 100, hours: 24, quantity: 1, source: 'manual', wattageBasis: 'nameplate' },
  { id: 'fan', name: 'Bedroom fan', kind: 'fan', watts: 55, hours: 8, quantity: 1, source: 'manual', wattageBasis: 'nameplate' }
], bills: [
  { id: 'august', month: '2026-08', amount: 1200, kwh: 100, periodStart: '2026-08-01', periodEnd: '2026-08-30', source: 'manual' },
  { id: 'september', month: '2026-09', amount: 1440, kwh: 120, periodStart: '2026-08-31', periodEnd: '2026-09-29', source: 'manual' }
] };
async function contextFor(browser, viewport, data = seed) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  await context.addInitScript(({ householdKey, data }) => { if (!localStorage.getItem(householdKey)) localStorage.setItem(householdKey, JSON.stringify(data)); }, { householdKey, data });
  return context;
}
async function waitReady(page) { await page.waitForFunction(() => { const button = document.querySelector('.tt-refresh-actions .ui-primary'); return button && !button.disabled; }); }
async function savedTips(page) { return page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null'), tipsKey); }
async function snapshot(page, name) {
  console.log(`CHECK: ${name}`);
  await page.evaluate(async () => { const visible = Array.from(document.images).filter(image => { const box = image.getBoundingClientRect(); return box.width > 0 && box.height > 0 && getComputedStyle(image).visibility !== 'hidden'; }); for (const image of visible) if (image.loading === 'lazy') image.loading = 'eager'; await Promise.race([Promise.all(visible.map(image => image.decode().catch(() => {}))), new Promise((_, reject) => setTimeout(() => reject(new Error(`Artwork decoding timed out: ${JSON.stringify(visible.filter(image => !image.complete).map(image => ({ src: image.currentSrc || image.src, box: image.getBoundingClientRect().toJSON() })))}`)), 20000))]); });
  assert.equal(await page.locator('[data-nextjs-dialog]').count(), 0, 'No framework error overlay');
  assert.equal(await page.locator('[data-next-badge][data-error="true"]').count(), 0, 'No development issue badge');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${name}: no page overflow`);
  for (const selector of ['.tt-inputs', '.tt-tip-grid', '.tt-freshness', '.ws-tip-preview']) if (await page.locator(selector).count()) assert.equal(await page.locator(selector).evaluate(element => element.scrollWidth <= element.clientWidth + 1), true, `${name}: ${selector} fits its width`);
  assert.deepEqual(await page.locator('img').evaluateAll(images => images.filter(image => image.getClientRects().length > 0 && (!image.complete || image.naturalWidth === 0)).map(image => image.src)), [], 'Visible artwork loads');
  if (await page.locator('.tt-hero').count()) {
    const text = await page.locator('.tt-hero > div').boundingBox(), art = await page.locator('.tt-hero img').boundingBox();
    assert.ok(text.x + text.width <= art.x || text.y + text.height <= art.y, 'Hero copy and artwork do not overlap');
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: path.join(screenshots, `${name}.png`), fullPage: true });
}
async function create(page) {
  await page.getByRole('button', { name: 'Create preview tips', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Preparing preview tips' }).waitFor();
  await page.getByRole('status').filter({ hasText: 'Preview tips refreshed and saved' }).waitFor();
}
async function flow(browser, viewport, name) {
  const context = await contextFor(browser, viewport), page = await context.newPage(); page.setDefaultTimeout(20000);
  const errors = [], consoleErrors = [], aiRequests = []; let offline = false;
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && !(offline && message.text().includes('net::ERR_INTERNET_DISCONNECTED'))) consoleErrors.push(message.text()); });
  page.on('request', request => { if (request.url().includes('/api/ai/')) aiRequests.push(request.url()); });
  await page.goto(`${baseURL}/dashboard`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: "Santos household's account", exact: true }).waitFor();
  await page.getByRole('link', { name: 'View Tipid Tips', exact: true }).waitFor();
  await page.getByText('Create tips from your reviewed records', { exact: true }).waitFor();
  await snapshot(page, `${name}-home`);
  await page.getByRole('link', { name: 'View Tipid Tips', exact: true }).click(); await waitReady(page);
  await page.getByRole('heading', { name: 'No saved tips yet', exact: true }).waitFor();
  await snapshot(page, `${name}-empty`); await create(page);
  await page.getByRole('heading', { name: 'Based on your current saved inputs', exact: true }).waitFor();
  assert.equal(await page.locator('.tt-tip').count(), 3);
  const fridge = page.locator('.tt-tip').filter({ has: page.getByRole('heading', { name: 'Care for Kitchen refrigerator', exact: true }) });
  assert.match(await fridge.innerText(), /Keep the refrigerator powered for food storage/);
  assert.match(await fridge.innerText(), /highest estimated use/);
  await fridge.locator('summary').click();
  assert.match(await fridge.innerText(), /100 W × 1 × 24 hours\/day × 30 days/);
  assert.match(await fridge.innerText(), /72\.00 kWh over 30 days/);
  assert.match(await page.locator('.tt-tip.is-bill').innerText(), /20\.00 kWh \(20\.0%\) higher/);
  const original = await savedTips(page);
  assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), householdKey), seed, 'Creating tips preserves household records');
  assert.equal(original.origin, 'household'); assert.equal(original.context.sample, false);
  assert.equal(await page.locator('.tt-tip').filter({ hasText: 'aircon' }).count(), 0, 'No invented appliance ownership');
  await snapshot(page, `${name}-generated`);
  const filters = page.getByRole('group', { name: 'Filter tips', exact: true });
  await filters.getByRole('button', { name: 'Appliances', exact: true }).click(); assert.equal(await page.locator('.tt-tip').count(), 2);
  await filters.getByRole('button', { name: 'Bills', exact: true }).click(); assert.equal(await page.locator('.tt-tip').count(), 1);
  await filters.getByRole('button', { name: 'All tips', exact: true }).click();
  await page.locator('.tt-preview-controls summary').click();
  await page.getByLabel('Preview refresh result', { exact: true }).selectOption('timeout');
  await page.getByRole('button', { name: 'Refresh tips', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Timeout example:' }).waitFor();
  assert.deepEqual(await savedTips(page), original, 'Timeout preserves the saved snapshot');
  await snapshot(page, `${name}-timeout`);
  await page.getByLabel('Preview refresh result', { exact: true }).selectOption('limit');
  await page.getByRole('button', { name: 'Refresh tips', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Request-limit example:' }).waitFor();
  assert.deepEqual(await savedTips(page), original, 'Request limit preserves saved tips');
  await page.getByLabel('Preview refresh result', { exact: true }).selectOption('success');
  await page.getByRole('button', { name: 'Refresh tips', exact: true }).click();
  await page.getByRole('button', { name: 'Cancel refresh', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Refresh cancelled.' }).waitFor();
  assert.deepEqual(await savedTips(page), original, 'Cancellation preserves saved tips');
  const changed = { ...seed, appliances: [{ ...seed.appliances[0], watts: 120 }, seed.appliances[1]], bills: [seed.bills[0], { ...seed.bills[1], kwh: 130 }] };
  await page.evaluate(({ key, changed }) => { localStorage.setItem(key, JSON.stringify(changed)); window.dispatchEvent(new Event('wattsnap-preview-change')); }, { key: householdKey, changed });
  await page.getByRole('heading', { name: 'Your inputs changed', exact: true }).waitFor();
  assert.deepEqual(await savedTips(page), original, 'Input edits mark older tips instead of replacing them');
  offline = true; await context.setOffline(true);
  await page.getByRole('status').filter({ hasText: 'Your saved tips are still readable.' }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Refresh tips', exact: true }).isDisabled(), true);
  assert.equal(await page.locator('.tt-tip').count(), 3); await snapshot(page, `${name}-offline-stale`);
  await context.setOffline(false); offline = false; await waitReady(page);
  await page.getByLabel('Preview refresh result', { exact: true }).selectOption('timeout');
  await page.getByRole('button', { name: 'Refresh tips', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Timeout example:' }).waitFor();
  await page.getByRole('button', { name: 'Retry refresh', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Preview tips refreshed and saved' }).waitFor();
  await page.getByRole('heading', { name: 'Based on your current saved inputs', exact: true }).waitFor();
  const refreshed = await savedTips(page); assert.notEqual(refreshed.generatedAt, original.generatedAt);
  assert.match(refreshed.tips.find(tip => tip.id === 'appliance-fridge').facts[0], /120 W/);
  assert.match(refreshed.tips.find(tip => tip.id === 'bill-review').reason, /30\.0%/);
  await page.reload(); await waitReady(page); assert.deepEqual(await savedTips(page), refreshed);
  await page.getByRole('link', { name: 'Open Watt-If', exact: true }).click(); await page.waitForURL('**/simulator');
  await page.getByRole('heading', { name: 'Try a change. See its impact.', exact: false }).waitFor();
  await page.goto(`${baseURL}/dashboard`); await page.getByText('Saved advice preview', { exact: true }).waitFor();
  await page.getByRole('link', { name: 'View Tipid Tips', exact: true }).click(); await waitReady(page);
  await page.getByRole('link', { name: 'Review bill history', exact: true }).click(); await page.waitForURL('**/bills');
  await page.goto(`${baseURL}/tips`); await waitReady(page);
  await page.getByRole('link', { name: 'Review appliance inputs', exact: true }).click(); await page.waitForURL('**/appliances');
  assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), householdKey), changed);
  assert.deepEqual(errors, []); assert.deepEqual(consoleErrors, []); assert.deepEqual(aiRequests, []);
  await context.close(); console.log(`PASS: ${name} navigation, input-based tips, filters, saved snapshots, refresh failures, cancellation, stale/offline states, reload, and layout`);
}
async function emptySampleAndErrors(browser) {
  const empty = { ...seed, appliances: [], bills: [] };
  const context = await contextFor(browser, { width: 390, height: 844 }, empty), page = await context.newPage(); page.setDefaultTimeout(20000);
  await page.goto(`${baseURL}/tips`); await waitReady(page); await create(page);
  assert.equal(await page.locator('.tt-tip.is-getting-started').count(), 2); assert.equal(await page.locator('.tt-tip.is-appliance').count(), 0);
  await page.locator('.tt-limitations summary').click();
  assert.match(await page.locator('.tt-limitations').innerText(), /No appliances are saved/);
  await page.getByRole('group', { name: 'Filter tips' }).getByRole('button', { name: 'Appliances', exact: true }).click();
  await page.getByRole('heading', { name: 'No appliance tips yet', exact: true }).waitFor(); await snapshot(page, 'empty-inputs');
  await page.evaluate(key => { localStorage.removeItem(key); window.dispatchEvent(new Event('wattsnap-tips-change')); }, tipsKey);
  await page.getByRole('button', { name: 'Try sample household', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Preview tips refreshed and saved' }).waitFor();
  await page.getByRole('heading', { name: 'Tips from a sample household', exact: true }).waitFor();
  assert.equal((await savedTips(page)).origin, 'sample');
  assert.equal(await page.locator('.tt-tip-top small').count(), await page.locator('.tt-tip').count(), 'All sample household tips labeled');
  assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), householdKey), empty); await snapshot(page, 'sample-household');
  // Storage failure retains readable earlier tips, and never announces a successful save.
  const previous = await savedTips(page);
  await page.evaluate(() => { window.restoreStorage = Storage.prototype.setItem; Storage.prototype.setItem = function () { throw new Error('Storage blocked for test'); }; });
  await page.getByRole('button', { name: 'Refresh tips', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Your previous saved tips are still available' }).waitFor();
  assert.deepEqual(await savedTips(page), previous);
  assert.equal(await page.getByRole('status').filter({ hasText: 'Preview tips refreshed and saved' }).count(), 0);
  await page.evaluate(key => { Storage.prototype.setItem = window.restoreStorage; localStorage.removeItem(key); window.dispatchEvent(new Event('wattsnap-tips-change')); Storage.prototype.setItem = function () { throw new Error('Storage blocked for test'); }; }, tipsKey);
  await page.getByRole('button', { name: 'Create preview tips', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'No tips have been saved yet' }).waitFor();
  assert.equal(await savedTips(page), null); await context.close();
  const corrupt = await contextFor(browser, { width: 320, height: 740 });
  await corrupt.addInitScript(key => localStorage.setItem(key, '{invalid json'), tipsKey);
  const badPage = await corrupt.newPage(); await badPage.goto(`${baseURL}/tips`); await waitReady(badPage);
  await badPage.getByRole('alert').filter({ hasText: 'Saved tips could not be opened' }).waitFor(); await create(badPage);
  assert.equal((await savedTips(badPage)).version, 'tips-ui-v1'); await corrupt.close();
  const qualified = await contextFor(browser, { width: 390, height: 844 }, { ...seed, bills: seed.bills.map(({ periodStart, periodEnd, ...bill }) => bill) });
  const qPage = await qualified.newPage(); await qPage.goto(`${baseURL}/tips`); await waitReady(qPage); await create(qPage);
  assert.doesNotMatch(await qPage.locator('.tt-tip.is-bill').innerText(), /20\.0%/);
  await qPage.locator('.tt-limitations summary').click(); assert.match(await qPage.locator('.tt-limitations').innerText(), /Exact billing dates are missing/); await snapshot(qPage, 'unverified-bill-periods');
  await qualified.close(); console.log('PASS: empty household, labeled sample tips, qualified bill comparisons, storage failures, and corrupt snapshot recovery');
}
(async () => {
  await fs.mkdir(screenshots, { recursive: true }); const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const [name, width, height] of [['desktop', 1440, 900], ['tablet', 1024, 768], ['mobile', 390, 844], ['small-mobile', 320, 740]]) await flow(browser, { width, height }, name);
    await emptySampleAndErrors(browser); console.log(`Screenshots: ${screenshots}`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
