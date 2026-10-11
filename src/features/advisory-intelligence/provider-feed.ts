import type { PreviewHousehold } from "../dashboard/preview-data";
import { captureMatch, manilaDay, normalizeReviewedAdvisory, publishedEnd } from "./review-preview";
import type { AdvisoryDetails, ReviewedAdvisory } from "./types";

/**
 * Advisories read from the provider's own page (the provider_advisories table).
 * The same conversion runs on the server before a row is published and in the browser
 * when it is shown, so a published row is always one the app can save.
 */
export interface ProviderAdvisoryRow { id: string; post_url: string; posted_at: string; details: unknown; original_text: string; read_from_images: boolean; }

export const feedProvider = "anteco";
export const feedColumns = "id, post_url, posted_at, details, original_text, read_from_images";
export const feedPageSize = 100, feedMaxPages = 5;
export const feedDismissedKey = "wattsnap-provider-feed-dismissed-v1";
export const feedOriginalName = "ANTECO Facebook post";
const DAY = 86400000, endedDays = 3, undatedDays = 14;

/** PostgREST `or` filter: chosen by schedule, so an interruption announced long ago is still returned. */
export function feedFilter(now = new Date()) {
  return `schedule_end.gte.${manilaDay(new Date(now.getTime() - endedDays * DAY))},and(schedule_end.is.null,posted_at.gte."${new Date(now.getTime() - undatedDays * DAY).toISOString()}")`;
}

/** The saved-advisory form of a row for this household, or null when the row is not a record the app accepts. */
export function feedRecord(row: ProviderAdvisoryRow, household: PreviewHousehold, now = new Date()): ReviewedAdvisory | null {
  try {
    if (!row || typeof row.id !== "string" || !row.id || !row.details || typeof row.details !== "object") return null;
    const details = row.details as AdvisoryDetails, stamp = now.toISOString();
    if (!Array.isArray(details.areas)) return null;
    return normalizeReviewedAdvisory({
      version: "advisory-ui-v1", id: row.id, revision: 1, createdAt: stamp, reviewedAt: stamp,
      original: { kind: "text", name: feedOriginalName, text: row.original_text, capturedAt: row.posted_at, feed: { url: row.post_url, fromImages: row.read_from_images === true } },
      details, match: captureMatch(details, household, now),
    });
  } catch { return null; }
}

/** Still worth saving: a dated advisory until 3 days after it ends, however long ago it was announced; an undated one for 14 days. */
export function feedIsCurrent(record: ReviewedAdvisory, now = new Date()) {
  const lastDay = record.details.endDate || record.details.date;
  if (!lastDay) return now.getTime() - Date.parse(record.original.capturedAt) <= undatedDays * DAY;
  return now.getTime() - (publishedEnd(record.details) ?? Date.parse(`${lastDay}T23:59:59+08:00`)) <= endedDays * DAY;
}

/** Without a structured location every advisory would be "possibly affected", so nothing is saved automatically. */
export function feedCanImport(household: Pick<PreviewHousehold, "provider" | "locality">) {
  return household.provider === feedProvider && Boolean(household.locality?.province.trim() && household.locality.municipality.trim());
}

/**
 * The feed rows to save for this household: listed or possibly listed in an advisory that names
 * at least one town, still current, not saved already (a saved feed advisory keeps the row's id,
 * so a corrected one is never replaced), and not removed by the user before. An advisory that
 * names no place at all (a reminder, general information) would be "possibly affected" for
 * everyone, so it is left in the list instead. Stops at the saved-advisory limit.
 */
export function feedImports(rows: ProviderAdvisoryRow[], saved: ReviewedAdvisory[], dismissed: string[], household: PreviewHousehold, now = new Date(), limit = 100): ReviewedAdvisory[] {
  if (!feedCanImport(household)) return [];
  const known = new Set([...saved.map(record => record.id), ...dismissed]), picked: ReviewedAdvisory[] = [];
  for (const row of rows) {
    if (saved.length + picked.length >= limit) break;
    if (!row || known.has(row.id)) continue;
    const record = feedRecord(row, household, now);
    if (!record || record.match.status === "not-listed" || !record.details.areas.some(area => area.municipality.trim()) || !feedIsCurrent(record, now)) continue;
    picked.push(record); known.add(row.id);
  }
  return picked;
}
