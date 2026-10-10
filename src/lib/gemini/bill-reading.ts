import type { BillCharge, BillExtractionResult } from "../../contracts/extraction";
import { previewProviders } from "../../features/household-profile/provider-preview";

/**
 * Reading an electricity bill photo with Gemini. The model reads; this file checks the numbers
 * against each other (meter readings vs kWh, charges vs total, subsidy vs amount due) and lists
 * anything the person should look at before saving. Nothing here is saved without review.
 */

export const billReadingInstruction = `You read photos of Philippine electricity bills and receipts and copy the printed values exactly. Accuracy matters more than completeness: if a value is blurred, cut off, folded, covered or not printed, return null for it. Never guess or calculate a value that is not printed.

How to read the numbers:
- Amounts are in the right-hand AMOUNT column. Do not copy the rate column (values like "× 8.4632/kWh").
- Remove "Php", "₱" and thousands commas: "3,072.60" is 3072.60. Keep the decimals exactly as printed.
- Dates: write YYYY-MM-DD. Reading dates are printed MM/DD/YYYY (08/23/2026 is 2026-08-23).

ANTECO (Antique Electric Cooperative, Inc.) receipts, top to bottom:
- "STATEMENT OF ACCOUNT" then the statement date, e.g. "August 23, 2026 (Sun) 8:50:34 AM" → statementDate 2026-08-23.
- "Billing Month: 2026 AUGUST" → billingMonth "2026-08".
- "Mult:" → multiplier.
- The reading table "READING DATE — READING — KWH USED" has two rows. The later date has the present reading; the earlier date has the previous reading. periodStart is the earlier date, periodEnd the later date. kwhUsed is the number under "KWH USED".
- Charge sections, each ending with "SUB-TOTAL": GEN. & TRANS REVENUES, DISTRIBUTION REVENUES, UNIVERSAL CHARGES, OTHER REVENUES. Then GOVERNMENT REVENUES ending with "TOTAL Value Added TAX (VAT)", then "REC RATE".
- "CURRENT MONTH BILL Php …" → currentMonthBill. This is the bill before any subsidy.
- "Provincial Electric Power Subsidy -…" (PEPS) → subsidy as a positive number.
- "AMOUNT DUE Php …" → amountDue (what is left to pay; it can be 0.00).
- "Due Date: September 29, 2026 (Tue)" → dueDate 2026-09-29.

charges: list each section SUB-TOTAL in printed order with short labels: "Generation & transmission", "Distribution", "Universal charges", "Other charges", "VAT", then any other line that adds to the bill such as "RE rate" or "Arrears". Use the amounts exactly as printed. For other utilities (Meralco, MORE Power, ILECO, AKELCO, CAPELCO) use their own section totals the same way.

provider: the short utility name, e.g. "ANTECO", "MORE Power", "ILECO I".
Do not return names, addresses, account numbers or meter numbers.
unreadable: the names of fields you could not read clearly.`;

const text = (description: string) => ({ type: "STRING", nullable: true, description });
const number = (description: string) => ({ type: "NUMBER", nullable: true, description });
const order = ["provider", "billingMonth", "statementDate", "periodStart", "periodEnd", "previousReading", "presentReading", "multiplier", "kwhUsed", "charges", "currentMonthBill", "subsidy", "amountDue", "dueDate", "unreadable", "notes"];

/** Gemini response schema, so the answer is always the same JSON shape. */
export const billResponseSchema = {
  type: "OBJECT",
  properties: {
    provider: text("Utility short name"),
    billingMonth: text("YYYY-MM"),
    statementDate: text("YYYY-MM-DD"),
    periodStart: text("Earlier reading date, YYYY-MM-DD"),
    periodEnd: text("Later reading date, YYYY-MM-DD"),
    previousReading: number("Previous meter reading"),
    presentReading: number("Present meter reading"),
    multiplier: number("Meter multiplier"),
    kwhUsed: number("kWh used"),
    charges: { type: "ARRAY", items: { type: "OBJECT", properties: { label: { type: "STRING" }, amount: { type: "NUMBER" } }, required: ["label", "amount"] } },
    currentMonthBill: number("Current month bill before subsidy, pesos"),
    subsidy: number("Subsidy deducted, positive pesos"),
    amountDue: number("Amount due after subsidy, pesos"),
    dueDate: text("YYYY-MM-DD"),
    unreadable: { type: "ARRAY", items: { type: "STRING" } },
    notes: text("Anything unclear"),
  },
  required: ["provider", "billingMonth", "kwhUsed", "currentMonthBill", "charges"],
  propertyOrdering: order,
};

