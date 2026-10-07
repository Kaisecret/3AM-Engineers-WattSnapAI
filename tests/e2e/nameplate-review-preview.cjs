const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const baseURL = process.env.UI_PREVIEW_URL || 'http://127.0.0.1:3000';
const screenshots = path.join(os.tmpdir(), 'wattsnap-nameplate-review-preview');
const storageKey = 'wattsnap-ui-preview-v1';
const seed = { name: 'Santos household', provider: 'anteco', location: 'San Jose de Buenavista, Antique', budget: 1800, appliances: [], bills: [{ id: 'bill', month: '2026-09', amount: 1200, kwh: 100, source: 'manual' }] };

async function contextFor(browser, viewport) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  await context.addInitScript(({ storageKey, seed }) => {
    if (!localStorage.getItem(storageKey)) localStorage.setItem(storageKey, JSON.stringify(seed));
    window.cameraRequests = 0;
    if (navigator.mediaDevices) Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { configurable: true, value: () => { window.cameraRequests++; return Promise.reject(new Error('No camera requested in this preview')); } });
  }, { storageKey, seed });
  return context;
}
async function savedItems(page) { return page.evaluate(key => JSON.parse(localStorage.getItem(key)).appliances, storageKey); }
async function checkScreen(page, name) {
  await page.evaluate(async () => {
    for (const image of document.images) image.loading = 'eager';
    await Promise.all(Array.from(document.images).map(image => image.decode().catch(() => {})));
  });
  assert.equal(await page.locator('[data-nextjs-dialog]').count(), 0, 'No framework error overlay');
  assert.equal(await page.locator('[data-next-badge][data-error="true"]').count(), 0, 'No development issue badge');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${name}: no page overflow`);
  assert.deepEqual(await page.locator('img').evaluateAll(images => images.filter(image => !image.complete || image.naturalWidth === 0).map(image => image.src)), [], 'Artwork and originals load');
  for (const selector of ['.np-form', '.np-original[open]', '.ap-dialog[open]']) {
    if (await page.locator(selector).count()) assert.equal(await page.locator(selector).evaluate(element => element.scrollWidth <= element.clientWidth + 1), true, `${name}: ${selector} fits its width`);
  }
  await page.screenshot({ path: path.join(screenshots, `${name}.png`), fullPage: true });
}
async function startInput(page) {
  await page.goto(`${baseURL}/appliances/new`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[type=file]:not(:disabled)').first().waitFor({ state: 'attached' });
}
async function applianceFlow(browser, viewport, name) {
  const context = await contextFor(browser, viewport);
  const page = await context.newPage(); page.setDefaultTimeout(20000);
  const errors = [], consoleErrors = [], aiRequests = [];
  let offline = false;
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && !(offline && message.text().includes('net::ERR_INTERNET_DISCONNECTED'))) consoleErrors.push(message.text()); });
  page.on('request', request => { if (request.url().includes('/api/ai/')) aiRequests.push(request.url()); });
  await page.goto(`${baseURL}/appliances`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'No appliances yet' }).waitFor();
  await page.getByRole('link', { name: 'Add appliance', exact: true }).first().click();
  await page.locator('input[type=file]:not(:disabled)').first().waitFor({ state: 'attached' });
  await checkScreen(page, `${name}-input`);
  assert.equal(await page.evaluate(() => window.cameraRequests), 0);
  await page.getByRole('button', { name: 'Complete sample', exact: true }).click();
  await page.getByRole('heading', { name: 'Review the sample appliance', exact: true }).waitFor();
  assert.equal((await savedItems(page)).length, 0, 'A preview is not saved automatically');
  assert.equal(await page.getByLabel('Hours per day', { exact: true }).inputValue(), '', 'Usage is not inferred from category');
  await checkScreen(page, `${name}-sample-review`);
  await page.getByRole('button', { name: 'View original', exact: true }).click();
  await page.getByRole('heading', { name: 'Original sample nameplate', exact: true }).waitFor();
  await checkScreen(page, `${name}-original`);
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('button', { name: 'View original', exact: true }).evaluate(button => document.activeElement === button), true, 'Focus returns after viewing the original');
  await page.getByLabel('Rated power', { exact: true }).fill('0.055');
  await page.getByLabel('Power unit', { exact: true }).selectOption('kW');
  await page.getByLabel('Hours per day', { exact: true }).fill('8');
  await page.getByLabel('Quantity', { exact: true }).fill('2');
  await page.getByLabel('Days in this period', { exact: true }).fill('15');
  await page.getByRole('radio', { name: 'My approximate wattage', exact: true }).check();
  assert.equal(await page.locator('.np-estimate strong').innerText(), '13.20 kWh');
  await page.getByRole('button', { name: 'Save sample appliance', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Confirm that you reviewed' }).waitFor();
  assert.equal((await savedItems(page)).length, 0, 'Confirmation gates saving');
  const confirm = page.getByRole('checkbox', { name: 'I checked the power', exact: false });
  await confirm.check(); await page.getByLabel('Hours per day', { exact: true }).fill('9');
  assert.equal(await confirm.isChecked(), false, 'Editing resets review confirmation');
  await page.getByLabel('Hours per day', { exact: true }).fill('8'); await confirm.check();
  await page.getByRole('button', { name: 'Save sample appliance', exact: true }).click();
  await page.getByRole('heading', { name: 'Appliance added!', exact: true }).waitFor();
  await checkScreen(page, `${name}-saved`);
  let item = (await savedItems(page))[0];
  assert.deepEqual({ watts: item.watts, model: item.model, days: item.days, source: item.source, basis: item.wattageBasis }, { watts: 55, model: 'WS-F55', days: 15, source: 'sample', basis: 'approximate' });
  const originalId = item.id;
  await page.getByRole('link', { name: 'View appliances', exact: true }).click();
  await page.getByRole('button', { name: 'Edit Electric fan', exact: true }).waitFor();
  await page.reload(); await page.getByRole('button', { name: 'Edit Electric fan', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Edit appliance', exact: true });
  await dialog.getByLabel('Hours per day', { exact: true }).fill('0');
  await dialog.getByLabel('Days in this period', { exact: true }).fill('10');
  await dialog.getByRole('button', { name: 'Save changes', exact: true }).click();
  await dialog.getByRole('alert').filter({ hasText: 'Confirm that you reviewed' }).waitFor();
  await checkScreen(page, `${name}-edit`);
  await dialog.getByRole('checkbox', { name: 'I reviewed the power', exact: false }).check();
  await dialog.getByRole('button', { name: 'Save changes', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Electric fan updated.' }).waitFor();
  item = (await savedItems(page))[0];
  assert.equal(item.source, 'sample'); assert.equal(item.model, 'WS-F55'); assert.equal(item.wattageBasis, 'approximate'); assert.equal(item.hours, 0); assert.equal(item.days, 10);
  assert.equal(await page.locator('.ap-item-detail').filter({ hasText: '10 days selected · 0.00 kWh' }).count(), 1);

  await startInput(page); await page.getByRole('button', { name: 'Enter manually', exact: true }).click();
  await page.getByRole('radio', { name: 'Fan', exact: true }).check();
  assert.equal(await page.getByLabel('Rated power', { exact: true }).inputValue(), '', 'Type selection never invents watts');
  await page.getByLabel('Model (optional)', { exact: true }).fill('WS-F55');
  await page.getByLabel('Rated power', { exact: true }).fill('70');
  await page.getByLabel('Hours per day', { exact: true }).fill('8');
  await page.getByLabel('Power unit', { exact: true }).selectOption('V');
  await page.getByRole('button', { name: 'Save appliance', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Use W or kW' }).waitFor();
  assert.equal(await page.locator('.np-estimate strong').innerText(), 'Waiting for your inputs');
  await page.getByLabel('Power unit', { exact: true }).selectOption('W');
  await page.getByLabel('Quantity', { exact: true }).fill('0');
  await page.getByRole('button', { name: 'Save appliance', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Quantity must be' }).waitFor();
  await page.getByLabel('Quantity', { exact: true }).fill('1');
  await page.getByRole('checkbox', { name: 'I checked the power', exact: false }).check();
  await page.getByRole('button', { name: 'Save appliance', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Choose whether to add' }).waitFor();
  assert.equal((await savedItems(page))[0].watts, 55, 'Duplicate remains unchanged without an explicit choice');
  await checkScreen(page, `${name}-duplicate`);
  await page.getByRole('radio', { name: 'Replace the saved appliance', exact: true }).check();
  offline = true; await context.setOffline(true);
  await page.getByRole('status').filter({ hasText: 'You’re offline.' }).waitFor();
  await checkScreen(page, `${name}-offline-review`);
  await page.getByRole('button', { name: 'Replace appliance', exact: true }).click();
  await page.getByRole('heading', { name: 'Appliance updated!', exact: true }).waitFor();
  item = (await savedItems(page))[0];
  assert.equal((await savedItems(page)).length, 1); assert.equal(item.id, originalId); assert.equal(item.watts, 70); assert.equal(item.source, 'manual'); assert.equal(item.days, 30);
  await context.setOffline(false); offline = false;
  assert.deepEqual(errors, []); assert.deepEqual(consoleErrors, []); assert.deepEqual(aiRequests, []);
  await context.close();
  console.log(`PASS: ${name} navigation, sample correction, units, explicit confirmation, saved labels, editing, duplicates, offline save, layout, and no AI calls`);
}
async function uploadsAndMissing(browser) {
  const context = await contextFor(browser, { width: 390, height: 844 });
  const page = await context.newPage(); page.setDefaultTimeout(20000);
  await startInput(page);
  const file = page.locator('input[type=file]').first();
  await file.setInputFiles({ name: 'bad.txt', mimeType: 'text/plain', buffer: Buffer.from('bad') });
  await page.getByRole('alert').filter({ hasText: 'Choose a JPG' }).waitFor();
  await file.setInputFiles({ name: 'large.png', mimeType: 'image/png', buffer: Buffer.alloc(10 * 1024 * 1024 + 1) });
  await page.getByRole('alert').filter({ hasText: 'up to 10 MB' }).waitFor();
  await file.setInputFiles({ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('broken') });
  await page.getByRole('alert').filter({ hasText: 'could not be opened' }).waitFor();
  await file.setInputFiles({ name: 'nameplate-example.png', mimeType: 'image/png', buffer: await fs.readFile(path.resolve('public/assets/branding/wattsnap-icon-192.png')) });
  await page.getByRole('heading', { name: 'Review your appliance', exact: true }).waitFor();
  assert.equal(await page.getByLabel('Rated power', { exact: true }).inputValue(), '', 'Uploaded image never gets fabricated sample watts');
  await page.getByRole('button', { name: 'View original', exact: true }).click();
  await page.getByRole('img', { name: 'Original uploaded appliance nameplate', exact: true }).waitFor();
  await checkScreen(page, 'uploaded-original'); await page.keyboard.press('Escape');
  await page.getByLabel('Appliance name', { exact: true }).fill('Desk lamp');
  await page.getByLabel('Rated power', { exact: true }).fill('9');
  await page.getByLabel('Hours per day', { exact: true }).fill('6');
  await page.getByRole('checkbox', { name: 'I checked the power', exact: false }).check();
  await page.getByRole('button', { name: 'Save appliance', exact: true }).click();
  await page.getByRole('heading', { name: 'Appliance added!', exact: true }).waitFor();
  assert.equal((await savedItems(page))[0].source, 'manual');
  await page.getByRole('button', { name: 'Add another', exact: true }).click();
  await page.getByRole('button', { name: 'Voltage-only sample', exact: true }).click();
  await page.getByRole('heading', { name: 'Review the sample appliance', exact: true }).waitFor();
  await page.getByLabel('Hours per day', { exact: true }).fill('8');
  await page.getByRole('button', { name: 'Save sample appliance', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Wattage is missing' }).waitFor();
  assert.equal((await savedItems(page)).length, 1);
  await checkScreen(page, 'voltage-only-missing');
  await page.getByLabel('Rated power', { exact: true }).fill('55');
  await page.getByRole('radio', { name: 'My approximate wattage', exact: true }).check();
  await page.getByRole('checkbox', { name: 'I checked the power', exact: false }).check();
  await page.evaluate(() => { Storage.prototype.setItem = function () { throw new Error('Storage blocked for test'); }; });
  await page.getByRole('button', { name: 'Save sample appliance', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'could not be saved' }).waitFor();
  assert.equal(await page.getByRole('heading', { name: 'Appliance added!', exact: true }).count(), 0, 'No false success on failed save');
  await context.close();
  console.log('PASS: unsupported/oversized/corrupt photos, local original review, uploaded manual readings, missing wattage, and failed storage');
}
(async () => {
  await fs.mkdir(screenshots, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const [name, width, height] of [['desktop', 1440, 900], ['tablet', 1024, 768], ['mobile', 390, 844], ['small-mobile', 320, 740]]) await applianceFlow(browser, { width, height }, name);
    await uploadsAndMissing(browser); console.log(`Screenshots: ${screenshots}`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
