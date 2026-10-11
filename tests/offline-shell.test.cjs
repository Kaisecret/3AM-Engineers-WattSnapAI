const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');
const source = fs.readFileSync('public/sw.js', 'utf8');
const origin = 'https://wattsnap.test';
const artwork = { images: [
  {src:'/assets/branding/wattsnap-logo.png',width:750},
  {src:'/assets/branding/actions-7.png',width:640},
  {src:'/assets/branding/all-set-bee.png',width:640},
  {src:'/assets/branding/sunny-eco-city-bg.png',width:1920},
], files:['/assets/branding/auth-clouds.svg','/assets/branding/wattsnap-icon-192.png'] };
const shellHtml='<script src="/_next/static/app.js?dpl=build"></script><link href="/_next/static/app.css?dpl=build" rel="stylesheet">';
function preparationResponse(request) {
  if(request==='/offline-app') return new Response(shellHtml,{headers:{'content-type':'text/html'}});
  if(request==='/offline-artwork.json') return Response.json(artwork);
  return new Response('static',{headers:{'content-type':String(request).includes('/_next/static/')?'application/javascript':'image/webp'}});
}
async function prepare(runtime) {
  let pending,result;
  runtime.handlers.message({data:{type:'PREPARE_OFFLINE'},ports:[{postMessage:next=>result=next}],waitUntil:promise=>pending=promise});
  await pending; return result;
}

function worker({ fetch, saved = {}, keys = [] }) {
  const handlers = {}, writes = [], deleted = [];
  const cache = {
    add: async () => {},
    match: async (key,options={}) => {
      const response=saved[typeof key === 'string' ? key : key.url];
      if(!response)return;
      if(!options.ignoreVary && response.headers.get('vary')?.toLowerCase().includes('accept') && (typeof key==='string'?null:key.headers?.get('accept'))!==null)return;
      return response.clone();
    },
    put: async (key, response) => writes.push([typeof key === 'string' ? key : key.url, await response.text()]),
  };
  vm.runInNewContext(source, {
    self: { location: { origin }, addEventListener: (name, handler) => { handlers[name] = handler; }, clients: { claim: async () => {} }, skipWaiting: () => {} },
    caches: { open: async () => cache, keys: async () => keys, delete: async name => { deleted.push(name); return true; } },
    fetch, URL, Response,
  });
  return { writes, deleted, handlers, dispatch(request) {
    let response; const background = [];
    handlers.fetch({ request, respondWith: promise => { response = promise; }, waitUntil: promise => background.push(promise) });
    return { get response() { return response; }, background };
  } };
}

test('pages always come from the server, so a signed-out visitor is sent to login', async () => {
  const toLogin = new Response(null, { status: 307, headers: { location: '/login?next=%2Fbills' } });
  const runtime = worker({ fetch: async () => toLogin });
  const event = runtime.dispatch({ method: 'GET', mode: 'navigate', url: origin + '/bills' });
  assert.equal(await event.response, toLogin);
  await Promise.all(event.background);
  assert.equal(runtime.writes.length, 0, 'pages are never saved');
});

test('offline app navigation opens the generic app shell rather than private HTML', async () => {
  const runtime = worker({ fetch: async () => { throw new TypeError('Failed to fetch'); }, saved: { '/offline-app': new Response('Generic app'), '/offline.html': new Response('Offline notice'), [origin+'/dashboard']: new Response('Private page') } });
  assert.equal(await (await runtime.dispatch({ method: 'GET', mode: 'navigate', url: origin + '/dashboard' }).response).text(), 'Generic app');
});

test('offline authentication pages remain a reconnect notice', async () => {
  const runtime = worker({ fetch: async () => { throw new TypeError('Failed to fetch'); }, saved: { '/offline-app': new Response('Generic app'), '/offline.html': new Response('Reconnect') } });
  for(const pathname of ['/login','/auth/callback','/complete-profile']) assert.equal(await (await runtime.dispatch({method:'GET',mode:'navigate',url:origin+pathname}).response).text(),'Reconnect');
});
test('a failed navigation marks the generic shell independently of the device connection indicator',async()=>{
 const runtime=worker({fetch:async()=>{throw new TypeError('Failed to fetch');},saved:{'/offline-app':new Response('<html><head></head><body>Generic app</body></html>')}});
 const response=await runtime.dispatch({method:'GET',mode:'navigate',url:origin+'/assistant'}).response;
 assert.match(await response.text(),/dataset.offlineShell="true"/);
 assert.equal(response.headers.get('cache-control'),'no-store');
});