const money = (value: number) => Math.round(value * 100) / 100;
const peso = (value: number) => `₱${value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const plain = (value: number) => Number(value.toFixed(2)).toLocaleString("en-PH");

export function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/php|₱|kwh|,|\s/gi, "");
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  return Number(cleaned);
}

const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const isCalendar = (year: number, month: number, day: number) => {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};
const iso = (year: number, month: number, day: number) => isCalendar(year, month, day) ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` : null;

/** YYYY-MM-DD from "2026-08-23", "08/23/2026" or "August 23, 2026 (Sun)". */
export function toDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  let match = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) return iso(+match[1], +match[2], +match[3]);
  match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) return iso(+match[3], +match[1], +match[2]);
  match = raw.toLowerCase().match(/^([a-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})/);
  if (match) { const month = months.findIndex(name => name.startsWith(match![1].slice(0, 3))) + 1; return month ? iso(+match[3], month, +match[2]) : null; }
  return null;
}

/** YYYY-MM from "2026-08" or "2026 AUGUST". */
export function toMonth(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim().toLowerCase();
  let match = raw.match(/^(\d{4})-(\d{1,2})$/);
  if (match && +match[2] >= 1 && +match[2] <= 12) return `${match[1]}-${match[2].padStart(2, "0")}`;
  match = raw.match(/^(\d{4})\s+([a-z]+)$/) ?? raw.match(/^([a-z]+)\s+(\d{4})$/);
  if (match) {
    const [year, name] = /^\d/.test(match[1]) ? [match[1], match[2]] : [match[2], match[1]];
    const month = months.findIndex(item => item.startsWith(name.slice(0, 3))) + 1;
    return month ? `${year}-${String(month).padStart(2, "0")}` : null;
  }
  return null;
}

/** WattSnap provider id for a printed utility name, when it is one of the listed ones. */
export function providerIdFor(name: string | null): string | null {
  if (!name) return null;
  const value = name.toLowerCase();
  if (/anteco|antique electric/.test(value)) return "anteco";
  if (/akelco|aklan/.test(value)) return "akelco";
  if (/capelco|capiz/.test(value)) return "capelco";
  if (/more\s*power|more electric/.test(value)) return "more-power";
  const ileco = value.match(/ileco\s*(iii|ii|i|3|2|1)\b/);
  if (ileco) return { i: "ileco-1", "1": "ileco-1", ii: "ileco-2", "2": "ileco-2", iii: "ileco-3", "3": "ileco-3" }[ileco[1]] ?? null;
  return previewProviders.find(provider => provider.name.toLowerCase() === value)?.id ?? null;
}

function chargesFrom(value: unknown): BillCharge[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(item => {
    if (!item || typeof item !== "object") return [];
    const label = typeof (item as BillCharge).label === "string" ? (item as BillCharge).label.trim().slice(0, 40) : "";
    const amount = toNumber((item as BillCharge).amount);
    return label && amount !== null && Math.abs(amount) < 1_000_000 ? [{ label, amount: money(amount) }] : [];
  }).slice(0, 12);
}

const positive = (value: number | null) => value !== null && value > 0 ? value : null;

