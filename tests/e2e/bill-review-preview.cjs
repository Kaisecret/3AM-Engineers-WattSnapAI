const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const baseURL = process.env.UI_PREVIEW_URL || 'http://127.0.0.1:3000';
const screenshots = path.join(os.tmpdir(), 'wattsnap-bill-review-preview');
const storageKey = 'wattsnap-ui-preview-v1';
const seed = { name: 'Santos household', provider: 'anteco', location: 'Payao, San Jose de Buenavista, Antique', budget: 1800, appliances: [], bills: [{ id: 'previous', month: '2026-09', amount: 1200, kwh: 100, source: 'manual' }] };

async function contextFor(browser, viewport) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  await context.addInitScript(({ storageKey, seed }) => {
    if (!localStorage.getItem(storageKey)) localStorage.setItem(storageKey, JSON.stringify(seed));
    window.cameraRequests = 0;
    if (navigator.mediaDevices) Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { configurable: true, value: () => { window.cameraRequests++; return Promise.reject(new DOMException('Denied for test', 'NotAllowedError')); } });
  }, { storageKey, seed });
  return context;
}

async function checkScreen(page, name) {
  await page.evaluate(async () => {
    for (const image of document.images) image.loading = 'eager';
    await Promise.all(Array.from(document.images).map(image => image.decode().catch(() => {})));
    document.querySelector('.scan-panel')?.scrollTo(0, 0);
  });
  assert.equal(await page.locator('[data-nextjs-dialog]').count(), 0, 'No framework error overlay');
  assert.equal(await page.locator('[data-next-badge][data-error="true"]').count(), 0, 'No development issue badge');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${name}: no horizontal overflow`);
  assert.equal(await page.locator('.scan-panel').evaluate(panel => panel.scrollWidth <= panel.clientWidth + 1), true, `${name}: review sheet fits its width`);
  assert.deepEqual(await page.locator('img').evaluateAll(images => images.filter(image => !image.complete || image.naturalWidth === 0).map(image => image.src)), [], 'All artwork and bill images load');
  await page.screenshot({ path: path.join(screenshots, `${name}.png`), fullPage: true });
}

async function billFlow(browser, viewport, name) {
  const context = await contextFor(browser, viewport);
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const errors = [];
  const consoleErrors = [];
  let simulatingOffline = false;
  const aiRequests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() !== 'error') return;
    if (simulatingOffline && message.text().includes('net::ERR_INTERNET_DISCONNECTED')) return;
    consoleErrors.push(message.text());
  });
  page.on('request', request => { if (request.url().includes('/api/ai/')) aiRequests.push(request.url()); });
  await page.goto(`${baseURL}/bills/new`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[type=file]:not(:disabled)').waitFor({ state: 'attached' });
  await page.getByText('UI preview · scanning shows sample values').waitFor();
  assert.equal(await page.evaluate(() => window.cameraRequests), 0, 'Opening the UI never requests camera permission');
  await checkScreen(page, `${name}-initial`);
  await page.getByRole('button', { name: name === 'desktop' || name === 'tablet' ? 'Use webcam' : 'Open camera', exact: true }).click();
  if (name === 'desktop' || name === 'tablet') await page.getByText('Webcam access is blocked in this browser.').waitFor();
  else await page.getByText('Camera access is blocked.', { exact: false }).waitFor();
  assert.equal(await page.evaluate(() => window.cameraRequests), 1);
  await page.getByRole('button', { name: name === 'desktop' || name === 'tablet' ? 'Try it with a sample bill' : 'Scan the sample bill', exact: true }).click();
  await page.getByRole('heading', { name: 'Review the sample reading', exact: true }).waitFor();
  assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).bills.length, storageKey), 1, 'A sample reading does not save before confirmation');
  await checkScreen(page, `${name}-sample-review`);
  await page.getByRole('button', { name: 'View original', exact: true }).click();
  await page.getByRole('heading', { name: 'Sample electricity bill', exact: true }).waitFor();
  await checkScreen(page, `${name}-original`);
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('button', { name: 'View original', exact: true }).evaluate(button => document.activeElement === button), true, 'Original preview returns keyboard focus');
  await page.getByLabel('Energy used', { exact: true }).fill('130.5');
  await page.getByLabel('Amount due', { exact: true }).fill('1500.75');
  await page.getByLabel('Due date', { exact: true }).fill('');
  await page.getByText('fields corrected from the example reading', { exact: false }).waitFor();
  await page.getByRole('button', { name: 'Save sample bill', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Confirm that you reviewed' }).waitFor();
  assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).bills.length, storageKey), 1);
  await page.getByRole('checkbox', { name: 'I reviewed all the values above.', exact: false }).check();
  await page.getByLabel('Energy used', { exact: true }).fill('131');
  assert.equal(await page.getByRole('checkbox', { name: 'I reviewed all the values above.', exact: false }).isChecked(), false, 'Editing resets confirmation');
  await page.getByRole('checkbox', { name: 'I reviewed all the values above.', exact: false }).check();
  await page.getByRole('button', { name: 'Save sample bill', exact: true }).click();
  await page.getByRole('heading', { name: 'Added to your history!' }).waitFor();
  await checkScreen(page, `${name}-sample-saved`);
  let saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).bills.find(bill => bill.month === '2026-10'), storageKey);
  assert.equal(saved.source, 'sample', 'Generated values stay labeled Sample');
  assert.equal(saved.kwh, 131);
  assert.equal(saved.amount, 1500.75);
  assert.equal(saved.dueDate, undefined, 'Missing optional date stays unknown');
  assert.equal(saved.provider, 'anteco', 'Saved bill has a provider snapshot');
  await page.getByRole('link', { name: 'View monthly history', exact: false }).click();
  await page.locator(`#bill-${saved.id}`).waitFor();
  assert.equal(await page.locator(`#bill-${saved.id} .en-source`).innerText(), 'Sample');
  await page.reload();
  await page.locator(`#bill-${saved.id}`).waitFor();

  // Manual review, negative-value validation, duplicate protection, and exact period.
  await page.goto(`${baseURL}/bills/new`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: name === 'desktop' || name === 'tablet' ? 'Enter bill manually' : 'Type it', exact: true }).click();
  await page.getByRole('heading', { name: 'Enter your bill details' }).waitFor();
  await page.getByLabel('Billing month', { exact: true }).fill('2026-10');
  await page.getByLabel('Energy used', { exact: true }).fill('142');
  await page.getByLabel('Amount due', { exact: true }).fill('-1');
  await page.getByRole('button', { name: 'Replace bill', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'greater than zero' }).waitFor();
  await page.getByLabel('Amount due', { exact: true }).fill('1700.25');
  await page.getByRole('button', { name: 'Exact billing period', exact: false }).click();
  await page.getByLabel('Period start', { exact: true }).fill('2026-09-15');
  await page.getByRole('button', { name: 'Replace bill', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Enter both billing period dates' }).waitFor();
  await page.getByLabel('Period end', { exact: true }).fill('2026-09-01');
  await page.getByRole('button', { name: 'Replace bill', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'on or after' }).waitFor();
  await page.getByLabel('Period end', { exact: true }).fill('2026-10-14');
  await page.getByRole('checkbox', { name: 'I reviewed all the values above.', exact: false }).check();
  await page.getByRole('button', { name: 'Replace bill', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Confirm replacement' }).waitFor();
  assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).bills.find(bill => bill.month === '2026-10').kwh, storageKey), 131, 'Old bill is preserved without replacement consent');
  await checkScreen(page, `${name}-duplicate`);
  await page.getByRole('checkbox', { name: 'Replace the saved bill', exact: false }).check();
  simulatingOffline = true;
  await context.setOffline(true);
  await page.getByText('You’re offline.', { exact: true }).waitFor();
  await checkScreen(page, `${name}-offline-review`);
  await page.getByRole('button', { name: 'Replace bill', exact: true }).click();
  await page.getByRole('heading', { name: 'Added to your history!' }).waitFor();
  saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).bills.find(bill => bill.month === '2026-10'), storageKey);
  assert.equal(saved.source, 'manual');
  assert.equal(saved.kwh, 142);
  assert.equal(saved.periodStart, '2026-09-15');
  assert.equal(saved.periodEnd, '2026-10-14');
  assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).bills.length, storageKey), 2, 'Replacing a month keeps one record per month');
  await context.setOffline(false);
  simulatingOffline = false;
  await page.getByRole('link', { name: 'View monthly history', exact: false }).click();
  await page.locator(`#bill-${saved.id}`).getByText('Manual', { exact: true }).waitFor();
  await page.locator(`#bill-${saved.id}`).getByText('Sep 15, 2026 – Oct 14, 2026', { exact: true }).waitFor();
  assert.deepEqual(aiRequests, [], 'The preview never calls AI APIs');
  assert.deepEqual(errors, [], 'No browser runtime errors');
  assert.deepEqual(consoleErrors, [], 'No browser console errors');
  await context.close();
  console.log(`PASS: ${name} sample/manual correction, original view, explicit confirmation, duplicate protection, offline save, persisted history, and layout`);
}

