const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');
const source = fs.readFileSync('public/sw.js', 'utf8');
const origin = 'https://wattsnap.test';

function worker({ fetch, saved = {}, keys = [] }) {
  const handlers = {}, writes = [], deleted = [];
  const cache = {
    add: async () => {},
    match: async key => saved[typeof key === 'string' ? key : key.url],
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

test('offline, any page opens the offline notice instead of a saved signed-in page', async () => {
  const runtime = worker({ fetch: async () => { throw new TypeError('Failed to fetch'); }, saved: { '/offline.html': new Response('Offline notice') } });
  assert.equal(await (await runtime.dispatch({ method: 'GET', mode: 'navigate', url: origin + '/dashboard' }).response).text(), 'Offline notice');
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
  assert.deepEqual(runtime.deleted, ['wattsnap-shell-v3']);
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
