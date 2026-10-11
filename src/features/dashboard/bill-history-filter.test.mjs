import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
registerHooks({ resolve(s, c, next) { try { return next(s, c); } catch (e) { if (e.code === 'ERR_MODULE_NOT_FOUND' && s.startsWith('.') && !/\.[a-z]+$/i.test(s)) return next(s + '.ts', c); throw e; } } });
const { filterBillHistory, billHistoryFilters } = await import('./bill-history-filter.ts');
const now = new Date('2026-10-12T04:00:00Z');
const bills = ['2024-12', ...Array.from({ length: 12 }, (_, i) => `2025-${String(i + 1).padStart(2, '0')}`), '2026-02', '2026-09'].map(month => ({ id: month, month, kwh: 100, amount: 1200 }));

test('last year returns all twelve months even when newer bills exist', () => {
  const result = filterBillHistory(bills, 'last-year', now);
  assert.equal(result.length, 12);
  assert.equal(result[0].month, '2025-01');
  assert.equal(result.at(-1).month, '2025-12');
});
test('this year and explicit recorded years preserve missing months', () => {
  assert.deepEqual(filterBillHistory(bills, 'this-year', now).map(b => b.month), ['2026-02', '2026-09']);
  assert.deepEqual(filterBillHistory(bills, '2024', now).map(b => b.month), ['2024-12']);
  assert.deepEqual(filterBillHistory(bills, '2023', now), []);
});
test('recent is six latest saved bills and all includes every year chronologically', () => {
  const copy = structuredClone(bills);
  assert.deepEqual(filterBillHistory([...bills].reverse(), 'recent', now).map(b => b.month), ['2025-09', '2025-10', '2025-11', '2025-12', '2026-02', '2026-09']);
  assert.equal(filterBillHistory(bills, 'all', now).length, 15);
  assert.deepEqual(bills, copy);
});
test('always offers last year and this year plus recorded years in descending order', () => {
  const options = billHistoryFilters(bills, now);
  assert.deepEqual(options.slice(0, 4), [
    { value: 'recent', label: 'Recent 6 bills' }, { value: 'all', label: 'All years' },
    { value: 'this-year', label: 'This year (2026)' }, { value: 'last-year', label: 'Last year (2025)' },
  ]);
  assert.deepEqual(options.slice(4).map(option => option.value), ['2026', '2025', '2024']);
  assert.ok(billHistoryFilters([], now).some(option => option.value === 'last-year'));
});
test('relative filters use Manila date rather than device timezone at New Year', () => {
  const boundary = new Date('2026-12-31T16:10:00Z');
  assert.deepEqual(filterBillHistory(bills, 'last-year', boundary).map(b => b.month), ['2026-02', '2026-09']);
});
