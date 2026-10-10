import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
registerHooks({ resolve(specifier, context, nextResolve) {
  try { return nextResolve(specifier, context); }
  catch (error) {
    if (error.code === "ERR_MODULE_NOT_FOUND" && specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) return nextResolve(`${specifier}.ts`, context);
    throw error;
  }
} });
const { billTipContext, generatePreviewTips, normalizeTipsSnapshot, tipsAreStale } = await import("./preview-tips.ts");
const { samplePreview } = await import("../dashboard/preview-data.ts");
const appliance = { id: "fridge", name: "Kitchen refrigerator", kind: "fridge", watts: 100, quantity: 1, hours: 16, days: 15, source: "manual", wattageBasis: "nameplate" };
const old = { id: "aug", month: "2026-08", kwh: 100, amount: 1200, source: "manual", periodStart: "2026-08-02", periodEnd: "2026-08-31" };
const latest = { id: "sep", month: "2026-09", kwh: 120, amount: 1440, source: "manual", periodStart: "2026-09-01", periodEnd: "2026-09-30" };
const household = { name: "Santos", budget: 1600, bills: [old, latest], appliances: [appliance] };
const now = new Date("2026-10-06T04:00:00Z");

test("tips refer only to supplied devices and never promise peso savings", () => {
  const snapshot = generatePreviewTips(household, now);
  const tip = snapshot.tips.find(item => item.category === "appliance");
  assert.match(tip.title, /Kitchen refrigerator/); assert.match(tip.action, /Keep the refrigerator powered/);
  assert.doesNotMatch(tip.action, /unplug|fewer hours|cut.*hours/);
  assert.match(tip.facts.join(" "), /48\.00 kWh over 30 days/);
  assert.doesNotMatch(JSON.stringify(snapshot), /guarantee|900 W|air conditioner|5–10%/);
  assert.equal(snapshot.generatedAt, now.toISOString()); assert.equal(snapshot.context.sample, false);
});
test("empty inputs produce limited setup advice rather than invented ownership", () => {
  const snapshot = generatePreviewTips({ ...household, bills: [], appliances: [] }, now);
  assert.ok(snapshot.tips.every(tip => tip.category === "getting-started"));
  assert.match(snapshot.context.limitations.join(" "), /No appliances are saved/);
  assert.doesNotMatch(JSON.stringify(snapshot.tips), /fridge|refrigerator|aircon|\d+\.\d+ kWh/);
});
test("zero-use entries cannot become a fabricated top energy user", () => {
  const snapshot = generatePreviewTips({ ...household, appliances: [{ ...appliance, hours: 0 }] }, now);
  assert.equal(snapshot.tips.some(tip => tip.category === "appliance"), false);
  assert.match(snapshot.context.limitations.join(" "), /No positive, finite appliance estimate/);
});
test("comparable periods report the proposal change without asserting appliance causation", () => {
  const context = billTipContext([old, latest]);
  assert.match(context.reason, /20\.00 kWh \(20\.0%\) higher/); assert.match(context.reason, /20% review threshold/); assert.deepEqual(context.limitations, []);
  assert.match(generatePreviewTips(household, now).tips[0].action, /cannot identify an appliance/);
  const lower = billTipContext([{ ...old, kwh: 120 }, { ...latest, kwh: 100 }]);
  assert.match(lower.reason, /20\.00 kWh \(16\.7%\) lower/);
});
test("missing months, dates, unequal periods, overlaps, and zero baselines are qualified", () => {
  assert.match(billTipContext([latest]).limitations.join(" "), /Only one bill/);
  assert.match(billTipContext([{ ...old, month: "2026-07" }, latest]).limitations.join(" "), /months are not consecutive/);
  assert.match(billTipContext([{ ...old, periodStart: undefined }, latest]).limitations.join(" "), /dates are missing/);
  assert.match(billTipContext([{ ...old, periodStart: "2026-08-01" }, latest]).limitations.join(" "), /Period lengths differ/);
  assert.match(billTipContext([old, { ...latest, periodStart: "2026-08-31" }]).limitations.join(" "), /overlap/);
  assert.match(billTipContext([{ ...old, kwh: 0 }, latest]).limitations.join(" "), /percentage change cannot be calculated/);
  assert.doesNotMatch(billTipContext([{ ...old, periodEnd: undefined }, latest]).reason, /20\.0%/);
});
test("sample inputs stay labeled and sample snapshots do not claim the user's household", () => {
  const snapshot = generatePreviewTips(samplePreview, now, "sample");
  assert.equal(snapshot.origin, "sample"); assert.equal(snapshot.context.sample, true); assert.ok(snapshot.tips.every(tip => tip.sample));
  assert.equal(tipsAreStale(snapshot, household), false);
});
test("input corrections mark advice stale while profile-only changes do not", () => {
  const snapshot = generatePreviewTips(household, now);
  assert.equal(tipsAreStale(snapshot, household), false);
  assert.equal(tipsAreStale(snapshot, { ...household, name: "Changed name", budget: 2000, bills: [latest, old] }), false);
  assert.equal(tipsAreStale(snapshot, { ...household, bills: [old, { ...latest, kwh: 150 }] }), true);
  assert.equal(tipsAreStale(snapshot, { ...household, appliances: [{ ...appliance, hours: 12 }] }), true);
});
test("malformed snapshots and unexpected navigation targets are ignored", () => {
  const snapshot = generatePreviewTips(household, now);
  assert.deepEqual(normalizeTipsSnapshot(snapshot), snapshot);
  for (const item of [null, {}, { ...snapshot, generatedAt: "invalid" }, { ...snapshot, tips: [] }, { ...snapshot, tips: [null] }, { ...snapshot, tips: [{ ...snapshot.tips[0], link: { label: "Bad", href: "javascript:alert(1)" } }] }, { ...snapshot, tips: [{ ...snapshot.tips[1], guidance: { label: "Bad", href: "https://example.com" } }] }]) assert.equal(normalizeTipsSnapshot(item), null);
});
