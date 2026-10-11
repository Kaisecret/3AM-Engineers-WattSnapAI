import { isCalendarDate, shiftMonth, sortBillsByMonth, type PreviewBill } from "./preview-data";
import { isExampleRecord } from "./local-records";

export interface NextMonthForecast {
  month: string;
  method: "seasonal" | "recent-average" | "latest-bill" | "insufficient";
  kwh: number | null;
  amount: number | null;
  unit: "kwh-month" | "kwh-30-days";
  billCount: number;
  baseYear: number | null;
  basisMonths: string[];
  adjustmentMonths: string[];
  scale: number;
  rate: number | null;
  rateMonth: string | null;
  notes: string[];
}

export function manilaMonth(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit" }).formatToParts(now);
  return `${parts.find(part => part.type === "year")!.value}-${parts.find(part => part.type === "month")!.value}`;
}

const periodDays = (bill: PreviewBill) => bill.periodStart && bill.periodEnd
  ? (Date.parse(bill.periodEnd) - Date.parse(bill.periodStart)) / 86_400_000 + 1 : null;

/** A local planning baseline; display filters never change its input history. */
export function forecastNextMonth(bills: PreviewBill[], now = new Date()): NextMonthForecast {
  const current = manilaMonth(now);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const currentYear = Number(current.slice(0, 4));
  const notes = ["Estimated use, not a guaranteed bill. Weather, habits and new appliances can change it.", "Peso cost assumes the recorded rate stays the same, before subsidy. Future rates and charges may change."];
  const candidates = bills.filter(bill => {
    if (isExampleRecord(bill) || !/^\d{4}-(0[1-9]|1[0-2])$/.test(bill.month) || bill.month.startsWith("0000") || bill.month > current || !Number.isFinite(bill.kwh) || bill.kwh <= 0) return false;
    if (bill.billingDate && (!isCalendarDate(bill.billingDate) || bill.billingDate > today)) return false;
    if ((bill.periodStart && (!isCalendarDate(bill.periodStart) || bill.periodStart > today)) || (bill.periodEnd && (!isCalendarDate(bill.periodEnd) || bill.periodEnd > today))) return false;
    return !(bill.periodStart && bill.periodEnd && bill.periodStart > bill.periodEnd);
  });
  const counts = new Map<string, number>();
  candidates.forEach(bill => counts.set(bill.month, (counts.get(bill.month) ?? 0) + 1));
  const conflicts = new Set<string>();
  for (let i = 0; i < candidates.length; i++) for (let j = i + 1; j < candidates.length; j++) {
    const a = candidates[i], b = candidates[j];
    // Consecutive meter-reading periods may share a boundary date.
    if (a.periodStart && a.periodEnd && b.periodStart && b.periodEnd && a.periodStart < b.periodEnd && b.periodStart < a.periodEnd) {
      conflicts.add(a.id); conflicts.add(b.id);
    }
  }
  if ([...counts.values()].some(count => count > 1)) notes.push("Duplicate billing months were excluded. Review those receipts.");
  if (conflicts.size) notes.push("Overlapping billing periods were excluded. Review their dates.");
  const usable = sortBillsByMonth(candidates.filter(bill => counts.get(bill.month) === 1 && !conflicts.has(bill.id)));
  const normalized = usable.length > 0 && usable.every(bill => { const days = periodDays(bill); return days !== null && days >= 20 && days <= 40; });
  const energy = (bill: PreviewBill) => normalized ? bill.kwh * 30 / periodDays(bill)! : bill.kwh;
  if (!normalized) notes.push("Uses billing-month totals. Missing or unusual period lengths can make monthly comparisons approximate.");
  const latest = usable.at(-1);
  const rateBill = usable.filter(bill => Number.isFinite(bill.amount) && bill.amount > 0 && Number.isFinite(bill.amount / bill.kwh)).at(-1);
  const result: NextMonthForecast = {
    month: shiftMonth(current, 1), method: "insufficient", kwh: null, amount: null,
    unit: normalized ? "kwh-30-days" : "kwh-month", billCount: usable.length, baseYear: null,
    basisMonths: [], adjustmentMonths: [], scale: 1,
    rate: rateBill ? rateBill.amount / rateBill.kwh : null, rateMonth: rateBill?.month ?? null, notes,
  };
  const completeYear = [currentYear, currentYear - 1].find(year => usable.filter(bill => bill.month.startsWith(`${year}-`)).length === 12);
  let estimate: number;
  if (completeYear !== undefined) {
    const baseline = usable.filter(bill => bill.month.startsWith(`${completeYear}-`));
    const matching = baseline.find(bill => bill.month.slice(5) === result.month.slice(5))!;
    result.method = "seasonal"; result.baseYear = completeYear; result.basisMonths = [matching.month];
    const pairs = usable.filter(bill => Number(bill.month.slice(0, 4)) > completeYear).slice(-3);
    if (pairs.length === 3) {
      const ratios = pairs.map(bill => energy(bill) / energy(baseline.find(prior => prior.month.slice(5) === bill.month.slice(5))!)).sort((a, b) => a - b);
      if (Number.isFinite(ratios[1]) && ratios[1] > 0 && ratios[1] <= 10) {
        result.scale = ratios[1]; result.adjustmentMonths = pairs.map(bill => bill.month);
      } else notes.push("The recorded usage shift is unusually large. Review the readings; the seasonal baseline is unchanged.");
    }
    estimate = energy(matching) * result.scale;
    notes.push("One complete year supplies a seasonal baseline; it does not establish a recurring seasonal pattern.");
  } else {
    const recent = usable.filter(bill => bill.month >= shiftMonth(current, -2));
    if (recent.length === 3) {
      result.method = "recent-average"; result.basisMonths = recent.map(bill => bill.month);
      estimate = recent.reduce((sum, bill) => sum + energy(bill), 0) / recent.length;
      notes.push("A recent average cannot establish a yearly seasonal pattern. Add all months from last year for a seasonal baseline.");
    } else if (recent.length) {
      const starting = recent.at(-1)!;
      result.method = "latest-bill"; result.basisMonths = [starting.month]; estimate = energy(starting);
      notes.push("A starting estimate only. Save three recent months for an average, or a complete last year for a seasonal baseline.");
    } else {
      notes.push("Save a recent bill or all twelve months from last year to estimate next month's use.");
      return result;
    }
  }
  if (latest && latest.month < shiftMonth(current, -2)) notes.push("Your latest bill is older than three months. Add recent bills to update the estimate and rate.");
  if (!Number.isFinite(estimate) || estimate <= 0 || !Number.isFinite(estimate * 10)) {
    result.method = "insufficient"; notes.push("The estimate is too large to display. Review your readings."); return result;
  }
  result.kwh = Math.round(estimate * 10) / 10;
  const amount = result.rate !== null ? estimate * result.rate : null;
  result.amount = amount !== null && Number.isFinite(amount * 100) ? Math.round(amount * 100) / 100 : null;
  return result;
}
