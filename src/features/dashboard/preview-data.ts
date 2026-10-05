export type BillSource = "scan" | "manual" | "sample";
export type ApplianceKind = "fan" | "aircon" | "fridge" | "tv" | "rice-cooker" | "washer" | "lights" | "laptop" | "phone" | "microwave" | "iron" | "other";
export interface PreviewBill { id: string; month: string; amount: number; kwh: number; dueDate?: string; source?: BillSource; }
export interface PreviewAppliance { id: string; name: string; watts: number; hours: number; quantity: number; kind?: ApplianceKind; }
export interface PreviewHousehold { bills: PreviewBill[]; appliances: PreviewAppliance[]; budget: number; name: string; }

export const emptyPreview: PreviewHousehold = { bills: [], appliances: [], budget: 3500, name: "Kris" };
export const previewStorageKey = "wattsnap-ui-preview-v1";
/** Used when a peso estimate needs a rate and no bill history exists yet. */
export const fallbackRate = 11.45;

const sample = (month: string, kwh: number, amount: number, dueDate: string): PreviewBill => ({ id: `sample-${month}`, month, kwh, amount, dueDate, source: "sample" });
/** Example monthly history shown on a first visit so comparisons have something to show. */
export const sampleBills: PreviewBill[] = [
  sample("2026-04", 142, 1626.2, "2026-05-10"),
  sample("2026-05", 158, 1809.1, "2026-06-10"),
  sample("2026-06", 151, 1728.95, "2026-07-10"),
  sample("2026-07", 137, 1568.65, "2026-08-10"),
  sample("2026-08", 121, 1385.45, "2026-09-10"),
  sample("2026-09", 109, 1248.5, "2026-10-10"),
];
export const sampleAppliances: PreviewAppliance[] = [
  { id: "sample-fan", name: "Electric fan", watts: 55, hours: 8, quantity: 2, kind: "fan" },
  { id: "sample-fridge", name: "Refrigerator", watts: 80, hours: 16, quantity: 1, kind: "fridge" },
  { id: "sample-tv", name: "LED television", watts: 60, hours: 5, quantity: 1, kind: "tv" },
  { id: "sample-rice", name: "Rice cooker", watts: 650, hours: 1, quantity: 1, kind: "rice-cooker" },
  { id: "sample-bulbs", name: "LED bulbs", watts: 9, hours: 6, quantity: 5, kind: "lights" },
];
export const samplePreview: PreviewHousehold = { bills: sampleBills, appliances: sampleAppliances, budget: 1600, name: "Kris" };

export const appliancePresets: { kind: ApplianceKind; name: string; watts: number; hours: number }[] = [
  { kind: "fan", name: "Electric fan", watts: 55, hours: 8 },
  { kind: "aircon", name: "Air conditioner", watts: 900, hours: 6 },
  { kind: "fridge", name: "Refrigerator", watts: 80, hours: 16 },
  { kind: "tv", name: "Television", watts: 60, hours: 5 },
  { kind: "rice-cooker", name: "Rice cooker", watts: 650, hours: 1 },
  { kind: "washer", name: "Washing machine", watts: 400, hours: 1 },
  { kind: "lights", name: "LED bulb", watts: 9, hours: 6 },
  { kind: "laptop", name: "Laptop", watts: 65, hours: 6 },
  { kind: "phone", name: "Phone charger", watts: 10, hours: 3 },
  { kind: "microwave", name: "Microwave", watts: 1000, hours: 0.25 },
  { kind: "iron", name: "Flat iron", watts: 1000, hours: 0.5 },
  { kind: "other", name: "", watts: 0, hours: 0 },
];
const kindKeywords: [ApplianceKind, RegExp][] = [
  ["aircon", /air ?con|aircon|\bac\b|split type|window type/i],
  ["fan", /\bfan\b|electric fan|bentilador/i],
  ["fridge", /fridge|refrigerator|\bref\b|freezer/i],
  ["tv", /\btv\b|television/i],
  ["rice-cooker", /rice|cooker/i],
  ["washer", /wash|laundry/i],
  ["lights", /bulb|light|lamp|led/i],
  ["laptop", /laptop|computer|\bpc\b|desktop/i],
  ["phone", /phone|charger|tablet/i],
  ["microwave", /microwave|oven/i],
  ["iron", /\biron\b|plantsa/i],
];
export function guessApplianceKind(name: string): ApplianceKind {
  return kindKeywords.find(([, pattern]) => pattern.test(name))?.[0] ?? "other";
}

