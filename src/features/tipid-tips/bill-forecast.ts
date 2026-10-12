import type { PreviewBill } from "../dashboard/preview-data";

export interface ForecastMonth {
  month: number;
  kwh: number | null;
  amount: number | null;
  direction: "up" | "down" | "steady" | "unknown";
  history: Array<{ year: number; kwh: number }>;
}
export interface BillForecast {
  version: "seasonal-v1";
  status: "ready" | "insufficient";
  targetYear: number;
  baseYear: number | null;
  receiptCount: number;
  completeYears: number[];
  matchedMonths: number;
  scale: number;
  unit: "kwh-month" | "kwh-30-days";
  effectiveRate: number | null;
  rateMonths: string[];
  peakMonth: number | null;
  lowMonth: number | null;
  limitations: string[];
  months: ForecastMonth[];
}

const round = (n: number) => Math.round(n * 10) / 10;
const median = (values: number[]) => { const ordered = [...values].sort((a,b) => a-b); const i = Math.floor(ordered.length/2); return ordered.length % 2 ? ordered[i] : (ordered[i-1] + ordered[i]) / 2; };
const validDate = (date: unknown): date is string => typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0,10) === date;
// Scanner periods are earlier/later meter-reading dates: adjacent periods share a boundary.
const days = (bill: PreviewBill) => bill.periodStart && bill.periodEnd ? (Date.parse(bill.periodEnd) - Date.parse(bill.periodStart)) / 86400000 : null;
export const forecastMonthName = (month: number, short = false) => new Intl.DateTimeFormat("en-PH", { month: short ? "short" : "long", timeZone: "UTC" }).format(new Date(Date.UTC(2000,month-1,1)));
export const forecastTargetYear = (now = new Date()) => Number(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric" }).format(now)) + 1;

/** A transparent seasonal planning baseline. Gemini explains it; it cannot alter these numbers. */
export function buildBillForecast(bills: PreviewBill[], now = new Date()): BillForecast {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const currentYear = Number(date.slice(0,4)), currentMonth = date.slice(0,7);
  const limitations = ["Actual use may differ from the estimated historical pattern. Weather, household habits, and new appliances can change it.", "Peso estimates keep your recent recorded cost per kWh unchanged, before subsidies. Future rates, fixed charges, and subsidies may change what you pay."];
  const candidates = bills.filter(bill => {
    if (!bill || typeof bill.id !== "string" || bill.source === "sample" || bill.id.startsWith("sample-")) return false;
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(bill.month) || bill.month > currentMonth || Number(bill.month.slice(0,4)) < currentYear-2 || !Number.isFinite(bill.kwh) || bill.kwh < 0) return false;
    if ((bill.periodStart !== undefined && !validDate(bill.periodStart)) || (bill.periodEnd !== undefined && !validDate(bill.periodEnd))) return false;
    if ((bill.periodStart && bill.periodStart > date) || (bill.periodEnd && bill.periodEnd > date) || (bill.periodStart && bill.periodEnd && bill.periodStart > bill.periodEnd)) return false;
    return true;
  });
  const counts = new Map<string,number>(); candidates.forEach(bill => counts.set(bill.month, (counts.get(bill.month) ?? 0) + 1));
  const duplicate = candidates.some(bill => counts.get(bill.month)! > 1);
  const conflicts = new Set<string>();
  for (let i = 0; i < candidates.length; i++) for (let j = i+1; j < candidates.length; j++) {
    const a = candidates[i], b = candidates[j];
    if (a.periodStart && a.periodEnd && b.periodStart && b.periodEnd && a.periodStart < b.periodEnd && b.periodStart < a.periodEnd) { conflicts.add(a.id); conflicts.add(b.id); }
  }
  if (duplicate) limitations.push("Duplicate billing months were excluded. Review those receipts before forecasting.");
  if (conflicts.size) limitations.push("Overlapping billing periods were excluded. Review their dates.");
  const usable = candidates.filter(bill => counts.get(bill.month) === 1 && !conflicts.has(bill.id)).sort((a,b) => a.month.localeCompare(b.month));
  const normalized = usable.length > 0 && usable.every(bill => { const length = days(bill); return length !== null && length >= 20 && length <= 40; });
  if (!normalized) limitations.push("Billing periods are missing or vary outside 20–40 days. Monthly totals are approximate comparisons; check the receipt dates.");
  const years = [...new Set(usable.map(b => Number(b.month.slice(0,4))))].sort((a,b) => a-b);
  const completeYears = years.filter(year => usable.filter(b => Number(b.month.slice(0,4)) === year).length === 12);
  const baseYear = completeYears.filter(year => year >= currentYear-1).at(-1) ?? null;
  const value = (bill: PreviewBill) => normalized ? bill.kwh * 30 / days(bill)! : bill.kwh;
  const rateBills = usable.filter(b => b.kwh > 0 && Number.isFinite(b.amount) && b.amount > 0).slice(-3);
  const effectiveRate = rateBills.length ? rateBills.reduce((total,b) => total+b.amount,0) / rateBills.reduce((total,b) => total+b.kwh,0) : null;
  const months: ForecastMonth[] = Array.from({ length: 12 }, (_,i) => ({ month: i+1, kwh: null, amount: null, direction: "unknown", history: usable.filter(b => Number(b.month.slice(5)) === i+1).map(b => ({ year: Number(b.month.slice(0,4)), kwh: round(value(b)) })) }));
  const result: BillForecast = { version: "seasonal-v1", status: "insufficient", targetYear: currentYear+1, baseYear, receiptCount: usable.length, completeYears, matchedMonths: 0, scale: 1, unit: normalized ? "kwh-30-days" : "kwh-month", effectiveRate, rateMonths: rateBills.map(b => b.month), peakMonth: null, lowMonth: null, limitations, months };
  if (baseYear === null) { limitations.push("Add all 12 months from last year or this year to estimate an annual pattern. Missing months are never treated as zero."); return result; }
  const base = usable.filter(b => Number(b.month.slice(0,4)) === baseYear);
  if (base.every(b => b.kwh === 0)) { limitations.push("The complete year has zero recorded consumption. Review those readings before estimating future use."); return result; }
  const latestYear = years.at(-1)!;
  if (latestYear > baseYear) {
    const ratios = usable.filter(b => Number(b.month.slice(0,4)) === latestYear).flatMap(b => { const prior = base.find(p => p.month.slice(5) === b.month.slice(5))!; return value(prior) > 0 ? [value(b)/value(prior)] : []; });
    result.matchedMonths = ratios.length;
    if (ratios.length >= 3) {
      const scale = median(ratios);
      if (Number.isFinite(scale) && scale > 0 && scale <= 10) result.scale = scale;
      else limitations.push("The usage shift is zero or unusually large. Review the readings; the forecast repeats the complete year without adjustment.");
    } else limitations.push("At least three matching months with positive prior usage are needed to adjust next year's pattern to this year's use.");
  }
  if (completeYears.length === 1) limitations.push("Only one complete year is available. Repeating its shape does not establish a recurring seasonal pattern.");
  result.status = "ready";
  months.forEach((month,i) => {
    const estimate = value(base[i]) * result.scale;
    month.kwh = round(estimate);
    month.amount = effectiveRate !== null ? Math.round(month.kwh * effectiveRate) : null;
    const previous = value(base[(i+11)%12]) * result.scale;
    const difference = estimate - previous;
    month.direction = Math.abs(difference) <= Math.max(previous * .05, 1) ? "steady" : difference > 0 ? "up" : "down";
  });
  const values = months.map(m => m.kwh!);
  if (Math.max(...values) - Math.min(...values) > Math.max(Math.max(...values)*.05, 1)) {
    result.peakMonth = values.indexOf(Math.max(...values))+1;
    result.lowMonth = values.indexOf(Math.min(...values))+1;
  }
  return result;
}

