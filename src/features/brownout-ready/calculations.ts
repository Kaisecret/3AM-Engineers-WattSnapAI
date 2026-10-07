import { householdMatchSignature, matchIsStale, matchPreviewAdvisory, normalizeReviewedAdvisory, publishedEnd, publishedStart } from "../advisory-intelligence/review-preview";
import type { AdvisoryDetails, ReviewedAdvisory } from "../advisory-intelligence/types";
import type { PreviewHousehold } from "../dashboard/preview-data";
import type { BrownoutPreviewPlan, PreparationId } from "./types";

export const brownoutStorageKey = "wattsnap-brownout-ui-preview-v1";
export const preparationItems: { id: PreparationId; title: string; detail: string }[] = [
  { id: "charge", title: "Charge phones and power banks", detail: "Use the time before the published schedule to charge what you need." },
  { id: "work", title: "Save your online work", detail: "Save documents and download anything you may need locally." },
  { id: "lights", title: "Prepare rechargeable lights", detail: "Keep a charged light somewhere easy to reach." },
  { id: "unplug", title: "Unplug sensitive appliances where practical", detail: "Follow the appliance instructions and your household needs." },
  { id: "fridge", title: "Minimize refrigerator opening", detail: "Keep the door closed as much as possible during an interruption." },
];

export function scheduleState(details: AdvisoryDetails, now: number) {
  const start = publishedStart(details), end = publishedEnd(details);
  const duration = start !== null && end !== null && Number.isFinite(start) && end > start ? end - start : null;
  const state = end !== null && Number.isFinite(end) && now >= end ? "elapsed" : start === null || !Number.isFinite(start) ? "unknown" : now >= start ? "started" : "future";
  return { start, end, duration, state, remaining: state === "future" && start !== null ? Math.max(0, start - now) : null };
}
export function durationLabel(milliseconds: number | null) {
  if (milliseconds === null || !Number.isFinite(milliseconds) || milliseconds <= 0) return "Unknown";
  const minutes = Math.round(milliseconds / 60000), hours = Math.floor(minutes / 60), remainder = minutes % 60;
  return [hours ? `${hours} ${hours === 1 ? "hour" : "hours"}` : "", remainder ? `${remainder} ${remainder === 1 ? "minute" : "minutes"}` : ""].filter(Boolean).join(" ");
}
export function countdownParts(milliseconds: number) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return { days: Math.floor(seconds / 86400), hours: Math.floor(seconds / 3600) % 24, minutes: Math.floor(seconds / 60) % 60, seconds: seconds % 60 };
}
export function manilaTimestamp(value: string | number) {
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(value));
}
export function cachedAge(value: string, now: number) {
  const delta = now - Date.parse(value);
  if (delta < 0) return "Device time is earlier than this saved review";
  const minutes = Math.floor(delta / 60000);
  return minutes < 1 ? "Reviewed less than a minute ago" : minutes < 60 ? `Reviewed ${minutes} min ago` : minutes < 1440 ? `Reviewed ${Math.floor(minutes / 60)} hr ago` : `Reviewed ${Math.floor(minutes / 1440)} days ago`;
}
export function activationPreview(record: ReviewedAdvisory, household: PreviewHousehold, now: number) {
  const match = matchPreviewAdvisory(record.details, household), schedule = scheduleState(record.details, now);
  const blocked = !["scheduled", "unscheduled"].includes(record.details.type) ? "This is an update or notice. Choose an interruption advisory for a preparation plan."
    : matchIsStale(record, household) ? "Review the changed household match before saving this plan."
    : match.status === "not-listed" ? "Your household is Not Listed in this review. This advisory cannot activate a readiness plan."
    : schedule.state === "elapsed" ? "This published schedule has elapsed. Keep its source in advisory history and choose a current review."
    : null;
  return { ...match, schedule, blocked, recommended: !blocked && match.status === "affected" && schedule.state === "future" };
}
export function planChanges(plan: BrownoutPreviewPlan, records: ReviewedAdvisory[], household: PreviewHousehold) {
  const current = records.find(record => record.id === plan.id);
  return {
    current,
    missing: !current,
    sourceChanged: Boolean(current && (current.revision !== plan.advisory.revision || current.reviewedAt !== plan.advisory.reviewedAt)),
    householdChanged: plan.advisory.match.householdSignature !== householdMatchSignature(household),
    updates: records.filter(record => record.details.relatedId === plan.id && !plan.acknowledgedUpdates.some(update => update.id === record.id && update.revision === record.revision)),
  };
}
export function normalizeBrownoutPlan(value: unknown): BrownoutPreviewPlan | null {
  if (!value || typeof value !== "object") return null;
  const plan = value as BrownoutPreviewPlan, advisory = normalizeReviewedAdvisory(plan.advisory);
  if (plan.version !== "brownout-ui-v1" || !advisory || plan.id !== advisory.id || !["scheduled", "unscheduled"].includes(advisory.details.type) || typeof plan.relevanceConfirmed !== "boolean" || plan.sourceConfirmed !== true || (advisory.match.status === "possibly-affected" && !plan.relevanceConfirmed) || advisory.match.status === "not-listed") return null;
  if (!Array.isArray(plan.checked) || plan.checked.length > 5 || new Set(plan.checked).size !== plan.checked.length || plan.checked.some(id => !preparationItems.some(item => item.id === id))) return null;
  if (!Array.isArray(plan.acknowledgedUpdates) || plan.acknowledgedUpdates.length > 100 || plan.acknowledgedUpdates.some(update => !update || typeof update.id !== "string" || !update.id || !Number.isInteger(update.revision) || update.revision < 1)) return null;
  if ([plan.createdAt, plan.updatedAt].some(stamp => typeof stamp !== "string" || !Number.isFinite(Date.parse(stamp)))) return null;
  return { ...plan, advisory };
}
