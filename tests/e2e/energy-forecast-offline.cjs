// Real production service-worker check; synthetic browser records, no account or AI calls.
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || path.join(os.tmpdir(), 'wattsnap-scanner-tools/node_modules/playwright'));
const base = process.env.OFFLINE_BASE || 'http://127.0.0.1:3122';
const id = '33333333-3333-4333-8333-333333333333';
const shape = [100, 110, 140, 180, 200, 170, 150, 120, 100, 90, 80, 100];
const year = (y, values = shape) => values.map((kwh, i) => ({ id: `${y}-${i + 1}`, month: `${y}-${String(i + 1).padStart(2, '0')}`, kwh, amount: kwh * 12, source: 'manual' }));
const household = { name: 'Offline forecast home', budget: 1800, provider: 'anteco', appliances: [], bills: [...year(2025), ...year(2026, shape.slice(0, 9).map(v => v * 1.2))] };

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const errors = []; const aiRequests = [];
  context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  context.on('request', request => { const pathname = new URL(request.url()).pathname; if (pathname.startsWith('/api/ai/')) aiRequests.push({ path: pathname, method: request.method() }); });
  try {
    let page = await context.newPage();
    await page.clock.setFixedTime(new Date('2026-10-12T04:00:00Z'));
    await page.goto(base + '/login');
    await page.waitForFunction(() => document.documentElement.dataset.offlineReady === 'true', null, { timeout: 60000 });
    await page.evaluate(({ id, household }) => {
      localStorage.setItem('wattsnap-account-display-v1', JSON.stringify({ version: 1, identity: { id, name: household.name, email: 'forecast@example.test' } }));
      localStorage.setItem('wattsnap-ui-preview-v1:household:' + id, JSON.stringify(household));
    }, { id, household });
    await context.setOffline(true); await page.close();
    page = await context.newPage(); await page.clock.setFixedTime(new Date('2026-10-12T04:00:00Z'));
    await page.goto(base + '/bills');
    await page.locator('[data-offline-app=true]').waitFor({ timeout: 20000 });
    const forecast = page.getByRole('region', { name: 'Next month estimate', exact: true });
    await forecast.getByText('96', { exact: true }).waitFor();
    await forecast.getByText('₱1,152.00', { exact: true }).waitFor();
    await page.getByLabel('History period', { exact: true }).selectOption('last-year');
    assert.equal(await page.locator('.en-list > li').count(), 12);
    await page.reload();
    await forecast.getByText('₱1,152.00', { exact: true }).waitFor();
    await page.getByLabel('History period', { exact: true }).selectOption('2025');
    assert.equal(await page.locator('.en-col').count(), 12);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    assert.deepEqual(errors, []);
    assert.deepEqual(aiRequests, []);
    console.log('PASS: actual production offline reopen, reload, seasonal forecast and year filtering without AI requests');
  } finally { await context.close(); await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
