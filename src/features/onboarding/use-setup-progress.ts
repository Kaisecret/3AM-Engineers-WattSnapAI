"use client";
import { useEffect, useState } from "react";
import { usePreviewStorageKey } from "@/features/auth/use-preview-storage-key";
import { usePreviewHousehold } from "@/features/dashboard/use-preview-household";
import { usePreviewTips } from "@/features/tipid-tips/use-preview-tips";
import { canReviewSetupTips, deriveSetupProgress, initialSetup, normalizeSetup, setupChangeEvent, setupStorageKey, type SetupState } from "./setup-progress";

export function useSetupProgress() {
  const home = usePreviewHousehold();
  const tips = usePreviewTips();
  const key = usePreviewStorageKey(setupStorageKey);
  const [saved, setSaved] = useState(initialSetup);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState(false);
  useEffect(() => {
    function read() {
      try { const raw = localStorage.getItem(key); setSaved(raw === null ? initialSetup : normalizeSetup(JSON.parse(raw))); setError(""); setLoadError(false); }
      catch { setSaved(initialSetup); setLoadError(true); setError("Your saved setup progress could not be opened. Your records are unchanged. Retry before saving progress."); }
      setReady(true);
    }
    const storage = (event: StorageEvent) => { if (event.key === key || event.key === null) read(); };
    read(); window.addEventListener("storage", storage); window.addEventListener(setupChangeEvent, read);
    return () => { window.removeEventListener("storage", storage); window.removeEventListener(setupChangeEvent, read); };
  }, [key]);
  const progress = deriveSetupProgress(home.household, tips.snapshot, saved);
  function save(patch: Partial<SetupState>) {
    if (loadError || !ready || !home.ready || !tips.ready) return false;
    try { const raw = localStorage.getItem(key); const next = { ...(raw === null ? initialSetup : normalizeSetup(JSON.parse(raw))), ...patch }; localStorage.setItem(key, JSON.stringify(next)); setSaved(next); setError(""); window.dispatchEvent(new Event(setupChangeEvent)); return true; }
    catch { setError("This setup update could not be saved. Your earlier progress is unchanged. Please try again."); return false; }
  }
  return {
    ...progress, ready: ready && home.ready && tips.ready,
    error: error || home.storageError || tips.error,
    canReviewTips: canReviewSetupTips(home.household, tips.snapshot),
    reviewTips: () => canReviewSetupTips(home.household, tips.snapshot) && save({ reviewedTips: tips.snapshot!.inputSignature }),
    acknowledge: () => progress.complete && save({ acknowledged: progress.signature }),
    reload: () => window.dispatchEvent(new Event(setupChangeEvent)),
  };
}
