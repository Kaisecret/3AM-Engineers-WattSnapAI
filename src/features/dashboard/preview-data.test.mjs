import assert from "node:assert/strict";
import test from "node:test";
import { compareWithPrevious, dailyApplianceKwh, guessApplianceKind, latestBill, monthlySeries, normalizePreview, sampleAppliances, sampleBills, sampleScanReading, shiftMonth, validateAppliance, validateBill } from "./preview-data.ts";

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
test("monthly comparison uses the closest earlier recorded bill", () => {
  const bills = [
    { id: "c", month: "2026-09", amount: 1100, kwh: 99 },
    { id: "a", month: "2026-06", amount: 1500, kwh: 150 },
    { id: "b", month: "2026-08", amount: 1200, kwh: 110 },
  ];
  const change = compareWithPrevious(bills, "2026-09");
  assert.equal(change.previous.id, "b");
  assert.equal(change.kwhChange, -11);
  assert.equal(change.kwhPercent, -10);
  assert.equal(compareWithPrevious(bills, "2026-06"), null);
  assert.equal(compareWithPrevious(bills, "2026-01"), null);
});
test("monthly series is chronological and leaves missing months out", () => {
  const bills = ["2026-09", "2025-12", "2026-02", "2026-01"].map((month, i) => ({ id: String(i), month, amount: 100, kwh: 10 }));
  assert.deepEqual(monthlySeries(bills, 3).map(bill => bill.month), ["2026-01", "2026-02", "2026-09"]);
  assert.equal(latestBill(bills).month, "2026-09");
  assert.equal(latestBill([]), undefined);
});
test("months shift across year boundaries", () => {
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
});
test("sample scan reading continues the saved history and stays valid", () => {
  const reading = sampleScanReading(sampleBills, new Date(2026, 9, 5), () => 0.5);
  assert.equal(reading.month, "2026-10");
  assert.equal(reading.dueDate, "2026-11-10");
  assert.equal(reading.source, "scan");
  assert.equal(validateBill(reading), null);
  assert.equal(sampleScanReading([], new Date(2026, 9, 5), () => 0).month, "2026-10");
});
test("sample household records are valid and appliance kinds are guessed from names", () => {
  assert.ok(sampleBills.every(bill => validateBill(bill) === null));
  assert.ok(sampleAppliances.every(item => validateAppliance(item) === null));
  assert.equal(guessApplianceKind("Split type aircon"), "aircon");
  assert.equal(guessApplianceKind("Kitchen Refrigerator"), "fridge");
  assert.equal(guessApplianceKind("Water pump"), "other");
  assert.ok(validateBill({ month: "2026-10", amount: 10, kwh: 1, dueDate: "2026-13-40" }));
});
