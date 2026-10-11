// Render the real screen and styles in an isolated browser harness.
// Framework navigation/image adapters are replaced; generation requests are controlled.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { registerHooks } = require('node:module');
registerHooks({ resolve(s, c, next) { try { return next(s, c); } catch (e) { if (e.code === 'ERR_MODULE_NOT_FOUND' && s.startsWith('.') && !/\.[a-z]+$/i.test(s)) return next(s + '.ts', c); throw e; } } });
const toolsPath = process.env.SCANNER_TOOLS || path.join(os.tmpdir(), 'wattsnap-scanner-tools', 'node_modules');
const { build } = require(path.join(toolsPath, 'esbuild'));
const { chromium } = require(path.join(toolsPath, 'playwright'));
const root = path.resolve(__dirname, '../..');
const householdKey = 'wattsnap-ui-preview-v1', tipsKey = 'wattsnap-tips-ui-preview-v1';
const seed = { name: 'Santos household', email: 'private@example.com', budget: 1800, appliances: [
  { id: 'fridge', name: 'Kitchen refrigerator', kind: 'fridge', watts: 100, hours: 16, quantity: 1, source: 'manual', wattageBasis: 'nameplate' },
  { id: 'fan', name: 'Bedroom fan', kind: 'fan', watts: 55, hours: 8, quantity: 1, source: 'manual', wattageBasis: 'nameplate' }
], bills: [{ id: 'sep', month: '2026-09', amount: 1440, kwh: 120, periodStart: '2026-09-01', periodEnd: '2026-09-30', source: 'manual' }] };
const reply = [
  { id: 'bill-review', title: 'Keep your bill history', action: 'Save your next bill and check the billing dates before comparing usage.', explanation: 'One bill is a starting point; another comparable period will help.', assumptions: ['Bill periods need to be comparable.'] },
  { id: 'appliance-fridge', title: 'Keep cool air inside', action: 'Keep door openings brief and check the seals. Keep the refrigerator powered for food storage.', explanation: 'Your refrigerator has the highest estimated use in your list.', assumptions: ['Rated power is an estimate of actual use.'] },
  { id: 'appliance-fan', title: 'Empty room? Fan off.', action: 'Switch off the bedroom fan when nobody is there to enjoy the airflow.', explanation: 'Your fan is recorded for eight hours a day.', assumptions: ['Use may differ from your saved hours.'] }
];

