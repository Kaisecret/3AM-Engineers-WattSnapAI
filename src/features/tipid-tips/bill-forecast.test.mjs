import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
registerHooks({ resolve(s, c, next) { try { return next(s, c); } catch (e) { if (e.code === "ERR_MODULE_NOT_FOUND" && s.startsWith(".") && !/\.[a-z]+$/i.test(s)) return next(s + ".ts", c); throw e; } } });
const { buildBillForecast, normalizeBillForecast } = await import("./bill-forecast.ts");
const { generatePreviewTips, normalizeTipsSnapshot, tipsAreStale } = await import("./preview-tips.ts");
const { mergeGeminiTips } = await import("./ai-tips.ts");
const now = new Date("2026-10-12T04:00:00Z");
const shape = [100, 110, 140, 180, 200, 170, 150, 120, 100, 90, 80, 100];
const year = (y, values = shape) => values.map((kwh, i) => ({ id: `${y}-${i+1}`, month: `${y}-${String(i+1).padStart(2,"0")}`, kwh, amount: kwh * 12, source: "manual" }));

test("a complete last year produces twelve seasonal estimates for next calendar year", () => {
  const result = buildBillForecast(year(2025), now);
  assert.equal(result.status, "ready"); assert.equal(result.targetYear, 2027); assert.equal(result.baseYear, 2025);
  assert.deepEqual(result.months.map(m => m.kwh), shape);
  assert.equal(result.peakMonth, 5); assert.equal(result.lowMonth, 11);
  assert.equal(result.months[3].direction, "up"); assert.equal(result.months[5].direction, "down");
  assert.match(result.limitations.join(" "), /one complete year/i);
});
test("current year matching months adjust the seasonal shape once without compound growth", () => {
  const recent = year(2026, shape.slice(0,6).map(v => v * 1.2));
  const result = buildBillForecast([...year(2025), ...recent], now);
  assert.equal(result.matchedMonths, 6); assert.ok(Math.abs(result.scale - 1.2) < 1e-9);
  assert.equal(result.months[4].kwh, 240); assert.equal(result.months[4].history.find(h => h.year === 2026).kwh, 240);
});
test("less than three matching months cannot establish an annual usage shift", () => {
  const result = buildBillForecast([...year(2025), ...year(2026, [500, 550])], now);
  assert.equal(result.scale, 1); assert.equal(result.months[0].kwh, 100);
  assert.match(result.limitations.join(" "), /three matching months/i);
});
test("missing months and samples never become zero-valued or fabricated forecasts", () => {
  for (const bills of [[], year(2025).slice(1), year(2025).map(b => ({ ...b, source: "sample" })), [...year(2025).slice(1), ...year(2026, [100])]]) {
    const result = buildBillForecast(bills, now); assert.equal(result.status, "insufficient"); assert.ok(result.months.every(m => m.kwh === null));
  }
});
test("future and duplicate month receipts are excluded, and old history cannot imply a recent trend", () => {
  const future = buildBillForecast([...year(2025), ...year(2027)], now);
  assert.equal(future.baseYear, 2025); assert.equal(future.receiptCount, 12);
  const duplicate = buildBillForecast([...year(2025), { ...year(2025)[0], id: "duplicate" }], now);
  assert.equal(duplicate.status, "insufficient"); assert.match(duplicate.limitations.join(" "), /duplicate/i);
  assert.equal(buildBillForecast(year(2020), now).status, "insufficient");
});
test("billing periods are normalized only when all usable records have reliable lengths", () => {
  const dated = year(2025, Array(12).fill(100)).map((b,i) => ({ ...b, periodStart: new Date(Date.UTC(2025,i,1)).toISOString().slice(0,10), periodEnd: new Date(Date.UTC(2025,i+1,1)).toISOString().slice(0,10) }));
  const result = buildBillForecast(dated, now);
  assert.equal(result.unit, "kwh-30-days"); assert.equal(result.months[1].kwh, 107.1);
  assert.equal(buildBillForecast(dated.map((b,i) => i === 0 ? { ...b, periodEnd: undefined } : b), now).unit, "kwh-month");
  assert.equal(buildBillForecast(dated.map((b,i) => i === 0 ? { ...b, periodEnd: "2025-02-10" } : b), now).status, "insufficient");
});
test("zero and flat usage have no fabricated peak, direction, or divide-by-zero trend", () => {
  const flat = buildBillForecast(year(2025, Array(12).fill(100)), now);
  assert.equal(flat.peakMonth, null); assert.equal(flat.lowMonth, null); assert.ok(flat.months.every(m => m.direction === "steady"));
  const zero = buildBillForecast([...year(2025, Array(12).fill(0)), ...year(2026, [100, 100, 100])], now);
  assert.equal(zero.status, "insufficient"); assert.ok(zero.months.every(m => m.kwh === null));
});
test("forecasts are deterministic regardless of receipt order and serialized safely", () => {
  const result = buildBillForecast(year(2025), now);
  assert.deepEqual(buildBillForecast(year(2025).reverse(), now), result);
  assert.deepEqual(normalizeBillForecast(JSON.parse(JSON.stringify(result))), result);
  for (const value of [{}, { ...result, months: [] }, { ...result, scale: Infinity }, { ...result, months: result.months.map(m => ({ ...m, kwh: -1 })) }]) assert.equal(normalizeBillForecast(value), null);
});
test("the forecast year uses the Philippines date at the year boundary", () => {
  assert.equal(buildBillForecast(year(2025), new Date("2026-12-31T16:10:00Z")).targetYear, 2028);
});
test("saved forecasts become stale at the Manila year boundary even without receipt changes", () => {
  const household = { name: "Home", budget: 1800, appliances: [], bills: year(2025) };
  const snapshot = generatePreviewTips(household, now);
  assert.equal(tipsAreStale(snapshot, household, new Date("2026-12-31T15:59:00Z")), false);
  assert.equal(tipsAreStale(snapshot, household, new Date("2026-12-31T16:00:00Z")), true);
  const { forecast, ...old } = snapshot;
  assert.equal(tipsAreStale(old, household, new Date("2026-12-31T16:00:00Z")), false, "Legacy tips have no time-sensitive forecast");
});
test("peso scenarios use the recent blended recorded cost per kWh, without claiming future prices", () => {
  const result = buildBillForecast([...year(2025), ...year(2026, [120,132,168]).map(b => ({ ...b, amount: b.kwh * 15 }))], now);
  assert.equal(result.effectiveRate, 15); assert.equal(result.months[4].amount, 3600);
  assert.deepEqual(result.rateMonths, ["2026-01", "2026-02", "2026-03"]);
  assert.match(result.limitations.join(" "), /rates.*subsidies/i);
  const unknown = buildBillForecast(year(2025).map(b => ({ ...b, amount: 0 })), now);
  assert.equal(unknown.effectiveRate, null); assert.ok(unknown.months.every(m => m.amount === null));
});
test("forecast tips and facts persist without allowing Gemini to change the projected values", () => {
  const basis = generatePreviewTips({ name: "Home", budget: 1800, appliances: [], bills: [...year(2025), ...year(2026, [120,132,168])] }, now);
  assert.equal(basis.forecast.targetYear, 2027);
  assert.ok(basis.tips.find(t => t.id === "bill-forecast"));
  assert.match(basis.tips.find(t => t.id === "bill-forecast").facts.join(" "), /May.*240.*kWh/);
  const reply = basis.tips.map(t => ({ id: t.id, title: "Prepare for higher use", action: "Check unused appliance hours before the projected peak month.", explanation: "These are estimates based on saved records.", assumptions: [] }));
  const merged = mergeGeminiTips(basis, reply);
  assert.deepEqual(merged.forecast, basis.forecast);
  assert.deepEqual(normalizeTipsSnapshot(JSON.parse(JSON.stringify(merged))), merged);
  assert.equal(normalizeTipsSnapshot({ ...merged, forecast: { ...merged.forecast, months: [] } }), null);
  const { forecast, ...old } = basis;
  assert.deepEqual(normalizeTipsSnapshot(old), old, "Existing snapshots still work");
});
