import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
// Match the app's TypeScript resolution for extensionless relative imports.
registerHooks({ resolve(specifier, context, nextResolve) {
  try { return nextResolve(specifier, context); }
  catch (error) {
    if (error.code === "ERR_MODULE_NOT_FOUND" && specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) return nextResolve(`${specifier}.ts`, context);
    throw error;
  }
} });
const { blankNameplate, nameplateEstimate, reviewNameplate, sampleNameplateDraft } = await import("./nameplate-preview.ts");

const manual = { ...blankNameplate, name: "Water pump", power: "1", unit: "kW", hours: "8", quantity: "1", days: "30" };

test("review converts kW once and estimates the explicitly selected period", () => {
  const result = reviewNameplate(manual, "manual");
  assert.equal(result.appliance.watts, 1000);
  assert.equal(nameplateEstimate(result.appliance), 240);
  assert.equal(nameplateEstimate(reviewNameplate({ ...manual, quantity: "2", days: "15" }, "manual").appliance), 240);
});
test("voltage-only labels and blank power never become inferred wattage", () => {
  const draft = sampleNameplateDraft("voltage");
  assert.equal(draft.power, "");
  assert.match(reviewNameplate({ ...draft, hours: "8" }, "sample").error, /missing/);
  for (const unit of ["V", "VA", "HP", "watts"]) assert.match(reviewNameplate({ ...manual, unit }, "manual").error, /Use W or kW/);
});
test("empty usage differs from explicit zero use", () => {
  assert.match(reviewNameplate({ ...manual, hours: "" }, "manual").error, /Enter daily usage/);
  const idle = reviewNameplate({ ...manual, hours: "0" }, "manual");
  assert.equal(nameplateEstimate(idle.appliance), 0);
});
test("invalid calculation inputs are rejected without a numeric estimate", () => {
  for (const patch of [{ power: "-1" }, { power: "0" }, { power: "Infinity" }, { hours: "25" }, { hours: "-1" }, { quantity: "0" }, { quantity: "1.5" }, { quantity: "51" }, { days: "0" }, { days: "1.5" }, { days: "367" }, { days: "" }]) {
    const result = reviewNameplate({ ...manual, ...patch }, "manual");
    assert.ok(result.error, JSON.stringify(patch)); assert.equal(result.appliance, undefined);
  }
});
test("sample and approximate labels survive review and optional model stays unknown", () => {
  const result = reviewNameplate({ ...sampleNameplateDraft("complete"), hours: "8", wattageBasis: "approximate", model: " " }, "sample");
  assert.equal(result.appliance.source, "sample");
  assert.equal(result.appliance.wattageBasis, "approximate");
  assert.equal(result.appliance.model, undefined);
});
