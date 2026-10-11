// Production browser check: real Next build, service worker and account-scoped browser records.
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs/promises');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||path.join(process.env.TEMP,'wattsnap-scanner-tools/node_modules/playwright'));
const base=process.env.OFFLINE_BASE||'http://localhost:3106';
const id='11111111-1111-4111-8111-111111111111';
const other='22222222-2222-4222-8222-222222222222';
const directory=path.join(process.env.TEMP,'wattsnap-offline-app');
const household={name:'Maria',budget:2000,provider:'anteco',location:'San Jose, Antique',bills:[{id:'august',month:'2026-08',kwh:192,amount:3072.6,source:'manual'},{id:'september',month:'2026-09',kwh:33,amount:418.85,subsidy:418.85,dueDate:'2026-09-29',source:'manual'}],appliances:[{id:'fan',name:'Bedroom fan',watts:60,hours:8,quantity:2,days:20,source:'manual'}]};
async function main(){
 await fs.mkdir(directory,{recursive:true});
 const artwork=JSON.parse(await fs.readFile('public/offline-artwork.json','utf8'));
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  for(const width of process.env.OFFLINE_ACCOUNT_ONLY ? [] : [320,390,1440]){
   const context=await browser.newContext({viewport:{width,height:844},reducedMotion:'reduce'});
   let aiCalls=0;const errors=[];
   context.on('request',request=>{if(request.url().includes('/api/ai/assistant'))aiCalls++;});
   context.on('page',page=>page.on('pageerror',error=>errors.push(error.message)));
   let page=await context.newPage();await page.goto(base+'/login');
   await page.waitForFunction(()=>document.documentElement.dataset.offlineReady==='true',null,{timeout:45000});
   if(width===390){
    const worker=context.serviceWorkers()[0];
    await worker.evaluate(()=>{
     self.artworkNetworkRequests=0;self.originalArtworkFetch=self.fetch;
     self.fetch=(input,options)=>{const url=new URL(typeof input==='string'?input:input.url,self.location.origin);if(url.pathname==='/_next/image'){self.artworkNetworkRequests++;return Promise.resolve(new Response('Temporary image outage',{status:503}));}return self.originalArtworkFetch(input,options);};
    });
    try{
     await page.evaluate(async artwork=>{
      for(const {src,width} of artwork.images)for(const size of [width,1200]){
       const url=new URL('/_next/image',location.origin);url.searchParams.set('url',src);url.searchParams.set('w',String(size));url.searchParams.set('q',size===width?'75':'90');
       const response=await fetch(url,{cache:'no-store',headers:{Accept:'image/avif,image/webp,image/apng,image/svg+xml,image/*;q=0.8'}});
       if(!response.ok||!response.headers.get('content-type')?.startsWith('image/'))throw new Error('Saved picture unavailable during outage: '+src);
       const blobUrl=URL.createObjectURL(await response.blob());try{const image=new Image();image.src=blobUrl;await image.decode();}finally{URL.revokeObjectURL(blobUrl);}
      }
     },artwork);
     assert.equal(await worker.evaluate(()=>self.artworkNetworkRequests),0,'saved picture formats and sizes never depend on a weak image connection');
     console.log('PASS: saved responsive artwork bypasses a temporary image-server outage with real Vary/Accept headers');
    }finally{await worker.evaluate(()=>{self.fetch=self.originalArtworkFetch;delete self.originalArtworkFetch;});}
   }
   await page.evaluate(({id,other,household})=>{
    localStorage.setItem('wattsnap-account-display-v1',JSON.stringify({version:1,identity:{id,name:'Maria',email:'maria@example.test'}}));
    localStorage.setItem('wattsnap-ui-preview-v1:household:'+id,JSON.stringify(household));
    localStorage.setItem('wattsnap-ui-preview-v1:household:'+other,JSON.stringify({...household,name:'Other home',budget:9999,bills:[],appliances:[]}));
   },{id,other,household});
   await context.setOffline(true);await page.close();page=await context.newPage();
   await page.goto(base+'/assistant');await page.locator('[data-offline-app=true]').waitFor({timeout:20000});
   const message=page.getByRole('textbox',{name:'Message WattSnap AI'});
   await message.fill('My budget and bill history please');await page.getByRole('button',{name:'Send message',exact:true}).click();
   await page.locator('.chat-row.is-bot').last().getByText(/August 2026/).first().waitFor();
   let answer=await page.locator('.chat-row.is-bot').last().innerText();
   for(const value of ['2,000.00','192 kWh','3,072.60','September 2026','418.85'])assert.ok(answer.includes(value),value);
   assert.equal(aiCalls,0);assert.ok(!answer.includes('9,999'));
   await page.screenshot({path:path.join(directory,`offline-chat-${width}.png`)});
   if(width===390){
    assert.equal(await page.locator('.chat-welcome-art img').evaluate(img=>img.complete&&img.naturalWidth>0),true,'offline artwork thumbnail is available');
    const imageResults=await page.evaluate(async artwork=>{
     const sources=[...artwork.images.flatMap(({src})=>{const responsive=new URL('/_next/image',location.origin);responsive.searchParams.set('url',src);responsive.searchParams.set('w','1200');responsive.searchParams.set('q','90');return [responsive.href,src];}),...artwork.files];
     return await Promise.all(sources.map(async src=>{const image=new Image();image.src=src;await image.decode();return {src,width:image.naturalWidth,height:image.naturalHeight};}));
    },artwork);
    for(const image of imageResults)assert.ok(image.width>0&&image.height>0,'offline picture decodes: '+image.src);
    const cachedBytes=await page.evaluate(async artwork=>{
     let bytes=0;
     for(const source of [...artwork.images.map(({src,width})=>{const url=new URL('/_next/image',location.origin);url.searchParams.set('url',src);url.searchParams.set('w',String(width));url.searchParams.set('q','75');return url.href;}),...artwork.files]){
      const response=await caches.match(source);if(!response)throw new Error('Artwork missing from cache: '+source);bytes+=(await response.arrayBuffer()).byteLength;
     }
     return bytes;
    },artwork);
    console.log('PASS: all '+(artwork.images.length+artwork.files.length)+' branding pictures decode offline, including alternate sizes and original paths ('+Math.round(cachedBytes/1024)+' KB saved)');
    await message.fill('Set my budget to 2500; Add Desk fan 20 W 6 hours');await page.getByRole('button',{name:'Send message',exact:true}).click();
    await page.getByRole('button',{name:'Confirm all 2',exact:true}).click();
    await page.getByText('Budget saved',{exact:true}).waitFor();
    await page.reload();await page.getByRole('textbox',{name:'Message WattSnap AI'}).fill('My budget and appliances');await page.getByRole('button',{name:'Send message',exact:true}).click();
    await page.locator('.chat-row.is-bot').last().getByText(/Desk fan/).waitFor();
    answer=await page.locator('.chat-row.is-bot').last().innerText();assert.ok(answer.includes('2,500.00'));
    for(const route of ['/dashboard','/bills','/budget','/appliances','/tips','/advisories','/simulator','/brownout-ready','/settings','/setup','/onboarding','/bills/new','/appliances/new','/advisories/new']){
     await page.goto(base+route);await page.locator('[data-offline-app=true]').waitFor();await page.locator('main').first().waitFor();
     assert.equal(new URL(page.url()).pathname,route,'offline navigation stays on '+route);
     const headings={'/dashboard':'Maria!','/bills':'Energy','/budget':'Smart Energy Budget','/appliances':'Appliances','/tips':'Tipid Tips','/advisories':'Advisories','/simulator':'Watt-If simulator','/brownout-ready':'Brownout Ready','/settings':'Household settings','/setup':'Home setup','/onboarding':'Household setup','/bills/new':'Snap AI','/appliances/new':'Add an appliance','/advisories/new':'Add advisory'};
     if(route==='/bills/new') await page.locator('.scan-title').getByText('Snap AI',{exact:true}).waitFor();
     else await page.getByRole('heading',{name:headings[route],exact:true}).first().waitFor();
     await page.evaluate(async()=>{await Promise.all([...document.images].map(async image=>{image.loading='eager';await image.decode();if(!image.naturalWidth)throw new Error('Broken offline picture: '+image.src);}));});
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true,'overflow '+route);
     if(route==='/dashboard'||route==='/bills'||route==='/advisories')await page.screenshot({path:path.join(directory,'offline-artwork-'+route.slice(1)+'.png'),fullPage:true});
    }
    await page.goto(base+'/assistant');await page.getByRole('textbox',{name:'Message WattSnap AI'}).waitFor();
    await page.evaluate(()=>{localStorage.removeItem('wattsnap-account-display-v1');window.dispatchEvent(new Event('wattsnap-preview-session-change'));});
    await page.getByRole('heading',{name:'Reconnect to open your home'}).waitFor();
    await page.reload();await page.getByRole('heading',{name:'Reconnect to open your home'}).waitFor();
    assert.equal(await page.locator('[data-offline-app=true]').count(),0);
    await page.evaluate(({other})=>localStorage.setItem('wattsnap-account-display-v1',JSON.stringify({version:1,identity:{id:other,name:'Other home',email:'other@example.test'}})),{other});
    await page.reload();await page.locator('[data-offline-app=true]').waitFor();
    await page.getByRole('textbox',{name:'Message WattSnap AI'}).fill('My budget and history');await page.getByRole('button',{name:'Send message',exact:true}).click();
    answer=await page.locator('.chat-row.is-bot').last().innerText();assert.ok(answer.includes('9,999.00'));assert.ok(!answer.includes('3,072.60'));
    await context.setOffline(false);await page.waitForURL(/\/login/,{timeout:15000});
    assert.equal(await page.locator('[data-offline-app=true]').count(),0,'reconnecting requires normal server authentication');
   }
   assert.deepEqual(errors,[]);assert.equal(aiCalls,0);await context.close();console.log('PASS: offline reopen, cached chat and layout at '+width+'px');
  }
  const context=await browser.newContext({viewport:{width:390,height:844}});
  try {
   let page=await context.newPage();await page.goto(base+'/login');
   await page.waitForFunction(()=>document.documentElement.dataset.offlineReady==='true',null,{timeout:45000});
   await page.evaluate(({id,household})=>{
    localStorage.setItem('wattsnap-account-display-v1',JSON.stringify({version:1,identity:{id,name:'Maria',email:'maria@example.test'}}));
    localStorage.setItem('wattsnap-ui-preview-v1:household:'+id,JSON.stringify(household));
   },{id,household});
   assert.ok(process.env.NEXT_PUBLIC_SUPABASE_URL,'Run with --env-file-if-exists=.env.local for the offline credential check');
   const authKey='sb-'+new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0]+'-auth-token';
   await context.addCookies([{name:authKey+'.0',value:'expired-token',url:base},{name:authKey+'.1',value:'old-refresh-token',url:base},{name:authKey+'-code-verifier',value:'pending-verifier',url:base},{name:'sb-another-project-auth-token',value:'preserve',url:base}]);
   await context.addInitScript(()=>Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>true}));
   await context.setOffline(true);await page.close();page=await context.newPage();
   const errors=[];let aiCalls=0;page.on('pageerror',error=>errors.push(error.message));context.on('request',request=>{if(request.url().includes('/api/ai/assistant'))aiCalls++;});
   await page.goto(base+'/assistant');await page.locator('[data-offline-app=true]').waitFor({timeout:15000});
   assert.equal(await page.evaluate(()=>navigator.onLine),true,'simulate a connected device with an unreachable server');
   assert.equal(await page.evaluate(()=>document.documentElement.dataset.offlineShell),'true');
   await page.getByRole('textbox',{name:'Message WattSnap AI'}).fill('My budget and bill history');await page.getByRole('button',{name:'Send message',exact:true}).click();
   await page.locator('.chat-row.is-bot').last().getByText(/3,072\.60/).first().waitFor();assert.equal(aiCalls,0);
   await page.goto(base+'/settings');
   await page.locator('[data-offline-app=true]').waitFor({timeout:15000});
   assert.equal(new URL(page.url()).pathname,'/settings');
   await page.screenshot({path:path.join(directory,'offline-settings-signout.png')});
   await page.getByRole('button',{name:'Log out',exact:true}).click();
   await page.getByRole('dialog',{name:'Log out of WattSnap?'}).getByRole('button',{name:'Log out',exact:true}).click();
   await page.waitForURL(/\/login/);
   assert.equal((await context.cookies()).some(cookie=>cookie.name.startsWith(authKey)),false,'expired credentials cannot survive offline logout');
   assert.equal((await context.cookies()).some(cookie=>cookie.name==='sb-another-project-auth-token'),true);
   assert.equal(await page.evaluate(()=>localStorage.getItem('wattsnap-account-display-v1')),null);
   assert.ok(await page.evaluate(id=>localStorage.getItem('wattsnap-ui-preview-v1:household:'+id),id),'saved records are kept unless removal is requested');
   await page.goto(base+'/assistant');await page.getByRole('heading',{name:'Reconnect to open your home'}).waitFor();assert.deepEqual(errors,[]);
   console.log('PASS: unreachable-server fallback, local chat and expired-session offline sign-out');
  } finally { await context.close(); }
 }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
