import test from 'node:test';
import assert from 'node:assert/strict';
import { dailyApplianceKwh, effectiveRate } from './preview-data.ts';
test('estimated use multiplies supplied inputs independently of the bill', () => {
  assert.equal(dailyApplianceKwh({ watts: 55, hours: 8, quantity: 2 }) * 30, 26.4);
  assert.equal(dailyApplianceKwh({ watts: 1000, hours: 0, quantity: 1 }), 0);
});
test('unknown rates stay unavailable; a saved bill supplies a declared approximation', () => {
  assert.equal(effectiveRate([]), 0);
  assert.equal(effectiveRate([{ id: 'entered', month: '2026-09', kwh: 100, amount: 1200 }]), 12);
});
