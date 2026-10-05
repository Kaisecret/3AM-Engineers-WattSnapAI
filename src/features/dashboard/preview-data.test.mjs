import assert from "node:assert/strict";
import test from "node:test";
import { dailyApplianceKwh, normalizePreview, validateAppliance, validateBill } from "./preview-data.ts";

test("appliance estimate converts watts into kWh and accounts for quantity", () => {
  assert.equal(dailyApplianceKwh({ watts: 100, hours: 8, quantity: 2 }), 1.6);
  assert.equal(dailyApplianceKwh({ watts: 1000, hours: 0.5, quantity: 1 }), 0.5);
});
test("appliance validation rejects impossible usage and invalid quantities", () => {
  assert.ok(validateAppliance({ name: "Fan", watts: 50, hours: 25, quantity: 1 }));
  assert.ok(validateAppliance({ name: "Fan", watts: 50, hours: 8, quantity: 1.5 }));
  assert.ok(validateAppliance({ name: "  ", watts: 50, hours: 8, quantity: 1 }));
  assert.equal(validateAppliance({ name: "Fan", watts: 50, hours: 8, quantity: 1 }), null);
});
test("bills need a month, finite positive amount, and positive consumption", () => {
  assert.ok(validateBill({ month: "2026-13", amount: 1200, kwh: 100 }));
  assert.ok(validateBill({ month: "2026-10", amount: NaN, kwh: 100 }));
  assert.ok(validateBill({ month: "2026-10", amount: 1200, kwh: 0 }));
  assert.equal(validateBill({ month: "2026-10", amount: 1200, kwh: 100 }), null);
});
test("invalid browser records are ignored without breaking the page", () => {
  const value = normalizePreview({ name: "  Maria  ", budget: -100, bills: [null, { id: "bad", month: "2026-99", amount: 1000, kwh: 100 }], appliances: [{ id: "bad", name: "Fan", watts: 60, hours: 99, quantity: 1 }] });
  assert.equal(value.name, "Maria");
  assert.equal(value.budget, 3500);
  assert.deepEqual(value.bills, []);
  assert.deepEqual(value.appliances, []);
});
