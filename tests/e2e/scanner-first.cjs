// Isolated browser regression: real scanner/hooks/canvas; only Next routing and AI responses are replaced.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const toolsPath = process.env.SCANNER_TOOLS || path.join(os.tmpdir(), 'wattsnap-scanner-tools', 'node_modules');
const { build } = require(path.join(toolsPath, 'esbuild'));
const { chromium } = require(path.join(toolsPath, 'playwright'));
const root = path.resolve(__dirname, '../..');
const output = path.join(os.tmpdir(), 'wattsnap-scanner-regression');
const draftKey = 'wattsnap-bill-draft-v1';
const reading = { reviewRequired: true, unknownFields: [], provider: 'ANTECO', providerId: 'anteco', billingMonth: '2026-09', consumptionKwh: 33, amountDue: 418.85, subsidy: 418.85, amountPayable: 0, dueDate: '2026-09-29', charges: [], checks: [] };

async function main() {
  await fs.mkdir(output, { recursive: true });
  await build({
    stdin: { contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import ScanScreen from './src/features/dashboard/components/ScanScreen'; import './src/app/globals.css'; import './src/app/(household)/dashboard/dashboard.css'; import './src/features/dashboard/app-ui.css'; import './src/features/dashboard/scan.css'; createRoot(document.getElementById('root')).render(<ScanScreen/>);`, resolveDir: root, loader: 'tsx' },
    bundle: true, outfile: path.join(output, 'scanner.js'), jsx: 'automatic', define: { 'process.env.NODE_ENV': '"development"' },
    plugins: [{ name: 'next-shell', setup(build) {
      build.onResolve({ filter: /^\/assets\// }, args => ({ path: args.path, external: true }));
      build.onResolve({ filter: /^(next\/(image|link|navigation)|\.\/PageShell)$/ }, args => ({ path: args.path, namespace: 'test-shell' }));
      build.onLoad({ filter: /.*/, namespace: 'test-shell' }, args => ({ loader: 'jsx', resolveDir: root, contents:
        args.path === 'next/navigation' ? 'export const useRouter=()=>({push:(url)=>{window.savedBillUrl=url}});' :
        args.path === './PageShell' ? 'import React from "react"; export default function Shell({children,className}){return <main className={className}>{children}</main>}' :
        args.path === 'next/link' ? 'import React from "react"; export default function Link({href,children,...rest}){return <a href={href} {...rest}>{children}</a>}' :
        'import React from "react"; export default function Image({fill,unoptimized,priority,children,...rest}){return <img {...rest}/>}' }));
    }}],
  });
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname === '/scanner.js' || url.pathname === '/scanner.css') {
        res.setHeader('Content-Type', url.pathname.endsWith('.css') ? 'text/css' : 'text/javascript');
        res.end(await fs.readFile(path.join(output, path.basename(url.pathname))));
      } else if (url.pathname.startsWith('/assets/')) {
        const asset = path.resolve(root, 'public', '.' + decodeURIComponent(url.pathname));
        assert.ok(asset.startsWith(path.join(root, 'public') + path.sep));
        res.end(await fs.readFile(asset));
      } else {
        res.setHeader('Content-Type', 'text/html');
        res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/scanner.css"><style>:root{--ws-ink:#10243c;--font-sans:Arial;--ws-header-height:0px}*{box-sizing:border-box}body{margin:0;font-family:Arial}button{cursor:pointer} @media(min-width:900px){main{padding:24px}}</style><div id="root"></div><script src="/scanner.js"></script>');
      }
    } catch { res.statusCode = 404; res.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const baseURL = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const failures = [];
  async function scenario(name, run, width = 390) {
    if (process.env.SCANNER_SCENARIO && !new RegExp(process.env.SCANNER_SCENARIO).test(name)) return;
    const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: 'reduce' });
    await context.addInitScript(() => localStorage.setItem('wattsnap-ui-preview-v1', JSON.stringify({ name: 'Scanner test', provider: 'anteco', appliances: [], bills: [] })));
    const page = await context.newPage(); page.setDefaultTimeout(6000);
    try { await run(page, context); console.log('PASS:', name); }
    catch (error) { failures.push(name); console.error('FAIL:', name, error.message); }
    finally { await context.close(); }
  }
  async function open(page) {
    await page.goto(baseURL + '/bills/new');
    await page.locator('input[type=file]:not(:disabled)').waitFor({ state: 'attached' });
  }
  async function upload(page, width = 800, height = 1600) {
    const base64 = await page.evaluate(({width,height}) => {
      const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 800, 1600);
      ctx.fillStyle = '#000'; ctx.font = '24px Arial'; ctx.fillText('ANTECO electricity bill', 30, 60);
      return canvas.toDataURL('image/png').split(',')[1];
    }, {width,height});
    await page.locator('input[type=file]').setInputFiles({ name: 'receipt.png', mimeType: 'image/png', buffer: Buffer.from(base64, 'base64') });
  }
  async function mockCamera(page) {
    await page.addInitScript(()=>{window.cameraRequests=0;Object.defineProperty(navigator.mediaDevices,'getUserMedia',{configurable:true,value:async()=>{
      window.cameraRequests++;
      const canvas=document.createElement('canvas');canvas.width=1920;canvas.height=1080;
      const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,1920,1080);ctx.fillStyle='#111';ctx.font='32px Arial';ctx.fillText('Receipt section',800,300);
      window.testCameraCanvas=canvas;window.testCameraStream=canvas.captureStream(10);setInterval(()=>ctx.fillRect(0,0,1,1),80);return window.testCameraStream;
    }});});
  }
  async function refusedCamera(page) {
    await page.addInitScript(()=>{window.cameraRequests=0;Object.defineProperty(navigator.mediaDevices,'getUserMedia',{configurable:true,value:async()=>{window.cameraRequests++;throw new DOMException('Refused for isolated test','NotAllowedError');}});});
  }
  // Phones open the camera by themselves; PCs wait for the webcam button.
  async function liveCamera(page, width = 390) {
    if(width>=900)await page.getByRole('button',{name:'Use webcam',exact:true}).click();
    await page.locator('.camera-live .scan-shutter:not(:disabled)').waitFor();
  }
  const namesCaptureMode=page=>page.evaluate(()=>/panorama/i.test(document.querySelector('.scan-app').textContent));
  try {
    await scenario('phone scanner opens the camera by itself with no capture mode switch',async page=>{
      await mockCamera(page);await open(page);await liveCamera(page);
      assert.equal(await page.evaluate(()=>window.cameraRequests),1,'The camera is requested once without a tap');
      for(const name of ['Bill','Receipt','Panorama','Open camera'])assert.equal(await page.getByRole('button',{name,exact:true}).count(),0,`No ${name} button`);
      assert.equal(await namesCaptureMode(page),false,'The capture mode is never named');
      assert.equal(await page.getByRole('button',{name:'Read receipt',exact:true}).count(),0,'Read receipt waits for the first capture');
      await page.screenshot({path:path.join(output,'camera-auto-390.png')});
    });
    await scenario('refused camera is asked once and keeps upload and manual entry',async page=>{
      await refusedCamera(page);await page.route('**/api/ai/bills',route=>route.fulfill({json:{data:reading}}));
      await open(page);await page.getByRole('heading',{name:'Camera is off',exact:true}).waitFor();
      assert.equal(await page.evaluate(()=>window.cameraRequests),1);
      await page.screenshot({path:path.join(output,'camera-off-390.png')});
      await page.getByRole('button',{name:'Type it',exact:true}).click();await page.getByRole('button',{name:'Use scanner',exact:true}).click();
      await page.getByRole('heading',{name:'Camera is off',exact:true}).waitFor();await page.waitForTimeout(200);
      assert.equal(await page.evaluate(()=>window.cameraRequests),1,'A refusal is not asked again without a tap');
      await page.getByRole('button',{name:'Try camera again',exact:true}).click();await page.waitForFunction(()=>window.cameraRequests===2);
      await upload(page);await page.getByRole('heading',{name:'Check your bill',exact:true}).waitFor();
    });
    await scenario('PC scanner waits for the webcam button',async page=>{
      await mockCamera(page);await open(page);await page.getByRole('button',{name:'Use webcam',exact:true}).waitFor();await page.waitForTimeout(300);
      assert.equal(await page.evaluate(()=>window.cameraRequests),0,'A PC webcam never turns on by itself');
      for(const name of ['Bill','Receipt','Panorama'])assert.equal(await page.getByRole('button',{name,exact:true}).count(),0,`No ${name} button`);
      assert.equal(await namesCaptureMode(page),false,'The capture mode is never named');
      await liveCamera(page,1440);assert.equal(await page.evaluate(()=>window.cameraRequests),1);
    },1440);
    for(const width of [320,390,1440])await scenario(`panorama collects ordered sections before AI reading at ${width}px`,async page=>{
      await mockCamera(page);let calls=0,sent;
      await page.route('**/api/ai/bills',async route=>{calls++;sent=route.request().postDataJSON();await route.fulfill({json:{data:reading}});});
      await open(page);await liveCamera(page,width);
      await page.getByRole('button',{name:'Capture receipt section',exact:true}).click();
      await page.getByRole('button',{name:'Remove last section',exact:true}).waitFor();assert.equal(calls,0);
      await page.getByRole('button',{name:'Capture receipt section',exact:true}).click();
      assert.equal(await page.locator('.scan-section-preview').count(),2);assert.equal(calls,0);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
      await page.screenshot({path:path.join(output,`panorama-${width}.png`)});
      await page.getByRole('button',{name:'Read receipt',exact:true}).click();await page.getByRole('heading',{name:'Check your bill',exact:true}).waitFor();
      assert.equal(calls,1);assert.equal(sent.images.length,2);assert.equal(sent.imageBase64,undefined);
      const dimensions=await page.evaluate(async images=>Promise.all(images.map(async image=>{const bitmap=await createImageBitmap(await(await fetch('data:'+image.mimeType+';base64,'+image.imageBase64)).blob());const size={width:bitmap.width,height:bitmap.height};bitmap.close();return size;})),sent.images);
      assert.ok(dimensions.every(size=>size.width<1920&&size.height<=1080&&size.height>500),'Crop guide at original camera resolution');
      await page.getByRole('button',{name:'View original',exact:true}).click();const original=page.getByRole('dialog',{name:'Your original bill',exact:true});
      assert.equal(await original.locator('.br-original-section').count(),2);
      assert.equal(await namesCaptureMode(page),false,'The saved source is never named after a capture mode');
      assert.equal(await page.evaluate(()=>window.testCameraStream.getTracks().every(track=>track.readyState==='ended')),true);
    },width);
    await scenario('panorama undo and manual entry discard unfinished captures',async page=>{
      await mockCamera(page);let calls=0;await page.route('**/api/ai/bills',route=>{calls++;return route.fulfill({json:{data:reading}});});
      await open(page);await liveCamera(page);
      await page.getByRole('button',{name:'Capture receipt section',exact:true}).click();await page.getByRole('button',{name:'Remove last section',exact:true}).waitFor();
      assert.equal(await page.locator('.scan-section-slot').count(),3,'Empty slots show the room left for a long receipt');
      await page.getByRole('button',{name:'Remove last section',exact:true}).click();
      assert.equal(await page.locator('.scan-section-preview').count(),0);assert.equal(await page.getByRole('button',{name:'Read receipt',exact:true}).count(),0);
      await page.getByRole('button',{name:'Capture receipt section',exact:true}).click();await page.getByRole('button',{name:'Type it',exact:true}).click();assert.equal(calls,0);
      await page.getByRole('button',{name:'Use scanner',exact:true}).click();assert.equal(await page.locator('.scan-section-preview').count(),0);
    });
    await scenario('panorama caps sections and supports preview plus undo',async page=>{
      await mockCamera(page);await open(page);await liveCamera(page);
      for(let i=0;i<4;i++)await page.getByRole('button',{name:'Capture receipt section',exact:true}).click();
      assert.equal(await page.locator('.scan-section-preview').count(),4);assert.equal(await page.locator('.scan-section-slot').count(),0);assert.equal(await page.getByRole('button',{name:'Capture receipt section',exact:true}).isEnabled(),false);
      await page.screenshot({path:path.join(output,'camera-full-390.png')});
      await page.getByRole('button',{name:'Preview receipt section 2',exact:true}).click();await page.getByRole('dialog',{name:'Receipt section 2',exact:true}).waitFor();
      await page.getByRole('button',{name:'Back to camera',exact:true}).click();await page.getByRole('button',{name:'Remove last section',exact:true}).click();
      assert.equal(await page.locator('.scan-section-preview').count(),3);assert.equal(await page.getByRole('button',{name:'Capture receipt section',exact:true}).isEnabled(),true);
    });
    await scenario('household switching discards panorama captures and stops the camera',async page=>{
      await mockCamera(page);await open(page);await liveCamera(page);
      await page.getByRole('button',{name:'Capture receipt section',exact:true}).click();await page.getByRole('button',{name:'Preview receipt section 1',exact:true}).click();
      // The scanner reopens the camera for the next household, so only the earlier stream must end.
      await page.evaluate(()=>{window.earlierCameraStream=window.testCameraStream;localStorage.setItem('wattsnap-preview-session-v1',JSON.stringify({version:1,identity:{id:'other-household',name:'Other home',email:'other@example.test'}}));window.dispatchEvent(new Event('wattsnap-preview-session-change'));});
      await page.getByRole('dialog',{name:'Receipt section 1',exact:true}).waitFor({state:'hidden'});
      assert.equal(await page.locator('.scan-section-preview').count(),0);assert.equal(await page.evaluate(()=>window.earlierCameraStream.getTracks().every(track=>track.readyState==='ended')),true);
    });
    await scenario('cancelled panorama reading ignores the later AI response',async page=>{
      await mockCamera(page);let respond;await page.route('**/api/ai/bills',async route=>{await new Promise(resolve=>respond=resolve);await route.fulfill({json:{data:reading}}).catch(()=>{});});
      await open(page);await liveCamera(page);
      await page.getByRole('button',{name:'Capture receipt section',exact:true}).click();await page.getByRole('button',{name:'Read receipt',exact:true}).click();await page.locator('.phase-scanning').waitFor();
      await page.getByRole('button',{name:'Cancel',exact:true}).first().click();respond?.();await page.waitForTimeout(150);
      assert.equal(await page.locator('.phase-camera').count(),1);assert.equal(await page.locator('.br-review').count(),0);assert.equal(await page.locator('.scan-section-preview').count(),0);
    });
    await scenario('unverified scanned kWh visibly requires checking before save', async page => {
      const warning = 'kWh could not be checked against the unreadable meter values. Compare it with the printed kWh before saving.';
      await page.route('**/api/ai/bills', route => route.fulfill({ json: { data: { ...reading, consumptionKwh: 34, previousReading: null, presentReading: null, unknownFields: ['previousReading', 'presentReading'], checks: [warning] } } }));
      await open(page); await upload(page);
      await page.getByRole('heading', { name: 'Check your bill', exact: true }).waitFor();
      await page.getByText(warning, { exact: true }).waitFor();
      assert.equal(await page.getByRole('checkbox', { name: /I reviewed all the values above/ }).isChecked(), false);
      assert.equal(await page.evaluate(() => window.savedBillUrl), undefined);
    });
    await scenario('large receipt uploads retain small text detail', async page => {
      let sentSize;
      await page.route('**/api/ai/bills', async route => {
        const body = route.request().postDataJSON();
        sentSize = await page.evaluate(async body => { const blob = await (await fetch(`data:${body.mimeType};base64,${body.imageBase64}`)).blob(); const bitmap = await createImageBitmap(blob); const size = Math.max(bitmap.width,bitmap.height); bitmap.close(); return size; }, body);
        await route.fulfill({ json: { data: reading } });
      });
      await open(page); await upload(page, 3000, 6000);
      await page.getByRole('heading', { name: 'Check your bill', exact: true }).waitFor();
      assert.equal(sentSize, 3072, 'Preserve 3072px receipt text rather than downscale to 2400px');
    });
    await scenario('unknown scanned subsidy stays empty instead of using a household estimate', async page => {
      await page.route('**/api/ai/bills', route => route.fulfill({ json: { data: { ...reading, subsidy: null, amountPayable: null, unknownFields: ['subsidy'] } } }));
      await open(page); await upload(page); await page.getByRole('heading', { name: 'Check your bill', exact: true }).waitFor();
      assert.equal(await page.getByLabel('Subsidy', { exact: true }).inputValue(), '', 'Only printed scan values belong in the reviewed bill');
    });
    await scenario('stored draft starts on scanner and resumes only on request', async page => {
      await page.addInitScript(({ draftKey }) => sessionStorage.setItem(draftKey, JSON.stringify({ version: 1, draft: { month: '2026-09', kwh: '33', amount: '418.85', provider: 'anteco' } })), { draftKey });
      await open(page);
      assert.equal(await page.locator('.scan-app.phase-camera').count(), 1, 'Opening Snap AI must show scanner even with unfinished fields');
      assert.equal(await page.locator('.br-review').count(), 0);
      await page.getByRole('button', { name: 'Resume draft', exact: true }).click();
      assert.equal(await page.getByLabel('Energy used', { exact: true }).inputValue(), '33');
      await page.getByRole('button', { name: 'Use scanner', exact: true }).click();
      assert.equal(await page.locator('.scan-app.phase-camera').count(), 1);
    });
    await scenario('failed reading stays on retry screen without opening manual form', async page => {
      await page.route('**/api/ai/bills', route => route.fulfill({ status: 502, json: { problem: 'unavailable' } }));
      await open(page); await upload(page);
      await page.getByRole('heading', { name: 'Try a clearer scan' }).waitFor();
      assert.equal(await page.locator('.br-review').count(), 0);
      await page.route('**/api/ai/bills', route => route.fulfill({ json: { data: reading } }));
      await page.getByRole('button', { name: 'Try reading again', exact: true }).click();
      await page.getByRole('heading', { name: 'Check your bill', exact: true }).waitFor();
      assert.equal(await page.getByLabel('Energy used', { exact: true }).inputValue(), '33');
      assert.equal(await page.locator('.scan-photo').evaluate(el => getComputedStyle(el).objectFit), 'contain');
    });
    await scenario('invalid replacement upload shows feedback on the retry screen', async page => {
      await page.route('**/api/ai/bills', route => route.fulfill({ status: 502, json: { problem: 'unavailable' } }));
      await open(page); await upload(page); await page.getByRole('heading', { name: 'Try a clearer scan' }).waitFor();
      await page.locator('input[type=file]').setInputFiles({ name: 'wrong.txt', mimeType: 'text/plain', buffer: Buffer.from('not a bill image') });
      await page.getByText('Choose a JPG, PNG, WebP, or PDF bill.', { exact: true }).waitFor();
      assert.equal(await page.locator('.scan-app.phase-failed').count(), 1);
    });
    await scenario('manual entry cancels a pending PDF validation', async page => {
      let calls = 0;
      await page.route('**/api/ai/bills', route => { calls++; return route.fulfill({ json: { data: reading } }); });
      await page.addInitScript(({draftKey}) => {
        sessionStorage.setItem(draftKey, JSON.stringify({ version: 1, draft: { month: '2026-09', kwh: '120', amount: '1400', provider: 'anteco' } }));
        Blob.prototype.text = function () { return new Promise(resolve => window.resolvePdfValidation = () => resolve('%PDF-1.4')); };
      }, {draftKey});
      await open(page);
      await page.locator('input[type=file]').setInputFiles({ name: 'pending.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%%EOF') });
      await page.waitForFunction(() => !!window.resolvePdfValidation);
      await page.getByRole('button', { name: 'Type it', exact: true }).click();
      await page.getByLabel('Energy used', { exact: true }).fill('120');
      await page.evaluate(() => window.resolvePdfValidation()); await page.waitForTimeout(300);
      assert.equal(calls, 0, 'A cancelled PDF must never be sent for reading');
      assert.equal(await page.getByLabel('Energy used', { exact: true }).inputValue(), '120');
    });
    await scenario('empty AI output requires rescan or explicit manual entry', async page => {
      await page.route('**/api/ai/bills', route => route.fulfill({ json: { data: { reviewRequired: true, consumptionKwh: null, amountDue: null, billingMonth: null } } }));
      await open(page); await upload(page);
      await page.getByRole('heading', { name: 'Try a clearer scan' }).waitFor();
      await page.getByRole('button', { name: 'Enter details from photo', exact: true }).click();
      await page.getByRole('heading', { name: 'Enter your bill details', exact: true }).waitFor();
      assert.equal(await page.getByLabel('Energy used', { exact: true }).inputValue(), '');
      assert.equal(await page.getByRole('button', { name: 'View original', exact: true }).count(), 1);
      await page.screenshot({ path: path.join(output, 'manual-after-failed-scan.png') });
    });
    await scenario('a new unreadable photo never inherits values from an earlier bill', async page => {
      await page.route('**/api/ai/bills', route => route.fulfill({ json: { data: { reviewRequired: true, consumptionKwh: null, amountDue: null } } }));
      await open(page); await page.getByRole('button', { name: 'Type it', exact: true }).click();
      await page.getByLabel('Energy used', { exact: true }).fill('120');
      await page.getByRole('button', { name: 'Use scanner', exact: true }).click();
      await upload(page); await page.getByRole('heading', { name: 'Try a clearer scan' }).waitFor();
      await page.screenshot({ path: path.join(output, 'failed-scan.png') });
      await page.getByRole('button', { name: 'Enter details from photo', exact: true }).click();
      assert.equal(await page.getByLabel('Energy used', { exact: true }).inputValue(), '', 'A different receipt must not inherit the previous bill’s kWh');
    });
    await scenario('cancelled extraction cannot replace the scanner with review', async page => {
      let respond; await page.route('**/api/ai/bills', async route => { await new Promise(resolve => respond = resolve); await route.fulfill({ json: { data: reading } }).catch(() => {}); });
      await open(page); await upload(page); await page.locator('.phase-scanning').waitFor();
      await page.getByRole('button', { name: 'Cancel', exact: true }).first().click(); respond?.();
      await page.waitForTimeout(200);
      assert.equal(await page.locator('.scan-app.phase-camera').count(), 1);
      assert.equal(await page.locator('.br-review').count(), 0);
    });
    for (const width of [320, 390, 1440]) await scenario(`discard dialog fits and preserves the draft until confirmed at ${width}px`, async page => {
      await open(page);
      await page.getByRole('button', { name: width < 900 ? 'Type it' : 'Enter bill manually', exact: true }).click();
      await page.getByLabel('Energy used', { exact: true }).fill('192');
      const discardLink = page.getByRole('button', { name: 'Discard draft', exact: true });
      await discardLink.click();
      const dialog = page.getByRole('dialog', { name: 'Discard unfinished bill?' });
      await dialog.waitFor();
      assert.equal(await dialog.getByRole('button', { name: 'Keep draft' }).evaluate(el => el === document.activeElement), true);
      const bounds = await dialog.evaluate(el => {
        const rect = el.getBoundingClientRect();
        const buttons = [...el.querySelectorAll('button')].map(button => button.getBoundingClientRect());
        return { fits: rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight,
          equalWidth: Math.abs(buttons[0].width - buttons[1].width) < 1,
          gap: innerWidth < 480 ? buttons[1].top - buttons[0].bottom : buttons[1].left - buttons[0].right };
      });
      assert.ok(bounds.fits, 'The dialog stays within the screen');
      assert.ok(bounds.equalWidth, 'Actions have equal widths');
      assert.ok(bounds.gap >= 10, 'Actions have breathing room');
      await page.screenshot({ path: path.join(output, `discard-${width}.png`) });
      await page.keyboard.press('Escape');
      assert.equal(await page.getByLabel('Energy used', { exact: true }).inputValue(), '192');
      await discardLink.click();
      await dialog.getByRole('button', { name: 'Keep draft' }).click();
      assert.equal(await page.getByLabel('Energy used', { exact: true }).inputValue(), '192');
      await discardLink.click();
      await dialog.getByRole('button', { name: 'Discard draft', exact: true }).click();
      assert.equal(await page.locator('.scan-app.phase-camera').count(), 1);
      assert.equal(await page.evaluate(key => sessionStorage.getItem(key), draftKey), null);
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('wattsnap-ui-preview-v1')).bills.length), 0);
    }, width);
    for (const width of [320, 390, 1440]) await scenario(`camera, guide and capture fit at ${width}px`, async page => {
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.addInitScript(() => {
        Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { configurable: true, value: async constraints => {
          window.cameraConstraints = constraints;
          const canvas = document.createElement('canvas'); canvas.width = 1920; canvas.height = 1080;
          const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 1920, 1080);
          ctx.fillStyle = '#111'; ctx.font = '30px Arial'; ctx.fillText('ANTECO 33 kWh', 800, 100);
          window.testCameraStream = canvas.captureStream(10); window.testCameraCanvas = canvas;
          window.testCameraTimer = setInterval(() => ctx.fillRect(0, 0, 1, 1), 80);
          return window.testCameraStream;
        } });
      });
      await page.route('**/api/ai/bills', async route => {
        const body = route.request().postDataJSON(); assert.ok(body.images[0].imageBase64.length > 1000);
        await route.fulfill({ json: { data: reading } });
      });
      await open(page); await liveCamera(page, width);
      const capture = page.getByRole('button', { name: 'Capture receipt section', exact: true });
      assert.equal(await page.locator('.scan-video').evaluate(el => getComputedStyle(el).objectFit), 'contain');
      const bounds = await page.evaluate(() => { const guide = document.querySelector('.scan-frame').getBoundingClientRect(); const view = document.querySelector('.scan-viewfinder').getBoundingClientRect(); const video = document.querySelector('video'); const scale = Math.min(view.width/video.videoWidth,view.height/video.videoHeight); const w=video.videoWidth*scale,h=video.videoHeight*scale; return { fits: guide.left >= view.left+(view.width-w)/2-1 && guide.right <= view.right-(view.width-w)/2+1 && guide.top >= view.top+(view.height-h)/2-1 && guide.bottom <= view.bottom-(view.height-h)/2+1, ratio: guide.width/guide.height }; });
      assert.ok(bounds.fits, 'Guide stays inside the entire visible camera image'); assert.ok(bounds.ratio > 0.6 && bounds.ratio < 0.75, 'One upright guide for every bill');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
      await page.screenshot({ path: path.join(output, `camera-${width}.png`) });
      await capture.click(); await page.getByRole('button', { name: 'Read receipt', exact: true }).click();
      await page.getByRole('heading', { name: 'Check your bill', exact: true }).waitFor();
      await page.getByRole('button', { name: 'Save to history', exact: true }).click();
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('wattsnap-ui-preview-v1')).bills.length), 0, 'Scan cannot save without confirmation');
      await page.screenshot({ path: path.join(output, `review-${width}.png`) });
      assert.equal(await page.evaluate(() => window.testCameraStream.getTracks().every(track => track.readyState === 'ended')), true);
      assert.deepEqual(errors, []);
    }, width);
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
  console.log('Screenshots:', output);
  if (failures.length) throw new Error(`${failures.length} scanner regressions failed`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
