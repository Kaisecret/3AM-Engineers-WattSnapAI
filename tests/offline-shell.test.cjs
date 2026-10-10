const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');
const source = fs.readFileSync('public/sw.js', 'utf8');
const origin = 'https://wattsnap.test';

function worker({ online = true, fetch, match, add = async () => {} }) {
  const handlers = {}, writes = [];
  const cache = { match, add, put: async (key, response) => writes.push([key, await response.text()]) };
  vm.runInNewContext(source, {
    self: { location: { origin }, navigator: { onLine: online }, addEventListener: (name, handler) => { handlers[name] = handler; } },
    caches: { open: async () => cache }, fetch, URL, Response,
  });
  return { writes, dispatch(request) {
    let response; const background = [];
    handlers.fetch({ request, respondWith: promise => { response = promise; }, waitUntil: promise => background.push(promise) });
    return { get response() { return response; }, background };
  } };
}

test('prepared shell loads while a network refresh is stalled', async () => {
  const runtime = worker({ fetch: () => new Promise(() => {}), match: async () => new Response('Prepared public shell') });
  const event = runtime.dispatch({ method: 'GET', mode: 'navigate', url: origin + '/bills' });
  const response = await Promise.race([event.response, new Promise((_, reject) => setTimeout(() => reject(new Error('Navigation waited for the network')), 200))]);
  assert.equal(await response.text(), 'Prepared public shell');
  assert.equal(runtime.writes.length, 0);
});

test('an unavailable new chunk leaves the prepared shell intact', async () => {
  const runtime = worker({
    fetch: async () => new Response('<script src="/_next/static/new-build.js"></script>', { headers: { 'content-type': 'text/html' } }),
    match: async key => key === '/bills' ? new Response('Prepared public shell') : undefined,
    add: async () => { throw new Error('New chunk unavailable'); },
  });
  const event = runtime.dispatch({ method: 'GET', mode: 'navigate', url: origin + '/bills' });
  assert.equal(await (await event.response).text(), 'Prepared public shell');
  await Promise.all(event.background);
  assert.equal(runtime.writes.length, 0, 'Do not replace a usable shell with incomplete new HTML');
});

test('API, writes, external requests and server-component responses are not cached', () => {
  const runtime = worker({ fetch: async () => { throw new Error('Unexpected fetch'); }, match: async () => { throw new Error('Unexpected cache access'); } });
  for (const request of [
    { method: 'GET', mode: 'cors', url: origin + '/api/ai/bills' },
    { method: 'POST', mode: 'navigate', url: origin + '/bills' },
    { method: 'GET', mode: 'navigate', url: 'https://provider.test/bills' },
    { method: 'GET', mode: 'cors', url: origin + '/bills?_rsc=private' },
  ]) assert.equal(runtime.dispatch(request).response, undefined);
});
