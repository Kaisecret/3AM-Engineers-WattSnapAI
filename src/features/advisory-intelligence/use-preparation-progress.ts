"use client";
import { useEffect, useState } from "react";
import type { PreviewHousehold } from "../dashboard/preview-data";
import type { ReviewedAdvisory } from "./types";
import { parsePreparationState, preparationChangeEvent, preparationKey, preparationStorageKey, type AdvisoryPreparationId, type AdvisoryPreparationProgress, type SamplePreparationProgress } from "./preparation-progress";

export function usePreparationProgress() {
  const [entries, setEntries] = useState<AdvisoryPreparationProgress[]>([]), [ready, setReady] = useState(false), [error, setError] = useState(""), [loadError, setLoadError] = useState(false);
  const [sample, setSample] = useState<SamplePreparationProgress | null>(null);
  useEffect(() => {
    function read() {
      try { const state = parsePreparationState(localStorage.getItem(preparationStorageKey)); setEntries(state.entries); setSample(state.sample); setError(""); setLoadError(false); }
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
      const state = parsePreparationState(localStorage.getItem(preparationStorageKey)), current = state.entries, key = preparationKey(record, household), previous = current.find(entry => entry.key === key)?.checked ?? [];
      const checked = previous.includes(id) ? previous.filter(item => item !== id) : [...previous, id];
      const next = [...current.filter(entry => entry.key !== key), { key, checked, updatedAt: new Date().toISOString() }].slice(-200);
      localStorage.setItem(preparationStorageKey, JSON.stringify({ version: 1, entries: next, sampleChecklist: state.sample })); setEntries(next); setError(""); window.dispatchEvent(new Event(preparationChangeEvent)); return true;
    } catch { setError("This checklist change could not be saved. Your previous progress is unchanged. Try again when browser storage is available."); return false; }
  }
  function toggleSample(record: ReviewedAdvisory, id: AdvisoryPreparationId) {
    if (!ready || loadError) return false;
    try {
      const state = parsePreparationState(localStorage.getItem(preparationStorageKey));
      const previous = state.sample?.record.id === record.id ? state.sample.checked : [];
      const checked = previous.includes(id) ? previous.filter(item => item !== id) : [...previous, id];
      const next = { version: 1, entries: state.entries, sampleChecklist: { record, checked, updatedAt: new Date().toISOString() } };
      const validated = parsePreparationState(JSON.stringify(next));
      localStorage.setItem(preparationStorageKey, JSON.stringify(next)); setSample(validated.sample); setError(""); window.dispatchEvent(new Event(preparationChangeEvent)); return true;
    } catch { setError("This checklist change could not be saved. Your previous progress is unchanged. Try again when browser storage is available."); return false; }
  }
  return { entries, sample, ready, error, loadError, toggle, toggleSample, reload: () => window.dispatchEvent(new Event(preparationChangeEvent)) };
}
