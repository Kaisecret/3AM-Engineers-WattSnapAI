import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
registerHooks({ resolve(specifier, context, next) {
  try { return next(specifier, context); } catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) return next(`${specifier}.ts`, context);
    throw error;
  }
} });
const backend = await import('./supabase-backend.ts').catch(() => ({}));
const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', householdId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
test('receipt rows round-trip the full reading and convert pesos to integer centavos', () => {
  const bill = { id, month: '2026-10', amount: 1234.56, kwh: 120.5, subsidy: 500, source: 'scan', sourceName: 'receipt.jpg', dueDate: '2026-11-10', billingDate: '2026-10-20', periodStart: '2026-09-20', periodEnd: '2026-10-20', provider: 'custom:My%20Coop', notes: 'Reviewed', charges: [{ label: 'Distribution', amount: 250.51 }], readings: { previous: 100, present: 220.5, multiplier: 1 } };
  const row = backend.billToRow(bill, householdId);
  assert.equal(row.household_id, householdId); assert.equal(row.amount_centavos, 123456); assert.equal(row.subsidy_centavos, 50000);
  assert.deepEqual(backend.billFromRow(row), bill);
});
test('appliance rows retain their UUID and usage inputs', () => {
  const appliance = { id, name: 'Fan', model: 'Model A', kind: 'fan', watts: 55, hours: 8, quantity: 2, days: 31, wattageBasis: 'nameplate', source: 'manual' };
  const row = backend.applianceToRow(appliance, householdId);
  assert.equal(row.id, id); assert.equal(row.hours_per_day, 8);
  assert.deepEqual(backend.applianceFromRow(row), appliance);
});
test('a session belonging to another user cannot start a household upload', async () => {
  let reads = 0;
  const client = { auth: { getUser: async () => ({ data: { user: { id: householdId } }, error: null }) }, from() { reads++; throw new Error('must not read'); } };
  await assert.rejects(() => backend.createSupabaseBackend(client, id, () => true, new AbortController().signal));
  assert.equal(reads, 0);
});

test('a stalled session check stops when the sync is aborted so a reconnect can retry', async () => {
  const controller = new AbortController();
  const client = { auth: { getUser: () => new Promise(() => {}) } };
  const pending = backend.createSupabaseBackend(client, id, () => true, controller.signal).then(() => 'unexpected success', () => 'aborted');
  controller.abort();
  const result = await Promise.race([pending, new Promise(resolve => setTimeout(() => resolve('stalled'), 100))]);
  assert.equal(result, 'aborted');
});
