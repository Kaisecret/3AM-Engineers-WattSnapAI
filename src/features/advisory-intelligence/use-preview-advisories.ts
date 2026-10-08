"use client";
import { useEffect, useState } from "react";
import { usePreviewStorageKey } from "@/features/auth/use-preview-storage-key";
import { advisoriesStorageKey, normalizeReviewedAdvisory } from "./review-preview";
import type { ReviewedAdvisory } from "./types";

export function usePreviewAdvisories() {
  const storageKey = usePreviewStorageKey(advisoriesStorageKey);
  const [records, setRecords] = useState<ReviewedAdvisory[]>([]), [ready, setReady] = useState(false), [error, setError] = useState(""), [loadError, setLoadError] = useState(false);
  useEffect(() => {
    function read() {
      try { const raw = localStorage.getItem(storageKey); const parsed: unknown = raw === null ? [] : JSON.parse(raw); if (!Array.isArray(parsed) || parsed.length > 100) throw new Error("Invalid advisory history"); const normalized = parsed.map(normalizeReviewedAdvisory); if (normalized.some(record => !record) || new Set(normalized.map(record => record!.id)).size !== normalized.length) throw new Error("Invalid advisory record"); setRecords(normalized as ReviewedAdvisory[]); setError(""); setLoadError(false); }
      catch { setLoadError(true); setError("Saved advisories could not be opened. Existing browser data is unchanged; retry loading before saving another review."); }
      setReady(true);
    }
    read(); const storage = (event: StorageEvent) => { if (event.key === storageKey) read(); }; window.addEventListener("storage", storage); window.addEventListener("wattsnap-advisories-change", read);
    return () => { window.removeEventListener("storage", storage); window.removeEventListener("wattsnap-advisories-change", read); };
  }, [storageKey]);
  function write(next: ReviewedAdvisory[]) {
    if (loadError) return false;
    if (next.length > 100) { setError("This browser preview holds up to 100 advisories. Review and remove an older saved entry before adding another."); return false; }
    try { localStorage.setItem(storageKey, JSON.stringify(next)); setRecords(next); setError(""); window.dispatchEvent(new Event("wattsnap-advisories-change")); return true; }
    catch { setError("This advisory could not be saved. Browser storage may be full or blocked. Keep your draft and try a smaller screenshot or pasted original. Earlier saved advisories are unchanged."); return false; }
  }
  return { records, ready, error, loadError, save: (record: ReviewedAdvisory) => write(records.some(item => item.id === record.id) ? records.map(item => item.id === record.id ? record : item) : [...records, record]), remove: (id: string) => write(records.filter(record => record.id !== id)), reload: () => window.dispatchEvent(new Event("wattsnap-advisories-change")) };
}
