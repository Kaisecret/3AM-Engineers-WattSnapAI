"use client";
import { useEffect, useRef, useState } from "react";
import { previewStorageFor, usePreviewStorageKey } from "@/features/auth/use-preview-storage-key";
import { advisoriesStorageKey, maxSavedAdvisories, normalizeReviewedAdvisory } from "./review-preview";
import type { ReviewedAdvisory } from "./types";

export function usePreviewAdvisories() {
  const storageKey = usePreviewStorageKey(advisoriesStorageKey);
  const [records, setRecords] = useState<ReviewedAdvisory[]>([]), [loadedKey, setLoadedKey] = useState<string | null>(null), [error, setError] = useState(""), [loadError, setLoadError] = useState(false);
  const ready = loadedKey === storageKey;
  const stored = useRef<string | null>(null);
  useEffect(() => {
    function read() {
      try { if (previewStorageFor(advisoriesStorageKey) !== storageKey) { setLoadedKey(null); return; }
      stored.current = localStorage.getItem(storageKey); const raw = localStorage.getItem(storageKey); const parsed: unknown = raw === null ? [] : JSON.parse(raw); if (!Array.isArray(parsed) || parsed.length > maxSavedAdvisories) throw new Error("Invalid advisory history"); const normalized = parsed.map(normalizeReviewedAdvisory); if (normalized.some(record => !record) || new Set(normalized.map(record => record!.id)).size !== normalized.length) throw new Error("Invalid advisory record"); setRecords(normalized as ReviewedAdvisory[]); setError(""); setLoadError(false); }
      catch { setRecords([]); setLoadError(true); setError("Saved advisories could not be opened. Existing browser data is unchanged; retry loading before saving another review."); }
      setLoadedKey(storageKey);
    }
    read(); const storage = (event: StorageEvent) => { if (event.key === storageKey || event.key === null) read(); }; window.addEventListener("storage", storage); window.addEventListener("wattsnap-advisories-change", read);
    return () => { window.removeEventListener("storage", storage); window.removeEventListener("wattsnap-advisories-change", read); };
  }, [storageKey]);
  function write(next: ReviewedAdvisory[]) {
    if (!ready || loadError) return false;
    if (next.length > maxSavedAdvisories) { setError(`Your household holds up to ${maxSavedAdvisories} advisories. Review and remove an older saved entry before adding another.`); return false; }
    try { if (previewStorageFor(advisoriesStorageKey) !== storageKey || localStorage.getItem(storageKey) !== stored.current) throw new Error("Household or saved records changed; reload before saving."); localStorage.setItem(storageKey, JSON.stringify(next)); stored.current = JSON.stringify(next); setRecords(next); setError(""); window.dispatchEvent(new Event("wattsnap-advisories-change")); return true; }
    catch { setError("This advisory could not be saved. Browser storage may be full or blocked. Keep your draft and try a smaller screenshot or pasted original. Earlier saved advisories are unchanged."); return false; }
  }
  return { records: ready ? records.filter(record => record.original.kind !== "sample") : [], total: ready ? records.length : 0, ready, error, loadError, save: (record: ReviewedAdvisory) => write(records.some(item => item.id === record.id) ? records.map(item => item.id === record.id ? record : item) : [...records, record]),
    /** Adds several advisories in one write. A record already saved under the same id is kept as it is. */
    saveMany: (list: ReviewedAdvisory[]) => write([...records, ...list.filter(next => !records.some(item => item.id === next.id))]), remove: (id: string) => write(records.filter(record => record.id !== id)), reload: () => window.dispatchEvent(new Event("wattsnap-advisories-change")) };
}
