import test from 'node:test';
import assert from 'node:assert/strict';
import { householdRecords, mergeHouseholdRecords } from './local-records.ts';
import { emptyPreview, samplePreview } from './preview-data.ts';

test('new household has no fabricated name, budget or records', () => {
  assert.deepEqual(emptyPreview, { bills: [], appliances: [], budget: 0, name: 'Your home' });
});
test('legacy fixtures stay stored but do not count as real household records', () => {
  const own = { id: 'own', month: '2026-10', amount: 1500, kwh: 100, source: 'manual' };
  const home = { ...samplePreview, bills: [...samplePreview.bills, own] };
  const visible = householdRecords(home);
  assert.deepEqual(visible.bills, [own]); assert.deepEqual(visible.appliances, []);
  const updated = mergeHouseholdRecords(home, { bills: [{ ...own, amount: 1600 }] });
  assert.deepEqual(updated.bills.slice(0, -1), samplePreview.bills);
  assert.equal(updated.bills.at(-1).amount, 1600);
  assert.equal(home.bills.at(-1).amount, 1500);
});
