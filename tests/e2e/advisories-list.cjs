// Exercise the actual Advisories screen and styles without a real account: the provider feed is replaced by fixed rows.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const toolsPath = process.env.SCANNER_TOOLS || path.join(os.tmpdir(), 'wattsnap-scanner-tools', 'node_modules');
const { build } = require(path.join(toolsPath, 'esbuild'));
const { chromium } = require(path.join(toolsPath, 'playwright'));
const root = path.resolve(__dirname, '../..');
const household = { name: 'Test home', provider: 'anteco', location: 'Mapatag, Hamtic, Antique', locality: { province: 'Antique', municipality: 'Hamtic', barangay: 'Mapatag' }, bills: [], appliances: [], budget: 0 };
const details = { type: 'scheduled', title: 'NGCP POWER INTERRUPTION SCHEDULE', provider: 'anteco', publisher: 'ANTECO', sourceUrl: '', date: '2026-10-18', startTime: '07:00', endDate: '', endTime: '16:00', expectedRestoration: '', reason: 'NGCP will facilitate maintenance activity along 138kV Sta. Barbara – San Jose (Igbonglo) Transmission Line', relatedId: '' };
const feed = [
  { id: 'feed-hamtic', post_url: 'https://www.facebook.com/anteco/posts/1', posted_at: '2026-10-10T02:00:00Z', original_text: 'NGCP POWER INTERRUPTION SCHEDULE. October 18, 2026, 7:00 AM to 4:00 PM.', read_from_images: false,
    details: { ...details, areaText: 'Anini-y, Tobias Fornier, Hamtic, San Jose, Sibalom, San Remigio, Belison, portion of Patnongon (Magsaysay to La Rioja to Poblacion to upland barangays)', areas: [{ province: 'Antique', municipality: 'Hamtic', barangay: '', scope: 'municipality' }] } },
  { id: 'feed-north', post_url: 'https://www.facebook.com/anteco/posts/2', posted_at: '2026-10-10T03:00:00Z', original_text: 'NGCP POWER INTERRUPTION SCHEDULE. October 19, 2026, 5:00 AM to 6:00 PM.', read_from_images: false,
    details: { ...details, date: '2026-10-19', startTime: '05:00', endTime: '18:00', areaText: 'Sebaste, Culasi, Tibiao, Barbaza, Laua-an, Bugasong, Valderrama and portion of Patnongon (Mabasa to La Rioja including upland barangays) and every sitio served by the Culasi and Bugasong substations', areas: [{ province: 'Antique', municipality: 'Culasi', barangay: '', scope: 'municipality' }] } },
];

