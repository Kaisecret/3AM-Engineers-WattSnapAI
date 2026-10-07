import { isCalendarDate, type PreviewHousehold } from "../dashboard/preview-data";
import { previewProviders, previewProviderName } from "../household-profile/provider-preview";
import { advisoryTypeLabels, type AdvisoryStatus } from "./advisory-preview";
import type { AdvisoryArea, AdvisoryDetails, AdvisoryMatch, AdvisoryOriginal, AdvisorySample, ReviewedAdvisory } from "./types";

export const advisoriesStorageKey = "wattsnap-advisories-ui-preview-v1";
export const maxOriginalBytes = 2 * 1024 * 1024;
export const maxOriginalText = 12000;
export const blankArea: AdvisoryArea = { province: "", municipality: "", barangay: "", scope: "uncertain" };
export const blankAdvisory: AdvisoryDetails = { type: "scheduled", title: "", provider: "", publisher: "", sourceUrl: "", date: "", startTime: "", endDate: "", endTime: "", expectedRestoration: "", areaText: "", areas: [{ ...blankArea }], reason: "", relatedId: "" };
export const matchLabels: Record<AdvisoryStatus, string> = { affected: "Affected", "possibly-affected": "Possibly Affected", "not-listed": "Not Listed" };
const providers = new Set<string>(previewProviders.map(provider => provider.id));
const same = (a: string, b: string) => a.trim().toLocaleLowerCase("en-PH").replace(/\s+/g, " ") === b.trim().toLocaleLowerCase("en-PH").replace(/\s+/g, " ");
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
export function householdMatchSignature(household: Pick<PreviewHousehold, "location" | "provider" | "locality">) { return JSON.stringify([household.provider ?? "", household.location ?? "", household.locality?.province ?? "", household.locality?.municipality ?? "", household.locality?.barangay ?? ""]); }
export function matchPreviewAdvisory(details: AdvisoryDetails, household: Pick<PreviewHousehold, "location" | "provider" | "locality">): { status: AdvisoryStatus; rationale: string[] } {
  const rationale: string[] = [];
  if (details.provider && household.provider && details.provider !== household.provider) return { status: "not-listed", rationale: [`The entered advisory provider (${previewProviderName(details.provider)}) differs from your selected provider (${previewProviderName(household.provider)}).`, "This preview does not infer shared service coverage or verify the source."] };
  if (!details.provider || !household.provider) rationale.push("An advisory provider or household provider is missing; provider relevance is unverified.");
  const home = household.locality;
  if (!home?.province.trim() || !home.municipality.trim()) return { status: "possibly-affected", rationale: [...rationale, "Your structured province and municipality are incomplete. A free-text location is not an exact locality match."] };
  let exact = false, uncertain = false;
  for (const area of details.areas) {
    if (area.province && !same(area.province, home.province)) continue;
    if (area.municipality && !same(area.municipality, home.municipality)) continue;
    if (!area.province || !area.municipality) { uncertain = true; continue; }
    if (area.scope === "uncertain") { uncertain = true; continue; }
    if (area.scope === "municipality") { exact = true; continue; }
    if (!area.barangay || !home.barangay) { uncertain = true; continue; }
    if (same(area.barangay, home.barangay)) exact = true;
  }
  if (exact && details.provider && household.provider) return { status: "affected", rationale: ["The entered provider and the full locality names match your saved household. The reviewed area scope explicitly includes this barangay or the whole municipality.", "This is a UI match against entered labels. The announcement, locality aliases, and utility coverage have not been independently verified."] };
  if (exact || uncertain || !details.areas.length || rationale.length) return { status: "possibly-affected", rationale: [...rationale, "The entered area or its scope is incomplete, broad, or uncertain. Review the original and confirm relevance before making a readiness plan."] };
  return { status: "not-listed", rationale: ["Your full saved locality was not listed among the entered areas. Province and municipality are compared together; a shared barangay name alone is insufficient.", "Not Listed means not listed in this review. It does not guarantee uninterrupted power; unverified aliases or coverage may require checking the original."] };
}
export function matchIsStale(record: ReviewedAdvisory, household: Pick<PreviewHousehold, "location" | "provider" | "locality">) { return record.match.householdSignature !== householdMatchSignature(household); }
export function captureMatch(details: AdvisoryDetails, household: PreviewHousehold, now = new Date()): AdvisoryMatch {
  return { ...matchPreviewAdvisory(details, household), householdSignature: householdMatchSignature(household), householdBasis: { location: household.location, provider: household.provider, ...(household.locality ? { locality: { ...household.locality } } : {}) }, matchedAt: now.toISOString() };
}
export function sourceLink(value: string) { try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? url.href : null; } catch { return null; } }
export function publishedStart(details: AdvisoryDetails) { return details.date && timePattern.test(details.startTime) ? Date.parse(`${details.date}T${details.startTime}:00+08:00`) : null; }
export function publishedEnd(details: AdvisoryDetails) { const date = details.endDate || details.date; return date && timePattern.test(details.endTime) ? Date.parse(`${date}T${details.endTime}:00+08:00`) : null; }
export function validateAdvisory(details: AdvisoryDetails) {
  if (!details.areaText.trim()) return "Copy the affected-area wording from the original. If it is absent, explicitly enter ‘Not provided’.";
  if (details.provider && !providers.has(details.provider)) return "Choose an available provider, or leave it unknown.";
  if (details.sourceUrl.trim() && !sourceLink(details.sourceUrl.trim())) return "Use a complete http or https source link, or leave it blank.";
  if ((details.date && !isCalendarDate(details.date)) || (details.endDate && !isCalendarDate(details.endDate))) return "Choose valid dates, or leave uncertain dates blank.";
  if ((details.startTime && !timePattern.test(details.startTime)) || (details.endTime && !timePattern.test(details.endTime))) return "Use valid 24-hour times, or leave uncertain times blank.";
  if (details.date && details.endDate && details.endDate < details.date) return "The end date cannot be earlier than the interruption date. Review the published schedule or leave an uncertain date blank.";
  const start = publishedStart(details), end = publishedEnd(details);
  if (start !== null && end !== null && end <= start) return "The scheduled end must be after the start. For an overnight schedule, enter its later end date.";
  for (const area of details.areas) {
    if (area.scope !== "uncertain" && (!area.province.trim() || !area.municipality.trim())) return "An exact area needs its province and municipality. Otherwise choose Uncertain or partial area.";
    if (area.scope === "barangay" && !area.barangay.trim()) return "Enter the listed barangay, or mark its area as uncertain.";
  }
  return null;
}
export function advisoryInputWarnings(details: AdvisoryDetails) {
  const warnings: string[] = [];
  if (!details.date || !details.startTime) warnings.push("A start date or time is missing. There is no complete schedule for a countdown.");
  if (!details.endTime || !(details.endDate || details.date)) warnings.push("A scheduled end is unknown. Duration cannot be inferred.");
  if (!details.expectedRestoration.trim()) warnings.push("Expected restoration was not provided. A scheduled end is not a restoration confirmation.");
  if (!details.publisher.trim() || !details.sourceUrl.trim()) warnings.push("Source attribution is incomplete. Keep the original and verify its publisher yourself.");
  if (!details.areas.length || details.areas.some(area => area.scope === "uncertain")) warnings.push("Some area wording is uncertain. An uncertain area cannot establish an exact match.");
  if (details.type === "restored" && !details.relatedId) warnings.push("This restoration update has no linked earlier advisory. It will be saved separately.");
  return warnings;
}
export function originalIsDuplicate(original: AdvisoryOriginal, records: ReviewedAdvisory[], exceptId?: string) { return records.find(record => record.id !== exceptId && (original.kind === "image" ? record.original.image === original.image : record.original.kind !== "image" && record.original.text.trim() === original.text.trim())); }
const strings = ["type", "title", "provider", "publisher", "sourceUrl", "date", "startTime", "endDate", "endTime", "expectedRestoration", "areaText", "reason", "relatedId"] as const;
const sampleKinds = new Set(["scheduled", "uncertain", "not-listed", "restored", "notice"]);
export function normalizeReviewedAdvisory(value: unknown): ReviewedAdvisory | null {
  if (!value || typeof value !== "object") return null;
  const record = value as ReviewedAdvisory, details = record.details, original = record.original, match = record.match;
  const validStamp = (stamp: unknown) => typeof stamp === "string" && Number.isFinite(Date.parse(stamp));
  if (!validStamp(record.createdAt) || !validStamp(record.reviewedAt) || !validStamp(original?.capturedAt) || !validStamp(match?.matchedAt)) return null;
  if (record.version !== "advisory-ui-v1" || typeof record.id !== "string" || !record.id || !Number.isInteger(record.revision) || record.revision < 1 || !Number.isFinite(Date.parse(record.createdAt)) || !Number.isFinite(Date.parse(record.reviewedAt)) || !original || !["text", "image", "sample"].includes(original.kind) || typeof original.name !== "string" || typeof original.text !== "string" || original.text.length > maxOriginalText || !Number.isFinite(Date.parse(original.capturedAt))) return null;
  if (original.kind === "image" ? typeof original.image !== "string" || original.image.length > Math.ceil(maxOriginalBytes / 3) * 4 + 80 || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(original.image) : !original.text.trim()) return null;
  if (original.kind === "sample" && (!original.sample || !sampleKinds.has(original.sample))) return null;
  if (!details || strings.some(key => typeof details[key] !== "string" || details[key].length > (key === "areaText" || key === "reason" ? 1500 : 300)) || !["scheduled", "unscheduled", "notice", "restored"].includes(details.type) || !Array.isArray(details.areas) || details.areas.length > 20 || details.areas.some(area => !area || !["barangay", "municipality", "uncertain"].includes(area.scope) || [area.province, area.municipality, area.barangay].some(field => typeof field !== "string" || field.length > 100)) || validateAdvisory(details)) return null;
  if (!match || !["affected", "possibly-affected", "not-listed"].includes(match.status) || !Array.isArray(match.rationale) || match.rationale.some(line => typeof line !== "string") || typeof match.householdSignature !== "string" || !match.householdBasis || !Number.isFinite(Date.parse(match.matchedAt))) return null;
  const basis = match.householdBasis;
  if (typeof basis !== "object" || (basis.location !== undefined && typeof basis.location !== "string") || (basis.provider !== undefined && (typeof basis.provider !== "string" || !providers.has(basis.provider))) || (basis.locality && [basis.locality.province, basis.locality.municipality, basis.locality.barangay].some(field => typeof field !== "string"))) return null;
  return record;
}
export function manilaDay(now = new Date()) { const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now); const part = (type: string) => parts.find(item => item.type === type)?.value; return `${part("year")}-${part("month")}-${part("day")}`; }
export function advisoryTab(record: ReviewedAdvisory, now = new Date()) { const end = publishedEnd(record.details); return record.details.type === "restored" || (end !== null && end < now.getTime()) || (record.details.date && record.details.date < manilaDay(now)) ? "history" : "active"; }
export function timeLabel(time: string) { return timePattern.test(time) ? new Intl.DateTimeFormat("en-PH", { hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(new Date(`2000-01-01T${time}:00Z`)) : "Unknown"; }
export function scheduleLabel(details: AdvisoryDetails) { return `${timeLabel(details.startTime)} – ${timeLabel(details.endTime)}${details.endDate && details.endDate !== details.date ? ` (${details.endDate})` : ""} · Asia/Manila`; }
export const sampleMatchHousehold: PreviewHousehold = { name: "Example household", bills: [], appliances: [], budget: 1600, provider: "anteco", location: "Payao, San Jose de Buenavista, Antique", locality: { province: "Antique", municipality: "San Jose de Buenavista", barangay: "Payao" } };
export function sampleAdvisory(kind: AdvisorySample, now = new Date()): { details: AdvisoryDetails; original: AdvisoryOriginal } {
  const tomorrow = new Date(`${manilaDay(now)}T00:00:00Z`); tomorrow.setUTCDate(tomorrow.getUTCDate() + 1); const date = tomorrow.toISOString().slice(0, 10);
  const details: AdvisoryDetails = { ...blankAdvisory, type: kind === "uncertain" ? "unscheduled" : kind === "restored" ? "restored" : kind === "notice" ? "notice" : "scheduled", provider: kind === "not-listed" ? "capelco" : "anteco", publisher: "Sample provider announcement · unverified example", date, startTime: "13:00", endTime: "17:00", areaText: "Entire Barangay Payao, San Jose de Buenavista, Antique", areas: [{ province: "Antique", municipality: "San Jose de Buenavista", barangay: "Payao", scope: "barangay" }], reason: "Sample line maintenance" };
  if (kind === "uncertain") Object.assign(details, { date: "", startTime: "", endTime: "", areaText: "Selected areas of San Jose de Buenavista and nearby barangays", areas: [{ province: "Antique", municipality: "San Jose de Buenavista", barangay: "", scope: "uncertain" }], reason: "Sample technical issue" });
  if (kind === "not-listed") Object.assign(details, { areaText: "Entire Barangay Payao, Roxas City, Capiz", areas: [{ province: "Capiz", municipality: "Roxas City", barangay: "Payao", scope: "barangay" }] });
  if (kind === "restored") Object.assign(details, { date: manilaDay(now), startTime: "", endTime: "", areaText: "Barangay Payao, San Jose de Buenavista, Antique", expectedRestoration: "Sample update reports restoration; no restoration time stated", reason: "Sample restoration update" });
  if (kind === "notice") Object.assign(details, { startTime: "", endTime: "", areaText: "Antique; specific areas not provided", areas: [{ province: "Antique", municipality: "", barangay: "", scope: "uncertain" }], reason: "Sample service notice" });
  details.title = advisoryTypeLabels[details.type];
  const text = `SAMPLE ONLY — ${previewProviderName(details.provider)}\n${details.title}\nDate: ${details.date || "Not provided"}\nStart: ${details.startTime || "Not provided"}\nEnd: ${details.endTime || "Not provided"}\nAffected areas: ${details.areaText}\nReason: ${details.reason}\nExpected restoration: ${details.expectedRestoration || "Not provided"}\nThis is a fictional design example, not a current provider advisory.`;
  return { details, original: { kind: "sample", sample: kind, name: "Sample announcement", text, capturedAt: now.toISOString() } };
}
