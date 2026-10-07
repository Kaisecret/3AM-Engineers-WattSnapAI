"use client";
import { useEffect, useState } from "react";
import type { PreviewHousehold } from "../dashboard/preview-data";
import type { ReviewedAdvisory } from "./types";
import { parsePreparationProgress, preparationChangeEvent, preparationKey, preparationStorageKey, type AdvisoryPreparationId, type AdvisoryPreparationProgress } from "./preparation-progress";

export function usePreparationProgress() {
  const [entries, setEntries] = useState<AdvisoryPreparationProgress[]>([]), [ready, setReady] = useState(false), [error, setError] = useState(""), [loadError, setLoadError] = useState(false);
  useEffect(() => {
    function read() {
      try { setEntries(parsePreparationProgress(localStorage.getItem(preparationStorageKey))); setError(""); setLoadError(false); }
      catch { setLoadError(true); setError("Your checklist progress could not be opened. Your saved data is unchanged. Retry loading before checking more items."); }
      setReady(true);
    }
    read(); const storage = (event: StorageEvent) => { if (event.key === preparationStorageKey || event.key === null) read(); };
    window.addEventListener("storage", storage); window.addEventListener(preparationChangeEvent, read);
    return () => { window.removeEventListener("storage", storage); window.removeEventListener(preparationChangeEvent, read); };
  }, []);
  function toggle(record: ReviewedAdvisory, household: PreviewHousehold, id: AdvisoryPreparationId) {
    if (!ready || loadError) return false;
    try {
      const current = parsePreparationProgress(localStorage.getItem(preparationStorageKey)), key = preparationKey(record, household), previous = current.find(entry => entry.key === key)?.checked ?? [];
      const checked = previous.includes(id) ? previous.filter(item => item !== id) : [...previous, id];
      const next = [...current.filter(entry => entry.key !== key), { key, checked, updatedAt: new Date().toISOString() }].slice(-200);
      localStorage.setItem(preparationStorageKey, JSON.stringify({ version: 1, entries: next })); setEntries(next); setError(""); window.dispatchEvent(new Event(preparationChangeEvent)); return true;
    } catch { setError("This checklist change could not be saved. Your previous progress is unchanged. Try again when browser storage is available."); return false; }
  }
  return { entries, ready, error, loadError, toggle, reload: () => window.dispatchEvent(new Event(preparationChangeEvent)) };
}
