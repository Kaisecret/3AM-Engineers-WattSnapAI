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
  assert.equal(tipsAreStale(snapshot, { ...household, name: "Changed name", bills: [latest, old] }), false);
  assert.equal(tipsAreStale(snapshot, { ...household, budget: 2000 }), true, "The budget tip depends on the budget");
  assert.equal(tipsAreStale(snapshot, { ...household, bills: [old, { ...latest, subsidy: 500 }] }), true, "Budget and subsidy tips depend on the recorded subsidy");
  assert.equal(tipsAreStale(snapshot, { ...household, bills: [old, { ...latest, kwh: 150 }] }), true);
  assert.equal(tipsAreStale(snapshot, { ...household, appliances: [{ ...appliance, hours: 12 }] }), true);
});
test("malformed snapshots and unexpected navigation targets are ignored", () => {
  const snapshot = generatePreviewTips(household, now);
  assert.deepEqual(normalizeTipsSnapshot(snapshot), snapshot);
  for (const item of [null, {}, { ...snapshot, generatedAt: "invalid" }, { ...snapshot, tips: [] }, { ...snapshot, tips: [null] }, { ...snapshot, tips: [{ ...snapshot.tips[0], link: { label: "Bad", href: "javascript:alert(1)" } }] }, { ...snapshot, tips: [{ ...snapshot.tips[1], guidance: { label: "Bad", href: "https://example.com" } }] }]) assert.equal(normalizeTipsSnapshot(item), null);
});
const aircon = { id: "ac", name: "Sala aircon", kind: "aircon", watts: 900, quantity: 1, hours: 6, source: "manual" };
const fans = { id: "fans", name: "Bedroom fans", kind: "fan", watts: 55, quantity: 2, hours: 8, source: "manual" };
const pump = { id: "pump", name: "Water pump", kind: "other", watts: 750, quantity: 1, hours: 3, source: "manual" };
const cooker = { id: "rice", name: "Rice cooker", kind: "rice-cooker", watts: 650, quantity: 1, hours: 1, source: "manual" };
const byId = (snapshot, id) => snapshot.tips.find(tip => tip.id === id);