test('static files are saved after the first load and reused', async () => {
  let runtime = worker({ fetch: async () => new Response('chunk') });
  let event = runtime.dispatch({ method: 'GET', mode: 'no-cors', url: origin + '/_next/static/chunk.js' });
  assert.equal(await (await event.response).text(), 'chunk');
  await Promise.all(event.background);
  assert.deepEqual(runtime.writes, [[origin + '/_next/static/chunk.js', 'chunk']]);
  runtime = worker({ fetch: async () => { throw new Error('Unexpected fetch'); }, saved: { [origin + '/assets/branding/actions-1.png']: new Response('saved art') } });
  event = runtime.dispatch({ method: 'GET', mode: 'no-cors', url: origin + '/assets/branding/actions-1.png' });
  assert.equal(await (await event.response).text(), 'saved art');
});

test('upgrading removes older caches, including ones that held signed-in pages', async () => {
  const runtime = worker({ fetch: async () => new Response(''), keys: ['wattsnap-shell-v3', 'wattsnap-static-v2'] });
  const pending = []; runtime.handlers.activate({ waitUntil: promise => pending.push(promise) }); await Promise.all(pending);
  assert.deepEqual(runtime.deleted, ['wattsnap-shell-v3','wattsnap-static-v2']);
});

test('API, writes, external requests and server-component responses are not intercepted', () => {
  const runtime = worker({ fetch: async () => { throw new Error('Unexpected fetch'); } });
  for (const request of [
    { method: 'GET', mode: 'cors', url: origin + '/api/ai/bills' },
    { method: 'POST', mode: 'navigate', url: origin + '/bills' },
    { method: 'GET', mode: 'navigate', url: 'https://provider.test/bills' },
    { method: 'GET', mode: 'cors', url: origin + '/bills?_rsc=private' },
  ]) assert.equal(runtime.dispatch(request).response, undefined);
});

test('preparing the offline app saves its essential assets before publishing generic HTML', async () => {
  const runtime=worker({fetch:async request=>preparationResponse(request)});
  let pending;const results=[];
  runtime.handlers.message({data:{type:'PREPARE_OFFLINE'},ports:[{postMessage:result=>results.push(result)}],waitUntil:promise=>pending=promise});
  await pending;
  const order=runtime.writes.map(([url])=>url);
  assert.ok(order.indexOf('/offline-app')>order.indexOf(origin+'/_next/static/app.js?dpl=build'));
  assert.ok(order.indexOf('/offline-app')>order.indexOf(origin+'/_next/static/app.css?dpl=build'));
  assert.equal(results[0].ready,true);
});

test('unopened mascots, logos, backgrounds and icons are cached before readiness',async()=>{
  const runtime=worker({fetch:async request=>preparationResponse(request)});
  const result=await prepare(runtime),order=runtime.writes.map(([url])=>url);
  assert.equal(result.ready,true);
  for(const {src,width} of artwork.images){
    const saved=order.find(url=>{const parsed=new URL(url,origin);return parsed.pathname==='/_next/image'&&parsed.searchParams.get('url')===src&&parsed.searchParams.get('w')===String(width);});
    assert.ok(saved,'cached unopened '+src);
    assert.ok(order.indexOf(saved)<order.indexOf('/offline-app'),'artwork is saved before the ready shell');
  }
  for(const src of artwork.files)assert.ok(order.includes(src),'cached original '+src);
});

test('failed artwork preparation cannot report the previous incomplete shell as ready',async()=>{
  const runtime=worker({saved:{'/offline-app':new Response('Earlier shell without complete artwork')},fetch:async request=>String(request).includes('actions-7')?new Response('unavailable',{status:503}):preparationResponse(request)});
  const result=await prepare(runtime);
  assert.equal(result.ready,false);
  assert.equal(runtime.writes.some(([url])=>url==='/offline-app'),false,'do not replace the previous shell with incomplete artwork');
});

test('offline image sizes resolve to the saved copy of the same illustration',async()=>{
  const thumbnail=new URL('/_next/image',origin);thumbnail.searchParams.set('url','/assets/branding/actions-7.png');thumbnail.searchParams.set('w','640');thumbnail.searchParams.set('q','75');
  const runtime=worker({saved:{'/offline-artwork.json':Response.json(artwork),[thumbnail.href]:new Response('Saved empty-state bee',{headers:{'content-type':'image/webp'}})},fetch:async()=>{throw new TypeError('Offline');}});
  const large=new URL(thumbnail);large.searchParams.set('w','1200');large.searchParams.set('q','90');
  for(const url of [large.href,origin+'/assets/branding/actions-7.png']){
    const response=await runtime.dispatch({method:'GET',mode:'no-cors',url}).response;
    assert.equal(response.headers.get('content-type'),'image/webp');
    assert.equal(await response.text(),'Saved empty-state bee');
  }
});