async function main() {
  const output = await fs.mkdtemp(path.join(os.tmpdir(), 'wattsnap-advisories-list-'));
  const adapters = {
    'next/link': `import React from 'react'; export default function Link({href,children,...props}){return <a href={href} {...props}>{children}</a>;}`,
    'next/image': `import React from 'react'; export default function Image({priority,fill,unoptimized,...props}){return <img {...props}/>;}`,
    'next/navigation': `export function usePathname(){return '/advisories';} export const useRouter=()=>({push(){}});`,
    chrome: `export default function Chrome(){return null}`,
    // Every provider-feed page request answers with the rows the test placed on the window.
    supabase: `export function getBrowserSupabase(){const query={select:()=>query,eq:()=>query,or:()=>query,order:()=>query,range:()=>Promise.resolve({data:window.testFeedRows||[],error:null})};return {from:()=>query};}`,
  };
  await build({
    stdin: { contents: `import React from 'react'; import {createRoot} from 'react-dom/client';
      import Advisories from './src/features/advisory-intelligence/components/AdvisoriesScreen';
      import './src/app/globals.css'; import './src/app/(household)/dashboard/dashboard.css';
      import './src/features/dashboard/app-ui.css'; import './src/features/dashboard/navigation.css';
      import './src/features/dashboard/account.css'; import './src/features/onboarding/theme.css';
      import './src/features/onboarding/accessibility.css'; import './src/features/dashboard/frontend-refinements.css';
      import './src/app/(household)/advisories/advisories.css'; import './src/features/advisory-intelligence/advisory-workflow.css';
      createRoot(document.getElementById('root')).render(<Advisories/>);`, resolveDir: root, loader: 'tsx' },
    outfile: path.join(output, 'app.js'), bundle: true, platform: 'browser', jsx: 'automatic', external: ['/assets/*'],
    define: { 'process.env.NODE_ENV': '"development"', 'process.env.NEXT_PUBLIC_SUPABASE_URL': '""', 'process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY': '""' },
    plugins: [{ name: 'framework-adapters', setup(b) {
      b.onResolve({ filter: /^next\/(link|image|navigation)$/ }, args => ({ path: args.path, namespace: 'adapter' }));
      b.onResolve({ filter: /\/(AppHeader|AppNavigation)$/ }, () => ({ path: 'chrome', namespace: 'adapter' }));
      b.onResolve({ filter: /lib\/supabase\/browser$/ }, () => ({ path: 'supabase', namespace: 'adapter' }));
      b.onLoad({ filter: /.*/, namespace: 'adapter' }, args => ({ contents: adapters[args.path], loader: 'tsx', resolveDir: root }));
    } }],
  });
  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname === '/') {
      response.setHeader('Content-Type', 'text/html; charset=utf-8');
      response.end('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/app.css"><style>:root{--font-jakarta-sans:"Segoe UI",sans-serif}</style></head><body><div id="root"></div><script src="/app.js"></script></body></html>'); return;
    }
    const publicRoot = path.join(root, 'public');
    const file = url.pathname === '/app.js' || url.pathname === '/app.css' ? path.join(output, url.pathname.slice(1)) : path.resolve(publicRoot, '.' + decodeURIComponent(url.pathname));
    if (!file.startsWith(publicRoot + path.sep) && !file.startsWith(output + path.sep)) { response.writeHead(403); response.end(); return; }
    try { const data = await fs.readFile(file); response.setHeader('Content-Type', file.endsWith('.css') ? 'text/css; charset=utf-8' : file.endsWith('.js') ? 'text/javascript; charset=utf-8' : file.endsWith('.png') ? 'image/png' : 'application/octet-stream'); response.end(data); }
    catch { response.writeHead(404); response.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const failures = [];
  // Lines of text an element shows, from its rendered height.
  const lines = locator => locator.evaluate(element => Math.round(element.getBoundingClientRect().height / parseFloat(getComputedStyle(element).lineHeight)));
  try {
    for (const width of [320, 390, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      await context.addInitScript(({ household, feed }) => { localStorage.setItem('wattsnap-ui-preview-v1', JSON.stringify(household)); window.testFeedRows = feed; }, { household, feed });
      const page = await context.newPage(); page.setDefaultTimeout(8000);
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      try {
        await page.clock.setFixedTime(new Date('2026-10-12T04:00:00Z'));
        await page.goto(base);
        const more = page.getByRole('region', { name: 'More from ANTECO', exact: true });
        await more.locator('.aw-feed-list > li').nth(1).waitFor();

        // Less text: one short AI notice, short actions, no time zone, long area lists folded.
        const notice = await page.locator('.adv-source-note').innerText();
        assert.match(notice, /AI/); assert.match(notice, /original post/i); assert.ok(notice.length <= 110, `Short AI notice (${notice.length} characters)`);
        assert.equal(await page.getByText(/read by AI/i).count(), 1, 'The AI notice is not repeated under the list');
        const other = more.locator('.aw-feed-list > li').filter({ hasText: 'Sebaste' });
        assert.equal(await other.getByRole('button', { name: 'Save NGCP POWER INTERRUPTION SCHEDULE to my advisories', exact: true }).innerText(), 'Save');
        assert.equal((await other.getByRole('link', { name: /Original post/ }).getAttribute('href')), 'https://www.facebook.com/anteco/posts/2');
        assert.doesNotMatch(await more.innerText(), /Asia\/Manila/);
        assert.ok(await lines(other.locator('.aw-feed-area')) <= 2, 'A long area list folds to two lines');
        await more.screenshot({ path: path.join(output, `feed-${width}.png`) });

        // The saved card: calendar-style date, plain schedule, folded details, one clear way in.
        await more.locator('.aw-feed-list > li').filter({ hasText: 'Hamtic' }).getByRole('button', { name: /^Save / }).click();
        const card = page.locator('.adv-list .adv-card').first(); await card.waitFor();
        assert.equal(await page.getByRole('button', { name: 'View NGCP POWER INTERRUPTION SCHEDULE, Affected', exact: true }).count(), 1);
        assert.match(await card.locator('.adv-date-tile').innerText(), /Oct\s*18\s*Sun/i);
        assert.doesNotMatch(await card.innerText(), /Asia\/Manila|2026-10/);
        assert.match(await card.innerText(), /7:00 AM – 4:00 PM/);
        assert.ok(await lines(card.locator('.adv-card-area')) <= 3, 'Card areas fold to three lines');
        assert.ok(await lines(card.locator('.adv-card-reason')) <= 2, 'Card reason folds to two lines');
        assert.match(await card.locator('.adv-card-foot').innerText(), /View details/);
        assert.equal(await card.locator('.adv-card-button').evaluate(element => getComputedStyle(element, '::before').content), 'none', 'No side stripe on the card');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${width}px: no page overflow`);
        await card.screenshot({ path: path.join(output, `card-${width}.png`) });

        // The full schedule with its time zone stays in the details.
        await card.locator('.adv-card-button').click();
        const dialog = page.getByRole('dialog'); await dialog.getByText('7:00 AM – 4:00 PM · Asia/Manila', { exact: true }).waitFor();
        assert.match(await dialog.innerText(), /Anini-y, Tobias Fornier, Hamtic/);
        assert.deepEqual(errors, []);
        console.log(`PASS ${width}px: short feed text, calendar card, folded details and full details in the dialog`);
      } catch (error) { failures.push(width); console.error(`FAIL ${width}px:`, error.message); await page.screenshot({ path: path.join(output, `failure-${width}.png`), fullPage: true }).catch(() => {}); }
      finally { await context.close(); }
    }
    console.log('Screenshots: ' + output);
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
  if (failures.length) throw new Error(`${failures.length} advisory list checks failed`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