/** Turns Gemini's JSON into checked bill values plus a list of things to double-check. */
export function readBillReading(raw: unknown, now = new Date()): BillExtractionResult {
  const data = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const checks: string[] = [];
  const provider = typeof data.provider === "string" && data.provider.trim() ? data.provider.trim().slice(0, 60) : null;
  const periodDates = [toDate(data.periodStart), toDate(data.periodEnd)].filter((date): date is string => !!date).sort();
  const [periodStart, periodEnd] = periodDates.length === 2 ? periodDates : [null, null];
  const billingDate = toDate(data.statementDate ?? data.billingDate);
  const dueDate = toDate(data.dueDate);
  let billingMonth = toMonth(data.billingMonth);
  if (!billingMonth && (periodEnd || billingDate)) { billingMonth = (periodEnd ?? billingDate)!.slice(0, 7); checks.push("The billing month was taken from the reading date. Check it."); }

  const previousReading = toNumber(data.previousReading);
  const presentReading = toNumber(data.presentReading);
  const multiplier = positive(toNumber(data.multiplier));
  let kwh = positive(toNumber(data.kwhUsed ?? data.consumptionKwh));
  if (previousReading !== null && presentReading !== null && presentReading > previousReading) {
    const fromMeter = money((presentReading - previousReading) * (multiplier ?? 1));
    if (kwh === null) { kwh = fromMeter; checks.push(`kWh was worked out from the meter readings (${plain(presentReading)} − ${plain(previousReading)}).`); }
    else if (Math.abs(kwh - fromMeter) > 0.5) checks.push(`The kWh reads ${plain(kwh)}, but the meter readings give ${plain(fromMeter)}. Check the kWh.`);
  }

  const charges = chargesFrom(data.charges);
  const chargesTotal = money(charges.reduce((sum, item) => sum + item.amount, 0));
  // Older answers used amountDue for the bill; the schema separates the bill from what is left to pay.
  const hasBill = "currentMonthBill" in data;
  let amount = positive(toNumber(hasBill ? data.currentMonthBill : data.amountDue));
  if (amount === null && charges.length >= 3 && chargesTotal > 0) { amount = chargesTotal; checks.push("The bill total was added up from the charges. Check it."); }
  else if (amount !== null && charges.length >= 2 && Math.abs(chargesTotal - amount) > 1) checks.push(`The charges add up to ${peso(chargesTotal)}, not ${peso(amount)}. Check the current month bill.`);

  let subsidy = toNumber(data.subsidy);
  subsidy = subsidy === null || subsidy === 0 ? null : money(Math.abs(subsidy));
  const payable = hasBill ? toNumber(data.amountDue) : null;
  if (subsidy !== null && amount !== null && subsidy > amount) { subsidy = amount; checks.push("The subsidy was larger than the bill, so it was set to the bill amount."); }
  if (subsidy !== null && amount !== null && payable !== null && payable >= 0 && Math.abs(amount - subsidy - payable) > 1) checks.push(`The bill minus the subsidy is ${peso(money(amount - subsidy))}, but the amount due reads ${peso(payable)}. Check the subsidy.`);
  if (subsidy === null && amount !== null && payable !== null && payable >= 0 && amount - payable > 1) checks.push(`The amount due (${peso(payable)}) is lower than the bill. If there is a subsidy, enter it.`);

  if (billingDate && dueDate && dueDate < billingDate) checks.push("The due date is before the statement date. Check both dates.");
  if (billingMonth) {
    const limit = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString().slice(0, 7);
    if (billingMonth > limit) checks.push("The billing month is in the future. Check it.");
  }

  const unknownFields = [!billingMonth && "billingMonth", kwh === null && "consumptionKwh", amount === null && "amountDue", !dueDate && "dueDate"].filter((field): field is string => !!field);
  const unreadable = Array.isArray(data.unreadable) ? data.unreadable.filter((item): item is string => typeof item === "string").slice(0, 10) : [];
  const notes = typeof data.notes === "string" && data.notes.trim() ? data.notes.trim().slice(0, 300) : null;

  return {
    reviewRequired: true,
    unknownFields: [...new Set([...unknownFields, ...unreadable])],
    provider, providerId: providerIdFor(provider),
    billingMonth, periodStart, periodEnd, billingDate, dueDate,
    amountDue: amount, subsidy, amountPayable: payable !== null && payable >= 0 ? money(payable) : null,
    consumptionKwh: kwh, previousReading, presentReading, multiplier,
    charges, checks, notes,
  };
}