test("the switch-off plan ranks one hour less a day and never lists essential or unclassified devices", () => {
  const snapshot = generatePreviewTips({ ...household, budget: 0, appliances: [appliance, pump, cooker, fans, aircon] }, now);
  const plan = byId(snapshot, "switch-off-plan");
  assert.equal(snapshot.tips.find(tip => tip.category === "appliance"), plan, "The plan leads the appliance tips");
  assert.equal(plan.title, "Switch off Sala aircon one hour earlier");
  assert.match(plan.facts[0], /^Sala aircon: 1 hour less per day ≈ 27\.00 kWh ≈ ₱324\.00 over 30 days\.$/);
  assert.match(plan.facts[1], /^Bedroom fans: 1 hour less per day ≈ 3\.30 kWh ≈ ₱39\.60 over 30 days\.$/);
  assert.match(plan.facts[2], /₱12\.00 per kWh from your September 2026 bill, before subsidy; this is not a future tariff/);
  assert.equal(plan.facts.length, 3);
  assert.doesNotMatch(JSON.stringify(plan), /Kitchen refrigerator|Water pump|Rice cooker|guarantee/);
  assert.match(plan.action, /Keep refrigerators and health or safety devices running/);
  assert.equal(plan.link.href, "/simulator");
  assert.equal(byId(generatePreviewTips({ ...household, appliances: [appliance, pump, cooker] }, now), "switch-off-plan"), undefined);
});
test("peso figures need a saved bill and always name their rate basis", () => {
  const without = generatePreviewTips({ ...household, bills: [], appliances: [aircon, fans] }, now);
  assert.doesNotMatch(JSON.stringify(without.tips), /₱|PHP/);
  assert.match(byId(without, "switch-off-plan").facts[0], /27\.00 kWh over 30 days/);
  const withBill = generatePreviewTips({ ...household, budget: 0, appliances: [aircon] }, now);
  assert.match(byId(withBill, "appliance-ac").facts.join(" "), /≈ ₱1,944\.00 over 30 days at ₱12\.00 per kWh from your September 2026 bill, before subsidy · estimate\./);
});
test("the budget tip compares what was paid, and only points to a switch-off list that exists", () => {
  const near = byId(generatePreviewTips(household, now), "budget-gap");
  assert.equal(near.title, "You are close to your budget"); assert.match(near.facts.join(" "), /Room left: ₱160\.00 ≈ 13\.3 kWh/); assert.equal(near.link.href, "/budget");
  const over = byId(generatePreviewTips({ ...household, budget: 1000 }, now), "budget-gap");
  assert.equal(over.title, "Trim about 36.7 kWh to meet your budget");
  assert.match(over.action, /₱440\.00 over your ₱1,000\.00 budget\. Review your appliance hours/); assert.doesNotMatch(over.action, /switch-off list/);
  assert.match(byId(generatePreviewTips({ ...household, budget: 1000, appliances: [aircon] }, now), "budget-gap").action, /switch-off list shows where to start; those changes may not cover the whole gap/);
  assert.equal(byId(generatePreviewTips({ ...household, budget: 2000 }, now), "budget-gap"), undefined);
  assert.equal(byId(generatePreviewTips({ ...household, budget: 0 }, now), "budget-gap"), undefined);
  const subsidised = generatePreviewTips({ ...household, budget: 1000, bills: [old, { ...latest, subsidy: 500 }] }, now);
  assert.equal(byId(subsidised, "budget-gap").title, "You are close to your budget", "₱940 paid of ₱1,000 after the subsidy");
  assert.deepEqual(normalizeTipsSnapshot(subsidised), subsidised);
});
test("subsidy notes appear only with a recorded subsidy", () => {
  const covered = generatePreviewTips({ ...household, appliances: [aircon], bills: [old, { ...latest, kwh: 33, amount: 418.85, subsidy: 418.85 }] }, now);
  assert.match(byId(covered, "subsidy-covered").facts[0], /bill ₱418\.85, subsidy ₱418\.85, you pay ₱0\.00/);
  assert.equal(byId(covered, "budget-gap"), undefined);
  assert.match(byId(covered, "switch-off-plan").assumptions.join(" "), /Savings lower what you pay only while the bill is above the subsidy/);
  const plain = generatePreviewTips({ ...household, appliances: [aircon] }, now);
  assert.equal(byId(plain, "subsidy-covered"), undefined);
  assert.doesNotMatch(JSON.stringify(plain.tips), /subsidy\. Savings/);
  assert.equal(byId(generatePreviewTips({ ...household, bills: [old, { ...latest, subsidy: 500 }] }, now), "subsidy-covered"), undefined, "A partly subsidised bill is not covered");
});
test("short-use kitchen and laundry devices get their own advice", () => {
  const tips = generatePreviewTips({ ...household, appliances: [cooker, { id: "iron", name: "Flat iron", kind: "iron", watts: 1000, quantity: 1, hours: 0.5 }, { id: "mw", name: "Microwave", kind: "microwave", watts: 1000, quantity: 1, hours: 0.25 }] }, now).tips;
  assert.deepEqual(tips.filter(tip => tip.category === "appliance").map(tip => tip.title), ["Switch off keep-warm on Rice cooker", "Iron in one batch with Flat iron", "Heat only what you need in Microwave"]);
});
test("a refrigeration name is never a switch-off candidate, whatever kind was saved or guessed", () => {
  const legacy = { id: "legacy", name: "Fan-cooled refrigerator", watts: 100, quantity: 1, hours: 16, source: "manual" };
  for (const item of [legacy, { ...legacy, kind: "fan" }, { ...legacy, name: "Chest freezer", kind: "tv" }]) {
    const snapshot = generatePreviewTips({ ...household, appliances: [item] }, now);
    assert.equal(byId(snapshot, "switch-off-plan"), undefined, item.name);
    assert.match(byId(snapshot, "appliance-legacy").action, /Keep the refrigerator powered/);
  }
  const mixed = byId(generatePreviewTips({ ...household, appliances: [{ ...legacy, kind: "fan" }, fans] }, now), "switch-off-plan");
  assert.equal(mixed.title, "Switch off Bedroom fans one hour earlier"); assert.doesNotMatch(JSON.stringify(mixed), /Fan-cooled/);
});
test("appliance peso estimates carry the recorded subsidy limit even without other peso tips", () => {
  const snapshot = generatePreviewTips({ ...household, bills: [old, { ...latest, subsidy: 500 }] }, now);
  assert.deepEqual(snapshot.tips.map(tip => tip.id), ["bill-review", "appliance-fridge"], "On track, not covered, nothing to switch off");
  const fridge = byId(snapshot, "appliance-fridge");
  assert.match(fridge.facts.join(" "), /≈ ₱576\.00 over 30 days at ₱12\.00 per kWh/);
  assert.match(fridge.assumptions.join(" "), /September 2026 bill had a ₱500\.00 subsidy\. Savings lower what you pay only while the bill is above the subsidy/);
  assert.doesNotMatch(byId(generatePreviewTips({ ...household, bills: [], appliances: [appliance] }, now), "appliance-fridge").assumptions.join(" "), /subsidy/);
});
