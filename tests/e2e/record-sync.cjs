// Real browser + real development Supabase. No service key is included in the bundle.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { randomUUID } = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');
const toolsPath = process.env.SCANNER_TOOLS || path.join(os.tmpdir(), 'wattsnap-scanner-tools', 'node_modules');
const { build } = require(path.join(toolsPath, 'esbuild'));
const { chromium } = require(path.join(toolsPath, 'playwright'));
const root = path.resolve(__dirname, '../..');

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, ref = new URL(url).hostname.split('.')[0];
  assert.equal(ref, process.env.WATTSNAP_TEST_PROJECT_REF, 'Only the configured development/test project may be used.');
  const admin = createClient(url, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const publicEnv = { NODE_ENV: 'development', NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY };
  const email = `wattsnap-browser-sync-${randomUUID()}@example.com`, password = `Sync1-${randomUUID()}`;
  let accountId, browser, server;
  try {
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: 'Browser sync test' } });
    assert.ifError(created.error); accountId = created.data.user.id;
    const household = await admin.from('households').select('id').eq('owner_id', accountId).single(); assert.ifError(household.error);
    const householdId = household.data.id, output = await fs.mkdtemp(path.join(os.tmpdir(), 'wattsnap-record-sync-'));
    const source = `
      import React from 'react'; import {createRoot} from 'react-dom/client';
      import HouseholdSync from './src/features/offline-access/components/HouseholdSync';
      import {readSyncStatus} from './src/lib/offline/status';
      import {usePreviewHousehold} from './src/features/dashboard/use-preview-household';
      import {getBrowserSupabase} from './src/lib/supabase/browser';
      import {rememberAccount} from './src/features/auth/session';
      function App({accountId}) {
        const {household, update, ready}=usePreviewHousehold();
        return <><HouseholdSync accountId={accountId}/>
          <button disabled={!ready} onClick={()=>update({appliances:[{id:crypto.randomUUID(),name:'Offline fan',kind:'fan',watts:55,hours:8,quantity:1,days:30,source:'manual',wattageBasis:'nameplate'}],bills:[{id:crypto.randomUUID(),month:'2040-10',amount:1234.56,kwh:120.5,subsidy:500,source:'scan'}]})}>Add records offline</button>
          <button disabled={!ready} onClick={()=>update({appliances:household.appliances.map(item=>({...item,watts:item.watts+20})),bills:[]})}>Edit and delete offline</button>
          <pre id="records">{JSON.stringify(household)}</pre></>;
      }
      window.openTestAccount=async(credentials)=>{
        const client=getBrowserSupabase(); const login=await client.auth.signInWithPassword(credentials); if(login.error)throw new Error('Test login failed');
        const verified=await client.auth.getUser(); if(verified.error||!verified.data.user)throw new Error('Account verification failed');
        const user=verified.data.user; const account={id:user.id,email:user.email,profile:{fullName:'Browser sync test',username:null,avatarPath:null,onboardedAt:new Date().toISOString(),notifications:{brownouts:true,billReminders:true,tips:false}}};
        rememberAccount(account); window.readTestSyncState=()=>readSyncStatus(user.id).state;
        createRoot(document.getElementById('root')).render(<App accountId={user.id}/>);
      };`;
    await build({ stdin: { contents: source, resolveDir: root, loader: 'tsx' }, bundle: true, outfile: path.join(output, 'app.js'), jsx: 'automatic', format: 'esm', define: { 'process.env': JSON.stringify(publicEnv) } });
    server = http.createServer(async (req, res) => {
      try {
        if (req.url === '/app.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(await fs.readFile(path.join(output, 'app.js'))); }
        else { res.setHeader('Content-Type', 'text/html'); res.end('<!doctype html><html><meta charset="utf-8"><div id="root"></div><script type="module" src="/app.js"></script></html>'); }
      } catch { res.writeHead(500).end(); }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const context = await browser.newContext(), page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const waitForSync = async () => {
      await page.waitForFunction(() => window.readTestSyncState() === 'synced', null, { timeout: 60_000 });
      assert.equal(await page.getByRole('status').count(), 0, 'background sync must not create a visible or announced status');
      assert.doesNotMatch(await page.locator('body').innerText(), /syncing|synced|waiting to sync|could not sync|sync failed|retrying/i);
    };
    const open = async () => { await page.goto(`http://127.0.0.1:${server.address().port}`); await page.waitForFunction(() => typeof window.openTestAccount === 'function'); await page.evaluate(credentials => window.openTestAccount(credentials), { email, password }); await waitForSync(); };
    const rows = async table => { const response = await admin.from(table).select('*').eq('household_id', householdId); assert.ifError(response.error); return response.data; };
    await open();
    await context.setOffline(true); await page.getByRole('button', { name: 'Add records offline' }).click();
    await page.waitForFunction(() => JSON.parse(document.querySelector('#records').textContent).bills.length === 1);
    assert.equal((await rows('appliances')).length, 0); assert.equal((await rows('bills')).length, 0);
    await context.setOffline(false);
    await waitForSync();
    assert.equal((await rows('appliances'))[0].watts, 55); assert.equal((await rows('bills'))[0].subsidy_centavos, 50000);
    await context.setOffline(true); await page.getByRole('button', { name: 'Edit and delete offline' }).click();
    assert.equal((await rows('appliances'))[0].watts, 55); assert.equal((await rows('bills')).length, 1);
    await context.setOffline(false);
    await waitForSync();
    assert.equal((await rows('appliances'))[0].watts, 75); assert.equal((await rows('bills')).length, 0);
    await page.route(`${url}/rest/v1/**`, route => route.abort());
    const rejectedRequest = page.waitForEvent('requestfailed', { predicate: request => request.url().startsWith(`${url}/rest/v1/`), timeout: 60_000 });
    await page.getByRole('button', { name: 'Edit and delete offline' }).click();
    await rejectedRequest;
    await page.waitForFunction(() => window.readTestSyncState() === 'pending', null, { timeout: 60_000 });
    assert.equal(await page.getByRole('status').count(), 0);
    assert.doesNotMatch(await page.locator('body').innerText(), /syncing|waiting to sync|could not sync|sync failed|retrying/i);
    assert.equal((await rows('appliances'))[0].watts, 75);
    await page.unroute(`${url}/rest/v1/**`); await open();
    assert.equal((await rows('appliances'))[0].watts, 95);
    const key = `wattsnap-ui-preview-v1:household:${accountId}`;
    await page.evaluate(key => localStorage.removeItem(key), key); await open();
    await page.waitForFunction(() => JSON.parse(document.querySelector('#records').textContent).appliances.length === 1);
    assert.equal((await rows('appliances'))[0].watts, 95);
    assert.deepEqual(errors, []);
    console.log('PASS: silent background sync uploads devices/receipts and offline edits/deletions; failed requests survive reload without user-facing sync messages.');
  } finally {
    if (browser) await browser.close();
    if (server) await new Promise(resolve => server.close(resolve));
    if (accountId) assert.ifError((await admin.auth.admin.deleteUser(accountId)).error);
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
