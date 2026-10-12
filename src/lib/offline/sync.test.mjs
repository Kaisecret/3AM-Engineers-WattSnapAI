import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';

const code = ts.transpileModule(readFileSync(new URL('./sync.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const exports = {};
vm.runInNewContext(code, { exports, crypto: webcrypto, TextEncoder });
const { syncRecords } = exports;
const account = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
function fixture() {
  const values = new Map(), remote = new Map(), calls = [];
  let owner = account, offline = false, fail = false, onPut;
  const stores = ['appliances', 'bills', 'settings', 'advisories', 'preparation', 'plans', 'tips', 'scenarios', 'setup', 'dismissed'].map(name => ({
    name, key: `${name}:${account}`, event: name,
    read: raw => raw === null ? {} : JSON.parse(raw),
    write: records => JSON.stringify(records),
  }));
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  const backend = {
    async read(name) { if (fail) throw new Error('network'); return { ...(remote.get(name) ?? {}) }; },
    async put(name, id, value) { if (fail) throw new Error('network'); calls.push(['put', name, id]); remote.set(name, { ...remote.get(name), [id]: value }); await onPut?.(); },
    async remove(name, id) { if (fail) throw new Error('network'); calls.push(['remove', name, id]); const next = { ...remote.get(name) }; delete next[id]; remote.set(name, next); },
  };
  const run = () => syncRecords({ accountId: account, stores, storage, backend, isCurrent: () => owner === account, isOffline: () => offline, changed() {} });
  return { stores, storage, values, remote, calls, run, save(name, records) { values.set(`${name}:${account}`, JSON.stringify(records)); }, get(name) { return JSON.parse(values.get(`${name}:${account}`)); }, set offline(value) { offline = value; }, set fail(value) { fail = value; }, set owner(value) { owner = value; }, set onPut(value) { onPut = value; } };
}

test('all existing local record types upload after reconnect, without requiring another edit', async () => {
  const f = fixture();
  for (const store of f.stores) f.save(store.name, { one: { value: store.name } });
  f.offline = true; await f.run(); assert.equal(f.calls.length, 0);
  f.offline = false; const result = await f.run();
  assert.equal(result.state, 'synced');
  for (const store of f.stores) assert.equal(f.remote.get(store.name).one.value, store.name);
  await f.run(); assert.equal(f.calls.length, f.stores.length, 'successful uploads are not repeated');
});

test('failed uploads survive a restart and are retried, with no local record loss', async () => {
  const f = fixture(); f.save('bills', { receipt: { amount: 1250 } }); f.fail = true;
  assert.equal((await f.run()).state, 'pending'); assert.equal(f.get('bills').receipt.amount, 1250);
  f.fail = false; await f.run(); assert.equal(f.remote.get('bills').receipt.amount, 1250);
});

test('explicit deletions persist offline and do not delete records created on another device', async () => {
  const f = fixture(); f.save('appliances', { fan: { watts: 50 } }); await f.run();
  f.save('appliances', {}); f.remote.set('appliances', { ...f.remote.get('appliances'), fridge: { watts: 80 } });
  f.offline = true; await f.run(); f.offline = false; await f.run();
  assert.equal(f.remote.get('appliances').fan, undefined); assert.equal(f.get('appliances').fridge.watts, 80);
});

test('a new device hydrates remote records instead of clearing them', async () => {
  const f = fixture(); f.remote.set('bills', { receipt: { amount: 500 } });
  await f.run(); assert.equal(f.get('bills').receipt.amount, 500); assert.equal(f.calls.length, 0);
});

test('an edit while uploading remains pending and is uploaded on the next pass', async () => {
  const f = fixture(); f.save('appliances', { fan: { watts: 50 } });
  f.onPut = () => { f.onPut = null; f.save('appliances', { fan: { watts: 65 } }); };
  assert.equal((await f.run()).state, 'pending');
  assert.equal(f.get('appliances').fan.watts, 65); assert.equal(f.remote.get('appliances').fan.watts, 50);
  await f.run(); assert.equal(f.remote.get('appliances').fan.watts, 65);
});

test('changing accounts cancels remaining writes and does not hydrate the previous account', async () => {
  const f = fixture(); f.save('appliances', { fan: { watts: 50 }, tv: { watts: 100 } });
  f.onPut = () => { f.owner = 'another-account'; };
  assert.equal((await f.run()).state, 'cancelled'); assert.equal(f.calls.length, 1);
  assert.equal(f.get('appliances').tv.watts, 100);
});

test('one failing record store does not stop independent records from syncing', async () => {
  const f = fixture(); f.save('appliances', { fan: { watts: 50 } }); f.save('bills', { receipt: { amount: 1200 } });
  const read = f.storage.getItem; f.storage.getItem = key => key === `bills:${account}` ? '{bad json' : read(key);
  assert.equal((await f.run()).state, 'pending'); assert.equal(f.remote.get('appliances').fan.watts, 50);
});

test('removing a successfully uploaded record after another record fails does not resurrect it', async () => {
  const f = fixture(); f.save('appliances', { fan: { watts: 50 }, tv: { watts: 100 } });
  f.onPut = () => { f.onPut = null; f.fail = true; };
  assert.equal((await f.run()).state, 'pending'); assert.equal(f.remote.get('appliances').fan.watts, 50);
  f.save('appliances', { tv: { watts: 100 } }); f.fail = false; await f.run();
  assert.equal(f.remote.get('appliances').fan, undefined); assert.equal(f.get('appliances').fan, undefined);
});

test('a request with an uncertain response is still deletable offline and retries otherwise', async () => {
  const f = fixture(); f.save('appliances', { fan: { watts: 50 } });
  f.onPut = () => { f.onPut = null; throw new Error('connection lost after server accepted the insert'); };
  assert.equal((await f.run()).state, 'pending');
  f.save('appliances', {}); await f.run();
  assert.equal(f.remote.get('appliances').fan, undefined); assert.equal(f.get('appliances').fan, undefined);
});
