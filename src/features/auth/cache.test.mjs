import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const code = readFileSync(new URL('../../../public/sw.js', import.meta.url), 'utf8');
function worker() {
  const handlers = {}, puts = [], deleted = [];
  const cache = { add: async () => {}, match: async key => key === '/offline.html' ? new Response('offline') : undefined, put: async (...args) => puts.push(args) };
  vm.runInNewContext(code, { self: { location: { origin: 'https://wattsnap.test' }, clients: { claim: async () => {} }, addEventListener: (name, callback) => handlers[name] = callback }, caches: { open: async () => cache, keys: async () => ['wattsnap-shell-v1'], delete: async key => deleted.push(key) }, fetch: async () => new Response('private household', { headers: { 'content-type': 'text/html' } }), URL, Response, Set, Promise });
  return { handlers, puts, deleted };
}
test('authenticated and auth document navigations never enter the service worker cache', async () => {
  for (const pathname of ['/dashboard','/login','/auth/callback']) {
    const w = worker(); let response;
    w.handlers.fetch({ request: { url: `https://wattsnap.test${pathname}`, method: 'GET', mode: 'navigate' }, respondWith: promise => response = promise, waitUntil: promise => promise });
    await response;
    assert.equal(w.puts.length, 0, pathname);
  }
});
test('activation deletes the old authenticated shell cache', async () => {
  const w = worker(); let pending;
  w.handlers.activate({ waitUntil: promise => pending = promise }); await pending;
  assert.deepEqual(w.deleted, ['wattsnap-shell-v1']);
});
