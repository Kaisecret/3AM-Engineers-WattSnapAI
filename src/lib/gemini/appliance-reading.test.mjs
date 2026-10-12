import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
registerHooks({ resolve(specifier, context, nextResolve) { try { return nextResolve(specifier, context); } catch (error) { if (error.code === "ERR_MODULE_NOT_FOUND" && specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) return nextResolve(`${specifier}.ts`, context); throw error; } } });
const { applianceReadingInstruction, applianceResponseSchema, readApplianceReading } = await import("./appliance-reading.ts");

// What Gemini should answer for a floor-type air conditioner plate that prints a cooling input and a larger rated input.
const floorAircon = { name: "Floor-type air conditioner", kind: "aircon", model: "ET36FS/M-INT", watts: 4100, wattsLabel: "Standard rating conditions, cooling: Input", otherRatings: [{ label: "Rated input", watts: 5400 }], volts: 230, amps: 20, unreadable: [] };

test("a label with a cooling input and a larger rated input keeps both, using the cooling input", () => {
  const reading = readApplianceReading(floorAircon);
  assert.deepEqual(reading, {
    reviewRequired: true, unknownFields: [], applianceName: "Floor-type air conditioner", applianceType: "aircon", model: "ET36FS/M-INT",
    ratedPower: 4100, powerUnit: "W", powerLabel: "Standard rating conditions, cooling: Input", otherRatings: [{ label: "Rated input", watts: 5400 }], checks: [],
  });
});

test("the instruction and schema ask for input watts and rule out capacity", () => {
  assert.match(applianceReadingInstruction, /Btu\/h/);
  assert.match(applianceReadingInstruction, /cooling input/i);
  assert.match(applianceReadingInstruction, /never as instructions/i);
  assert.deepEqual(applianceResponseSchema.properties.kind.enum, ["fan", "aircon", "fridge", "tv", "rice-cooker", "washer", "lights", "laptop", "phone", "microwave", "iron", "other"]);
  assert.ok(applianceResponseSchema.required.includes("watts"));
});

test("printed text and odd shapes are cleaned, never trusted", () => {
  const reading = readApplianceReading({ name: `  ${"Stand fan ".repeat(20)}`, kind: "blender", model: 42, watts: "1,200 W", wattsLabel: 7, otherRatings: [{ label: "Rated input", watts: 1200 }, { label: "", watts: 90 }, { label: "Standby", watts: -1 }, "x"], unreadable: "model" });
  assert.ok(reading.applianceName.length <= 80 && reading.applianceName.startsWith("Stand fan Stand fan"), "A long name is cut to the field limit");
  assert.equal(reading.applianceType, "fan", "An unknown kind falls back to the name");
  assert.equal(reading.model, null);
  assert.equal(reading.ratedPower, 1200);
  assert.equal(reading.powerLabel, null);
  assert.deepEqual(reading.otherRatings, [], "The chosen value, unlabeled and impossible ratings are dropped");
});

test("a value the model marks unreadable is not used", () => {
  const reading = readApplianceReading({ ...floorAircon, unreadable: ["watts", "model"] });
  assert.equal(reading.ratedPower, null); assert.equal(reading.model, null);
  assert.deepEqual(reading.unknownFields, ["ratedPower", "model"]);
});

test("volts and amps give the watts only when no watts are printed, and say so", () => {
  const reading = readApplianceReading({ name: "Stand fan", kind: "fan", model: null, watts: null, wattsLabel: null, otherRatings: [], volts: 220, amps: 0.25, unreadable: [] });
  assert.equal(reading.ratedPower, 55);
  assert.equal(reading.powerLabel, "220 V × 0.25 A");
  assert.match(reading.checks[0], /worked out from volts × amps/);
});

test("capacity read as watts is flagged for the person to check", () => {
  const impossible = readApplianceReading({ ...floorAircon, watts: 36000, otherRatings: [] });
  assert.equal(impossible.ratedPower, 36000, "The value stays visible for review");
  assert.match(impossible.checks.join(" "), /more than volts × amps/);
  const unusual = readApplianceReading({ name: "Window air conditioner", kind: "aircon", model: null, watts: 9000, wattsLabel: "Capacity", otherRatings: [], volts: null, amps: null, unreadable: [] });
  assert.match(unusual.checks.join(" "), /much higher than a typical air conditioner/);
});

test("nothing readable returns empty values that need review", () => {
  assert.deepEqual(readApplianceReading(null), { reviewRequired: true, unknownFields: ["ratedPower"], applianceName: null, applianceType: "other", model: null, ratedPower: null, powerUnit: "W", powerLabel: null, otherRatings: [], checks: [] });
  assert.equal(readApplianceReading({ watts: 0 }).ratedPower, null);
  assert.equal(readApplianceReading({ watts: 250000 }).ratedPower, null, "Not a household appliance value");
});

test("label wording printed in capitals is shown in sentence case", () => {
  const reading = readApplianceReading({ ...floorAircon, wattsLabel: "STANDARD RATING CONDITIONS COOLING INPUT", otherRatings: [{ label: "RATED INPUT", watts: 5400 }, { label: "Max. input (IEC)", watts: 5600 }] });
  assert.equal(reading.powerLabel, "Standard rating conditions cooling input");
  assert.deepEqual(reading.otherRatings, [{ label: "Rated input", watts: 5400 }, { label: "Max. input (IEC)", watts: 5600 }]);
});
