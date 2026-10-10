import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
registerHooks({ resolve(specifier, context, nextResolve) {
  try { return nextResolve(specifier, context); }
  catch (error) { if (error.code === "ERR_MODULE_NOT_FOUND" && specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) return nextResolve(`${specifier}.ts`, context); throw error; }
} });
const { deriveSetupProgress, normalizeSetup, canReviewSetupTips } = await import("./setup-progress.ts");
const { generatePreviewTips } = await import("../tipid-tips/preview-tips.ts");
const { samplePreview } = await import("../dashboard/preview-data.ts");
const bill = { id: "own-bill", month: "2026-09", amount: 2480, kwh: 210, source: "manual" };
const appliance = { id: "own-fan", name: "Bedroom fan", watts: 60, hours: 8, quantity: 1, source: "manual" };
const home = { name: "Santos", location: "San Jose de Buenavista, Antique", locality: { province: "Antique", municipality: "San Jose de Buenavista", barangay: "" }, provider: "anteco", budget: 3000, bills: [bill], appliances: [appliance] };

test("fixtures and sample readings never complete bill or appliance setup", () => {
  assert.equal(deriveSetupProgress(samplePreview, generatePreviewTips(samplePreview)).count, 0);
  const sample = { ...home, bills: [{ ...bill, source: "sample" }], appliances: [{ ...appliance, source: "sample" }] };
  assert.equal(deriveSetupProgress(sample, generatePreviewTips(sample)).count, 2);
  assert.equal(canReviewSetupTips(sample, generatePreviewTips(sample)), false);
});

test("viewing current household tips is insufficient without explicit review", () => {
  const tips = generatePreviewTips(home);
  const progress = deriveSetupProgress(home, tips);
  assert.equal(progress.count, 4); assert.equal(progress.next.id, "tips"); assert.equal(progress.percent, 80);
  assert.equal(deriveSetupProgress(home, tips, { version: 1, reviewedTips: tips.inputSignature }).count, 5);
});

test("setup accepts actual records in any order and invalid records cannot finish steps", () => {
  const empty = { ...home, location: undefined, locality: undefined, provider: undefined, bills: [], appliances: [appliance] };
  assert.deepEqual(deriveSetupProgress(empty, null).steps.map(item => item.complete), [false, false, false, true, false]);
  const invalid = { ...home, bills: [{ ...bill, kwh: 0 }], appliances: [{ ...appliance, hours: 25 }] };
  assert.equal(deriveSetupProgress(invalid, null).count, 2);
});

test("missing inputs, sample tips and earlier snapshots cannot complete tips review", () => {
  const tips = generatePreviewTips(home);
  assert.equal(canReviewSetupTips({ ...home, bills: [] }, tips), false);
  assert.equal(canReviewSetupTips(home, generatePreviewTips(home, new Date(), "sample")), false);
  assert.equal(canReviewSetupTips({ ...home, appliances: [{ ...appliance, hours: 4 }] }, tips), false);
});

test("record corrections invalidate tips review and completed notification acknowledgment", () => {
  const tips = generatePreviewTips(home);
  const reviewed = { version: 1, reviewedTips: tips.inputSignature };
  const progress = deriveSetupProgress(home, tips, reviewed);
  const acknowledged = { ...reviewed, acknowledged: progress.signature };
  assert.equal(deriveSetupProgress(home, tips, acknowledged).dismissed, true);
  const changed = { ...home, appliances: [{ ...appliance, hours: 4 }] };
  assert.equal(deriveSetupProgress(changed, tips, acknowledged).count, 4);
  assert.equal(deriveSetupProgress({ ...home, name: "Reyes" }, tips, acknowledged).dismissed, false);
});

test("completion is celebrated once, never again after later edits", () => {
  const tips = generatePreviewTips(home);
  const reviewed = { version: 1, reviewedTips: tips.inputSignature };
  assert.equal(deriveSetupProgress(home, tips, { version: 1 }).celebrate, false, "incomplete setup is not celebrated");
  const progress = deriveSetupProgress(home, tips, reviewed);
  assert.equal(progress.celebrate, true);
  const acknowledged = { ...reviewed, acknowledged: progress.signature };
  assert.equal(deriveSetupProgress(home, tips, acknowledged).celebrate, false);
  assert.equal(deriveSetupProgress({ ...home, name: "Reyes" }, tips, acknowledged).celebrate, false, "renaming after completion does not celebrate again");
});

test("malformed progress is rejected rather than becoming a completed checklist", () => {
  for (const value of [null, { version: 2 }, { version: 1, reviewedTips: true }, { version: 1, acknowledged: [] }]) assert.throws(() => normalizeSetup(value));
  assert.deepEqual(normalizeSetup({ version: 1, completed: [true, true, true, true, true] }), { version: 1 });
});
