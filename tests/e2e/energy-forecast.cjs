// Exercise the actual Energy screen and styles without a real account or AI calls.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const toolsPath = process.env.SCANNER_TOOLS || path.join(os.tmpdir(), 'wattsnap-scanner-tools', 'node_modules');
const { build } = require(path.join(toolsPath, 'esbuild'));
const { chromium } = require(path.join(toolsPath, 'playwright'));
const root = path.resolve(__dirname, '../..');
const key = 'wattsnap-ui-preview-v1';
const shape = [100, 110, 140, 180, 200, 170, 150, 120, 100, 90, 80, 100];
const year = (y, values = shape) => values.map((kwh, i) => ({ id: `${y}-${i + 1}`, month: `${y}-${String(i + 1).padStart(2, '0')}`, kwh, amount: kwh * 12, source: 'manual' }));
const seed = { name: 'Santos household', provider: 'anteco', budget: 1800, appliances: [], bills: [...year(2025), ...year(2026, shape.slice(0, 9).map(v => v * 1.2))] };

async function main() {
  const output = await fs.mkdtemp(path.join(os.tmpdir(), 'wattsnap-energy-forecast-'));
  const adapters = {
    'next/link': `import React from 'react'; export default function Link({href,children,...props}){return <a href={href} {...props}>{children}</a>;}`,
    'next/image': `import React from 'react'; export default function Image({priority,fill,unoptimized,...props}){return <img {...props}/>;} export function getImageProps(props){return {props};}`,
    'next/navigation': `export function usePathname(){return '/bills';}`,
  };
  await build({
    stdin: { contents: `import React from 'react'; import {createRoot} from 'react-dom/client';
      import EnergyScreen from './src/features/dashboard/components/EnergyScreen';
      import './src/app/globals.css'; import './src/app/(household)/dashboard/dashboard.css';
      import './src/features/dashboard/app-ui.css'; import './src/features/dashboard/navigation.css';
      import './src/features/dashboard/account.css'; import './src/features/onboarding/theme.css';
      import './src/features/onboarding/accessibility.css'; import './src/features/dashboard/frontend-refinements.css';
      import './src/features/dashboard/energy.css'; createRoot(document.getElementById('root')).render(<EnergyScreen/>);`, resolveDir: root, loader: 'tsx' },
    outfile: path.join(output, 'app.js'), bundle: true, platform: 'browser', jsx: 'automatic', external: ['/assets/*'],
    define: { 'process.env.NODE_ENV': '"development"', 'process.env.NEXT_PUBLIC_SUPABASE_URL': '""', 'process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY': '""' },
    plugins: [{ name: 'framework-adapters', setup(b) {
      b.onResolve({ filter: /^next\/(link|image|navigation)$/ }, args => ({ path: args.path, namespace: 'adapter' }));
      b.onLoad({ filter: /.*/, namespace: 'adapter' }, args => ({ contents: adapters[args.path], loader: 'tsx', resolveDir: root }));
    } }],
  });
  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname === '/') {
      response.setHeader('Content-Type', 'text/html');
      response.end('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/app.css"><style>:root{--font-jakarta-sans:"Segoe UI",sans-serif}</style></head><body><div id="root"></div><script src="/app.js"></script></body></html>'); return;
    }
    const publicRoot = path.join(root, 'public');
    const file = url.pathname === '/app.js' || url.pathname === '/app.css' ? path.join(output, url.pathname.slice(1)) : path.resolve(publicRoot, '.' + decodeURIComponent(url.pathname));
    if (!file.startsWith(publicRoot + path.sep) && !file.startsWith(output + path.sep)) { response.writeHead(403); response.end(); return; }
    try { const data = await fs.readFile(file); response.setHeader('Content-Type', file.endsWith('.css') ? 'text/css' : file.endsWith('.js') ? 'text/javascript' : file.endsWith('.svg') ? 'image/svg+xml' : file.endsWith('.png') ? 'image/png' : 'application/octet-stream'); response.end(data); }
    catch { response.writeHead(404); response.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const contexts = [];
  async function open(data, width = 390, search = '') {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' }); contexts.push(context);
    await context.addInitScript(({ key, data }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(data)); }, { key, data });
    const page = await context.newPage(); page.setDefaultTimeout(10000);
    page.on('pageerror', error => console.error('Browser error: ' + error.message));
    await page.clock.setFixedTime(new Date('2026-10-12T04:00:00Z'));
    await page.goto(base + search);
    try { await page.getByLabel('History period', { exact: true }).waitFor(); }
    catch (error) { console.error((await page.locator('body').innerText()).slice(0, 2000)); throw error; }
    return { context, page };
  }
  try {
    for (const width of [1440, 390, 320]) {
      const { context, page } = await open(seed, width);
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      const comparison = page.locator('.en-compare');
      assert.equal(await comparison.locator('details[open]').count(), 0, 'Comparison details start collapsed');
      assert((await comparison.innerText()).length < 220, 'Comparison copy fits a quick mobile scan');
      if (width < 600) {
        await comparison.screenshot({ path: path.join(output, `comparison-${width}.png`) });
        const height = (await comparison.boundingBox()).height;
        assert(height <= 320, `Mobile comparison stays compact (${height}px at ${width}px)`);
      }
      await comparison.getByText('Comparison details', { exact: true }).click();
      assert.match(await comparison.innerText(), /20%|20 percent/);
      assert.match(await comparison.innerText(), /do not explain what caused/);
      await comparison.getByText('Comparison details', { exact: true }).click();
      const forecast = page.getByRole('region', { name: 'Next month estimate', exact: true });
      await forecast.getByText('November 2026', { exact: true }).waitFor();
      await forecast.getByText('96', { exact: true }).waitFor();
      assert.match(await forecast.innerText(), /₱1,152\.00/);
      const estimate = await forecast.innerText();
      assert.equal(await page.locator('.en-list > li').count(), 6);
      await page.getByLabel('History period', { exact: true }).selectOption('last-year');
      assert.equal(await page.locator('.en-list > li').count(), 12);
      assert.equal(await page.locator('.en-col').count(), 12);
      assert.equal(await forecast.innerText(), estimate, 'Filtering never changes the all-history forecast');
      assert.match(await page.locator('.en-hero').innerText(), /September 2026/, 'Latest bill summary remains the newest saved bill');
      await page.getByRole('button', { name: 'January 2025: 100 kilowatt hours, ₱1,200.00', exact: true }).click();
      assert.match(await page.locator('.en-focus').innerText(), /January 2025/);
      await page.getByRole('button', { name: 'Pesos', exact: true }).click();
      assert.match(await page.locator('.en-bar').first().innerText(), /₱1,200/);
      await page.getByLabel('History period', { exact: true }).selectOption('this-year');
      assert.equal(await page.locator('.en-list > li').count(), 9);
      assert.match(await page.locator('.en-focus').innerText(), /September 2026/, 'Changing periods resets month selection');
      await page.getByLabel('History period', { exact: true }).selectOption('all');
      assert.equal(await page.locator('.en-list > li').count(), 21);
      await forecast.getByText('How this is estimated', { exact: true }).click();
      assert.match(await forecast.innerText(), /2025.*November|November.*2025/);
      assert.match(await forecast.innerText(), /before subsidy/);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
      await page.screenshot({ path: path.join(output, `energy-${width}-dark.png`), fullPage: true });
      await forecast.screenshot({ path: path.join(output, `forecast-${width}-dark.png`) });
      await page.evaluate(() => { delete document.documentElement.dataset.theme; });
      await page.screenshot({ path: path.join(output, `energy-${width}.png`), fullPage: true });
      await forecast.screenshot({ path: path.join(output, `forecast-${width}.png`) });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${width}px: no page overflow`);
      await context.setOffline(true);
      await page.getByLabel('History period', { exact: true }).selectOption('last-year');
      assert.equal(await page.locator('.en-list > li').count(), 12, 'Filtering works offline');
      assert.match(await forecast.innerText(), /₱1,152\.00/);
      await context.setOffline(false);
      const changed = { ...seed, bills: [...seed.bills, ...year(2026).slice(9, 10).map(b => ({ ...b, kwh: 180, amount: 2700 }))] };
      await page.evaluate(({ key, data }) => { localStorage.setItem(key, JSON.stringify(data)); window.dispatchEvent(new Event('wattsnap-preview-change')); }, { key, data: changed });
      await forecast.getByText('₱1,440.00', { exact: true }).waitFor();
      await page.reload();
      await forecast.getByText('₱1,440.00', { exact: true }).waitFor();
      assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key), changed, 'View filters do not mutate receipts');
      await page.getByLabel('History period', { exact: true }).selectOption('2026');
      await page.evaluate(({ key, data }) => { localStorage.setItem(key, JSON.stringify(data)); window.dispatchEvent(new Event('wattsnap-preview-change')); }, { key, data: { ...seed, bills: year(2025) } });
      await page.getByText('No bills for this period', { exact: true }).waitFor();
      assert.equal(await page.getByLabel('History period', { exact: true }).inputValue(), '2026', 'Removing a year’s final bill preserves the selected empty period');
      assert.equal(await page.getByLabel('History period', { exact: true }).locator('option:checked').innerText(), '2026');
      assert.deepEqual(errors, []);
      await context.close();
      console.log(`PASS ${width}px: seasonal estimate, filters, month selection, record changes, offline interaction, persistence and layout`);
    }
    const { page } = await open({ ...seed, bills: [year(2026)[8]] });
    await page.getByLabel('History period', { exact: true }).selectOption('last-year');
    await page.getByText('No bills for this period', { exact: true }).waitFor();
    assert.equal(await page.locator('.en-col').count(), 0);
    assert.equal(await page.locator('.en-list > li').count(), 0);
    await page.getByRole('button', { name: 'Show all years', exact: true }).click();
    assert.equal(await page.locator('.en-list > li').count(), 1);
    assert.match(await page.getByRole('region', { name: 'Next month estimate', exact: true }).innerText(), /Starting estimate/);
    const empty = await open({ ...seed, bills: [] });
    await empty.page.getByRole('heading', { name: 'No electricity bills yet', exact: true }).waitFor();
    assert.equal(await empty.page.locator('.en-col').count(), 0);
    assert.match(await empty.page.getByRole('region', { name: 'Next month estimate', exact: true }).innerText(), /Save a recent bill/);
    console.log('PASS: empty years, reset, limited history and no-bill state');
    const added = await open(seed, 390, '?added=2025-1');
    await added.page.locator('#bill-2025-1 .en-details').waitFor();
    assert.match(await added.page.locator('#bill-2025-1 .en-source').innerText(), /WattSnap AI/);
    assert.equal(await added.page.getByLabel('History period', { exact: true }).inputValue(), '2025', 'A newly saved old bill is visible in its year');
    assert.equal(await added.page.locator('#bill-2025-1 .en-row').getAttribute('aria-expanded'), 'true');
    console.log('PASS: newly saved historical bills remain visible and open');
    console.log('Screenshots: ' + output);
  } finally {
    await Promise.all(contexts.map(context => context.close().catch(() => {})));
    await browser.close(); await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
