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
const { applianceSignature, compareScenario, createScenario, isStaleScenario, normalizeScenarios } = await import("./calculations.ts");
const { exampleScenario } = await import("./preview-examples.ts");
const ac = { id: "ac", name: "Aircon", watts: 1000, hours: 8, quantity: 1, kind: "aircon", days: 10 };
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} ≈ ${expected}`);

test("proposal aircon example uses equal periods and preserves originals", () => {
  const scenario = createScenario([ac], "test");
  scenario.entries[0].hours = "5";
  const result = compareScenario(scenario).comparison;
  assert.equal(result.baselineKwh, 240); assert.equal(result.scenarioKwh, 150); assert.equal(result.savingsKwh, 90);
  assert.equal(scenario.baseline[0].hours, 8); assert.equal(ac.hours, 8); assert.equal(ac.days, 10);
  scenario.days = "15";
  assert.equal(compareScenario(scenario).comparison.baselineKwh, 120); assert.equal(compareScenario(scenario).comparison.scenarioKwh, 75);
});
test("LED substitution keeps quantity, hours, and period identical", () => {
  const scenario = exampleScenario("led", "test");
  const result = compareScenario(scenario).comparison;
  assert.equal(result.baselineKwh, 72); near(result.scenarioKwh, 8.64); near(result.savingsKwh, 63.36);
  assert.equal(scenario.entries[0].quantity, "4"); assert.equal(scenario.entries[0].hours, "6");
});
test("partial fan substitution includes both appliances and supports exclusion", () => {
  const scenario = exampleScenario("fan", "test");
  near(compareScenario(scenario).comparison.scenarioKwh, 154.95); near(compareScenario(scenario).comparison.savingsKwh, 85.05);
  scenario.entries[1].included = false;
  assert.equal(compareScenario(scenario).comparison.scenarioKwh, 150);
});
test("negative savings represents increased consumption and zero baselines have no percent", () => {
  const scenario = createScenario([ac], "test"); scenario.entries[0].hours = "10";
  assert.equal(compareScenario(scenario).comparison.savingsKwh, -60);
  assert.equal(compareScenario(scenario).comparison.savingsPercent, -25);
  const idle = createScenario([{ ...ac, hours: 0 }], "test"); idle.entries[0].hours = "2";
  assert.equal(compareScenario(idle).comparison.savingsPercent, null);
  idle.entries[0].included = false;
  assert.equal(compareScenario(idle).comparison.scenarioKwh, 0);
});
test("peso comparisons require an explicit positive rate", () => {
  const scenario = exampleScenario("aircon", "test");
  assert.equal(compareScenario(scenario).comparison.savingsCost, undefined);
  scenario.rate = "12"; assert.equal(compareScenario(scenario).comparison.savingsCost, 1080);
  for (const rate of ["0", "-1", "Infinity", "bad"]) { scenario.rate = rate; assert.match(compareScenario(scenario).error, /rate greater than zero/); }
});
test("invalid period, duration, wattage, and quantity suppress comparisons", () => {
  const scenario = createScenario([ac], "test");
  for (const days of ["", "0", "1.5", "367", "-1"]) assert.ok(compareScenario({ ...scenario, days }).error);
  for (const patch of [{ hours: "" }, { hours: "25" }, { hours: "-1" }, { watts: "0" }, { watts: "-1" }, { watts: "" }, { quantity: "0" }, { quantity: "1.5" }, { quantity: "51" }]) assert.ok(compareScenario({ ...scenario, entries: [{ ...scenario.entries[0], ...patch }] }).error, JSON.stringify(patch));
  assert.equal(compareScenario({ ...scenario, entries: [{ ...scenario.entries[0], hours: "0" }] }).comparison.scenarioKwh, 0);
  assert.match(compareScenario({ ...scenario, entries: [{ ...scenario.entries[0], watts: "1e308", quantity: "50" }] }).error, /too large to display/);
  assert.match(compareScenario({ ...scenario, rate: "1e308" }).error, /too large to display/);
});
test("stored baselines detect later appliance changes and ignore list order", () => {
  const fan = { ...ac, id: "fan", name: "Fan", watts: 55 };
  const scenario = createScenario([ac, fan], "test");
  assert.equal(applianceSignature([ac, fan]), applianceSignature([fan, ac]));
  assert.equal(isStaleScenario(scenario, [fan, ac]), false);
  assert.equal(isStaleScenario(scenario, [{ ...ac, hours: 5 }, fan]), true);
  assert.equal(isStaleScenario(scenario, []), true);
  assert.equal(isStaleScenario(exampleScenario("aircon", "test"), []), false);
});
test("browser snapshots reject malformed, invalid, or mismatched originals", () => {
  const scenario = exampleScenario("aircon", "test");
  assert.deepEqual(normalizeScenarios([scenario]), [scenario]);
  for (const value of [null, {}, [null], [{ ...scenario, days: "0" }], [{ ...scenario, baseline: [{ ...scenario.baseline[0], hours: 20 }] }], [{ ...scenario, entries: [null] }], [{ ...scenario, entries: [...scenario.entries, ...scenario.entries] }]]) assert.deepEqual(normalizeScenarios(value), []);
});
