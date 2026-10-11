import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
registerHooks({ resolve(specifier, context, next) {
  try { return next(specifier, context); } catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) return next(`${specifier}.ts`, context);
    throw error;
  }
} });
const { householdStores } = await import('./database.ts');
const { syncRecords } = await import('./sync.ts');
const account = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
test('every saved record type has an account-scoped sync store', () => {
  const stores = householdStores(account);
  assert.deepEqual(stores.map(store => store.name), ['settings', 'bills', 'appliances', 'advisories', 'preparation', 'plans', 'tips', 'scenarios', 'setup', 'dismissed']);
  assert.ok(stores.every(store => store.key.endsWith(`:household:${account}`)));
});
test('bill snapshots retain receipt details and exclude examples from database writes', () => {
  const stores = householdStores(account), store = stores.find(store => store.name === 'bills');
  const bill = { id: account, month: '2026-10', source: 'scan', amount: 1250, kwh: 100, subsidy: 500, charges: [{ label: 'Distribution', amount: 250 }], readings: { previous: 100, present: 200 } };
  const raw = JSON.stringify({ name: 'Ana', budget: 1200, bills: [bill, { ...bill, id: 'sample-bill', source: 'sample', month: '2026-09' }], appliances: [] });
  assert.deepEqual(store.read(raw), { '2026-10': bill });
  const updated = JSON.parse(store.write({ '2026-10': { ...bill, amount: 1400 } }, raw));
  assert.equal(updated.name, 'Ana'); assert.equal(updated.budget, 1200); assert.equal(updated.bills.length, 2);
  assert.equal(updated.bills.find(value => value.id === account).amount, 1400);
});
test('corrupt local records cannot be treated as deletions', () => {
  const store = householdStores(account).find(store => store.name === 'appliances');
  assert.throws(() => store.read(JSON.stringify({ appliances: [{ id: account, name: 'Fan', watts: -1, hours: 8, quantity: 1 }], bills: [] })));
});
test('settings sync independently from bills and do not invent edits to absent preferences', () => {
  const store = householdStores(account).find(store => store.name === 'settings');
  const raw = JSON.stringify({ name: 'Ana', budget: 2000, bills: [], appliances: [] });
  assert.equal('photo' in store.read(raw), false); assert.equal('monthlySubsidy' in store.read(raw), false);
  const updated = JSON.parse(store.write({ name: 'Ana', budget: 2000, photo: null, monthlySubsidy: 500 }, raw));
  assert.equal(updated.photo, undefined); assert.equal(updated.monthlySubsidy, 500); assert.deepEqual(updated.bills, []);
});

test('clearing device copies with acknowledgements retained restores shared-key records instead of deleting the database', async () => {
  const stores = householdStores(account).slice(0, 3), values = new Map(), remote = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  const backend = { async read(name) { return { ...remote.get(name) }; }, async put(name, id, value) { remote.set(name, { ...remote.get(name), [id]: value }); }, async remove(name, id) { const next = { ...remote.get(name) }; delete next[id]; remote.set(name, next); } };
  const run = () => syncRecords({ accountId: account, stores, storage, backend, isCurrent: () => true, isOffline: () => false, changed() {} });
  storage.setItem(stores[0].key, JSON.stringify({ name: 'Ana', budget: 1000, bills: [{ id: account, month: '2026-10', amount: 1000, kwh: 100 }], appliances: [{ id: account, name: 'Fan', watts: 50, hours: 8, quantity: 1 }] }));
  await run(); storage.removeItem(stores[0].key); await run();
  assert.equal(Object.keys(remote.get('bills')).length, 1); assert.equal(Object.keys(remote.get('appliances')).length, 1);
  const home = JSON.parse(storage.getItem(stores[0].key)); assert.equal(home.bills.length, 1); assert.equal(home.appliances.length, 1);
});
