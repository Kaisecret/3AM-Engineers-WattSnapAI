import assert from "node:assert/strict";
import test from "node:test";
import { amountPaid, antiquePepsSubsidy, effectiveRate, monthlySubsidyFor, normalizePreview, subsidyFor, suggestedBudget, validateBill } from "./preview-data.ts";

const august = { month: "2026-08", kwh: 192, amount: 3072.6 };

test("Antique's PEPS covers up to ₱500 and never more than the bill", () => {
  assert.equal(antiquePepsSubsidy, 500);
  assert.equal(subsidyFor(3072.6, 500), 500);
  assert.equal(subsidyFor(418.85, 500), 418.85, "a small bill is fully covered, as on the September receipt");
  assert.equal(subsidyFor(418.85, 0), 0);
});

test("ANTECO households default to ₱500 until they choose their own amount", () => {
  assert.equal(monthlySubsidyFor({ provider: "anteco" }), 500);
  assert.equal(monthlySubsidyFor({ provider: "akelco" }), 0);
  assert.equal(monthlySubsidyFor({ provider: "anteco", monthlySubsidy: 0 }), 0, "0 turns it off");
  assert.equal(monthlySubsidyFor({ provider: "akelco", monthlySubsidy: 300 }), 300);
});

test("what the household pays is the bill minus its recorded subsidy", () => {
  assert.equal(amountPaid({ ...august, subsidy: 500 }), 2572.6);
  assert.equal(amountPaid({ amount: 418.85, subsidy: 418.85 }), 0);
  assert.equal(amountPaid(august), 3072.6, "bills without a subsidy are unchanged");
});

test("the price per kWh uses the full bill, because the subsidy is a fixed monthly amount", () => {
  assert.equal(effectiveRate([{ id: "a", ...august, subsidy: 500 }]).toFixed(2), "16.00");
});

test("a subsidy cannot be negative or larger than the bill", () => {
  assert.equal(validateBill({ ...august, subsidy: 500 }), null);
  assert.ok(validateBill({ ...august, subsidy: 4000 }));
  assert.ok(validateBill({ ...august, subsidy: -1 }));
});

test("the household setting is kept when valid and the budget suggestion uses what was paid", () => {
  assert.equal(normalizePreview({ name: "Santos", bills: [], appliances: [], budget: 0, monthlySubsidy: 500 }).monthlySubsidy, 500);
  assert.equal(normalizePreview({ name: "Santos", bills: [], appliances: [], budget: 0, monthlySubsidy: -5 }).monthlySubsidy, undefined);
  assert.equal(suggestedBudget([{ id: "a", ...august, subsidy: 500 }]), 2800, "₱2,572.60 paid + 5% headroom, rounded up to ₱100");
});
