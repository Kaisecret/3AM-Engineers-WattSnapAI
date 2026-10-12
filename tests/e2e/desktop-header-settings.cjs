// Render the real household screens with isolated records and framework adapters.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const vm = require('node:vm');
const toolsPath = process.env.SCANNER_TOOLS || path.join(os.tmpdir(), 'wattsnap-scanner-tools', 'node_modules');
const { build } = require(path.join(toolsPath, 'esbuild'));
const { chromium } = require(path.join(toolsPath, 'playwright'));
const root = path.resolve(__dirname, '../..');
const routes = {
  '/settings': 'features/dashboard/components/SettingsScreen',
  '/dashboard': 'features/dashboard/components/HomeScreen',
  '/bills': 'features/dashboard/components/EnergyScreen',
  '/appliances': 'features/dashboard/components/AppliancesScreen',
  '/advisories': 'features/advisory-intelligence/components/AdvisoriesScreen',
  '/bills/new': 'features/dashboard/components/ScanScreen',
  '/simulator': 'features/watt-if-simulator/components/SimulatorScreen',
  '/assistant': 'features/assistant/components/ChatScreen',
};
const household = {
  name: 'Santos household', email: 'household@example.com', location: 'San Jose de Buenavista, Antique', provider: 'anteco',
  locality: { province: 'Antique', municipality: 'San Jose de Buenavista', barangay: 'San Pedro' },
  budget: 2000, monthlySubsidy: 500,
  bills: [{ id: 'sep', month: '2026-09', amount: 1800, kwh: 150, source: 'manual', subsidy: 500 }],
  appliances: [{ id: 'fan', name: 'Bedroom fan', kind: 'fan', watts: 60, hours: 8, quantity: 1 }],
};