export function dailyApplianceKwh(appliance: Pick<PreviewAppliance, "watts" | "hours" | "quantity">) {
  return appliance.watts * appliance.hours * appliance.quantity / 1000;
}
export function validateAppliance(appliance: Omit<PreviewAppliance, "id">) {
  if (!appliance.name.trim()) return "Enter an appliance name.";
  if (!Number.isFinite(appliance.watts) || appliance.watts <= 0) return "Enter a wattage greater than zero.";
  if (!Number.isFinite(appliance.hours) || appliance.hours <= 0 || appliance.hours > 24) return "Daily usage must be between 0 and 24 hours.";
  if (!Number.isInteger(appliance.quantity) || appliance.quantity < 1) return "Quantity must be a whole number of at least 1.";
  return null;
}
export function validateBill(bill: Omit<PreviewBill, "id">) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(bill.month)) return "Choose a valid billing month.";
  if (!Number.isFinite(bill.amount) || bill.amount <= 0) return "Enter a bill amount greater than zero.";
  if (!Number.isFinite(bill.kwh) || bill.kwh <= 0) return "Enter consumption greater than zero.";
  if (bill.dueDate !== undefined && bill.dueDate !== "" && !/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(bill.dueDate)) return "Choose a valid due date.";
  return null;
}
export function normalizePreview(value: unknown): PreviewHousehold {
  if (!value || typeof value !== "object") return emptyPreview;
  const data = value as Partial<PreviewHousehold>;
  return {
    bills: Array.isArray(data.bills) ? data.bills.filter(item => item && typeof item.id === "string" && typeof item.month === "string" && !validateBill(item)) : [],
    appliances: Array.isArray(data.appliances) ? data.appliances.filter(item => item && typeof item.id === "string" && typeof item.name === "string" && !validateAppliance(item)) : [],
    budget: typeof data.budget === "number" && Number.isFinite(data.budget) && data.budget > 0 ? data.budget : 3500,
    name: typeof data.name === "string" && data.name.trim() ? data.name.trim() : "Kris",
  };
}

/** Bills in chronological order. Missing months stay missing rather than becoming zero. */
export function sortBillsByMonth(bills: PreviewBill[]) {
  return [...bills].sort((a, b) => a.month.localeCompare(b.month));
}
export function latestBill(bills: PreviewBill[]): PreviewBill | undefined {
  return sortBillsByMonth(bills)[bills.length - 1];
}
export function monthlySeries(bills: PreviewBill[], count = 6) {
  return sortBillsByMonth(bills).slice(-count);
}
export interface MonthComparison { previous: PreviewBill; kwhChange: number; kwhPercent: number; amountChange: number; amountPercent: number; }
/** Compares a bill with the closest earlier recorded bill. */
export function compareWithPrevious(bills: PreviewBill[], month: string): MonthComparison | null {
  const sorted = sortBillsByMonth(bills);
  const index = sorted.findIndex(bill => bill.month === month);
  if (index <= 0) return null;
  const current = sorted[index];
  const previous = sorted[index - 1];
  return {
    previous,
    kwhChange: current.kwh - previous.kwh,
    kwhPercent: (current.kwh - previous.kwh) / previous.kwh * 100,
    amountChange: current.amount - previous.amount,
    amountPercent: (current.amount - previous.amount) / previous.amount * 100,
  };
}
export function averageKwh(bills: PreviewBill[]) {
  return bills.length ? bills.reduce((sum, bill) => sum + bill.kwh, 0) / bills.length : 0;
}
/** Peso per kWh from the latest bill, used to label appliance cost estimates. */
export function effectiveRate(bills: PreviewBill[]) {
  const latest = latestBill(bills);
  return latest ? latest.amount / latest.kwh : fallbackRate;
}
export function shiftMonth(month: string, delta: number) {
  const [year, value] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, value - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}
export function currentMonth(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
/**
 * Example reading for the scanner preview. AI extraction is not connected, so the
 * values continue the saved history and the person reviews them before saving.
 */
export function sampleScanReading(bills: PreviewBill[], now = new Date(), random = Math.random): Omit<PreviewBill, "id"> {
  const latest = latestBill(bills);
  const month = latest ? shiftMonth(latest.month, 1) : currentMonth(now);
  const kwh = Math.max(1, Math.round((latest?.kwh ?? 120) * (0.9 + random() * 0.16)));
  const amount = Math.round(kwh * effectiveRate(bills) * 100) / 100;
  return { month, kwh, amount, dueDate: `${shiftMonth(month, 1)}-10`, source: "scan" };
}

export const pesos = (value: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2 }).format(value);
export const billMonth = (month: string) => new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`));
export const shortMonth = (month: string) => new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`));
export const monthName = (month: string) => new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`));
export const dueDateLabel = (date: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
