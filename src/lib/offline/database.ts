import { emptyPreview, normalizePreview, previewStorageKey } from "../../features/dashboard/preview-data";
import { isExampleRecord } from "../../features/dashboard/local-records";
import { advisoriesStorageKey, maxSavedAdvisories, normalizeReviewedAdvisory } from "../../features/advisory-intelligence/review-preview";
import { parsePreparationState, preparationChangeEvent, preparationStorageKey } from "../../features/advisory-intelligence/preparation-progress";
import { brownoutStorageKey, maxSavedPlans, normalizeBrownoutPlan } from "../../features/brownout-ready/calculations";
import { normalizeScenarios, scenariosStorageKey } from "../../features/watt-if-simulator/calculations";
import { normalizeTipsSnapshot, tipsStorageKey } from "../../features/tipid-tips/preview-tips";
import { initialSetup, normalizeSetup, setupChangeEvent, setupStorageKey } from "../../features/onboarding/setup-progress";
import { feedDismissedKey } from "../../features/advisory-intelligence/provider-feed";
import type { RecordStore, Records } from "./sync";

const fields = ["name", "email", "photo", "budget", "location", "provider", "locality", "notifications", "monthlySubsidy"] as const;
function object(raw: string | null): Record<string, unknown> {
  if (raw === null) return {};
  const value = JSON.parse(raw);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Unreadable household");
  return value;
}
function records<T>(list: T[], key: (value: T) => string): Records {
  const next = Object.fromEntries(list.map(value => [key(value), value]));
  if (Object.keys(next).length !== list.length) throw new Error("Duplicate saved records");
  return next;
}
function array(raw: string | null, cap: number): unknown[] {
  const value = raw === null ? [] : JSON.parse(raw);
  if (!Array.isArray(value) || value.length > cap) throw new Error("Unreadable record history");
  return value;
}

/** All store keys use the authenticated user ID, matching the existing offline hooks.
 * Descriptors reject corrupt records instead of silently dropping them during reconciliation.
 */
export function householdStores(accountId: string): RecordStore[] {
  const scoped = (base: string) => `${base}:household:${encodeURIComponent(accountId)}`;
  const homeStore = (name: "bills" | "appliances"): RecordStore => ({
    name, key: scoped(previewStorageKey), event: "wattsnap-preview-change",
    read(raw) {
      const value = object(raw), normalized = normalizePreview(value), list = normalized[name];
      if (value[name] !== undefined && (!Array.isArray(value[name]) || value[name].length !== list.length)) throw new Error("Unreadable records");
      const real = list.filter(item => !isExampleRecord(item));
      return records(real, item => name === "bills" ? (item as { month: string }).month : item.id);
    },
    write(next, raw) {
      const value = object(raw), normalized = normalizePreview(value);
      return JSON.stringify({ ...emptyPreview, ...value, [name]: [...normalized[name].filter(isExampleRecord), ...Object.values(next)] });
    },
  });
  return [
    {
      name: "settings", key: scoped(previewStorageKey), event: "wattsnap-preview-change",
      read(raw) {
        if (raw === null) return {};
        const value = object(raw), home = normalizePreview(value);
        return Object.fromEntries(fields.filter(field => field in value).map(field => [field, home[field] ?? null]));
      },
      write(next, raw) {
        const value = { ...emptyPreview, ...object(raw) } as Records;
        for (const field of fields) {
          if (next[field] === null || next[field] === undefined) delete value[field]; else value[field] = next[field];
        }
        return JSON.stringify(value);
      },
    },
    homeStore("bills"), homeStore("appliances"),
    {
      name: "advisories", key: scoped(advisoriesStorageKey), event: "wattsnap-advisories-change",
      read(raw) {
        const list = array(raw, maxSavedAdvisories).map(normalizeReviewedAdvisory);
        if (list.some(value => !value)) throw new Error("Unreadable advisory");
        return records(list.filter(value => value!.original.kind !== "sample"), value => value!.id);
      },
      write: next => JSON.stringify(Object.values(next)),
    },
    {
      name: "preparation", key: scoped(preparationStorageKey), event: preparationChangeEvent,
      read: raw => records(parsePreparationState(raw).entries.filter(entry => !JSON.parse(entry.key)[0].startsWith("sample-")), entry => entry.key),
      write: (next, raw) => JSON.stringify({ version: 1, entries: Object.values(next), sampleChecklist: parsePreparationState(raw).sample }),
    },
    {
      name: "plans", key: scoped(brownoutStorageKey), event: "wattsnap-brownout-change",
      read(raw) {
        const list = array(raw, maxSavedPlans).map(normalizeBrownoutPlan);
        if (list.some(value => !value)) throw new Error("Unreadable plan");
        return records(list.filter(value => value!.advisory.original.kind !== "sample"), value => value!.id);
      },
      write: next => JSON.stringify(Object.values(next)),
    },
    {
      name: "tips", key: scoped(tipsStorageKey), event: "wattsnap-tips-change",
      read(raw) {
        if (raw === null) return {};
        const value = normalizeTipsSnapshot(JSON.parse(raw));
        if (!value) throw new Error("Unreadable tips");
        return value.origin === "sample" || value.context.sample ? {} : { current: value };
      },
      write: next => next.current ? JSON.stringify(next.current) : null,
    },
    {
      name: "scenarios", key: scoped(scenariosStorageKey), event: "wattsnap-scenario-change",
      read(raw) {
        const list = array(raw, 50), normalized = normalizeScenarios(list);
        if (normalized.length !== list.length) throw new Error("Unreadable scenario");
        return records(normalized.filter(value => value.origin !== "sample"), value => value.id);
      },
      write: next => JSON.stringify(Object.values(next)),
    },
    {
      name: "setup", key: scoped(setupStorageKey), event: setupChangeEvent,
      read: raw => raw === null ? {} : { current: normalizeSetup(JSON.parse(raw)) },
      write: next => JSON.stringify(next.current ?? initialSetup),
    },
    {
      name: "dismissed", key: scoped(feedDismissedKey), event: "wattsnap-provider-feed-dismissed",
      read(raw) {
        const list = array(raw, 500);
        if (list.some(value => typeof value !== "string")) throw new Error("Unreadable dismissed posts");
        return Object.fromEntries(list.map(id => [id as string, true]));
      },
      write: next => JSON.stringify(Object.keys(next)),
    },
  ];
}