test('browser Accept headers use the precached WebP without another network request',async()=>{
  const url=origin+'/_next/image?url=%2Fassets%2Fbranding%2Factions-7.png&w=640&q=75';
  let requests=0;
  const runtime=worker({saved:{[url]:new Response('Saved bee',{headers:{'content-type':'image/webp','vary':'Accept'}})},fetch:async()=>{requests++;return new Response('Temporary outage',{status:503});}});
  const response=await runtime.dispatch(new Request(url,{headers:{Accept:'image/avif,image/webp,image/apng,image/svg+xml,image/*;q=0.8'}})).response;
  assert.equal(await response.text(),'Saved bee');assert.equal(requests,0);
});

test('a cached format the browser does not accept retains format negotiation',async()=>{
  const url=origin+'/_next/image?url=%2Fassets%2Fbranding%2Factions-7.png&w=640&q=75';
  const runtime=worker({saved:{[url]:new Response('AVIF art',{headers:{'content-type':'image/avif','vary':'Accept'}})},fetch:async()=>new Response('WebP art',{headers:{'content-type':'image/webp'}})});
  const response=await runtime.dispatch(new Request(url,{headers:{Accept:'image/webp,image/*;q=0.8'}})).response;
  assert.equal(await response.text(),'WebP art');
});

test('another image size uses the saved illustration immediately without relying on the server',async()=>{
  const thumbnail=new URL('/_next/image',origin);thumbnail.searchParams.set('url','/assets/branding/actions-7.png');thumbnail.searchParams.set('w','640');thumbnail.searchParams.set('q','75');
  let requests=0;
  const runtime=worker({saved:{'/offline-artwork.json':Response.json(artwork),[thumbnail.href]:new Response('Saved bee',{headers:{'content-type':'image/webp','vary':'Accept'}})},fetch:async()=>{requests++;return new Response('Temporary outage',{status:503});}});
  const large=new URL(thumbnail);large.searchParams.set('w','1200');
  const response=await runtime.dispatch(new Request(large,{headers:{Accept:'image/webp,image/*;q=0.8'}})).response;
  assert.equal(await response.text(),'Saved bee');assert.equal(response.ok,true);assert.equal(requests,0);
});
test('failed essential downloads leave the previous shell unchanged and do not claim readiness', async()=>{
  const runtime=worker({fetch:async request=>request==='/offline-app'?new Response('<script src="/_next/static/app.js"></script><link href="/_next/static/app.css">',{headers:{'content-type':'text/html'}}):new Response('unavailable',{status:503})});
  let pending,result;
  runtime.handlers.message({data:{type:'PREPARE_OFFLINE'},ports:[{postMessage:next=>result=next}],waitUntil:promise=>pending=promise});
  await pending;assert.equal(runtime.writes.length,0);assert.equal(result.ready,false);
});

test('retrying a failed image download completes offline preparation',async()=>{
  let unavailable=true;
  const runtime=worker({fetch:async request=>unavailable&&String(request).includes('actions-7')?new Response('unavailable',{status:503}):preparationResponse(request)});
  assert.equal((await prepare(runtime)).ready,false);
  unavailable=false;assert.equal((await prepare(runtime)).ready,true);
  assert.ok(runtime.writes.some(([url])=>url==='/offline-app'));
});

test('the artwork manifest covers all branding images used by the app',()=>{
  const manifest=JSON.parse(fs.readFileSync('public/offline-artwork.json','utf8'));
  const covered=new Set([...manifest.images.map(image=>image.src),...manifest.files]);
  function check(directory){
    for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
      const path=directory+'/'+entry.name;
      if(entry.isDirectory())check(path);
      else if(/\.(tsx?|css)$/.test(path))for(const match of fs.readFileSync(path,'utf8').matchAll(/\/assets\/branding\/[^"'`\n)]+?\.(?:png|svg|webp|jpg)/g))assert.ok(covered.has(match[0]),'missing artwork from '+path+': '+match[0]);
    }
  }
  check('src');
  for(const src of covered)assert.ok(fs.existsSync('public'+src),'artwork exists: '+src);
});