export function normalizeBillForecast(value: unknown): BillForecast | null {
  if (!value || typeof value !== "object") return null;
  const f = value as BillForecast;
  const integer = (v: unknown, min: number, max: number): v is number => typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
  const energy = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1e12;
  const monthOrNull = (v: unknown) => v === null || integer(v,1,12);
  if (f.version !== "seasonal-v1" || !["ready","insufficient"].includes(f.status) || !integer(f.targetYear,2000,9999) || (f.baseYear !== null && !integer(f.baseYear,1999,f.targetYear-1)) || !integer(f.receiptCount,0,120) || !integer(f.matchedMonths,0,12) || !Number.isFinite(f.scale) || f.scale <= 0 || f.scale > 10 || !["kwh-month","kwh-30-days"].includes(f.unit) || !monthOrNull(f.peakMonth) || !monthOrNull(f.lowMonth) || !Array.isArray(f.completeYears) || f.completeYears.length > 3 || f.completeYears.some(y => !integer(y,1999,f.targetYear-1)) || !Array.isArray(f.limitations) || f.limitations.length > 20 || f.limitations.some(s => typeof s !== "string" || s.length > 500) || !Array.isArray(f.months) || f.months.length !== 12) return null;
  if (f.months.some((m,i) => !m || m.month !== i+1 || (f.status === "ready" ? !energy(m.kwh) : m.kwh !== null) || !["up","down","steady","unknown"].includes(m.direction) || !Array.isArray(m.history) || m.history.length > 3 || m.history.some(h => !h || !integer(h.year,1999,f.targetYear-1) || !energy(h.kwh)))) return null;
  if ((f.effectiveRate !== null && !energy(f.effectiveRate)) || !Array.isArray(f.rateMonths) || f.rateMonths.length > 3 || f.rateMonths.some(m => typeof m !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(m)) || f.months.some(m => m.amount !== null && !energy(m.amount))) return null;
  if (f.status === "ready" && (f.baseYear === null || !f.completeYears.includes(f.baseYear))) return null;
  return f;
}