async function uploadsAndErrors(browser) {
  const context = await contextFor(browser, { width: 1440, height: 900 });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  await page.goto(`${baseURL}/bills/new`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[type=file]:not(:disabled)').waitFor({ state: 'attached' });
  const input = page.locator('input[type=file]');
  await input.setInputFiles({ name: 'wrong.txt', mimeType: 'text/plain', buffer: Buffer.from('not a bill') });
  await page.getByRole('alert').filter({ hasText: 'Choose a JPG' }).first().waitFor();
  await input.setInputFiles({ name: 'big.png', mimeType: 'image/png', buffer: Buffer.alloc(10 * 1024 * 1024 + 1) });
  await page.getByRole('alert').filter({ hasText: 'up to 10 MB' }).first().waitFor();
  await input.setInputFiles({ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('invalid image') });
  await page.getByRole('alert').filter({ hasText: 'could not be opened' }).first().waitFor();
  await input.setInputFiles({ name: 'example-bill.png', mimeType: 'image/png', buffer: await fs.readFile(path.resolve('public/assets/branding/wattsnap-icon-192.png')) });
  await page.getByRole('heading', { name: 'Review the sample reading' }).waitFor();
  await page.getByRole('button', { name: 'View original', exact: true }).click();
  await page.getByRole('img', { name: 'Original uploaded electricity bill' }).waitFor();
  await checkScreen(page, 'uploaded-original');
  await page.getByRole('button', { name: 'Back to review' }).click();
  await page.getByRole('button', { name: 'Start over', exact: true }).click();
  await input.setInputFiles({ name: 'example-bill.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%%EOF') });
  await page.getByRole('heading', { name: 'Review the sample reading' }).waitFor();
  await page.getByRole('button', { name: 'View original', exact: true }).click();
  assert.match(await page.getByRole('link', { name: 'Open original PDF' }).getAttribute('href'), /^blob:/, 'PDF reference stays local');
  await page.keyboard.press('Escape');
  await page.getByRole('checkbox', { name: 'I reviewed all the values above.', exact: false }).check();
  await page.evaluate(() => { Storage.prototype.setItem = function () { throw new Error('Storage blocked for test'); }; });
  await page.getByRole('button', { name: 'Save sample bill', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'could not be saved' }).waitFor();
  assert.equal(await page.getByRole('heading', { name: 'Added to your history!' }).count(), 0, 'A failed save never shows success');
  await context.close();
  console.log('PASS: unsupported/oversized/corrupt uploads, image/PDF originals, and storage failure');
}

(async () => {
  await fs.mkdir(screenshots, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const [name, width, height] of [['desktop', 1440, 900], ['tablet', 1024, 768], ['mobile', 390, 844], ['small-mobile', 320, 740]]) await billFlow(browser, { width, height }, name);
    await uploadsAndErrors(browser);
    console.log(`Screenshots: ${screenshots}`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
