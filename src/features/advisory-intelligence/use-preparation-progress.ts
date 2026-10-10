"use client";
import { useEffect, useRef, useState } from "react";
import { previewStorageFor, usePreviewStorageKey } from "@/features/auth/use-preview-storage-key";
import type { PreviewHousehold } from "../dashboard/preview-data";
import type { ReviewedAdvisory } from "./types";
import { parsePreparationState, preparationChangeEvent, preparationKey, preparationStorageKey, type AdvisoryPreparationId, type AdvisoryPreparationProgress, type SamplePreparationProgress } from "./preparation-progress";

export function usePreparationProgress() {
  const storageKey = usePreviewStorageKey(preparationStorageKey);
  const [entries, setEntries] = useState<AdvisoryPreparationProgress[]>([]), [loadedKey, setLoadedKey] = useState<string | null>(null), [error, setError] = useState(""), [loadError, setLoadError] = useState(false);
  const [sample, setSample] = useState<SamplePreparationProgress | null>(null);
  const ready = loadedKey === storageKey;
  const stored = useRef<string | null>(null);
  useEffect(() => {
    function read() {
      try { if (previewStorageFor(preparationStorageKey) !== storageKey) { setLoadedKey(null); return; }
      stored.current = localStorage.getItem(storageKey); const state = parsePreparationState(localStorage.getItem(storageKey)); setEntries(state.entries); setSample(state.sample); setError(""); setLoadError(false); }
      catch { setEntries([]); setSample(null); setLoadError(true); setError("Your checklist progress could not be opened. Your saved data is unchanged. Retry loading before checking more items."); }
      setLoadedKey(storageKey);
    }
    read(); const storage = (event: StorageEvent) => { if (event.key === storageKey || event.key === null) read(); };
    window.addEventListener("storage", storage); window.addEventListener(preparationChangeEvent, read);
    return () => { window.removeEventListener("storage", storage); window.removeEventListener(preparationChangeEvent, read); };
  }, [storageKey]);
  function toggle(record: ReviewedAdvisory, household: PreviewHousehold, id: AdvisoryPreparationId) {
    if (!ready || loadError) return false;
    try { if (previewStorageFor(preparationStorageKey) !== storageKey || localStorage.getItem(storageKey) !== stored.current) throw new Error("Household or saved records changed; reload before saving.");
      const state = parsePreparationState(localStorage.getItem(storageKey)), current = state.entries, key = preparationKey(record, household), previous = current.find(entry => entry.key === key)?.checked ?? [];
      const checked = previous.includes(id) ? previous.filter(item => item !== id) : [...previous, id];
      const next = [...current.filter(entry => entry.key !== key), { key, checked, updatedAt: new Date().toISOString() }].slice(-200);
      localStorage.setItem(storageKey, JSON.stringify({ version: 1, entries: next, sampleChecklist: state.sample })); stored.current = localStorage.getItem(storageKey); setEntries(next); setError(""); window.dispatchEvent(new Event(preparationChangeEvent)); return true;
    } catch { setError("This checklist change could not be saved. Your previous progress is unchanged. Try again when browser storage is available."); return false; }
  }
  function toggleSample(record: ReviewedAdvisory, id: AdvisoryPreparationId) {
    if (!ready || loadError) return false;
    try {
      const state = parsePreparationState(localStorage.getItem(storageKey));
      const previous = state.sample?.record.id === record.id ? state.sample.checked : [];
      const checked = previous.includes(id) ? previous.filter(item => item !== id) : [...previous, id];
      const next = { version: 1, entries: state.entries, sampleChecklist: { record, checked, updatedAt: new Date().toISOString() } };
      const validated = parsePreparationState(JSON.stringify(next));
      localStorage.setItem(storageKey, JSON.stringify(next)); stored.current = JSON.stringify(next); setSample(validated.sample); setError(""); window.dispatchEvent(new Event(preparationChangeEvent)); return true;
    } catch { setError("This checklist change could not be saved. Your previous progress is unchanged. Try again when browser storage is available."); return false; }
  }
  return { entries: ready ? entries : [], sample: ready ? sample : null, ready, error, loadError, toggle, toggleSample, reload: () => window.dispatchEvent(new Event(preparationChangeEvent)) };
}
