const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const baseURL = process.env.UI_PREVIEW_URL || 'http://127.0.0.1:3002';

async function design(browser) {
  for (const width of [320, 390, 768, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage(); const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${baseURL}/onboarding`, { waitUntil: 'domcontentloaded' });
    const name = page.getByLabel('Household name', { exact: true });
    await name.waitFor(); await name.focus();
    assert.equal(await name.evaluate(input => parseFloat(getComputedStyle(input).outlineWidth) >= 2 && getComputedStyle(input).outlineStyle !== 'none'), true, 'Visible form focus');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${width}px no horizontal overflow`);
    assert.equal(await page.getByRole('navigation', { name: 'Main navigation' }).count(), 1);
    assert.equal(await page.getByRole('img', { name: 'WattSnap', exact: true }).count(), 1);
    assert.deepEqual(errors, []);
    await context.close();
  }
  console.log('PASS: retained branding/navigation, form focus and 320–1440px layout');
}

async function records(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${baseURL}/dashboard`);
  await page.getByText('No bills yet', { exact: true }).first().waitFor();
  assert.equal(await page.locator('.ws-chart-day').count(), 0, 'No invented history bars');
  assert.equal(await page.locator('.ws-budget-summary').innerText(), 'Set a monthly budget');
  assert.equal(await page.evaluate(() => localStorage.getItem('wattsnap-ui-preview-v1')), null, 'Opening a page does not seed records');
  await page.goto(`${baseURL}/appliances`);
  await page.getByRole('heading', { name: 'No appliances yet' }).waitFor();
  await page.goto(`${baseURL}/advisories`);
  await page.getByRole('heading', { name: 'No saved advisories yet' }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Samples', exact: true }).count(), 0);
  await page.goto(`${baseURL}/bills/new`);
  assert.equal(await page.getByRole('button', { name: /sample/i }).count(), 0);
  await page.getByRole('button', { name: 'Type it', exact: true }).click();
  assert.equal(await page.getByLabel('Energy used', { exact: true }).inputValue(), '');
  assert.deepEqual(errors, []);
  await context.close(); console.log('PASS: honest empty states, no seeding, actual-only charts and manual bill entry');
}

async function household(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(`${baseURL}/signup`);
  await page.getByRole('button', { name: 'Set up my household', exact: true }).click();
  await page.waitForURL('**/setup');
  assert.equal(await page.locator('input[type=password]').count(), 0, 'No fake sign-in');
  await page.goto(`${baseURL}/onboarding`);
  await page.getByLabel('Household name', { exact: true }).fill('River household');
  await page.getByLabel('Province', { exact: true }).fill('Antique');
  await page.getByLabel('Municipality or city', { exact: true }).fill('San Jose de Buenavista');
  await page.getByLabel('Barangay', { exact: true }).fill('Payao');
  await page.getByRole('button', { name: 'Save household profile', exact: true }).click();
  assert.equal(await page.getByRole('radio', { name: /ANTECO/ }).isChecked(), false, 'No implicit provider selection');
  await page.getByRole('radio', { name: /Other provider/ }).check();
  await page.getByLabel('Provider name', { exact: true }).fill('My electricity cooperative');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Save household', exact: true }).click();
  await page.getByRole('heading', { name: 'Welcome home, River!' }).waitFor();
  await page.reload();
  assert.equal(await page.getByLabel('Household name', { exact: true }).inputValue(), 'River household');
  await page.goto(`${baseURL}/welcome`); await page.waitForURL('**/dashboard');
  await page.getByRole('heading', { name: 'River!', exact: true }).waitFor();
  const saved = await page.evaluate(() => localStorage.getItem('wattsnap-ui-preview-v1'));
  assert.equal(JSON.parse(saved).provider, 'custom:My%20electricity%20cooperative');
  await page.goto(`${baseURL}/login`);
  await page.getByRole('button', { name: 'Continue to my household' }).click();
  await page.waitForURL('**/dashboard');
  assert.equal(await page.evaluate(() => localStorage.getItem('wattsnap-ui-preview-v1')), saved);
  await context.close(); console.log('PASS: local household setup, explicit custom provider, refresh and returning access without passwords');
}

async function bills(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(() => { if (!localStorage.getItem('wattsnap-ui-preview-v1')) localStorage.setItem('wattsnap-ui-preview-v1', JSON.stringify({ name: 'River home', provider: 'anteco', bills: [], appliances: [], budget: 0 })); });
  const page = await context.newPage(); const ai = [];
  page.on('request', request => { if (request.url().includes('/api/ai/')) ai.push(request.url()); });
  await page.goto(`${baseURL}/bills/new`);
  const upload = page.locator('input[type=file]').first();
  await page.waitForFunction(() => { const input = document.querySelector('input[type=file]'); return input && !input.disabled; });
  await upload.setInputFiles({ name: 'bad.txt', mimeType: 'text/plain', buffer: Buffer.from('bad') });
  await page.getByRole('alert').filter({ hasText: 'Choose a JPG' }).first().waitFor();
  const photo = await fs.readFile('public/assets/branding/wattsnap-icon-192.png');
  await upload.setInputFiles({ name: 'my-bill.png', mimeType: 'image/png', buffer: photo });
  await page.getByLabel('Energy used', { exact: true }).waitFor();
  assert.equal(await page.getByLabel('Energy used', { exact: true }).inputValue(), '', 'Upload does not invent extraction');
  await page.getByLabel('Billing month', { exact: true }).fill('2026-09');
  await page.getByLabel('Energy used', { exact: true }).fill('100');
  await page.getByLabel('Amount due', { exact: true }).fill('1200');
  await page.getByLabel('Due date', { exact: true }).fill('2026-10-15');
  await page.getByLabel('Billing date', { exact: false }).fill('2026-10-01');
  await page.getByLabel('Bill notes', { exact: false }).fill('Actual entered fields');
  await page.getByRole('button', { name: 'Remove file', exact: true }).click();
  assert.equal(await page.getByLabel('Amount due', { exact: true }).inputValue(), '1200');
  await page.reload();
  assert.equal(await page.getByLabel('Energy used', { exact: true }).inputValue(), '100');
  assert.equal(await page.getByRole('checkbox', { name: 'I reviewed all the values above.', exact: false }).isChecked(), false, 'Refresh does not confirm a draft');
  await page.getByRole('button', { name: 'Save to history', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Confirm that you reviewed' }).waitFor();
  await page.getByRole('checkbox', { name: 'I reviewed all the values above.', exact: false }).check();
  await page.getByRole('button', { name: 'Save to history', exact: true }).click();
  await page.getByRole('heading', { name: 'Added to your history!' }).waitFor();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('wattsnap-ui-preview-v1')).bills);
  assert.equal(saved.length, 1); assert.equal(saved[0].source, 'manual'); assert.equal(saved[0].billingDate, '2026-10-01'); assert.equal(saved[0].notes, 'Actual entered fields');
  assert.equal(await page.evaluate(() => sessionStorage.getItem('wattsnap-bill-draft-v1')), null);
  await page.goto(`${baseURL}/bills/new`); await page.getByRole('button', { name: 'Type it', exact: true }).click();
  await page.getByLabel('Billing month', { exact: true }).fill('2026-09');
  await page.getByLabel('Energy used', { exact: true }).fill('105');
  await page.getByLabel('Amount due', { exact: true }).fill('1250');
  await page.getByRole('checkbox', { name: 'I reviewed all the values above.', exact: false }).check();
  await page.getByRole('button', { name: 'Replace bill', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Confirm replacement' }).waitFor();
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('wattsnap-ui-preview-v1')).bills[0].amount), 1200);
  await page.getByRole('checkbox', { name: 'Replace the saved bill', exact: false }).check();
  await page.getByRole('button', { name: 'Replace bill', exact: true }).click();
  await page.getByRole('heading', { name: 'Added to your history!' }).waitFor();
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('wattsnap-ui-preview-v1')).bills.length), 1);
  assert.deepEqual(ai, []);
  await context.close(); console.log('PASS: bill photo/manual review, draft recovery, optional fields, confirmation and duplicate protection without AI calls');
}

async function appliances(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage(); await page.goto(`${baseURL}/appliances/new`);
  await page.getByRole('button', { name: 'Upload photo', exact: true }).waitFor();
  await page.waitForFunction(() => !document.querySelector('input[type=file]').disabled);
  await page.locator('input[type=file]').first().setInputFiles({ name: 'label.png', mimeType: 'image/png', buffer: await fs.readFile('public/assets/branding/wattsnap-icon-192.png') });
  await page.getByLabel('Rated power', { exact: true }).waitFor();
  assert.equal(await page.getByLabel('Rated power', { exact: true }).inputValue(), '');
  await page.getByRole('radio', { name: 'Electric fan', exact: true }).check();
  await page.getByLabel('Rated power', { exact: true }).fill('55');
  await page.getByLabel('Hours per day', { exact: true }).fill('8');
  await page.getByLabel('Quantity', { exact: true }).fill('2');
  await page.getByRole('button', { name: 'Remove photo', exact: true }).click();
  assert.equal(await page.getByLabel('Rated power', { exact: true }).inputValue(), '55');
  await page.getByRole('checkbox', { name: /I checked the power/ }).check();
  await page.getByRole('button', { name: 'Save appliance', exact: true }).click();
  await page.getByRole('heading', { name: 'Appliance added!' }).waitFor();
  await page.getByRole('link', { name: 'View appliances', exact: true }).click();
  await page.getByRole('button', { name: 'Edit Electric fan', exact: true }).click();
  await page.getByLabel('Hours per day', { exact: true }).fill('6');
  await page.getByRole('checkbox', { name: 'I reviewed the power, quantity, hours, and days.' }).check();
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'updated' }).waitFor();
  await page.reload(); await page.getByRole('button', { name: 'Remove Electric fan', exact: true }).click();
  await page.getByRole('button', { name: 'Keep record', exact: true }).click();
  assert.equal(await page.locator('.ap-list > li').count(), 1);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('wattsnap-ui-preview-v1')).appliances[0].hours), 6);
  await page.getByRole('button', { name: 'Remove Electric fan', exact: true }).click(); await page.getByRole('button', { name: 'Remove record', exact: true }).click();
  await page.getByRole('heading', { name: 'No appliances yet' }).waitFor();
  await context.close(); console.log('PASS: actual appliance photo review, manual wattage, editing, calculation and confirmed removal');
}

async function estimates(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(() => { if (!localStorage.getItem('wattsnap-ui-preview-v1')) localStorage.setItem('wattsnap-ui-preview-v1', JSON.stringify({ name: 'River home', bills: [], budget: 0, appliances: [{ id: 'my-fan', name: 'My fan', watts: 55, hours: 8, quantity: 2, days: 20 }] })); });
  const page = await context.newPage(); await page.goto(`${baseURL}/appliances`);
  await page.getByText('My fan', { exact: true }).waitFor();
  assert.match(await page.locator('.ap-summary-cost').innerText(), /Add a bill/);
  assert.match(await page.locator('.ap-list').innerText(), /17.60 kWh for this period/);
  assert.match(await page.locator('.ap-summary-copy').innerText(), /26.4/);
  await page.evaluate(() => { const key = 'wattsnap-ui-preview-v1', home = JSON.parse(localStorage.getItem(key)); home.bills = [{ id: 'my-bill', month: '2026-09', kwh: 100, amount: 1200 }]; localStorage.setItem(key, JSON.stringify(home)); window.dispatchEvent(new Event('wattsnap-preview-change')); });
  await page.getByText(/316.80 per 30 days/).waitFor();
  assert.match(await page.locator('.ap-summary-copy').innerText(), /26.4/, 'Bill does not force the appliance estimate to match');
  await context.close(); console.log('PASS: energy formula, selected days, unknown rate and genuine bill-derived costs');
}

async function tips(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(() => { if (!localStorage.getItem('wattsnap-ui-preview-v1')) localStorage.setItem('wattsnap-ui-preview-v1', JSON.stringify({ name: 'River home', bills: [], budget: 0, appliances: [{ id: 'my-fridge', name: 'My refrigerator', kind: 'fridge', watts: 80, hours: 16, quantity: 1 }] })); });
  const page = await context.newPage(); await page.goto(`${baseURL}/tips`);
  await page.getByRole('button', { name: 'Create tips', exact: true }).click();
  await page.getByRole('heading', { name: 'Care for My refrigerator', exact: true }).waitFor();
  assert.match(await page.locator('.tt-page').innerText(), /Keep the refrigerator powered/);
  await page.evaluate(() => { const home = JSON.parse(localStorage.getItem('wattsnap-ui-preview-v1')); home.appliances[0].name = 'Kitchen refrigerator'; localStorage.setItem('wattsnap-ui-preview-v1', JSON.stringify(home)); window.dispatchEvent(new Event('wattsnap-preview-change')); });
  await page.getByRole('heading', { name: 'Your inputs changed', exact: true }).waitFor();
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Refresh tips', exact: true }).click();
  await page.getByRole('heading', { name: 'Care for Kitchen refrigerator', exact: true }).waitFor();
  assert.equal(await page.getByRole('heading', { name: 'Your inputs changed', exact: true }).count(), 0);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('wattsnap-tips-ui-preview-v1')).context.applianceCount), 1);
  await context.setOffline(false); await page.reload(); await page.getByRole('heading', { name: 'Care for Kitchen refrigerator', exact: true }).waitFor();
  await context.close(); console.log('PASS: relevant local tips, essential-device guidance, stale inputs and offline refresh');
}

async function advisories(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(() => { if (!localStorage.getItem('wattsnap-ui-preview-v1')) localStorage.setItem('wattsnap-ui-preview-v1', JSON.stringify({ name: 'River home', provider: 'custom:River%20cooperative', location: 'Payao, San Jose de Buenavista, Antique', locality: { province: 'Antique', municipality: 'San Jose de Buenavista', barangay: 'Payao' }, bills: [], budget: 0, appliances: [] })); });
  const page = await context.newPage(); await page.goto(`${baseURL}/advisories/new`);
  await page.waitForFunction(() => !document.querySelector('input[type=file]').disabled);
  await page.locator('input[type=file]').setInputFiles({ name: 'notice.png', mimeType: 'image/png', buffer: await fs.readFile('public/assets/branding/wattsnap-icon-192.png') });
  await page.getByLabel('Areas as written in the original').fill('Payao');
  await page.getByLabel('Provider named in the advisory').selectOption('other');
  assert.equal(await page.getByLabel('Provider name', { exact: true }).inputValue(), 'River cooperative');
  await page.getByLabel('Province for area 1', { exact: true }).fill('Antique');
  await page.getByLabel('Municipality for area 1', { exact: true }).fill('San Jose de Buenavista');
  await page.getByLabel('Barangay for area 1', { exact: true }).fill('Payao');
  await page.getByRole('heading', { name: 'Possibly Affected', exact: true }).waitFor();
  await page.getByLabel('Scope for area 1', { exact: true }).selectOption('barangay');
  await page.getByRole('heading', { name: 'Affected', exact: true }).waitFor();
  await page.getByLabel('Review title (optional)', { exact: true }).fill('My provider notice');
  await page.getByRole('checkbox', { name: /I checked the original and these fields/ }).check();
  await page.getByRole('button', { name: 'Save reviewed advisory', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Choose to keep this original screenshot' }).waitFor();
  assert.equal(await page.evaluate(() => localStorage.getItem('wattsnap-advisories-ui-preview-v1')), null, 'Photo not saved without explicit choice');
  await page.getByRole('checkbox', { name: /Keep the original screenshot/ }).check();
  await page.getByRole('button', { name: 'Save reviewed advisory', exact: true }).click();
  await page.getByRole('link', { name: 'View saved advisory', exact: true }).click();
  await page.getByRole('heading', { name: 'My provider notice', exact: true }).waitFor();
  await page.getByRole('link', { name: 'Correct review fields', exact: true }).click();
  await page.getByLabel('Review title (optional)', { exact: true }).fill('Corrected provider notice');
  await page.getByRole('checkbox', { name: /I checked the original and these fields/ }).check();
  await page.getByRole('button', { name: 'Save corrected review', exact: true }).click();
  await page.getByRole('link', { name: 'View saved advisory', exact: true }).click();
  await page.getByRole('heading', { name: 'Corrected provider notice', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Close advisory details', exact: true }).click();
  await page.goto(`${baseURL}/advisories/new`);
  await page.getByLabel('Original advisory text', { exact: true }).fill('Official notice: some areas may be affected. Schedule not provided.');
  await page.getByRole('button', { name: 'Review pasted text', exact: true }).click();
  await page.getByLabel('Areas as written in the original').fill('Some areas');
  await page.getByRole('checkbox', { name: /I checked the original and these fields/ }).check();
  await page.getByRole('button', { name: 'Save reviewed advisory', exact: true }).click();
  await page.getByRole('link', { name: 'View saved advisory', exact: true }).waitFor();
  await page.reload(); await page.goto(`${baseURL}/advisories`);
  await page.locator('.adv-card').first().waitFor();
  assert.equal(await page.locator('.adv-card').count(), 2);
  const records = await page.evaluate(() => JSON.parse(localStorage.getItem('wattsnap-advisories-ui-preview-v1')));
  assert.equal(records.length, 2); assert.equal(records[0].details.provider, 'custom:River%20cooperative'); assert.equal(records[0].revision, 2);
  assert.equal(records[1].original.text, 'Official notice: some areas may be affected. Schedule not provided.');
  await context.close(); console.log('PASS: advisory upload consent, custom provider, exact/ambiguous matches, correction, paste and refresh');
}

async function storage(browser) {
  const context = await browser.newContext();
  await context.addInitScript(() => { if (!localStorage.getItem('wattsnap-ui-preview-v1')) localStorage.setItem('wattsnap-ui-preview-v1', JSON.stringify({ name: 'River home', bills: [{ id: 'sample-preserved', month: '2026-07', kwh: 100, amount: 1200, source: 'sample' }], budget: 0, appliances: [], futureField: { preserve: true } })); });
  const page = await context.newPage(); await page.goto(`${baseURL}/budget`);
  await page.getByLabel('Monthly budget in pesos').fill('2000');
  await page.getByRole('button', { name: /Set budget to/ }).click(); await page.getByRole('status').filter({ hasText: 'Budget set' }).waitFor();
  const home = await page.evaluate(() => JSON.parse(localStorage.getItem('wattsnap-ui-preview-v1')));
  assert.deepEqual(home.futureField, { preserve: true }); assert.equal(home.bills[0].id, 'sample-preserved');
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException('Full storage', 'QuotaExceededError'); }; });
  await page.getByLabel('Monthly budget in pesos').fill('2500'); await page.getByRole('button', { name: /Set budget to/ }).click();
  await page.getByRole('alert').filter({ hasText: 'could not be saved' }).waitFor(); assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('wattsnap-ui-preview-v1')).budget), 2000);
  await context.close();
  const broken = await browser.newContext(); await broken.addInitScript(() => localStorage.setItem('wattsnap-ui-preview-v1', '{unreadable'));
  const brokenPage = await broken.newPage(); await brokenPage.goto(`${baseURL}/budget`);
  await brokenPage.getByRole('alert').filter({ hasText: 'could not be opened' }).waitFor();
  await brokenPage.getByLabel('Monthly budget in pesos').fill('2000'); await brokenPage.getByRole('button', { name: /Set budget to/ }).click();
  assert.equal(await brokenPage.evaluate(() => localStorage.getItem('wattsnap-ui-preview-v1')), '{unreadable'); await broken.close();
  console.log('PASS: unknown legacy fields and fixtures retained; quota and unreadable data do not overwrite records');
}

async function offline(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(() => { if (!localStorage.getItem('wattsnap-ui-preview-v1')) localStorage.setItem('wattsnap-ui-preview-v1', JSON.stringify({ name: 'River home', bills: [{ id: 'actual', month: '2026-09', kwh: 100, amount: 1200 }], budget: 1500, appliances: [{ id: 'fan', name: 'My fan', watts: 55, hours: 8, quantity: 1 }] })); });
  const page = await context.newPage(); const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${baseURL}/dashboard`); await page.locator('.ws-chart-day').first().waitFor();
  await page.waitForFunction(() => navigator.serviceWorker.controller?.state === 'activated', undefined, { timeout: 60000 });
  assert.equal(await page.evaluate(async () => { const cache = await caches.open('wattsnap-shell-v3'); return !!await cache.match('/advisories/new', { ignoreVary: true }) && !!await cache.match('/assistant', { ignoreVary: true }); }), true, 'All shells prepared before disconnecting');
  await page.reload(); await page.locator('.ws-chart-day').first().waitFor();
  await page.evaluate(async () => { const resources = performance.getEntriesByType('resource').map(entry => entry.name).filter(name => new URL(name).pathname.startsWith('/_next/image')); await Promise.all(resources.map(url => fetch(url))); });
  await context.setOffline(true);
  await page.waitForFunction(() => !navigator.onLine);
  await page.locator('.ws-connectivity').waitFor();
  for (const route of ['/bills', '/appliances', '/tips', '/advisories', '/onboarding', '/budget', '/simulator', '/brownout-ready', '/assistant', '/dashboard']) {
    console.log(`Checking cached route ${route}`);
    await page.goto(`${baseURL}${route}`); await page.locator('.ws-home').waitFor(); await page.locator('.ws-connectivity').waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${route} fits offline`);
  }
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Energy', exact: true }).click(); await page.waitForURL('**/bills');
  await page.locator('.en-list > li').waitFor();
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('wattsnap-ui-preview-v1')).bills[0].kwh), 100);
  assert.deepEqual(errors, []); await context.close(); console.log('PASS: production cached shells, cold offline navigation, saved records and no runtime errors');
}

async function accessibility(browser) {
  const context = await browser.newContext({ viewport: { width: 320, height: 800 }, reducedMotion: 'reduce' });
  const page = await context.newPage(); await page.goto(`${baseURL}/appliances/new`);
  await page.getByRole('button', { name: 'Enter manually', exact: true }).click();
  const refrigerator = page.getByRole('radio', { name: 'Refrigerator', exact: true }); await refrigerator.focus(); await page.keyboard.press('Space');
  assert.equal(await refrigerator.isChecked(), true);
  assert.equal(await refrigerator.evaluate(input => { const label = input.closest('label'), style = getComputedStyle(label), rect = label.getBoundingClientRect(); return rect.width >= 44 && rect.height >= 44 && parseFloat(style.fontSize) >= 14; }), true);
  assert.equal(await page.getByLabel('Appliance name', { exact: true }).evaluate(input => parseFloat(getComputedStyle(input).fontSize) >= 16), true);
  await page.getByLabel('Rated power', { exact: true }).focus();
  assert.equal(await page.getByLabel('Rated power', { exact: true }).evaluate(input => getComputedStyle(input).outlineStyle !== 'none'), true);
  assert.equal(await page.getByRole('button', { name: 'Save appliance', exact: true }).evaluate(button => button.getBoundingClientRect().height >= 44), true);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
  await context.close(); console.log('PASS: keyboard appliance choice, readable fields, visible focus and senior touch targets');
}

async function responsive(browser) {
  await fs.mkdir('docs/frontend-review', { recursive: true });
  for (const width of [320, 390, 768, 1024, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    await context.addInitScript(() => { if (!localStorage.getItem('wattsnap-ui-preview-v1')) localStorage.setItem('wattsnap-ui-preview-v1', JSON.stringify({ name: 'River household', provider: 'anteco', location: 'Payao, San Jose de Buenavista, Antique', locality: { province: 'Antique', municipality: 'San Jose de Buenavista', barangay: 'Payao' }, bills: [7, 8, 9].map((month, i) => ({ id: `my-bill-${i}`, month: `2026-0${month}`, kwh: 100 + i * 30, amount: 1200 + i * 350, source: 'manual' })), budget: 2000, appliances: [{ id: 'fan', name: 'Living room electric fan', watts: 55, hours: 8, quantity: 2, days: 30 }, { id: 'fridge', name: 'Kitchen refrigerator', watts: 80, hours: 16, quantity: 1, days: 30 }] })); });
    const page = await context.newPage(); const errors = []; page.on('pageerror', error => errors.push(error.message));
    for (const route of ['/dashboard', '/bills', '/bills/new', '/appliances', '/appliances/new', '/tips', '/advisories', '/advisories/new', '/onboarding', '/settings', '/simulator', '/brownout-ready', '/assistant', '/setup']) {
      await page.goto(`${baseURL}${route}`); await page.locator('nav[aria-label="Main navigation"]').waitFor({ state: 'attached' });
      await page.waitForFunction(() => !!document.querySelector('.ws-home'));
      const fit = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
      if (!fit) console.log(await page.evaluate(() => [...document.querySelectorAll('main *')].filter(el => el.getBoundingClientRect().right > innerWidth + 2).slice(0, 6).map(el => ({ tag: el.tagName, class: el.className, right: el.getBoundingClientRect().right }))));
      assert.equal(fit, true, `${route} fits ${width}px`);
      if (route === '/dashboard' && (width === 390 || width === 1440)) { await page.locator('.ws-chart-day').first().waitFor(); await page.evaluate(() => document.fonts.ready.then(() => true)); await page.screenshot({ path: `docs/frontend-review/dashboard-${width}.png`, fullPage: true }); }
      if (route === '/appliances/new' && width === 390) { await page.getByRole('button', { name: 'Enter manually', exact: true }).click(); await page.screenshot({ path: 'docs/frontend-review/appliance-mobile.png', fullPage: true }); }
    }
    assert.deepEqual(errors, []); await context.close(); console.log(`PASS: fourteen household pages fit ${width}px without runtime errors`);
  }
}

async function chart(browser) {
  for (const width of [320, 390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.addInitScript(() => localStorage.setItem('wattsnap-ui-preview-v1', JSON.stringify({ name: 'River household', bills: [{ id: 'actual', month: '2026-09', kwh: 100, amount: 1200 }], appliances: [], budget: 1500 })));
    const page = await context.newPage(); await page.goto(`${baseURL}/dashboard`); await page.locator('.ws-bar-value').waitFor();
    assert.equal(await page.locator('.ws-bar-value').evaluate(value => { const chart = value.closest('.ws-chart').getBoundingClientRect(), rect = value.getBoundingClientRect(); return rect.top >= chart.top && rect.right <= chart.right; }), true, 'Selected chart value is fully visible');
    assert.equal(await page.locator('.ws-chart-day').first().evaluate(button => button.getBoundingClientRect().width >= 44), true);
    if (width !== 320) await page.screenshot({ path: `docs/frontend-review/dashboard-${width}.png`, fullPage: true });
    await context.close();
  }
  console.log('PASS: chart values remain visible with usable touch targets at mobile and desktop widths');
}

async function content(browser) {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage(); await page.goto(`${baseURL}/`);
    await page.getByRole('heading', { name: 'Made for Everyday Households' }).waitFor();
    const text = await page.locator('body').innerText();
    assert.doesNotMatch(text, /What Users Are Saying|AI reads the details|let AI extract|Local SQLite Storage/);
    assert.match(text, /Review the Details/); assert.match(text, /Automatic extraction and live outage monitoring are unavailable/);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    await page.goto(`${baseURL}/settings`);
    await page.getByRole('heading', { name: 'Your saved information', exact: true }).waitFor();
    assert.equal(await page.getByRole('switch').count(), 0, 'Unavailable automatic alerts are not interactive');
    assert.equal(await page.getByLabel('Home location', { exact: true }).inputValue(), '', 'No invented household locality');
    await page.goto(`${baseURL}/assistant`);
    await page.getByText('Local guidance · saved records', { exact: true }).waitFor();
    await context.close();
  }
  console.log('PASS: honest landing capabilities, local access, shared-browser privacy and manual assistant');
}

async function history(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(() => { if (!localStorage.getItem('wattsnap-ui-preview-v1')) localStorage.setItem('wattsnap-ui-preview-v1', JSON.stringify({ name: 'River home', budget: 0, appliances: [], bills: [{ id: 'actual-1', month: '2026-07', kwh: 100, amount: 1200, source: 'manual', periodStart: '2026-07-01', periodEnd: '2026-07-31' }, { id: 'actual-2', month: '2026-09', kwh: 150, amount: 1800, source: 'manual', periodStart: '2026-09-01', periodEnd: '2026-09-30' }] })); });
  const page = await context.newPage(); await page.goto(`${baseURL}/bills`);
  await page.getByRole('heading', { name: 'Latest vs previous saved bill' }).waitFor();
  await page.getByText('Notable increase.', { exact: true }).waitFor();
  assert.equal(await page.locator('.en-col').count(), 2, 'No invented missing month');
  assert.match(await page.locator('.en-compare').innerText(), /different numbers of days/);
  await page.getByRole('button', { name: 'Remove September 2026 bill', exact: true }).click();
  await page.getByRole('button', { name: 'Keep record', exact: true }).click();
  assert.equal(await page.locator('.en-list > li').count(), 2);
  await page.getByRole('button', { name: 'Remove September 2026 bill', exact: true }).click();
  await page.getByRole('button', { name: 'Remove record', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'bill removed' }).waitFor();
  await page.reload(); await page.locator('.en-list > li').first().waitFor(); assert.equal(await page.locator('.en-list > li').count(), 1);
  await page.goto(`${baseURL}/dashboard`); await page.locator('.ws-chart-day').first().waitFor(); assert.equal(await page.locator('.ws-chart-day').count(), 1);
  await context.close(); console.log('PASS: actual bill history, gaps, notable changes, confirmed deletion and refresh');
}


async function camera(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(() => {
    window.__cameraRequests = 0;
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => { window.__cameraRequests++; throw new DOMException('Denied for isolated test', 'NotAllowedError'); } } });
  });
  const page = await context.newPage(); await page.goto(baseURL + '/bills/new');
  assert.equal(await page.evaluate(() => window.__cameraRequests), 0, 'Camera never opens without user action');
  await page.getByRole('button', { name: 'Open camera', exact: true }).click();
  await page.getByText('Camera access is blocked.', { exact: false }).first().waitFor();
  assert.equal(await page.evaluate(() => window.__cameraRequests), 1);
  await page.getByRole('button', { name: 'Type it', exact: true }).click();
  await page.getByLabel('Energy used', { exact: true }).waitFor();
  assert.equal(await page.getByLabel('Energy used', { exact: true }).inputValue(), '');
  await context.close(); console.log('PASS: user-triggered camera denial and manual fallback without invented values');
}

async function retained(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await context.addInitScript(() => { if (!localStorage.getItem('wattsnap-ui-preview-v1')) localStorage.setItem('wattsnap-ui-preview-v1', JSON.stringify({ name: 'River home', provider: 'anteco', location: 'Payao, San Jose de Buenavista, Antique', locality: { province: 'Antique', municipality: 'San Jose de Buenavista', barangay: 'Payao' }, budget: 1800, bills: [{ id: 'older', month: '2026-07', kwh: 100, amount: 1200 }, { id: 'newer', month: '2026-09', kwh: 150, amount: 1500 }], appliances: [{ id: 'actual-ac', name: 'Living room air conditioner', kind: 'aircon', watts: 1000, hours: 8, quantity: 1, days: 30, source: 'manual' }] })); });
  const page = await context.newPage(); const errors = [], ai = [];
  page.on('pageerror', error => errors.push(error.message)); page.on('request', request => { if (/\/api\/ai\//.test(request.url())) ai.push(request.url()); });
  await page.goto(baseURL + '/simulator');
  await page.getByRole('button', { name: 'Use saved appliances' }).click();
  assert.equal(await page.getByTestId('baseline-kwh').innerText(), '240.00\nkWh');
  await page.getByLabel('Hours per day for appliance 1', { exact: true }).fill('5');
  assert.equal(await page.getByTestId('scenario-kwh').innerText(), '150.00\nkWh');
  assert.equal(await page.locator('.wi-costs').count(), 0, 'No implicit scenario tariff');
  await page.getByLabel('Scenario name', { exact: true }).fill('My reviewed cooling comparison');
  await page.getByRole('button', { name: 'Save scenario', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Scenario saved' }).waitFor();
  await page.reload(); await page.getByRole('button', { name: 'Open My reviewed cooling comparison' }).click();
  assert.equal(await page.getByTestId('scenario-kwh').innerText(), '150.00\nkWh');
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('wattsnap-ui-preview-v1')).appliances[0].hours), 8, 'Simulator does not edit the real appliance');
  await page.goto(baseURL + '/assistant');
  await page.getByText('Local guidance', { exact: false }).first().waitFor();
  await page.getByLabel('Message WattSnap AI').fill('Why did my bill go higher?'); await page.keyboard.press('Enter');
  await page.locator('.chat-row.is-bot').first().waitFor();
  assert.match(await page.locator('.chat-row.is-bot').first().innerText(), /150 kWh, 50% more/);
  assert.match(await page.locator('.chat-row.is-bot').first().innerText(), /totals alone do not explain why/);
  await context.setOffline(true);
  await page.getByLabel('Message WattSnap AI').fill('Which appliance uses the most?'); await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelectorAll('.chat-row.is-bot').length === 2);
  assert.match(await page.locator('.chat-row.is-bot').last().innerText(), /Living room air conditioner/i);
  await context.setOffline(false); await page.getByRole('button', { name: 'Start a new chat' }).click(); assert.equal(await page.locator('.chat-row').count(), 0);
  await page.goto(baseURL + '/advisories/new');
  await page.getByLabel('Original advisory text', { exact: true }).fill('Provider announcement for Payao: planned work on November 10, 2030 from 8am to noon. Check official updates.');
  await page.getByRole('button', { name: 'Review pasted text', exact: true }).click();
  await page.getByLabel('Advisory type').selectOption('scheduled');
  await page.getByLabel('Provider named in the advisory').selectOption('anteco');
  await page.getByLabel('Review title (optional)').fill('My preparation notice');
  await page.getByLabel('Interruption date', { exact: true }).fill('2030-11-10');
  await page.getByLabel('Start time', { exact: true }).fill('08:00'); await page.getByLabel('End time', { exact: true }).fill('12:00');
  await page.getByLabel('Areas as written in the original').fill('Payao');
  await page.getByLabel('Province for area 1').fill('Antique'); await page.getByLabel('Municipality for area 1').fill('San Jose de Buenavista'); await page.getByLabel('Barangay for area 1').fill('Payao'); await page.getByLabel('Scope for area 1').selectOption('barangay');
  await page.getByRole('checkbox', { name: /I checked the original and these fields/ }).check();
  await page.getByRole('button', { name: 'Save reviewed advisory', exact: true }).click();
  await page.getByRole('link', { name: 'View saved advisory', exact: true }).click();
  await page.getByRole('link', { name: 'Prepare with this advisory', exact: true }).click();
  const save = page.getByRole('button', { name: 'Save preparation plan', exact: true }); assert.equal(await save.isDisabled(), true);
  await page.getByRole('checkbox', { name: 'I checked the original provider source and the published schedule for this preparation plan.', exact: true }).check();
  await save.click(); await page.getByRole('region', { name: 'Saved published schedule' }).waitFor();
  assert.match(await page.locator('.bready-schedule').innerText(), /4 hours/);
  const checklist = page.getByRole('region', { name: 'Preparation checklist' }); await context.setOffline(true); await checklist.getByRole('checkbox').first().check();
  await context.setOffline(false); await page.reload(); await checklist.getByRole('checkbox').first().waitFor(); assert.equal(await checklist.getByRole('checkbox').first().isChecked(), true);
  await page.getByText('Manage this preparation plan', { exact: true }).click(); await page.getByRole('button', { name: 'Remove this plan', exact: true }).click(); await page.getByRole('button', { name: 'Keep plan', exact: true }).click();
  assert.equal(await page.getByRole('region', { name: 'Preparation checklist' }).count(), 1);
  await page.getByRole('button', { name: 'Remove this plan', exact: true }).click(); await page.getByRole('button', { name: 'Remove preparation plan', exact: true }).click(); await page.getByRole('heading', { name: 'No preparation plan yet' }).waitFor();
  await page.goto(baseURL + '/advisories'); await page.getByRole('button', { name: /View My preparation notice/ }).click();
  await page.getByText('Manage saved advisory', { exact: true }).click(); await page.getByRole('button', { name: 'Remove saved advisory', exact: true }).click(); await page.getByRole('button', { name: 'Keep advisory', exact: true }).click();
  assert.equal(await page.getByRole('heading', { name: 'My preparation notice', exact: true }).count(), 1);
  await page.getByRole('button', { name: 'Remove saved advisory', exact: true }).click(); await page.getByRole('button', { name: 'Remove advisory and original', exact: true }).click(); await page.getByRole('heading', { name: 'No saved advisories yet' }).waitFor();
  assert.deepEqual(errors, []); assert.deepEqual(ai, []); await context.close(); console.log('PASS: actual simulator snapshots, offline local assistant, reviewed preparation plans, persistent checklist and confirmed deletion');
}


async function polish(browser) {
  for (const width of [320, 1440]) {
    console.log('Checking final polish at ' + width + 'px');
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    await context.addInitScript(() => { if (!localStorage.getItem('wattsnap-ui-preview-v1')) localStorage.setItem('wattsnap-ui-preview-v1', JSON.stringify({ name: 'My home', provider: 'anteco', budget: 1800, appliances: [], bills: [{ id: 'older', month: '2026-07', kwh: 100, amount: 1200 }, { id: 'newer', month: '2026-09', kwh: 100, amount: 1200, billingDate: '2026-09-30', notes: 'My verified meter note ' + 'A'.repeat(100) }] })); });
    const page = await context.newPage(); const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(baseURL + '/dashboard'); await page.locator('.ws-savings').waitFor(); assert.equal((await page.locator('.ws-savings').innerText()).trim(), 'No change');
    await page.goto(baseURL + '/bills'); await page.getByText('No change from July', { exact: true }).waitFor();
    await page.getByText('Notes: My verified meter note', { exact: false }).waitFor(); await page.getByText('Bill issued', { exact: false }).first().waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'Long bill note fits');
    await page.goto(baseURL + '/bills/new'); await page.getByRole('button', { name: width >= 1100 ? 'Enter bill manually' : 'Type it', exact: true }).click();
    await page.getByLabel('Billing month', { exact: true }).fill('2026-10'); await page.getByLabel('Energy used', { exact: true }).fill('100'); await page.getByLabel('Amount due', { exact: true }).fill('1200');
    await page.getByRole('checkbox', { name: 'I reviewed all the values above.', exact: false }).check(); await page.getByRole('button', { name: 'Save to history', exact: true }).click();
    await page.getByText('No change from September', { exact: true }).waitFor();
    await page.goto(baseURL + '/appliances/new'); await page.getByRole('button', { name: 'Enter manually', exact: true }).click(); await page.getByRole('button', { name: 'Add photo', exact: true }).waitFor();
    await page.goto(baseURL + '/brownout-ready'); await page.getByRole('heading', { name: 'No preparation plan yet' }).waitFor(); assert.equal(await page.locator('a[href*="sample="]').count(), 0); assert.equal(await page.getByRole('link', { name: 'Add your provider announcement' }).count(), 1);
    await page.goto(baseURL + '/'); assert.deepEqual(await page.locator('.post-feature-card').evaluateAll(items => items.map(item => item.getAttribute('href'))), ['/bills/new', '/bills', '/tips', '/advisories']);
    assert.deepEqual(errors, []); await context.close();
  }
  console.log('PASS: neutral unchanged bills, readable optional metadata, honest photo action, actual advisory entry and feature destinations');
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try { for (const check of (process.argv.slice(2).length ? process.argv.slice(2) : ['design', 'records', 'household', 'bills', 'history', 'appliances', 'estimates', 'tips', 'advisories', 'storage', 'accessibility', 'camera', 'retained'])) await ({ design, records, household, bills, history, appliances, estimates, tips, advisories, storage, offline, accessibility, responsive, chart, content, camera, retained, polish })[check](browser); } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
