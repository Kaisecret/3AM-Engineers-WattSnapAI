// Real setup, bill-entry and tips components with local framework adapters.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const toolsPath = process.env.SCANNER_TOOLS || path.join(os.tmpdir(), 'wattsnap-scanner-tools', 'node_modules');
const { build } = require(path.join(toolsPath, 'esbuild'));
const { chromium } = require(path.join(toolsPath, 'playwright'));
const root = path.resolve(__dirname, '../..');
const householdKey = 'wattsnap-ui-preview-v1', tipsKey = 'wattsnap-tips-ui-preview-v1', setupKey = 'wattsnap-home-setup-v1';
const home = { name: 'Santos', location: 'San Jose de Buenavista, Antique', locality: { province: 'Antique', municipality: 'San Jose de Buenavista', barangay: '' }, provider: 'anteco', budget: 3000,
  bills: [{ id: 'sep', month: '2026-09', amount: 2480, kwh: 210, source: 'manual' }],
  appliances: [{ id: 'fan', name: 'Bedroom fan', kind: 'fan', watts: 60, hours: 8, quantity: 1, source: 'manual' }] };

async function main() {
  const output = await fs.mkdtemp(path.join(os.tmpdir(), 'wattsnap-setup-completion-'));
  const adapters = {
    'next/link': `import React from 'react'; export default function Link({href,children,...props}){return <a href={href} {...props}>{children}</a>;}`,
    'next/image': `import React from 'react'; export default function Image({priority,fill,unoptimized,...props}){return <img {...props}/>;} export function getImageProps(props){return {props};}`,
    'next/navigation': `export function usePathname(){return location.pathname;} export function useRouter(){return {push:p=>location.assign(p),replace:p=>location.replace(p),refresh:()=>location.reload()};}`,
  };
  await build({
    stdin: { contents: `import React from 'react'; import {createRoot} from 'react-dom/client';
      import TipsScreen from './src/features/tipid-tips/components/TipsScreen';
      import ScanScreen from './src/features/dashboard/components/ScanScreen';
      import AppliancesScreen from './src/features/dashboard/components/AppliancesScreen';
      import HouseholdSetupScreen from './src/features/household-profile/components/HouseholdSetupScreen';
      import SetupChecklist from './src/features/onboarding/components/SetupChecklist';
      import HomeSetupProgress from './src/features/onboarding/components/HomeSetupProgress';
      import PageShell from './src/features/dashboard/components/PageShell';
      import {generatePreviewTips} from './src/features/tipid-tips/preview-tips';
      import './src/app/globals.css'; import './src/features/onboarding/theme.css'; import './src/features/onboarding/accessibility.css';
      import './src/features/dashboard/frontend-refinements.css'; import './src/app/(household)/dashboard/dashboard.css';
      import './src/features/dashboard/app-ui.css'; import './src/features/dashboard/navigation.css'; import './src/features/dashboard/account.css';
      import './src/features/dashboard/scan.css'; import './src/features/dashboard/appliances.css'; import './src/features/tipid-tips/tips-preview.css';
      if (!localStorage.getItem('${tipsKey}')) localStorage.setItem('${tipsKey}',JSON.stringify(generatePreviewTips(JSON.parse(localStorage.getItem('${householdKey}')))));
      const route=location.pathname;
      createRoot(document.getElementById('root')).render(route==='/setup'?<SetupChecklist/>:route==='/onboarding'?<HouseholdSetupScreen/>:route==='/bills/new'?<ScanScreen/>:route==='/appliances/new'?<AppliancesScreen startAdding/>:route==='/dashboard'?<PageShell title="Dashboard" active="Home"><HomeSetupProgress/><p>Saved household dashboard</p></PageShell>:route==='/bills'?<PageShell title="Energy" active="Energy"><p>Saved bills</p></PageShell>:<TipsScreen/>);`, resolveDir: root, loader: 'tsx' },
    outfile: path.join(output, 'app.js'), bundle: true, platform: 'browser', jsx: 'automatic', external: ['/assets/*'],
    define: { 'process.env.NODE_ENV': '"development"', 'process.env.NEXT_PUBLIC_SUPABASE_URL': '""', 'process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY': '""' },
    plugins: [{ name: 'framework-adapters', setup(b) {
      b.onResolve({ filter: /^next\/(link|image|navigation)$/ }, args => ({ path: args.path, namespace: 'adapter' }));
      b.onLoad({ filter: /.*/, namespace: 'adapter' }, args => ({ contents: adapters[args.path], loader: 'tsx', resolveDir: root }));
    } }],
  });
  const routes = new Set(['/tips','/setup','/onboarding','/bills/new','/bills','/appliances/new','/dashboard']);
  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    if (routes.has(url.pathname)) { response.setHeader('Content-Type','text/html'); response.end('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/app.css"></head><body><div id="root"></div><script src="/app.js"></script></body></html>'); return; }
    const publicRoot = path.join(root,'public');
    const file = ['/app.js','/app.css'].includes(url.pathname) ? path.join(output,url.pathname.slice(1)) : path.resolve(publicRoot,'.'+decodeURIComponent(url.pathname));
    if (!file.startsWith(publicRoot+path.sep) && !file.startsWith(output+path.sep)) { response.writeHead(403); response.end(); return; }
    try { const data=await fs.readFile(file); response.setHeader('Content-Type',file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.png')?'image/png':'application/octet-stream'); response.end(data); }
    catch { response.writeHead(404); response.end(); }
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try {
    for (const width of [320,390,1440]) {
      const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
      await context.addInitScript(({key,data})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(data));},{key:householdKey,data:home});
      const page=await context.newPage(), errors=[]; page.on('pageerror',e=>errors.push(e.message));
      await page.route('**/api/ai/**',route=>route.abort());
      await page.goto(base+'/setup'); await page.getByText('4/5 Completed',{exact:true}).waitFor();
      for (const route of ['/onboarding','/bills/new','/appliances/new','/tips']) {
        await page.goto(base+route); await page.locator('main').waitFor();
        assert.equal(await page.locator('.setup-resume').count(),0,route+' has no setup return bar');
        assert.equal(await page.getByRole('link',{name:/^Home setup(?:\s|$)/}).count(),0,route+' has no Home setup back button');
      }
      await page.locator('.tt-setup summary').click();
      await page.getByRole('button',{name:'I’ve reviewed these tips',exact:true}).click();
      await page.getByText('Tips reviewed',{exact:true}).waitFor();
      const reviewed=await page.evaluate(key=>localStorage.getItem(key),setupKey);
      await page.goto(base+'/setup'); await page.getByText('5/5 Completed',{exact:true}).waitFor();
      await page.goto(base+'/bills/new'); await page.getByRole('button',{name:width>=900?'Enter bill manually':'Type it',exact:true}).click();
      await page.getByLabel('Billing month',{exact:true}).fill('2026-10');
      await page.getByLabel('Energy used',{exact:true}).fill('180');
      await page.getByLabel('Current month bill',{exact:true}).fill('2200');
      await page.getByRole('checkbox',{name:'I reviewed all the values above.',exact:false}).check();
      await page.getByRole('button',{name:'Save to history',exact:true}).click();
      await page.waitForURL(url=>url.pathname==='/bills' && url.searchParams.has('added'));
      assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).bills.length,householdKey),2);
      // Check progress immediately, before opening Tipid Tips again.
      await page.goto(base+'/setup'); await page.getByText('5/5 Completed',{exact:true}).waitFor();
      await page.reload(); await page.getByText('5/5 Completed',{exact:true}).waitFor();
      assert.equal(await page.evaluate(key=>localStorage.getItem(key),setupKey),reviewed);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      await page.screenshot({path:path.join(output,'complete-'+width+'.png'),fullPage:true});
      await page.goto(base+'/dashboard'); await page.getByText('Saved household dashboard',{exact:true}).waitFor();
      assert.equal(await page.locator('.setup-progress-card').count(),0,'Completed setup stays hidden on dashboard');
      await page.goto(base+'/tips'); await page.getByText('Records changed · refresh your tips',{exact:true}).waitFor();
      await page.locator('.tt-setup summary').click(); await page.getByText('Tips reviewed',{exact:true}).waitFor();
      assert.equal(await page.getByRole('button',{name:'I’ve reviewed these tips',exact:true}).count(),0);
      await context.setOffline(true); await page.getByText('Offline · saved tips are available.',{exact:true}).waitFor();
      await page.getByText('Tips reviewed',{exact:true}).waitFor(); await context.setOffline(false);
      await page.goto(base+'/setup');
      await page.evaluate(()=>{localStorage.setItem('wattsnap-preview-session-v1',JSON.stringify({version:1,identity:{id:'other-household',name:'Other home',email:''}}));window.dispatchEvent(new Event('wattsnap-preview-session-change'));});
      await page.getByText('0/5 Completed',{exact:true}).waitFor();
      assert.equal(await page.evaluate(key=>localStorage.getItem(key),setupKey),reviewed);
      assert.deepEqual(errors,[]); await context.close();
      console.log('PASS: '+width+'px removal across screens, first review, real bill save, 5/5 persistence, offline and household isolation');
    }
    console.log('Screenshots: '+output);
  } finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
