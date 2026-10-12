import type { TipsGenerationRequest } from "../gemini/types";
import type { PreviewHousehold, ApplianceKind } from "../../features/dashboard/preview-data";

const kinds = new Set(["fan", "aircon", "fridge", "tv", "rice-cooker", "washer", "lights", "laptop", "phone", "microwave", "iron", "other"]);
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const text = (v: unknown, max = 120): v is string => typeof v === "string" && !!v.trim() && v.length <= max && !/[\u0000-\u001f]/.test(v);
const number = (v: unknown, max: number): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max;
const date = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;

/** Allowlisted energy inputs only; arbitrary profile properties never reach the model. */
export function readTipsRequest(value: unknown): TipsGenerationRequest | null {
  if (!record(value) || !record(value.household) || !number(value.household.budget ?? 0, 1e9)) return null;
  const bills = value.bills ?? [], appliances = value.appliances ?? [];
  if (!Array.isArray(bills) || bills.length > 120 || !Array.isArray(appliances) || appliances.length > 100) return null;
  const request: TipsGenerationRequest = { household: { name: "Your home", budget: (value.household.budget ?? 0) as number }, bills: [], appliances: [] };
  const billIds = new Set<string>(), applianceIds = new Set<string>();
  for (const bill of bills) {
    if (!record(bill) || !text(bill.id) || billIds.has(bill.id) || typeof bill.month !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(bill.month) || !number(bill.amount, 1e9) || !number(bill.kwh, 1e8)) return null;
    if ((bill.periodStart !== undefined && !date(bill.periodStart)) || (bill.periodEnd !== undefined && !date(bill.periodEnd)) || (bill.periodStart && bill.periodEnd && String(bill.periodStart) > String(bill.periodEnd))) return null;
    if (bill.source !== undefined && !["manual", "scan", "sample"].includes(String(bill.source))) return null;
    billIds.add(bill.id);
    request.bills!.push({ id: bill.id, month: bill.month, amount: bill.amount, kwh: bill.kwh, ...(bill.periodStart ? { periodStart: bill.periodStart as string } : {}), ...(bill.periodEnd ? { periodEnd: bill.periodEnd as string } : {}), ...(bill.source ? { source: bill.source as "manual" | "scan" | "sample" } : {}) });
  }
  for (const item of appliances) {
    if (!record(item) || !text(item.id) || applianceIds.has(item.id) || !text(item.name) || !number(item.watts, 1e6) || !number(item.hours, 24) || !number(item.quantity, 10000) || !Number.isInteger(item.quantity) || item.quantity < 1) return null;
    if ((item.type !== undefined && !kinds.has(String(item.type))) || (item.days !== undefined && (!number(item.days, 366) || !Number.isInteger(item.days) || item.days < 1)) || (item.source !== undefined && !["manual", "sample"].includes(String(item.source))) || (item.wattageBasis !== undefined && !["nameplate", "approximate"].includes(String(item.wattageBasis)))) return null;
    applianceIds.add(item.id);
    request.appliances!.push({ id: item.id, name: item.name, watts: item.watts, hours: item.hours, quantity: item.quantity, ...(item.type ? { type: item.type as ApplianceKind } : {}), ...(item.days !== undefined ? { days: item.days as number } : {}), ...(item.source ? { source: item.source as "manual" | "sample" } : {}), ...(item.wattageBasis ? { wattageBasis: item.wattageBasis as "nameplate" | "approximate" } : {}) });
  }
  return request;
}

export function tipsRequestHousehold(request: TipsGenerationRequest): PreviewHousehold {
  return { name: "Your home", budget: request.household.budget ?? 0, bills: request.bills ?? [], appliances: (request.appliances ?? []).map(({ type, ...item }) => ({ ...item, ...(type ? { kind: type } : {}) })) };
}
