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

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try { for (const check of (process.argv.slice(2).length ? process.argv.slice(2) : ['design', 'records', 'household', 'bills', 'history', 'appliances', 'estimates', 'tips', 'advisories'])) await ({ design, records, household, bills, history, appliances, estimates, tips, advisories })[check](browser); } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
