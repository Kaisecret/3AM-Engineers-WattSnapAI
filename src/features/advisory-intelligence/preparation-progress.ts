import type { PreviewHousehold } from "../dashboard/preview-data";
import { advisoryTab, householdMatchSignature, matchIsStale, matchPreviewAdvisory, normalizeReviewedAdvisory, publishedStart, sampleMatchHousehold } from "./review-preview";
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
export interface SamplePreparationProgress { record: ReviewedAdvisory; checked: AdvisoryPreparationId[]; updatedAt: string; }
export const preparationStorageKey = "wattsnap-advisory-checklists-ui-v1";
export const preparationChangeEvent = "wattsnap-advisory-checklists-change";

export function preparationKey(record: ReviewedAdvisory, household: PreviewHousehold) {
  return JSON.stringify([record.id, record.revision, householdMatchSignature(household)]);
}
export function preparationEligible(record: ReviewedAdvisory, household: PreviewHousehold, now = new Date()) {
  return advisoryTab(record, now) === "active" && ["scheduled", "unscheduled"].includes(record.details.type) && matchPreviewAdvisory(record.details, household).status === "affected" && !matchIsStale(record, household);
}
function validCheckedItems(value: unknown): value is AdvisoryPreparationId[] {
  return Array.isArray(value) && value.length <= advisoryPreparationItems.length && new Set(value).size === value.length && value.every(id => advisoryPreparationItems.some(item => item.id === id));
}
export function parsePreparationProgress(raw: string | null): AdvisoryPreparationProgress[] {
  if (raw === null) return [];
  const data: unknown = JSON.parse(raw);
  if (!data || typeof data !== "object" || !("version" in data) || data.version !== 1 || !("entries" in data) || !Array.isArray(data.entries) || data.entries.length > 200) throw new Error("Invalid checklist history");
  const entries: AdvisoryPreparationProgress[] = [];
  for (const value of data.entries) {
    if (!value || typeof value !== "object" || typeof value.key !== "string" || value.key.length > 3000 || !validCheckedItems(value.checked) || typeof value.updatedAt !== "string" || !Number.isFinite(Date.parse(value.updatedAt))) throw new Error("Invalid checklist progress");
    const key: unknown = JSON.parse(value.key);
    if (!Array.isArray(key) || key.length !== 3 || typeof key[0] !== "string" || !key[0] || !Number.isInteger(key[1]) || key[1] < 1 || typeof key[2] !== "string" || !key[2]) throw new Error("Invalid checklist basis");
    entries.push({ key: value.key, checked: [...value.checked], updatedAt: value.updatedAt });
  }
  if (new Set(entries.map(entry => entry.key)).size !== entries.length) throw new Error("Duplicate checklist basis");
  return entries;
}
export function parsePreparationState(raw: string | null): { entries: AdvisoryPreparationProgress[]; sample: SamplePreparationProgress | null } {
  const entries = parsePreparationProgress(raw);
  const sample: unknown = raw === null ? null : JSON.parse(raw).sampleChecklist;
  if (sample === undefined || sample === null) return { entries, sample: null };
  if (typeof sample !== "object" || !("record" in sample) || !("checked" in sample) || !validCheckedItems(sample.checked) || !("updatedAt" in sample) || typeof sample.updatedAt !== "string" || !Number.isFinite(Date.parse(sample.updatedAt))) throw new Error("Invalid sample checklist");
  const record = normalizeReviewedAdvisory(sample.record);
  if (!record || record.original.kind !== "sample" || record.id !== `sample-gallery-${record.original.sample}` || !["scheduled", "unscheduled"].includes(record.details.type) || matchPreviewAdvisory(record.details, sampleMatchHousehold).status !== "affected" || matchIsStale(record, sampleMatchHousehold)) throw new Error("Invalid sample advisory");
  return { entries, sample: { record, checked: [...sample.checked], updatedAt: sample.updatedAt } };
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
export function pendingHomePreparation(records: ReviewedAdvisory[], entries: AdvisoryPreparationProgress[], household: PreviewHousehold, sample: SamplePreparationProgress | null, now = new Date()) {
  const reviewed = pendingPreparation(records, entries, household, now);
  if (sample && sample.checked.length > 0 && sample.checked.length < advisoryPreparationItems.length && preparationEligible(sample.record, sampleMatchHousehold, now) && (!reviewed || Date.parse(sample.updatedAt) > (Date.parse(reviewed.updatedAt) || 0))) return { ...sample, gallery: true };
  return reviewed ? { ...reviewed, gallery: false } : undefined;
}
