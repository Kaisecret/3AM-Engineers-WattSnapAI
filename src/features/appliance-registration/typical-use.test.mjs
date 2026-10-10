import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
registerHooks({ resolve(specifier, context, nextResolve) {
  try { return nextResolve(specifier, context); }
  catch (error) { if (error.code === "ERR_MODULE_NOT_FOUND" && specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) return nextResolve(`${specifier}.ts`, context); throw error; }
} });
const { typicalUse } = await import("./typical-use.ts");

test("every listed appliance type has a typical wattage range to guide people without a label", () => {
  for (const kind of ["fan", "aircon", "fridge", "tv", "rice-cooker", "washer", "lights", "laptop", "phone", "microwave", "iron"]) {
    const guide = typicalUse(kind);
    assert.ok(guide, kind);
    const [low, high] = guide.watts;
    assert.ok(low > 0 && high > low, `${kind} range is increasing`);
  }
  assert.equal(typicalUse("other"), null, "no guess for an unknown appliance");
});

test("appliances that cycle or run briefly explain how to count hours", () => {
  assert.match(typicalUse("fridge").hours, /not 24/);
  assert.match(typicalUse("lights").hours, /Quantity/);
});
