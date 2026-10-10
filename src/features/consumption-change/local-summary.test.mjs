import test from 'node:test';
import assert from 'node:assert/strict';
import { consumptionChange } from './local-summary.ts';
const bill = { id: 'b', month: '2026-10', amount: 1000, kwh: 100 };
test('consumption change reports actual differences, zero baselines and a declared threshold without causes', () => {
  assert.deepEqual([consumptionChange({ ...bill, kwh: 120 }, bill).difference, consumptionChange({ ...bill, kwh: 120 }, bill).percentage], [20, 20]);
  assert.equal(consumptionChange({ ...bill, kwh: 80 }, bill).label, 'Notable decrease');
  assert.equal(consumptionChange({ ...bill, kwh: 110 }, bill).label, 'Small change');
  assert.equal(consumptionChange(bill, bill).label, 'No change');
  assert.equal(consumptionChange(bill, { ...bill, kwh: 0 }).percentage, null);
});
test('unequal or missing period lengths qualify the recorded-total comparison', () => {
  const previous = { ...bill, periodStart: '2026-08-01', periodEnd: '2026-08-31' };
  assert.match(consumptionChange({ ...bill, periodStart: '2026-09-01', periodEnd: '2026-09-30' }, previous).note, /different numbers of days/);
  assert.match(consumptionChange(bill, previous).note, /unknown/);
});
