import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
registerHooks({ resolve(s, c, next) { try { return next(s, c); } catch (e) { if (e.code === 'ERR_MODULE_NOT_FOUND' && s.startsWith('.') && !/\.[a-z]+$/i.test(s)) return next(s + '.ts', c); throw e; } } });
const { forecastNextMonth, manilaMonth } = await import('./next-month-forecast.ts');
const now = new Date('2026-10-12T04:00:00Z');
const shape = [100, 110, 140, 180, 200, 170, 150, 120, 100, 90, 80, 100];
const bill = (month, kwh, amount = kwh * 12) => ({ id: month, month, kwh, amount, source: 'manual' });
const year = (y, values = shape) => values.map((kwh, i) => bill(`${y}-${String(i + 1).padStart(2, '0')}`, kwh));

test('uses last year matching month to estimate the next calendar month', () => {
  const result = forecastNextMonth(year(2025), now);
  assert.equal(result.month, '2026-11');
  assert.equal(result.method, 'seasonal');
  assert.equal(result.kwh, 80);
  assert.equal(result.amount, 960);
  assert.deepEqual(result.basisMonths, ['2025-11']);
  assert.equal(result.rateMonth, '2025-12');
  assert.ok(result.notes.some(note => /one complete year/i.test(note)));
  assert.ok(result.notes.some(note => /older/i.test(note)));
});

test('adjusts the seasonal month once by the median of three latest matching months', () => {
  const bills = [...year(2025), ...year(2026, shape.slice(0, 9).map((v, i) => v * (i === 7 ? 4 : 1.2)))];
  const result = forecastNextMonth(bills, now);
  assert.equal(result.kwh, 96);
  assert.equal(result.scale, 1.2);
  assert.deepEqual(result.adjustmentMonths, ['2026-07', '2026-08', '2026-09']);
  assert.equal(result.amount, 1152);
});

test('does not infer a usage shift from just two matching months', () => {
  const result = forecastNextMonth([...year(2025), ...year(2026, [200, 220])], now);
  assert.equal(result.scale, 1);
  assert.equal(result.kwh, 80);
  assert.deepEqual(result.adjustmentMonths, []);
});

test('uses a recent three-month average when a seasonal year is incomplete', () => {
  const result = forecastNextMonth([bill('2026-07', 900), bill('2026-08', 90), bill('2026-09', 120), bill('2026-10', 150, 2250)], now);
  assert.equal(result.method, 'recent-average');
  assert.equal(result.kwh, 120);
  assert.equal(result.rate, 15);
  assert.equal(result.amount, 1800);
  assert.deepEqual(result.basisMonths, ['2026-08', '2026-09', '2026-10']);
});

test('one or two recent bills give a clearly limited latest-bill starting estimate', () => {
  const result = forecastNextMonth([bill('2026-08', 90), bill('2026-09', 120)], now);
  assert.equal(result.method, 'latest-bill');
  assert.equal(result.kwh, 120);
  assert.deepEqual(result.basisMonths, ['2026-09']);
  assert.ok(result.notes.some(note => /three recent/i.test(note)));
});

test('incomplete old history is insufficient rather than a fabricated current trend', () => {
  for (const bills of [[], year(2025).slice(0, 11), year(2020)]) {
    const result = forecastNextMonth(bills, now);
    assert.equal(result.method, 'insufficient');
    assert.equal(result.kwh, null);
    assert.equal(result.amount, null);
  }
});

test('sample, future, invalid consumption and duplicate months cannot train the forecast', () => {
  const real = bill('2026-09', 120);
  const result = forecastNextMonth([real, { ...bill('2026-10', 900), source: 'sample' }, bill('2026-11', 500), bill('2026-08', NaN), bill('2026-07', -1)], now);
  assert.equal(result.kwh, 120);
  assert.equal(result.billCount, 1);
  const duplicate = forecastNextMonth([...year(2025), { ...year(2025)[10], id: 'duplicate' }], now);
  assert.equal(duplicate.method, 'insufficient');
  assert.ok(duplicate.notes.some(note => /duplicate/i.test(note)));
});

test('future issue dates are excluded while future payment due dates are allowed', () => {
  const saved = bill('2026-09', 120);
  const futureIssued = { ...bill('2026-10', 999, 14985), billingDate: '2026-10-30' };
  const result = forecastNextMonth([saved, futureIssued], now);
  assert.equal(result.kwh, 120);
  assert.equal(result.rateMonth, '2026-09');
  assert.equal(forecastNextMonth([{ ...saved, dueDate: '2026-11-10' }], now).kwh, 120);
});

test('legacy example records are not real training data', () => {
  const result = forecastNextMonth([{ ...bill('2026-09', 999), id: 'example-receipt' }], now);
  assert.equal(result.kwh, null);
});

test('normalizes reliable periods to thirty days and states the displayed unit', () => {
  const dated = year(2025, Array(12).fill(100)).map((b, i) => ({ ...b, periodStart: `${b.month}-01`, periodEnd: `${b.month}-${new Date(Date.UTC(2025, i + 1, 0)).getUTCDate()}` }));
  const result = forecastNextMonth(dated, now);
  assert.equal(result.unit, 'kwh-30-days');
  assert.equal(result.kwh, 100);
  assert.equal(forecastNextMonth(dated.map((b, i) => i ? b : { ...b, periodEnd: undefined }), now).unit, 'kwh-month');
});

test('excludes overlapping and invalid billing periods', () => {
  const overlap = [
    { ...bill('2026-09', 100), periodStart: '2026-08-15', periodEnd: '2026-09-15' },
    { ...bill('2026-10', 100), periodStart: '2026-09-10', periodEnd: '2026-10-10' },
  ];
  assert.equal(forecastNextMonth(overlap, now).method, 'insufficient');
  assert.equal(forecastNextMonth([{ ...bill('2026-09', 100), periodStart: '2026-02-30', periodEnd: '2026-09-10' }], now).method, 'insufficient');
});

test('peso estimates use the latest usable rate before subsidy and full-precision kWh', () => {
  const result = forecastNextMonth([bill('2026-08', 100), bill('2026-09', 100), { ...bill('2026-10', 101, 1414), subsidy: 500 }], now);
  assert.equal(result.rate, 14);
  assert.equal(result.kwh, 100.3);
  assert.equal(result.amount, 1404.67);
  assert.equal(result.rateMonth, '2026-10');
  const missing = forecastNextMonth([bill('2026-09', 100, NaN)], now);
  assert.equal(missing.kwh, 100);
  assert.equal(missing.amount, null);
});

test('uses Manila calendar month at the year boundary', () => {
  const date = new Date('2026-12-31T16:10:00Z');
  assert.equal(manilaMonth(date), '2027-01');
  assert.equal(forecastNextMonth(year(2026), date).month, '2027-02');
});

test('sorting never mutates records and cannot change the forecast', () => {
  const bills = year(2025).reverse();
  const original = structuredClone(bills);
  assert.deepEqual(forecastNextMonth(bills, now), forecastNextMonth([...bills].reverse(), now));
  assert.deepEqual(bills, original);
});
