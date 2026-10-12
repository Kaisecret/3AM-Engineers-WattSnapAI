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
  // The mascot must never cover the bill facts or its actions.
  const heroLayout = page => page.locator('.en-hero').evaluate(card => {
    const box = element => element.getBoundingClientRect();
    const art = box(card.querySelector('.en-hero-art'));
    const covered = [...card.querySelectorAll('.en-hero-title, .en-hero-figure, .en-hero-meta, .en-hero-change, .en-hero-budget, .en-hero-button')].filter(item => { const b = box(item); return b.left < art.right && b.right > art.left && b.top < art.bottom && b.bottom > art.top; }).map(item => item.className);
    const bar = card.querySelector('.en-hero-budget-bar'), button = box(card.querySelector('.en-hero-button'));
    return { covered, height: box(card).height, art: art.width, fill: bar ? box(bar.firstElementChild).width / box(bar).width : null, buttonWidth: button.width, buttonHeight: button.height, copyWidth: box(card.querySelector('.en-hero-copy')).width };
  });
  try {
    for (const width of [1440, 390, 320]) {
      const { context, page } = await open(seed, width);
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      const hero = page.locator('.en-hero');
      await hero.getByRole('heading', { name: 'September 2026 bill', exact: true }).waitFor();
      assert.equal(await hero.getByRole('link', { name: /Budget\s*80% of ₱1,800/ }).getAttribute('href'), '/budget');
      const layout = await heroLayout(page);
      assert.ok(layout.art > 60, 'Mascot stays on the card');
      assert.deepEqual(layout.covered, [], `${width}px: mascot covers no bill fact or action`);
      assert.ok(Math.abs(layout.fill - 0.8) < 0.02, `Budget bar shows the share used (${layout.fill})`);
      assert.ok(layout.buttonHeight >= 44, 'Scan button is a comfortable touch target');
      if (width < 600) assert.ok(layout.buttonWidth >= layout.copyWidth - 1, 'Phone scan button spans the card');
      if (width < 600) assert.ok(layout.height <= 260, `Phone card stays compact (${layout.height}px at ${width}px)`);
      await hero.screenshot({ path: path.join(output, `hero-${width}.png`) });
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
      // Forecast card: the basis label sits with its explanation, both figures share a row, the disclosure is a full touch target.
      assert.equal(await forecast.locator('.en-forecast-basis .en-forecast-method').innerText(), 'Seasonal baseline');
      const forecastLayout = await forecast.evaluate(panel => { const box = element => element.getBoundingClientRect(), values = [...panel.querySelectorAll('.en-forecast-values dd')].map(box); return { sameRow: Math.abs(values[0].top - values[1].top) < 2, head: box(panel.querySelector('.en-forecast-head')).height, icon: box(panel.querySelector('.en-forecast-icon')).width, summary: box(panel.querySelector('summary')).height }; });
      assert.ok(forecastLayout.sameRow, 'Use and cost read side by side');
      assert.ok(forecastLayout.icon >= 40 && forecastLayout.head <= 56, `Compact heading beside its icon (${JSON.stringify(forecastLayout)})`);
      assert.ok(forecastLayout.summary >= 44, 'How this is estimated is a comfortable touch target');
      // History period: the bill count is a small pill on the label row, not a second control beside the select.
      const toolbar = await page.locator('.en-history-toolbar').evaluate(bar => { const box = element => element.getBoundingClientRect(), count = box(bar.querySelector('.en-history-count')), select = box(bar.querySelector('select')), label = box(bar.querySelector('label')); return { aboveSelect: count.bottom <= select.top + 1, onLabelRow: Math.abs((count.top + count.bottom) / 2 - (label.top + label.bottom) / 2) < 6, select: select.width, bar: box(bar).width, count: count.height }; });
      if (width < 600) { assert.ok(toolbar.aboveSelect && toolbar.onLabelRow, `Bill count sits on the label row (${JSON.stringify(toolbar)})`); assert.ok(toolbar.select >= toolbar.bar - 1, 'Period select spans the row'); }
      assert.ok(toolbar.count <= 30, `Bill count is a small pill (${toolbar.count}px)`);
      assert.equal(await page.locator('.en-stats svg').count(), 2, 'Lowest and highest carry direction icons');
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
    const subsidised = await open({ ...seed, bills: [...seed.bills.slice(0, -1), { ...seed.bills.at(-1), amount: 1200, subsidy: 300, dueDate: '2026-10-05' }] });
    await subsidised.page.locator('.en-hero').getByRole('link', { name: /Budget\s*50% of ₱1,800/ }).waitFor();
    assert.match(await subsidised.page.locator('.en-hero').innerText(), /Due Oct 5, 2026/);
    const unset = await open({ ...seed, budget: 0 });
    assert.equal(await unset.page.locator('.en-hero').getByRole('link', { name: 'Set a monthly budget', exact: true }).getAttribute('href'), '/budget');
    assert.equal(await unset.page.locator('.en-hero-budget-bar').count(), 0, 'No bar without a budget');
    const over = await open({ ...seed, budget: 1000 });
    await over.page.locator('.en-hero-budget.is-over').getByText('144% of ₱1,000', { exact: true }).waitFor();
    assert.equal((await heroLayout(over.page)).fill, 1, 'An over-budget bar stops at full');
    await over.page.locator('.en-hero').screenshot({ path: path.join(output, 'hero-over-390.png') });
    const large = await open({ ...seed, bills: [{ id: 'earlier', month: '2026-08', kwh: 2000, amount: 20000, source: 'manual' }, { id: 'large', month: '2026-09', kwh: 1234, amount: 12345.67, dueDate: '2026-10-05', source: 'manual' }] }, 320);
    assert.deepEqual((await heroLayout(large.page)).covered, [], 'Large values stay clear of the mascot on a small phone');
    assert.equal(await large.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    await large.page.locator('.en-hero').screenshot({ path: path.join(output, 'hero-large-320.png') });
    console.log('PASS: latest-bill card budget share after subsidy, unset and over budget, large values');
    console.log('Screenshots: ' + output);
  } finally {
    await Promise.all(contexts.map(context => context.close().catch(() => {})));
    await browser.close(); await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