async function main() {
  const outputBase = process.env.UI_REVIEW_OUTPUT || os.tmpdir();
  await fs.mkdir(outputBase, { recursive: true });
  const output = await fs.mkdtemp(path.join(outputBase, 'wattsnap-desktop-header-'));
  const adapters = {
    'next/link': `import React from 'react'; export default function Link({href,children,...props}) { return <a href={href} {...props}>{children}</a>; }`,
    'next/image': `import React from 'react'; export default function Image({priority,fill,unoptimized,...props}) { return <img {...props}/>; } export function getImageProps(props) { return {props}; }`,
    'next/navigation': `export const usePathname=()=>location.pathname; export const useRouter=()=>({push(href){location.href=href;}});`,
  };
  const styles = [
    'app/globals.css', 'features/onboarding/theme.css', 'features/onboarding/accessibility.css',
    'features/dashboard/frontend-refinements.css', 'app/(household)/dashboard/dashboard.css',
    'features/dashboard/app-ui.css', 'features/dashboard/navigation.css', 'features/dashboard/account.css',
    'features/dashboard/settings.css', 'features/dashboard/energy.css', 'features/dashboard/appliances.css',
    'features/dashboard/scan.css', 'features/bill-scanner/bill-review.css',
    'app/(household)/advisories/advisories.css', 'features/advisory-intelligence/advisory-workflow.css',
    'features/watt-if-simulator/simulator-preview.css', 'features/assistant/assistant.css', 'features/tipid-tips/tips-preview.css',
  ];
  await build({
    stdin: { contents: `import React from 'react'; import {createRoot} from 'react-dom/client';
      ${Object.values(routes).map((file, i) => `import Screen${i} from './src/${file}';`).join('\n')}
      ${styles.map(file => `import './src/${file}';`).join('\n')}
      const screens={${Object.keys(routes).map((route, i) => `${JSON.stringify(route)}:Screen${i}`).join(',')}};
      const Screen=screens[location.pathname]; createRoot(document.getElementById('root')).render(<Screen/>);`, resolveDir: root, loader: 'tsx' },
    outfile: path.join(output, 'app.js'), bundle: true, platform: 'browser', format: 'esm', jsx: 'automatic', external: ['/assets/*'],
    define: { 'process.env.NODE_ENV': '"development"', 'process.env.NEXT_PUBLIC_SUPABASE_URL': '""', 'process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY': '""' },
    plugins: [{ name: 'framework-adapters', setup(b) {
      b.onResolve({ filter: /^next\/(link|image|navigation)$/ }, args => ({ path: args.path, namespace: 'adapter' }));
      b.onLoad({ filter: /.*/, namespace: 'adapter' }, args => ({ contents: adapters[args.path], loader: 'tsx', resolveDir: root }));
    } }],
  });
  let fontCss = ':root{--font-jakarta-sans:"Segoe UI",sans-serif}';
  try {
    for (const file of await fs.readdir(path.join(root, '.next/static/css'))) {
      const css = await fs.readFile(path.join(root, '.next/static/css', file), 'utf8');
      const faces = css.match(/@font-face\{[^}]*font-family:[^;}]*Plus[ _]Jakarta[ _]Sans[^}]*\}/g);
      if (faces) { fontCss = faces.join('') + ':root{--font-jakarta-sans:' + faces[0].match(/font-family:([^;]+)/)[1] + '}'; break; }
    }
  } catch { /* The pre-change check can run before a production build. */ }
  const productionStyles = {};
  for (const route of Object.keys(routes)) {
    const manifestFile = path.join(root, '.next/server/app/(household)', route.slice(1), 'page_client-reference-manifest.js');
    try {
      const scope = {}; vm.runInNewContext(await fs.readFile(manifestFile, 'utf8'), scope);
      const manifest = Object.values(scope.__RSC_MANIFEST)[0];
      const chain = ['src/app/layout', 'src/app/(household)/layout', `src/app/(household)${route}/page`];
      productionStyles[route] = chain.flatMap(segment => Object.entries(manifest.entryCSSFiles)
        .filter(([entry]) => entry.replaceAll('\\', '/').endsWith(segment)).flatMap(([, files]) => files.map(file => file.path)));
    } catch { /* Before building, use the source styles bundled above. */ }
  }
  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    if (routes[url.pathname]) {
      response.setHeader('Content-Type', 'text/html');
      const links = productionStyles[url.pathname]?.length ? productionStyles[url.pathname].map(file => `<link rel="stylesheet" href="/_next/${file}">`).join('') : '<link rel="stylesheet" href="/app.css">';
      response.end('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1">' + links + '<style>' + fontCss + '</style></head><body><div id="root"></div><script type="module" src="/app.js"></script></body></html>'); return;
    }
    const publicRoot = path.join(root, 'public'), staticRoot = path.join(root, '.next/static');
    const file = url.pathname.startsWith('/_next/static/') ? path.resolve(staticRoot, url.pathname.slice(14))
      : ['/app.js', '/app.css'].includes(url.pathname) ? path.join(output, url.pathname.slice(1))
      : path.resolve(publicRoot, '.' + decodeURIComponent(url.pathname));
    if (![output, publicRoot, staticRoot].some(base => file.startsWith(base + path.sep))) { response.writeHead(403); response.end(); return; }
    try {
      const data = await fs.readFile(file);
      response.setHeader('Content-Type', file.endsWith('.css') ? 'text/css' : file.endsWith('.js') ? 'text/javascript' : file.endsWith('.png') ? 'image/png' : file.endsWith('.svg') ? 'image/svg+xml' : 'application/octet-stream'); response.end(data);
    } catch { response.writeHead(404); response.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    let cases = 0;
    const viewports = [1440, 1920, 1024, 900, 768, 390].map(width => ({ width, height: 900 }));
    // 1920 × 900 at 200% zoom gives a 960 × 450 CSS viewport and doubles the pixel ratio.
    viewports.push({ width: 960, height: 450, zoom: 2 });
    for (const theme of ['dark', 'light']) for (const { width, height, zoom = 1 } of viewports) {
      const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: zoom, reducedMotion: 'reduce' });
      await context.addInitScript(({ household, theme }) => {
        localStorage.setItem('wattsnap-ui-preview-v1', JSON.stringify(household));
        localStorage.setItem('wattsnap-theme-v1', theme);
        document.addEventListener('DOMContentLoaded', () => { document.documentElement.dataset.theme = theme; }, { once: true });
      }, { household, theme });
      await context.route('**/api/**', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"Test: AI unavailable"}' }));
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      for (const route of Object.keys(routes)) {
        await page.goto(`http://127.0.0.1:${server.address().port}${route}`);
        await page.locator('.ws-home').waitFor(); await page.evaluate(() => document.fonts.ready);
        const desktop = width >= 900;
        const measurements = await page.evaluate(() => {
          const header = document.querySelector('.ws-header'), body = header.parentElement.querySelector('main');
          const css = getComputedStyle(header), h = header.getBoundingClientRect(), m = body.getBoundingClientRect();
          const heading = document.querySelector('.ws-desktop-heading'), actions = document.querySelector('.ws-header-actions');
          const a = actions.getBoundingClientRect(), t = heading?.getBoundingClientRect();
          return { headerVisible: css.display !== 'none', height: h.height, top: h.top, padding: css.paddingLeft,
            gap: m.top - h.bottom, headingRight: t?.right, actionsLeft: a.left,
            overflow: document.documentElement.scrollWidth - innerWidth, titleSize: heading && getComputedStyle(heading.firstElementChild).fontSize };
        });
        assert.ok(measurements.overflow <= 1, `${route} ${theme} ${width}: horizontal overflow`);
        if (desktop) {
          assert.equal(measurements.height, 114, `${route}: header height`);
          assert.equal(measurements.padding, '24px', `${route}: desktop header inset`);
          assert.ok(measurements.gap >= 23 && measurements.gap <= 25, `${route}: expected 24px content separation, got ${measurements.gap}`);
          assert.ok(measurements.headingRight <= measurements.actionsLeft, `${route}: title overlaps controls`);
          assert.ok(parseFloat(measurements.titleSize) >= 26 && parseFloat(measurements.titleSize) <= 34);
          const longHeading = await page.locator('.ws-desktop-heading').evaluate(element => {
            const title = element.firstElementChild, text = title.textContent;
            title.textContent = 'A deliberately long household page heading '.repeat(4);
            const fits = element.getBoundingClientRect().right <= document.querySelector('.ws-header-actions').getBoundingClientRect().left;
            title.textContent = text; return fits;
          });
          assert.ok(longHeading, `${route}: long heading overlaps controls`);
          await page.locator('.ws-header-actions .ws-profile-button').click();
          const panel = page.locator('.ws-header-panel'); await panel.waitFor();
          const bounds = await panel.boundingBox();
          assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width, `${route}: menu outside viewport`);
          assert.ok(await panel.getByRole('link', { name: 'Household setup' }).isVisible());
          await page.keyboard.press('Escape'); await panel.waitFor({ state: 'hidden' });
          assert.ok(await page.locator('.ws-profile-button').evaluate(el => el === document.activeElement), `${route}: Escape restores focus`);
          await page.evaluate(() => window.scrollTo(0, 300));
          assert.ok(Math.abs((await page.locator('.ws-header').boundingBox()).y) <= 1, `${route}: header not sticky`);
          if (route === '/settings' && width >= 1200) {
            assert.ok(Math.abs((await page.locator('.st-side').boundingBox()).y - 138) <= 1, 'Settings sidebar overlaps the sticky header');
          }
          await page.evaluate(() => window.scrollTo(0, 0));
          if (route === '/assistant' && height >= 700) {
            const composer = await page.locator('.chat-composer').boundingBox();
            assert.ok(composer.y + composer.height <= height, 'Assistant composer is below the viewport');
          }
        } else if (measurements.headerVisible) {
          assert.ok(measurements.height <= 83, `${route}: mobile header changed`);
          assert.ok(measurements.gap < 24, `${route}: desktop gap leaked to mobile`);
        }
        if (route === '/settings') {
          await page.getByRole('textbox', { name: 'Household name', exact: true }).waitFor();
          if (desktop) {
            const settings = await page.evaluate(() => {
              const card = document.querySelector('[aria-labelledby="st-profile-title"]'), form = card.querySelector('form');
              return { padding: getComputedStyle(card).paddingTop, gap: getComputedStyle(form).rowGap,
                headingGap: getComputedStyle(card.querySelector('.st-card-head')).marginBottom,
                labelGap: getComputedStyle(form.querySelector('label')).rowGap,
                leftTop: document.querySelector('.st-side').getBoundingClientRect().top, rightTop: card.getBoundingClientRect().top };
            });
            assert.equal(settings.padding, '32px'); assert.equal(settings.gap, '24px');
            assert.equal(settings.headingGap, '24px'); assert.equal(settings.labelGap, '10px');
            if (width >= 1200) assert.ok(Math.abs(settings.leftTop - settings.rightTop) <= 1, 'Settings columns start at different heights');
          }
          if ([1440, 390].includes(width)) await page.screenshot({ path: path.join(output, `settings-${theme}-${width}.png`), fullPage: false });
          const name = page.getByRole('textbox', { name: 'Household name', exact: true });
          await name.fill('A household with a deliberately long name for tests');
          await page.getByRole('button', { name: 'Cancel', exact: true }).click();
          assert.equal(await name.inputValue(), household.name);
          await name.fill('Updated household'); await page.getByRole('button', { name: 'Save changes', exact: true }).click();
          assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('wattsnap-ui-preview-v1')).name), 'Updated household');
          await name.fill(household.name); await page.getByRole('button', { name: 'Save changes', exact: true }).click();
        }
        assert.deepEqual(errors, [], `${route}: browser errors`); cases++;
      }
      await context.close();
    }
    console.log(`PASS: ${cases} screen/theme/viewport cases; menus, scroll, spacing and save/cancel checked.`);
    console.log(`Screenshots: ${output}`);
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
