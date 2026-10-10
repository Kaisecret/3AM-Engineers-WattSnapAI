import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
registerHooks({ resolve(specifier, context, nextResolve) {
  try { return nextResolve(specifier, context); }
  catch (error) { if (error.code === "ERR_MODULE_NOT_FOUND" && specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) return nextResolve(`${specifier}.ts`, context); throw error; }
} });
const { billResponseSchema, providerIdFor, readBillReading, toDate, toMonth, toNumber } = await import("./bill-reading.ts");
const now = new Date("2026-10-10T00:00:00Z");

// ANTECO receipt, August 2026 (photo cut off below CURRENT MONTH BILL).
const august = {
  provider: "ANTECO", billingMonth: "2026-08", statementDate: "2026-08-23", periodStart: "2026-07-23", periodEnd: "2026-08-23",
  previousReading: 10802, presentReading: 10994, multiplier: 1, kwhUsed: 192,
  charges: [{ label: "Generation & transmission", amount: 2174.37 }, { label: "Distribution", amount: 480.27 }, { label: "Universal charges", amount: 126.24 }, { label: "Other charges", amount: 2.21 }, { label: "VAT", amount: 287.01 }, { label: "RE rate", amount: 2.5 }],
  currentMonthBill: 3072.6, subsidy: null, amountDue: null, dueDate: null, unreadable: ["dueDate"], notes: null,
};
// ANTECO receipt, September 2026: fully covered by the ₱500 PEPS.
const september = {
  provider: "Antique Electric Cooperative, Inc.", billingMonth: "2026 SEPTEMBER", statementDate: "September 21, 2026", periodStart: "08/23/2026", periodEnd: "09/21/2026",
  kwhUsed: 33, charges: [{ label: "Generation & transmission", amount: 293.11 }, { label: "Distribution", amount: 69.96 }, { label: "Universal charges", amount: 17.09 }, { label: "Other charges", amount: 0.3 }, { label: "VAT", amount: 38.05 }, { label: "RE rate", amount: 0.34 }],
  currentMonthBill: "418.85", subsidy: -418.85, amountDue: "0.00", dueDate: "September 29, 2026 (Tue)",
};

test("a correct August reading passes every check", () => {
  const result = readBillReading(august, now);
  assert.deepEqual(result.checks, []);
  assert.equal(result.providerId, "anteco");
  assert.equal(result.billingMonth, "2026-08");
  assert.equal(result.consumptionKwh, 192);
  assert.equal(result.amountDue, 3072.6);
  assert.deepEqual([result.periodStart, result.periodEnd, result.billingDate], ["2026-07-23", "2026-08-23", "2026-08-23"]);
  assert.equal(result.charges.length, 6);
  assert.ok(result.unknownFields.includes("dueDate"));
});

test("a September receipt with the PEPS subsidy reads as fully covered", () => {
  const result = readBillReading(september, now);
  assert.deepEqual(result.checks, []);
  assert.equal(result.providerId, "anteco");
  assert.equal(result.billingMonth, "2026-09");
  assert.deepEqual([result.amountDue, result.subsidy, result.amountPayable], [418.85, 418.85, 0]);
  assert.equal(result.dueDate, "2026-09-29");
  assert.deepEqual([result.periodStart, result.periodEnd], ["2026-08-23", "2026-09-21"]);
});

test("a misread kWh is caught by the meter readings", () => {
  const result = readBillReading({ ...august, kwhUsed: 162 }, now);
  assert.match(result.checks.join(" "), /reads 162, but the meter readings give 192/);
  const missing = readBillReading({ ...august, kwhUsed: null }, now);
  assert.equal(missing.consumptionKwh, 192, "worked out from the readings when not printed");
});

test("a misread total is caught by the charges", () => {
  const result = readBillReading({ ...august, currentMonthBill: 3012.6 }, now);
  assert.match(result.checks.join(" "), /charges add up to ₱3,072\.60, not ₱3,012\.60/);
  const missing = readBillReading({ ...august, currentMonthBill: null }, now);
  assert.equal(missing.amountDue, 3072.6); assert.match(missing.checks.join(" "), /added up from the charges/);
});

test("a subsidy that does not match the amount due is flagged, and never exceeds the bill", () => {
  assert.match(readBillReading({ ...september, subsidy: 400 }, now).checks.join(" "), /Check the subsidy/);
  const capped = readBillReading({ ...september, subsidy: 500, amountDue: 0 }, now);
  assert.equal(capped.subsidy, 418.85); assert.match(capped.checks.join(" "), /larger than the bill/);
  assert.match(readBillReading({ ...september, subsidy: null }, now).checks.join(" "), /If there is a subsidy, enter it/);
});

test("the amount due is never saved as the bill, and odd dates are flagged", () => {
  const unread = readBillReading({ ...september, currentMonthBill: null, charges: [] }, now);
  assert.equal(unread.amountDue, null, "₱0.00 left to pay is not the bill amount");
  assert.ok(unread.unknownFields.includes("amountDue"));
  assert.match(readBillReading({ ...august, dueDate: "2026-08-01" }, now).checks.join(" "), /before the statement date/);
  assert.match(readBillReading({ ...august, billingMonth: "2027-05" }, now).checks.join(" "), /future/);
  const noMonth = readBillReading({ ...august, billingMonth: null }, now);
  assert.equal(noMonth.billingMonth, "2026-08"); assert.match(noMonth.checks.join(" "), /taken from the reading date/);
});

test("printed formats are converted, and personal details are never part of the result", () => {
  assert.equal(toNumber("Php 3,072.60"), 3072.6); assert.equal(toNumber("-418.85"), -418.85); assert.equal(toNumber("12abc"), null);
  assert.equal(toDate("08/23/2026"), "2026-08-23"); assert.equal(toDate("September 29, 2026 (Tue)"), "2026-09-29"); assert.equal(toDate("02/30/2026"), null);
  assert.equal(toMonth("2026 AUGUST"), "2026-08"); assert.equal(toMonth("2026-13"), null);
  assert.equal(providerIdFor("ILECO II"), "ileco-2"); assert.equal(providerIdFor("MORE Power"), "more-power"); assert.equal(providerIdFor("Meralco"), null);
  const result = readBillReading({ ...august, accountName: "JUAN DELA CRUZ", meterNumber: "801299478" }, now);
  assert.doesNotMatch(JSON.stringify(result), /JUAN|801299478/);
  assert.ok(!("accountName" in billResponseSchema.properties) && !("meterNumber" in billResponseSchema.properties));
});
