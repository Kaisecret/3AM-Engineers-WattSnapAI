"use client";
import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { previewStorageFor, usePreviewStorageKey } from "@/features/auth/use-preview-storage-key";
import { usePreviewHousehold } from "@/features/dashboard/use-preview-household";
import { isDeviceOffline } from "@/features/offline-access/connectivity";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { feedColumns, feedDismissedKey, feedFilter, feedMaxPages, feedPageSize, feedProvider, type ProviderAdvisoryRow } from "./provider-feed";

const dismissedEvent = "wattsnap-provider-feed-dismissed", feedEvent = "wattsnap-provider-feed", maxDismissed = 500, freshMs = 60_000;

/** Published advisories read from the provider's page. The same list for every account, so one fetch is shared by every screen for a minute. */
let shared: { at: number; rows: Promise<ProviderAdvisoryRow[]> } | null = null;
async function fetchFeed(): Promise<ProviderAdvisoryRow[]> {
  // ponytail: untyped client until src/generated/database.types.ts is regenerated with the provider_advisories table (docs/13).
  const supabase = getBrowserSupabase() as unknown as SupabaseClient, rows: ProviderAdvisoryRow[] = [], filter = feedFilter();
  for (let page = 0; page < feedMaxPages; page += 1) {
    const { data, error } = await supabase.from("provider_advisories").select(feedColumns).eq("provider_id", feedProvider).eq("status", "published").or(filter)
      .order("posted_at", { ascending: false }).order("id").range(page * feedPageSize, (page + 1) * feedPageSize - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data as unknown as ProviderAdvisoryRow[]));
    if (data.length < feedPageSize) break;
  }
  return rows;
}
function loadFeed(force: boolean) {
  if (!force && shared && Date.now() - shared.at < freshMs) return shared.rows;
  const rows = fetchFeed();
  shared = { at: Date.now(), rows };
  rows.catch(() => { if (shared?.rows === rows) shared = null; });
  // Every mounted screen, including the one that saves advisories, takes the new list.
  window.dispatchEvent(new Event(feedEvent));
  return rows;
}

/**
 * The provider's published advisories for an ANTECO household, and the ids of feed advisories this
 * account removed (so they are not saved again). `dismissed` is null until it has been read.
 */
export function useProviderAdvisories() {
  const { household, ready } = usePreviewHousehold(), storageKey = usePreviewStorageKey(feedDismissedKey);
  const [rows, setRows] = useState<ProviderAdvisoryRow[]>([]), [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [dismissed, setDismissed] = useState<{ key: string; ids: string[] } | null>(null);
  const enabled = ready && household.provider === feedProvider;
  useEffect(() => {
    function read() {
      try {
        if (previewStorageFor(feedDismissedKey) !== storageKey) { setDismissed(null); return; }
        const parsed: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
        setDismissed({ key: storageKey, ids: Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string").slice(-maxDismissed) : [] });
      } catch { setDismissed({ key: storageKey, ids: [] }); }
    }
    read();
    const storage = (event: StorageEvent) => { if (event.key === storageKey || event.key === null) read(); };
    window.addEventListener("storage", storage); window.addEventListener(dismissedEvent, read);
    return () => { window.removeEventListener("storage", storage); window.removeEventListener(dismissedEvent, read); };
  }, [storageKey]);
  useEffect(() => {
    if (!enabled) { setRows([]); setStatus("idle"); return; }
    let live = true;
    const load = (force: boolean) => {
      if (isDeviceOffline()) { setStatus(current => (current === "ready" ? current : "error")); return; }
      setStatus(current => (current === "ready" ? current : "loading"));
      loadFeed(force).then(next => { if (live) { setRows(next); setStatus("ready"); } }, () => { if (live) setStatus(current => (current === "ready" ? current : "error")); });
    };
    load(false);
    // Coming back to the app (an installed app can stay open for days) reloads a list older than a
    // minute, and retries one that failed.
    const online = () => load(true), refreshed = () => load(false), visible = () => { if (document.visibilityState === "visible") load(false); };
    window.addEventListener("online", online); window.addEventListener("focus", refreshed); window.addEventListener(feedEvent, refreshed); document.addEventListener("visibilitychange", visible);
    return () => { live = false; window.removeEventListener("online", online); window.removeEventListener("focus", refreshed); window.removeEventListener(feedEvent, refreshed); document.removeEventListener("visibilitychange", visible); };
  }, [enabled]);
  function dismiss(id: string) {
    try {
      if (previewStorageFor(feedDismissedKey) !== storageKey) return;
      const parsed: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "[]"), ids = Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
      localStorage.setItem(storageKey, JSON.stringify([...ids.filter(item => item !== id), id].slice(-maxDismissed)));
      window.dispatchEvent(new Event(dismissedEvent));
    } catch { /* Storage is unavailable: the advisory may be saved again on the next visit. */ }
  }
  /** Loads the list again now. Used by the "Try again" button after a failure. */
  function reload() { if (!enabled || isDeviceOffline()) return; setStatus("loading"); loadFeed(true).then(next => { setRows(next); setStatus("ready"); }, () => setStatus("error")); }
  return { enabled, rows, status, dismissed: dismissed?.key === storageKey ? dismissed.ids : null, dismiss, reload };
}
