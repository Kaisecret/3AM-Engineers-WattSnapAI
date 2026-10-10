import assert from "node:assert/strict";
import test from "node:test";
const { billCoverage } = await import("./bill-coverage.ts");

test("devices are compared with the latest bill so missing appliances are visible", () => {
  assert.deepEqual(billCoverage(79, 192), { percent: 41, status: "under" });
  assert.deepEqual(billCoverage(180, 192), { percent: 94, status: "close" });
  assert.deepEqual(billCoverage(230, 192), { percent: 120, status: "over" });
});

test("no comparison without both a device estimate and a bill", () => {
  assert.equal(billCoverage(0, 192), null);
  assert.equal(billCoverage(50, 0), null);
  assert.equal(billCoverage(Number.NaN, 192), null);
});
