import assert from "node:assert/strict";
import test from "node:test";
import { budgetStatus, chartMonths, compareWithPrevious, parseAmount, suggestedBudget, validateBudget, dailyApplianceKwh, guessApplianceKind, isPhotoDataUrl, validateProfile, latestBill, monthlySeries, normalizePreview, sampleAppliances, sampleBills, sampleScanReading, shiftMonth, validateAppliance, validateBill } from "./preview-data.ts";

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

test("bill dates reject nonexistent days and reversed or incomplete periods", () => {
  const bill = { month: "2026-10", amount: 1200, kwh: 100 };
  assert.ok(validateBill({ ...bill, dueDate: "2026-02-29" }));
  assert.ok(validateBill({ ...bill, dueDate: "2026-04-31" }));
  assert.equal(validateBill({ ...bill, dueDate: "2028-02-29" }), null);
  assert.ok(validateBill({ ...bill, periodStart: "2026-09-10" }));
  assert.ok(validateBill({ ...bill, periodStart: "2026-10-10", periodEnd: "2026-09-10" }));
  assert.ok(validateBill({ ...bill, periodStart: "2026-09-31", periodEnd: "2026-10-10" }));
  assert.equal(validateBill({ ...bill, periodStart: "2026-09-10", periodEnd: "2026-10-10" }), null);
  assert.equal(validateBill(bill), null);
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
test("profile fields survive storage only when valid", () => {
  const photo = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
  const kept = normalizePreview({ name: "Maria", photo, email: " maria@gmail.com ", location: " Sibalom, Antique ", provider: "anteco", notifications: { brownouts: false } });
  assert.equal(kept.photo, photo);
  assert.equal(kept.email, "maria@gmail.com");
  assert.equal(kept.location, "Sibalom, Antique");
  assert.deepEqual(kept.notifications, { brownouts: false, billReminders: true, tips: false });
  const dropped = normalizePreview({ name: "Maria", photo: "javascript:alert(1)", email: "not-an-email", provider: "someone-else" });
  assert.equal(dropped.photo, undefined);
  assert.equal(dropped.email, undefined);
  assert.equal(dropped.provider, undefined);
  assert.equal(isPhotoDataUrl("data:image/svg+xml;base64,PHN2Zz4="), false);
});
test("profile validation needs a name and location, and a real email when given", () => {
  assert.equal(validateProfile({ name: "Kris", email: "", location: "San Jose, Antique" }), null);
  assert.ok(validateProfile({ name: " ", email: "", location: "San Jose" }));
  assert.ok(validateProfile({ name: "Kris", email: "kris@", location: "San Jose" }));
  assert.ok(validateProfile({ name: "Kris", email: "", location: "" }));
});
test("monthly charts fill earlier months with marked examples until there are enough bills", () => {
  const one = chartMonths([{ id: "oct", month: "2026-10", amount: 1225.59, kwh: 107 }]);
  assert.equal(one.length, 6);
  assert.deepEqual(one.map(bar => bar.month), ["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"]);
  assert.deepEqual(one.map(bar => bar.example), [true, true, true, true, true, false]);
  assert.equal(one[5].id, "oct");
  assert.ok(one.slice(0, 5).every(bar => bar.kwh > 0 && bar.amount > 0));
  assert.ok(chartMonths([]).every(bar => bar.example));
  assert.ok(chartMonths(sampleBills).every(bar => !bar.example));
});
test("budget helpers suggest, parse, validate, and classify spending", () => {
  assert.equal(suggestedBudget(sampleBills), 1700);
  assert.equal(suggestedBudget([]), null);
  assert.equal(parseAmount("₱ 1,600"), 1600);
  assert.equal(parseAmount("1500.50"), 1500.5);
  assert.ok(Number.isNaN(parseAmount("12a")));
  assert.ok(validateBudget(0));
  assert.ok(validateBudget(250000));
  assert.equal(validateBudget(1600), null);
  assert.equal(budgetStatus(1200, 1600), "on-track");
  assert.equal(budgetStatus(1400, 1600), "near");
  assert.equal(budgetStatus(1700, 1600), "over");
});
