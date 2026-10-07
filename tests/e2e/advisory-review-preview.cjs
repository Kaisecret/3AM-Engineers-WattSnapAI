const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const baseURL = process.env.UI_PREVIEW_URL || 'http://127.0.0.1:3000';
const screenshots = path.join(os.tmpdir(), 'wattsnap-advisory-review-preview');
const householdKey = 'wattsnap-ui-preview-v1', advisoryKey = 'wattsnap-advisories-ui-preview-v1';
const seed = { name: 'Santos household', provider: 'anteco', location: 'Payao, San Jose de Buenavista, Antique', locality: { province: 'Antique', municipality: 'San Jose de Buenavista', barangay: 'Payao' }, budget: 1800, bills: [{ id: 'bill', month: '2026-09', kwh: 100, amount: 1200, source: 'manual' }], appliances: [{ id: 'fan', name: 'Bedroom fan', kind: 'fan', watts: 55, hours: 8, quantity: 1, source: 'manual' }] };
async function contextFor(browser, viewport) { const context = await browser.newContext({ viewport, reducedMotion: 'reduce' }); await context.addInitScript(({ key, seed }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(seed)); }, { key: householdKey, seed }); return context; }
async function records(page) { return page.evaluate(key => JSON.parse(localStorage.getItem(key) || '[]'), advisoryKey); }
async function waitList(page) { await page.waitForFunction(() => { const button = document.querySelector('.aw-source-views button'); return button && !button.disabled; }); }
async function waitIntake(page) { await page.waitForFunction(() => { const button = document.querySelector('.aw-upload button'); return button && !button.disabled; }); }
async function waitReview(page) { await page.getByRole('heading', { name: 'Confirm your review', exact: true }).waitFor(); }
const confirmation = page => page.getByRole('checkbox', { name: 'I checked the original and these fields, and kept missing or uncertain values unknown.', exact: true });
async function saveReview(page, corrected = false) { await confirmation(page).check(); await page.getByRole('button', { name: corrected ? 'Save corrected review' : 'Save reviewed advisory', exact: true }).click(); await page.locator('.aw-saved').waitFor(); }
async function snapshot(page, name) {
  const dialogs = page.locator('dialog[open]'); const modal = await dialogs.count() > 0;
  await page.evaluate(async () => { const visible = Array.from(document.images).filter(image => { const box = image.getBoundingClientRect(); return box.width > 0 && box.height > 0 && getComputedStyle(image).visibility !== 'hidden'; }); for (const image of visible) if (image.loading === 'lazy') image.loading = 'eager'; await Promise.race([Promise.all(visible.map(image => image.decode().catch(() => {}))), new Promise((_, reject) => setTimeout(() => reject(new Error('Visible artwork did not finish loading')), 20000))]); });
  assert.equal(await page.locator('[data-nextjs-dialog]').count(), 0, 'No framework error overlay');
  assert.equal(await page.locator('[data-next-badge][data-error="true"]').count(), 0, 'No development issue badge');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${name}: no horizontal overflow`);
  for (const selector of ['.aw-fields', '.aw-match', '.aw-original', '.aw-saved', 'dialog[open]']) for (const element of await page.locator(selector).all()) assert.equal(await element.evaluate(element => element.scrollWidth <= element.clientWidth + 1), true, `${name}: ${selector} fits`);
  const hero = page.locator('.aw-hero'); if (await hero.count()) { const copy = await hero.locator('> div').boundingBox(), art = await hero.locator('img').boundingBox(); assert.ok(copy.x + copy.width <= art.x || copy.y + copy.height <= art.y, 'Intake hero copy and artwork do not overlap'); }
  if (!modal) await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: path.join(screenshots, `${name}.png`), fullPage: !modal });
}
async function flow(browser, viewport, name) {
  const context = await contextFor(browser, viewport), page = await context.newPage(); page.setDefaultTimeout(20000);
  const errors = [], consoleErrors = [], aiRequests = []; let offline = false;
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && !(offline && message.text().includes('net::ERR_INTERNET_DISCONNECTED'))) consoleErrors.push(message.text()); });
  page.on('request', request => { if (/\/api\/ai\//.test(request.url())) aiRequests.push(request.url()); });
  await page.goto(`${baseURL}/advisories`, { waitUntil: 'domcontentloaded' }); await waitList(page);
  await page.getByRole('heading', { name: 'No saved advisories yet', exact: true }).waitFor(); assert.equal((await records(page)).length, 0);
  await snapshot(page, `${name}-empty-list`);
  const views = page.getByRole('group', { name: 'Advisory source view', exact: true });
  await views.getByRole('button', { name: 'Samples', exact: true }).click();
  assert.equal(await page.locator('.adv-card').count(), 4); assert.match(await page.locator('.aw-sample-context').innerText(), /do not describe your current household/);
  for (const label of ['Affected', 'Possibly Affected', 'Not Listed']) assert.ok(await page.locator('.adv-status').filter({ hasText: new RegExp(`^${label}$`) }).count() > 0);
  await snapshot(page, `${name}-samples`);
  await page.getByRole('tab', { name: /^Active/ }).focus(); await page.keyboard.press('ArrowRight');
  assert.equal(await page.getByRole('tab', { name: /^History/ }).getAttribute('aria-selected'), 'true'); assert.equal(await page.locator('.adv-card').count(), 1);
  await page.keyboard.press('Home'); assert.equal(await page.getByRole('tab', { name: /^Active/ }).getAttribute('aria-selected'), 'true');
  const filters = page.getByRole('group', { name: 'Filter advisory type', exact: true }); await filters.getByRole('button', { name: /^Scheduled/ }).click(); assert.equal(await page.locator('.adv-card').count(), 2);
  await views.getByRole('button', { name: /^Saved advisories/ }).click();
  await page.getByRole('link', { name: 'Add advisory', exact: true }).click(); await waitIntake(page); await snapshot(page, `${name}-intake`);
  await page.getByRole('button', { name: 'Scheduled sample', exact: true }).click(); await page.getByRole('status').filter({ hasText: 'Preparing your local original' }).waitFor(); await waitReview(page);
  assert.equal(await page.getByLabel('Start time', { exact: true }).inputValue(), '13:00'); assert.equal(await page.getByLabel('End time', { exact: true }).inputValue(), '17:00');
  await page.locator('.aw-original > details > summary').click(); assert.match(await page.locator('.aw-original-preview').innerText(), /SAMPLE ONLY/);
  await page.getByLabel('Review title (optional)', { exact: true }).fill(`${name} notice`);
  await page.getByRole('button', { name: 'Save reviewed advisory', exact: true }).click(); await page.getByRole('alert').filter({ hasText: 'Confirm that you reviewed' }).waitFor();
  await page.getByLabel('End time', { exact: true }).fill('12:00'); await confirmation(page).check();
  await page.getByRole('button', { name: 'Save reviewed advisory', exact: true }).click(); await page.getByRole('alert').filter({ hasText: 'scheduled end must be after' }).waitFor();
  await page.getByLabel('End time', { exact: true }).fill('17:00'); assert.equal(await confirmation(page).isChecked(), false, 'Editing resets review confirmation');
  await snapshot(page, `${name}-review`); await saveReview(page);
  const original = (await records(page))[0]; assert.equal(original.original.kind, 'sample'); assert.equal(original.match.status, 'affected'); assert.equal(original.details.expectedRestoration, '');
  assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), householdKey), seed, 'Advisory saving leaves bill, appliance, and household records unchanged');
  await snapshot(page, `${name}-saved`);
  await page.getByRole('link', { name: 'View saved advisory', exact: true }).click(); await waitList(page);
  const detail = page.getByRole('dialog', { name: `${name} notice`, exact: true }); await detail.waitFor();
  await detail.locator('.aw-original > details > summary').click(); await detail.getByRole('button', { name: 'Open full original', exact: true }).click();
  const full = page.getByRole('dialog', { name: 'Original advisory · Sample', exact: true }); await full.waitFor(); assert.equal(await full.locator('pre').innerText(), original.original.text);
  await full.getByRole('button', { name: 'Close original advisory', exact: true }).click();
  await detail.getByRole('heading', { name: `${name} notice`, exact: true }).waitFor();
  const changed = { ...seed, provider: 'akelco' };
  await page.evaluate(({ key, changed }) => { localStorage.setItem(key, JSON.stringify(changed)); window.dispatchEvent(new Event('wattsnap-preview-change')); }, { key: householdKey, changed });
  await detail.getByRole('status').filter({ hasText: 'Your location or provider changed' }).waitFor();
  await detail.getByRole('heading', { name: 'Not Listed', exact: true }).waitFor(); assert.equal((await records(page))[0].match.householdBasis.provider, 'anteco', 'Current result changes but the saved review awaits confirmation');
  offline = true; await context.setOffline(true); await page.getByRole('status').filter({ hasText: 'No new provider announcements are fetched.' }).waitFor();
  await detail.getByRole('button', { name: 'Confirm updated match', exact: true }).click(); await detail.getByRole('status').filter({ hasText: 'Match reviewed for your current household' }).waitFor();
  const rechecked = (await records(page))[0]; assert.equal(rechecked.match.householdBasis.provider, 'akelco'); assert.equal(rechecked.revision, 1); assert.deepEqual(rechecked.original, original.original); assert.deepEqual(rechecked.details, original.details);
  await snapshot(page, `${name}-offline-rechecked`); await context.setOffline(false); offline = false;
  await detail.getByRole('link', { name: 'Correct review fields', exact: true }).click(); await waitReview(page);
  await page.getByRole('heading', { name: 'Correct your saved review', exact: true }).waitFor();
  await page.getByLabel('Reason as stated (optional)', { exact: false }).fill('Corrected sample reason'); await saveReview(page, true);
  const corrected = (await records(page))[0]; assert.equal(corrected.id, original.id); assert.equal(corrected.revision, 2); assert.equal(corrected.createdAt, original.createdAt); assert.deepEqual(corrected.original, original.original);
  await page.getByRole('link', { name: 'View saved advisory', exact: true }).click(); await waitList(page); await page.getByRole('dialog', { name: `${name} notice`, exact: true }).waitFor();
  await page.reload(); await waitList(page); const reloaded = page.getByRole('dialog', { name: `${name} notice`, exact: true }); await reloaded.waitFor(); assert.deepEqual((await records(page))[0], corrected); await reloaded.getByRole('button', { name: 'Done', exact: true }).click();
  assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), householdKey), changed);
  assert.deepEqual(errors, []); assert.deepEqual(consoleErrors, []); assert.deepEqual(aiRequests, []); await context.close();
  console.log(`PASS: ${name} saved/sample views, keyboard tabs, filters, review validation, originals, household recheck, offline read/save, correction revisions, reload, and layout`);
}
async function pasteImageAndErrors(browser) {
  const context = await contextFor(browser, { width: 390, height: 844 }), page = await context.newPage(); page.setDefaultTimeout(20000);
  await page.goto(`${baseURL}/advisories/new`); await waitIntake(page);
  await page.getByRole('button', { name: 'Review pasted text', exact: true }).click(); await page.getByRole('alert').filter({ hasText: 'Paste the original advisory text' }).waitFor();
  await page.getByLabel('Original advisory text', { exact: false }).fill('x'.repeat(12001)); assert.equal((await page.getByLabel('Original advisory text', { exact: false }).inputValue()).length, 12001, 'Overlong originals are never silently truncated'); await page.getByRole('button', { name: 'Review pasted text', exact: true }).click(); await page.getByRole('alert').filter({ hasText: 'Use an original up to 12,000 characters' }).waitFor();
  const text = 'FICTIONAL BROWSER TEST NOTICE\nSelected areas of San Jose de Buenavista.\nNo date, start, end, or restoration time is provided.\n';
  await page.getByLabel('Original advisory text', { exact: false }).fill(text); await page.getByRole('button', { name: 'Review pasted text', exact: true }).click(); await waitReview(page);
  assert.equal(await page.getByLabel('Interruption date', { exact: true }).inputValue(), ''); assert.equal(await page.getByLabel('Start time', { exact: true }).inputValue(), '');
  await page.getByLabel('Review title (optional)', { exact: true }).fill('Pasted uncertain notice');
  await page.getByLabel('Provider named in the advisory', { exact: false }).selectOption('anteco');
  await page.getByLabel('Publisher / source name', { exact: true }).fill('Fictional test fixture');
  await page.getByLabel('Areas as written in the original', { exact: true }).fill('Selected areas of San Jose de Buenavista.');
  await page.getByLabel('Province for area 1', { exact: true }).fill('Antique'); await page.getByLabel('Municipality for area 1', { exact: true }).fill('San Jose de Buenavista');
  await page.getByLabel('Original source link (optional)', { exact: true }).fill('javascript:alert(1)'); await confirmation(page).check(); await page.getByRole('button', { name: 'Save reviewed advisory', exact: true }).click(); await page.getByRole('alert').filter({ hasText: 'complete http or https source link' }).waitFor();
  await page.getByLabel('Original source link (optional)', { exact: true }).fill('https://example.org/fictional-provider-post');
  await page.getByRole('heading', { name: 'Possibly Affected', exact: true }).waitFor(); await context.setOffline(true); await saveReview(page);
  const pasted = (await records(page))[0]; assert.equal(pasted.original.text, text); assert.equal(pasted.original.kind, 'text'); assert.equal(pasted.details.date, ''); assert.equal(pasted.details.endTime, ''); assert.equal(pasted.details.expectedRestoration, ''); assert.equal(pasted.match.status, 'possibly-affected'); await snapshot(page, 'pasted-unknown-offline');
  await context.setOffline(false); await page.getByRole('button', { name: 'Add another advisory', exact: true }).click(); await waitIntake(page);
  await page.getByRole('button', { name: 'Scheduled sample', exact: true }).click(); await waitReview(page); await saveReview(page); const scheduled = (await records(page))[1];
  await page.getByRole('button', { name: 'Add another advisory', exact: true }).click(); await waitIntake(page); await page.getByRole('button', { name: 'Scheduled sample', exact: true }).click(); await waitReview(page); await confirmation(page).check(); await page.getByRole('button', { name: 'Save reviewed advisory', exact: true }).click(); await page.getByRole('alert').filter({ hasText: 'original is already saved' }).waitFor(); assert.equal((await records(page)).length, 2);
  await page.getByRole('checkbox', { name: 'Save another review of this original as a separate advisory.', exact: true }).check(); await page.getByRole('button', { name: 'Save reviewed advisory', exact: true }).click(); await page.locator('.aw-saved').waitFor(); assert.equal((await records(page)).length, 3);
  const earlier = await records(page); await page.getByRole('button', { name: 'Add another advisory', exact: true }).click(); await waitIntake(page); await page.getByRole('button', { name: 'Restoration update sample', exact: true }).click(); await waitReview(page);
  await page.getByLabel('Earlier advisory (optional)', { exact: false }).selectOption(scheduled.id); await page.getByLabel('Review title (optional)', { exact: true }).fill('Separate restoration update'); await saveReview(page); const updated = await records(page); assert.equal(updated.length, 4); assert.equal(updated[3].details.relatedId, scheduled.id); assert.equal(updated[3].details.type, 'restored'); assert.deepEqual(updated.slice(0, 3), earlier, 'A restoration update never overwrites an earlier announcement');
  await page.getByRole('link', { name: 'View saved advisory', exact: true }).click(); await waitList(page); const restoration = page.getByRole('dialog', { name: 'Separate restoration update', exact: true }); await restoration.waitFor(); assert.match(await restoration.innerText(), /original has not been replaced/); await restoration.getByRole('button', { name: 'Done', exact: true }).click(); await page.getByRole('tab', { name: /^History/ }).click(); assert.equal(await page.locator('.adv-card').count(), 1);
  await page.getByRole('link', { name: 'Add advisory', exact: true }).click(); await waitIntake(page);
  const fileInput = page.locator('input[type=file]'); await fileInput.setInputFiles({ name: 'notice.pdf', mimeType: 'application/pdf', buffer: Buffer.from('not an image') }); await page.getByRole('alert').filter({ hasText: 'Choose a JPG, PNG or WebP' }).waitFor();
  await fileInput.setInputFiles({ name: 'large.png', mimeType: 'image/png', buffer: Buffer.alloc(2 * 1024 * 1024 + 1) }); await page.getByRole('alert').filter({ hasText: 'screenshot up to 2 MB' }).waitFor();
  await fileInput.setInputFiles({ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('broken image') }); await page.getByRole('alert').filter({ hasText: 'screenshot could not be opened' }).waitFor();
  const data = await page.evaluate(() => { const canvas = document.createElement('canvas'); canvas.width = 500; canvas.height = 380; const context = canvas.getContext('2d'); context.fillStyle = '#fff'; context.fillRect(0, 0, 500, 380); context.fillStyle = '#29455e'; context.font = '20px sans-serif'; ['FICTIONAL PROVIDER NOTICE', 'Original screenshot test fixture', 'Barangay Payao, San Jose de Buenavista', 'Antique · 13:00–17:00', 'Date chosen separately in review'].forEach((line, i) => context.fillText(line, 20, 40 + i * 52)); return canvas.toDataURL('image/png'); });
  await fileInput.setInputFiles({ name: 'original-notice.png', mimeType: 'image/png', buffer: Buffer.from(data.split(',')[1], 'base64') }); await waitReview(page); assert.equal(await page.getByLabel('Interruption date', { exact: true }).inputValue(), '', 'Image upload does not fake an extraction');
  await page.getByLabel('Review title (optional)', { exact: true }).fill('Uploaded original'); await page.getByLabel('Provider named in the advisory', { exact: false }).selectOption('anteco'); await page.getByLabel('Areas as written in the original', { exact: true }).fill('Entire Barangay Payao, San Jose de Buenavista, Antique'); await page.getByLabel('Province for area 1', { exact: true }).fill('Antique'); await page.getByLabel('Municipality for area 1', { exact: true }).fill('San Jose de Buenavista'); await page.getByLabel('Barangay for area 1', { exact: true }).fill('Payao'); await page.getByLabel('Scope for area 1', { exact: true }).selectOption('barangay'); await page.getByLabel('Interruption date', { exact: true }).fill('2099-07-07'); await page.getByLabel('Start time', { exact: true }).fill('13:00'); await page.getByLabel('End time', { exact: true }).fill('17:00'); await saveReview(page);
  const photo = (await records(page))[4]; assert.equal(photo.original.image, data, 'The original screenshot is saved byte-for-byte without resizing'); assert.equal(photo.original.name, 'original-notice.png');
  await page.getByRole('link', { name: 'View saved advisory', exact: true }).click(); await waitList(page); await page.reload(); await waitList(page); const imageDetail = page.getByRole('dialog', { name: 'Uploaded original', exact: true }); await imageDetail.waitFor(); await context.setOffline(true); await imageDetail.locator('.aw-original > details > summary').click(); await imageDetail.getByRole('button', { name: 'Open full original', exact: true }).click(); const fullImage = page.getByRole('dialog', { name: 'Original advisory', exact: true }); await fullImage.waitFor(); assert.equal(await fullImage.locator('img').getAttribute('src'), data); await snapshot(page, 'saved-original-offline'); await fullImage.getByRole('button', { name: 'Close original advisory', exact: true }).click(); await context.setOffline(false);
  await imageDetail.locator('.aw-manage summary').click(); await imageDetail.getByRole('button', { name: 'Remove saved advisory', exact: true }).click(); await imageDetail.getByRole('button', { name: 'Keep advisory', exact: true }).click(); assert.equal((await records(page)).length, 5); await imageDetail.getByRole('button', { name: 'Remove saved advisory', exact: true }).click(); await imageDetail.getByRole('button', { name: 'Remove advisory and original', exact: true }).click(); assert.deepEqual(await records(page), updated);
  await page.getByRole('link', { name: 'Add advisory', exact: true }).click(); await waitIntake(page); await page.getByRole('button', { name: 'Different-provider sample', exact: true }).click(); await waitReview(page); await page.evaluate(() => { Storage.prototype.setItem = function () { throw new Error('Storage blocked for test'); }; }); await confirmation(page).check(); await page.getByRole('button', { name: 'Save reviewed advisory', exact: true }).click(); await page.getByRole('alert').filter({ hasText: 'advisory could not be saved' }).waitFor(); assert.deepEqual(await records(page), updated); assert.equal(await page.locator('.aw-saved').count(), 0); await snapshot(page, 'failed-save-keeps-draft'); await context.close();
  const corrupt = await contextFor(browser, { width: 320, height: 740 }); await corrupt.addInitScript(key => { if (!localStorage.getItem(key)) localStorage.setItem(key, '{bad json'); }, advisoryKey); const bad = await corrupt.newPage(); await bad.goto(`${baseURL}/advisories/new`); await waitIntake(bad); await bad.getByRole('alert').filter({ hasText: 'Saved advisories could not be opened' }).waitFor(); await bad.getByRole('button', { name: 'Scheduled sample', exact: true }).click(); await waitReview(bad); assert.equal(await bad.getByRole('button', { name: 'Save reviewed advisory', exact: true }).isDisabled(), true); assert.equal(await bad.evaluate(key => localStorage.getItem(key), advisoryKey), '{bad json', 'Unreadable saved originals are never silently overwritten'); await bad.evaluate(key => localStorage.setItem(key, '[]'), advisoryKey); await bad.getByRole('button', { name: 'Retry loading saved advisories', exact: true }).click(); await bad.getByRole('button', { name: 'Save reviewed advisory', exact: true }).waitFor({ state: 'visible' }); await saveReview(bad); assert.equal((await records(bad)).length, 1); await corrupt.close();
  console.log('PASS: pasted unknowns, safe source links, duplicate acknowledgement, separate restoration updates, image validation and originals, offline reading, removal confirmation, storage failure, and unreadable-history recovery');
}
(async () => { await fs.mkdir(screenshots, { recursive: true }); const browser = await chromium.launch({ channel: 'chrome', headless: true }); try { for (const [name, width, height] of [['desktop', 1440, 900], ['tablet', 1024, 768], ['mobile', 390, 844], ['small-mobile', 320, 740]]) await flow(browser, { width, height }, name); await pasteImageAndErrors(browser); console.log(`Screenshots: ${screenshots}`); } finally { await browser.close(); } })().catch(error => { console.error(error); process.exitCode = 1; });
