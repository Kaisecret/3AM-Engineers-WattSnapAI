import type { PreviewHousehold } from "../dashboard/preview-data";
import { advisoryTab, householdMatchSignature, matchIsStale, matchPreviewAdvisory, publishedStart } from "./review-preview";
import type { ReviewedAdvisory } from "./types";

export const advisoryPreparationItems = [
  { id: "charge", title: "Charge phones and power banks" },
  { id: "lights", title: "Prepare flashlights or emergency lights" },
  { id: "unplug", title: "Unplug sensitive appliances" },
  { id: "fridge", title: "Keep the refrigerator closed" },
  { id: "water", title: "Store drinking water" },
] as const;
export type AdvisoryPreparationId = typeof advisoryPreparationItems[number]["id"];
export interface AdvisoryPreparationProgress { key: string; checked: AdvisoryPreparationId[]; updatedAt: string; }
export const preparationStorageKey = "wattsnap-advisory-checklists-ui-v1";
export const preparationChangeEvent = "wattsnap-advisory-checklists-change";

export function preparationKey(record: ReviewedAdvisory, household: PreviewHousehold) {
  return JSON.stringify([record.id, record.revision, householdMatchSignature(household)]);
}
export function preparationEligible(record: ReviewedAdvisory, household: PreviewHousehold, now = new Date()) {
  return advisoryTab(record, now) === "active" && ["scheduled", "unscheduled"].includes(record.details.type) && matchPreviewAdvisory(record.details, household).status === "affected" && !matchIsStale(record, household);
}
export function parsePreparationProgress(raw: string | null): AdvisoryPreparationProgress[] {
  if (raw === null) return [];
  const data: unknown = JSON.parse(raw);
  if (!data || typeof data !== "object" || !("version" in data) || data.version !== 1 || !("entries" in data) || !Array.isArray(data.entries) || data.entries.length > 200) throw new Error("Invalid checklist history");
  const entries: AdvisoryPreparationProgress[] = [];
  for (const value of data.entries) {
    if (!value || typeof value !== "object" || typeof value.key !== "string" || value.key.length > 3000 || !Array.isArray(value.checked) || value.checked.length > advisoryPreparationItems.length || new Set(value.checked).size !== value.checked.length || value.checked.some((id: unknown) => !advisoryPreparationItems.some(item => item.id === id)) || typeof value.updatedAt !== "string" || !Number.isFinite(Date.parse(value.updatedAt))) throw new Error("Invalid checklist progress");
    const key: unknown = JSON.parse(value.key);
    if (!Array.isArray(key) || key.length !== 3 || typeof key[0] !== "string" || !key[0] || !Number.isInteger(key[1]) || key[1] < 1 || typeof key[2] !== "string" || !key[2]) throw new Error("Invalid checklist basis");
    entries.push({ key: value.key, checked: [...value.checked], updatedAt: value.updatedAt });
  }
  if (new Set(entries.map(entry => entry.key)).size !== entries.length) throw new Error("Duplicate checklist basis");
  return entries;
}
export function pendingPreparation(records: ReviewedAdvisory[], entries: AdvisoryPreparationProgress[], household: PreviewHousehold, now = new Date()) {
  return records.filter(record => preparationEligible(record, household, now)).map(record => {
    const progress = entries.find(entry => entry.key === preparationKey(record, household));
    return { record, checked: progress?.checked ?? [], updatedAt: progress?.updatedAt ?? "" };
  }).filter(item => item.checked.length < advisoryPreparationItems.length).sort((a, b) => {
    const recent = (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0);
    return recent || (publishedStart(a.record.details) ?? Infinity) - (publishedStart(b.record.details) ?? Infinity) || a.record.id.localeCompare(b.record.id);
  })[0];
}
