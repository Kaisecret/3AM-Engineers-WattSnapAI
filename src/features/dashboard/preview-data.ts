export interface PreviewBill { id: string; month: string; amount: number; kwh: number; }
export interface PreviewAppliance { id: string; name: string; watts: number; hours: number; quantity: number; }
export interface PreviewHousehold { bills: PreviewBill[]; appliances: PreviewAppliance[]; budget: number; name: string; }

export const emptyPreview: PreviewHousehold = { bills: [], appliances: [], budget: 3500, name: "Kris" };
export const previewStorageKey = "wattsnap-ui-preview-v1";

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
export const pesos = (value: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2 }).format(value);
export const billMonth = (month: string) => new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`));