async function main() {
  const output = await fs.mkdtemp(path.join(os.tmpdir(), 'wattsnap-tipid-tips-'));
  let fontCss = ':root{--font-jakarta-sans:"Segoe UI"}';
  try {
    const cssDir = path.join(root, '.next/static/css');
    for (const file of await fs.readdir(cssDir)) {
      const css = await fs.readFile(path.join(cssDir, file), 'utf8');
      const faces = css.match(/@font-face\{[^}]*Plus_Jakarta_Sans[^}]*\}/g);
      if (faces) { const family = faces[0].match(/font-family:([^;]+)/)[1]; fontCss = faces.join('') + ':root{--font-jakarta-sans:' + family + '}'; break; }
    }
  } catch { /* System-font fallback when no production build exists. */ }
  const adapters = {
    'next/link': `import React from 'react'; export default function Link({href,children,...props}){return <a href={href} {...props}>{children}</a>;}`,
    'next/image': `import React from 'react'; export default function Image({priority,fill,unoptimized,...props}){return <img {...props}/>;} export function getImageProps(props){return {props};}`,
    'next/navigation': `export function usePathname(){return '/tips';}`,
  };
  await build({
    stdin: { contents: `import React from 'react'; import {createRoot} from 'react-dom/client';
      import TipsScreen from './src/features/tipid-tips/components/TipsScreen';
      import './src/app/globals.css';
      import './src/features/onboarding/theme.css'; import './src/features/onboarding/accessibility.css';
      import './src/features/dashboard/frontend-refinements.css';
      import './src/app/(household)/dashboard/dashboard.css';
      import './src/features/dashboard/app-ui.css'; import './src/features/dashboard/navigation.css';
      import './src/features/dashboard/account.css'; import './src/features/tipid-tips/tips-preview.css';
      createRoot(document.getElementById('root')).render(<TipsScreen/>);`, resolveDir: root, loader: 'tsx' },
    outfile: path.join(output, 'app.js'), bundle: true, platform: 'browser', jsx: 'automatic', external: ['/assets/*'],
    define: { 'process.env.NODE_ENV': '"development"', 'process.env.NEXT_PUBLIC_SUPABASE_URL': '""', 'process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY': '""' },
    plugins: [{ name: 'framework-adapters', setup(b) {
      b.onResolve({ filter: /^next\/(link|image|navigation)$/ }, args => ({ path: args.path, namespace: 'adapter' }));
      b.onLoad({ filter: /.*/, namespace: 'adapter' }, args => ({ contents: adapters[args.path], loader: 'tsx', resolveDir: root }));
    } }],
  });
  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname === '/') { response.setHeader('Content-Type', 'text/html'); response.end('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/app.css"><style>' + fontCss + '</style></head><body><div id="root"></div><script src="/app.js"></script></body></html>'); return; }
    const publicRoot = path.join(root, 'public');
    const staticRoot = path.join(root, '.next/static');
    const file = url.pathname.startsWith('/_next/static/') ? path.resolve(staticRoot, url.pathname.slice('/_next/static/'.length)) : url.pathname === '/app.js' || url.pathname === '/app.css' ? path.join(output, url.pathname.slice(1)) : path.resolve(publicRoot, '.' + decodeURIComponent(url.pathname));
    if (!file.startsWith(publicRoot + path.sep) && !file.startsWith(output + path.sep) && !file.startsWith(staticRoot + path.sep)) { response.writeHead(403); response.end(); return; }
    try { const data = await fs.readFile(file); response.setHeader('Content-Type', file.endsWith('.css') ? 'text/css' : file.endsWith('.js') ? 'text/javascript' : file.endsWith('.svg') ? 'image/svg+xml' : file.endsWith('.png') ? 'image/png' : 'application/octet-stream'); response.end(data); }
    catch { response.writeHead(404); response.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    // Old AI advice must not freeze the outlook when bill sync imports a complete year.
    const { generatePreviewTips } = await import('../../src/features/tipid-tips/preview-tips.ts');
    const forecastDate = new Date('2026-10-12T04:00:00Z');
    const recentHome = { ...seed, bills: [{ id: 'aug', month: '2026-08', amount: 1200, kwh: 100, source: 'manual' }, seed.bills[0]] };
    const oldAdvice = generatePreviewTips(recentHome, forecastDate);
    const pattern = [138,145,181,224,246,211,186,169,154,142,131,158];
    const fullHome = { ...recentHome, bills: [...pattern.map((kwh,i) => ({ id: `history-${i}`, month: `2025-${String(i+1).padStart(2,'0')}`, kwh, amount: kwh*12, subsidy: 500, source: 'manual' })), ...recentHome.bills] };
    for (const width of [1440, 390]) {
      const fc = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      await fc.addInitScript(({ householdKey, tipsKey, home, advice }) => {
        if (!localStorage.getItem(householdKey)) localStorage.setItem(householdKey, JSON.stringify(home));
        if (!localStorage.getItem(tipsKey)) localStorage.setItem(tipsKey, JSON.stringify(advice));
      }, { householdKey, tipsKey, home: recentHome, advice: oldAdvice });
      const fp = await fc.newPage(), errors = [], requests = [];
      fp.setDefaultTimeout(10000);
      fp.on('pageerror', e => errors.push(e.message));
      fp.on('request', r => { if (new URL(r.url()).pathname.startsWith('/api/ai/')) requests.push(r.url()); });
      await fp.clock.setFixedTime(forecastDate);
      await fp.goto(base);
      await fp.getByRole('heading', { name: 'Next-year outlook', exact: true }).waitFor();
      await fp.locator('.tt-forecast-empty summary').click();
      assert.match(await fp.locator('.tt-forecast-empty').innerText(), /2 usable receipts/);
      await fp.evaluate(({ key, home }) => { localStorage.setItem(key, JSON.stringify(home)); window.dispatchEvent(new Event('wattsnap-preview-change')); }, { key: householdKey, home: fullHome });
      await fp.getByRole('heading', { name: '2027 outlook', exact: true }).waitFor();
      assert.match(await fp.locator('.tt-forecast-selected').innerText(), /246.*kWh/s);
      assert.match(await fp.locator('.tt-forecast-highlights').innerText(), /high: May.*low: Nov/);
      assert.equal(await fp.locator('.tt-forecast-selected').getByText('Estimated bill · before subsidies', { exact: true }).count(), 1);
      assert.match(await fp.locator('.tt-forecast-stale').innerText(), /Refresh tips to include this outlook/);
      assert.deepEqual(await fp.evaluate(key => JSON.parse(localStorage.getItem(key)), tipsKey), oldAdvice, 'New outlook preserves saved advice');
      assert.equal(await fp.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
      await fp.screenshot({ path: path.join(output, `synced-outlook-${width}.png`), fullPage: true });
      await fp.reload();
      await fp.getByRole('heading', { name: '2027 outlook', exact: true }).waitFor();
      await fc.setOffline(true);
      await fp.getByRole('button', { name: 'August 2027', exact: true }).click();
      assert.match(await fp.locator('.tt-forecast-selected').innerText(), /169.*kWh/s);
      const editedHome = { ...fullHome, bills: fullHome.bills.map(b => b.month === '2025-08' ? { ...b, kwh: 175 } : b) };
      await fp.evaluate(({ key, home }) => { localStorage.setItem(key, JSON.stringify(home)); window.dispatchEvent(new Event('wattsnap-preview-change')); }, { key: householdKey, home: editedHome });
      await fp.waitForFunction(() => document.querySelector('.tt-forecast-selected')?.textContent.includes('175'));
      // A stored ready forecast cannot hide a missing month after a bill is removed.
      const readyAdvice = generatePreviewTips(fullHome, forecastDate);
      await fp.evaluate(({ householdKey, tipsKey, home, advice }) => {
        localStorage.setItem(tipsKey, JSON.stringify(advice)); window.dispatchEvent(new Event('wattsnap-tips-change'));
        localStorage.setItem(householdKey, JSON.stringify(home)); window.dispatchEvent(new Event('wattsnap-preview-change'));
      }, { householdKey, tipsKey, home: { ...fullHome, bills: fullHome.bills.filter(b => b.month !== '2025-01') }, advice: readyAdvice });
      await fp.getByRole('heading', { name: 'Next-year outlook', exact: true }).waitFor();
      await fp.locator('.tt-forecast-empty summary').click();
      assert.match(await fp.locator('.tt-forecast-empty').innerText(), /13 usable receipts/);
      assert.deepEqual(await fp.evaluate(key => JSON.parse(localStorage.getItem(key)), tipsKey), readyAdvice);
      assert.deepEqual(requests, [], 'Recalculating the outlook makes no AI calls');
      assert.deepEqual(errors, []);
      await fc.close();
      console.log(`PASS: ${width}px current bill history overrides old advice for sync, edits, removal, reload and offline outlook`);
    }
    for (const [name, width, height, dark] of [['desktop', 1440, 900, false], ['mobile', 390, 844, false], ['small-mobile', 320, 740, false], ['dark-mobile', 390, 844, true]]) {
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
      await context.addInitScript(({ key, data, dark }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(data)); if (dark) { const setTheme = () => { document.documentElement.dataset.theme = 'dark'; }; if (document.documentElement) setTheme(); else document.addEventListener('DOMContentLoaded', setTheme, { once: true }); } }, { key: householdKey, data: seed, dark });
      const page = await context.newPage(), errors = []; page.on('pageerror', error => errors.push(error.message));
      await page.route('**/api/ai/tips', async route => {
        const body = route.request().postDataJSON();
        assert.equal(body.appliances[0].id, 'fridge');
        assert.doesNotMatch(JSON.stringify(body), /private@example|Santos household/);
        await route.fulfill({ json: { ok: true, data: reply } });
      });
      await page.goto(base);
      await page.getByRole('button', { name: 'Create tips', exact: true }).click();
      await page.getByText('Your new tips are ready.', { exact: true }).waitFor();
      assert.equal(await page.locator('.tt-tip').count(), 3);
      assert.equal(await page.locator('.tt-tip-basis[open]').count(), 0);
      assert.equal(await page.locator('.tt-tip-detail').first().isVisible(), false);
      await page.locator('.tt-tip-basis summary').first().click();
      assert.equal(await page.locator('.tt-tip-detail').first().isVisible(), true);
      await page.locator('.tt-tip-basis summary').first().click();
      const original = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), tipsKey);
      assert.equal(original.source, 'gemini');
      const filters = page.getByRole('group', { name: 'Filter tips' });
      await filters.getByRole('button', { name: 'Appliances', exact: true }).click(); assert.equal(await page.locator('.tt-tip').count(), 2);
      await filters.getByRole('button', { name: 'Bills', exact: true }).click(); assert.equal(await page.locator('.tt-tip').count(), 1);
      await filters.getByRole('button', { name: 'All tips', exact: true }).click();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, name + ' has no horizontal overflow');
      await page.evaluate(async () => { await document.fonts.ready; window.scrollTo(0, 0); });
      await page.screenshot({ path: path.join(output, name + '.png'), fullPage: true });
      await page.unroute('**/api/ai/tips');
      await page.route('**/api/ai/tips', route => route.fulfill({ status: 429, json: { error: 'busy' } }));
      await page.getByRole('button', { name: 'Refresh tips', exact: true }).click();
      await page.getByRole('alert').filter({ hasText: 'Your saved tips are unchanged' }).waitFor();
      assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), tipsKey), original);
      await page.unroute('**/api/ai/tips');
      let pending;
      await page.route('**/api/ai/tips', route => { pending = route; });
      await page.getByRole('button', { name: 'Refresh tips', exact: true }).click();
      await page.getByRole('button', { name: 'Cancel', exact: true }).click();
      await page.getByText('Cancelled. Your saved tips are unchanged.', { exact: true }).waitFor();
      if (pending) await pending.abort().catch(() => {});
      assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), tipsKey), original);
      await context.setOffline(true);
      await page.getByText('Offline · saved tips are available.', { exact: true }).waitFor();
      assert.equal(await page.getByRole('button', { name: 'Refresh tips', exact: true }).isDisabled(), true);
      assert.equal(await page.locator('.tt-tip').count(), 3);
      await context.setOffline(false);
      await page.unroute('**/api/ai/tips');
      await page.reload(); await page.getByText('AI tips · based on your records', { exact: true }).waitFor();
      assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), tipsKey), original);
      assert.deepEqual(errors, []);
      await context.close(); console.log('PASS: ' + name + ' generation, disclosure, filters, failure, cancellation, offline, reload, layout');
    }
    // First-time cloud failure yields labeled basic tips, rather than an empty screen.
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.addInitScript(({ key, data }) => localStorage.setItem(key, JSON.stringify(data)), { key: householdKey, data: seed });
    const page = await context.newPage();
    await page.route('**/api/ai/tips', route => route.fulfill({ status: 503, json: { error: 'unavailable' } }));
    await page.goto(base); await page.getByRole('button', { name: 'Create tips', exact: true }).click();
    await page.getByText('Basic tips · based on your records', { exact: true }).waitFor();
    assert.equal((await page.evaluate(key => JSON.parse(localStorage.getItem(key)), tipsKey)).source, 'local-rule');
    await page.screenshot({ path: path.join(output, 'basic-fallback.png'), fullPage: true });
    await context.close(); console.log('PASS: first-time fallback');
    // A slow response cannot replace advice from another tab or use changed records.
    const raceContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await raceContext.addInitScript(({ key, data }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(data)); }, { key: householdKey, data: seed });
    const racePage = await raceContext.newPage();
    await racePage.route('**/api/ai/tips', route => route.fulfill({ json: { ok: true, data: reply } }));
    await racePage.goto(base); await racePage.getByRole('button', { name: 'Create tips', exact: true }).click();
    await racePage.getByText('Your new tips are ready.', { exact: true }).waitFor();
    const before = await racePage.evaluate(key => JSON.parse(localStorage.getItem(key)), tipsKey);
    await racePage.unroute('**/api/ai/tips');
    let waiting;
    await racePage.route('**/api/ai/tips', route => { waiting = route; });
    const requested = racePage.waitForRequest('**/api/ai/tips');
    await racePage.getByRole('button', { name: 'Refresh tips', exact: true }).click(); await requested;
    const otherTab = await raceContext.newPage(); await otherTab.goto(base);
    const newer = { ...before, generatedAt: '2026-10-12T12:00:00Z', tips: before.tips.map(tip => ({ ...tip, title: 'Newer cross-tab title' })) };
    await otherTab.evaluate(({ key, newer }) => { localStorage.setItem(key, JSON.stringify(newer)); window.dispatchEvent(new Event('wattsnap-tips-change')); }, { key: tipsKey, newer });
    await racePage.getByRole('heading', { name: 'Newer cross-tab title', exact: true }).first().waitFor();
    await waiting.fulfill({ json: { ok: true, data: reply } });
    await racePage.getByRole('alert').filter({ hasText: 'Saved tips changed in another tab' }).waitFor();
    assert.deepEqual(await racePage.evaluate(key => JSON.parse(localStorage.getItem(key)), tipsKey), newer);
    const requestedAgain = racePage.waitForRequest('**/api/ai/tips');
    await racePage.getByRole('button', { name: 'Refresh tips', exact: true }).click(); await requestedAgain;
    await racePage.evaluate(key => { const data = JSON.parse(localStorage.getItem(key)); data.appliances[0].watts = 120; localStorage.setItem(key, JSON.stringify(data)); window.dispatchEvent(new Event('wattsnap-preview-change')); }, householdKey);
    await racePage.getByText('Records changed · refresh your tips', { exact: true }).waitFor();
    await waiting.fulfill({ json: { ok: true, data: reply } });
    await racePage.getByRole('alert').filter({ hasText: 'Your records changed' }).waitFor();
    assert.deepEqual(await racePage.evaluate(key => JSON.parse(localStorage.getItem(key)), tipsKey), newer);
    // Switching the device-local account cancels the previous household request.
    const finalRequest = racePage.waitForRequest('**/api/ai/tips');
    await racePage.getByRole('button', { name: 'Refresh tips', exact: true }).click(); await finalRequest;
    await racePage.evaluate(() => { localStorage.setItem('wattsnap-preview-session-v1', JSON.stringify({ version: 1, identity: { id: 'other-household', name: 'Other home', email: '' } })); window.dispatchEvent(new Event('wattsnap-preview-session-change')); });
    await racePage.getByRole('button', { name: 'Create tips', exact: true }).waitFor();
    await waiting.abort().catch(() => {});
    assert.equal(await racePage.evaluate(key => localStorage.getItem(key + ':household:other-household'), tipsKey), null);
    assert.deepEqual(await racePage.evaluate(key => JSON.parse(localStorage.getItem(key)), tipsKey), newer);
    await raceContext.close(); console.log('PASS: concurrent tips, record edits, and account switches preserve saved advice');
    // Complete last year + partial current year: actual history, computed outlook and AI advice.
    const localYear = Number(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric' }).format(new Date()));
    const monthly = [100,110,140,180,200,170,150,120,100,90,80,100];
    const patternBills = (year, values) => values.map((kwh,i) => ({ id: `${year}-${i+1}`, month: `${year}-${String(i+1).padStart(2,'0')}`, kwh, amount: kwh*12, source: 'manual' }));
    const seasonalHome = { ...seed, bills: [...patternBills(localYear-1, monthly), ...patternBills(localYear, monthly.slice(0,6).map(v=>v*1.2))] };
    const forecastReply = [...reply, { id: 'bill-forecast', title: 'Prepare before May', action: 'Review unused appliance hours before May, your projected high-use month. Keep a budget buffer for changing rates.', explanation: 'The forecast repeats last year’s pattern, adjusted using six matching months.', assumptions: ['Future usage and rates may change.'] }];
    for (const [name,width,dark] of [['forecast-desktop',1440,false],['forecast-mobile',390,false],['forecast-narrow',320,false],['forecast-dark',390,true]]) {
      const fc = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      await fc.addInitScript(({ key, data }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(data)); }, { key: householdKey, data: seasonalHome });
      const fp = await fc.newPage(), errors = []; fp.on('pageerror', e => errors.push(e.message));
      await fp.route('**/api/ai/tips', route => { assert.equal(route.request().postDataJSON().bills.length,18); return route.fulfill({ json: { ok: true, data: forecastReply } }); });
      await fp.goto(base); if (dark) await fp.evaluate(() => document.documentElement.dataset.theme='dark');
      await fp.getByRole('heading', { name: `${localYear+1} outlook`, exact: true }).waitFor();
      assert.match(await fp.locator('.tt-forecast-selected').innerText(), /240.*kWh/s);
      assert.match(await fp.locator('.tt-forecast-selected').innerText(), /2,880/);
      assert.match(await fp.locator('.tt-forecast-highlights').innerText(), /high: May.*low: Nov/);
      await fp.getByRole('button', { name: `June ${localYear+1}`, exact: true }).click();
      assert.match(await fp.locator('.tt-forecast-selected').innerText(), /204.*May fall/s);
      await fp.getByRole('button', { name: `May ${localYear+1}`, exact: true }).click();
      await fp.getByRole('button', { name: 'Create tips', exact: true }).click(); await fp.getByText('Your new tips are ready.', { exact: true }).waitFor();
      assert.equal(await fp.locator('.tt-tip').count(),4);
      const stored = await fp.evaluate(key=>JSON.parse(localStorage.getItem(key)),tipsKey);
      assert.equal(stored.forecast.months[4].kwh,240); assert.equal(stored.forecast.months[4].amount,2880);
      assert.equal(await fp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,name+' no overflow');
      await fp.evaluate(async()=>{await document.fonts.ready; window.scrollTo(0,0);}); await fp.screenshot({ path:path.join(output,name+'.png'),fullPage:true });
      await fp.locator('.tt-forecast-method summary').click(); assert.match(await fp.locator('.tt-forecast-method').innerText(),/before subsidies/);
      await fp.reload(); await fp.getByRole('heading',{name:`${localYear+1} outlook`,exact:true}).waitFor();
      assert.deepEqual(await fp.evaluate(key=>JSON.parse(localStorage.getItem(key)),tipsKey),stored);
      await fc.setOffline(true); await fp.getByText('Offline · saved tips are available.',{exact:true}).waitFor();
      assert.equal(await fp.locator('.tt-forecast').isVisible(),true);
      assert.deepEqual(errors,[]); await fc.close(); console.log('PASS: '+name+' monthly pattern, kWh/pesos, month selection, AI advice, saved/offline forecast');
    }
    console.log('Screenshots: ' + output);
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
