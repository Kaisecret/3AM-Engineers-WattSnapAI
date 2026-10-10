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
const { applianceFrom, blankDraft, draftFrom } = await import("./appliance-draft.ts");
const { dailyApplianceKwh, validateAppliance } = await import("../dashboard/preview-data.ts");

const pump = { ...blankDraft, name: " Water pump ", power: "1", unit: "kW", hours: "8", days: "30" };

test("kW is converted once and the estimate uses watts × hours × quantity", () => {
  const appliance = applianceFrom(pump);
  assert.equal(appliance.watts, 1000); assert.equal(appliance.name, "Water pump");
  assert.equal(dailyApplianceKwh(appliance), 8);
  assert.equal(dailyApplianceKwh(applianceFrom({ ...pump, unit: "W", power: "60", quantity: 2 })), 0.96);
});

test("blank power or hours are asked for, never treated as zero; zero hours is allowed", () => {
  assert.match(validateAppliance(applianceFrom({ ...pump, power: "" })), /wattage/);
  assert.match(validateAppliance(applianceFrom({ ...pump, hours: "" })), /between 0 and 24/);
  assert.equal(validateAppliance(applianceFrom({ ...pump, hours: "0" })), null);
  assert.match(validateAppliance(applianceFrom({ ...pump, days: "" })), /Days/);
});

test("editing starts from the saved values in watts", () => {
  const draft = draftFrom({ id: "a", name: "Bedroom fan", watts: 60, hours: 8, quantity: 2, days: 15 });
  assert.deepEqual(draft, { kind: "fan", name: "Bedroom fan", model: "", power: "60", unit: "W", hours: "8", quantity: 2, days: "15", wattageBasis: "approximate" });
  assert.equal(draftFrom(), blankDraft);
});
