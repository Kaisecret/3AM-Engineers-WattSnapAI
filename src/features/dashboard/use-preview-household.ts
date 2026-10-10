"use client";
import { useEffect, useState } from "react";
import { previewStorageFor, usePreviewStorageKey } from "@/features/auth/use-preview-storage-key";
import { normalizePreview, emptyPreview, previewStorageKey, type PreviewHousehold } from "./preview-data";
import { householdRecords, mergeHouseholdRecords } from "./local-records";
import { readPreviewIdentity } from "@/features/auth/preview-session";

export function usePreviewHousehold() {
  const storageKey = usePreviewStorageKey(previewStorageKey);
  const [household, setHousehold] = useState(emptyPreview);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const ready = loadedKey === storageKey;
  const [storageError, setStorageError] = useState("");
  const [loadError, setLoadError] = useState(false);
  useEffect(() => {
    function read() {
      try {
        if (previewStorageFor(previewStorageKey) !== storageKey) { setLoadedKey(null); return; }
        const saved = localStorage.getItem(storageKey);
        const identity = readPreviewIdentity();
        setHousehold(saved === null ? identity ? { ...emptyPreview, name: identity.name, email: identity.email || undefined } : emptyPreview : normalizePreview(JSON.parse(saved)));
        setStorageError(""); setLoadError(false);
      }
      catch { setHousehold(emptyPreview); setLoadError(true); setStorageError("Your saved household could not be opened. Changes cannot be saved until browser storage is available and the record can be read."); }
      setLoadedKey(storageKey);
    }
    read();
    const sync = (event: StorageEvent) => { if (event.key === storageKey || event.key === null) read(); };
    window.addEventListener("storage", sync);
    window.addEventListener("wattsnap-preview-change", read);
    return () => { window.removeEventListener("storage", sync); window.removeEventListener("wattsnap-preview-change", read); };
  }, [storageKey]);
  function update(change: Partial<PreviewHousehold>) {
    if (!ready || loadError) return false;
    try { if (previewStorageFor(previewStorageKey) !== storageKey) return false; const raw = localStorage.getItem(storageKey); const next = mergeHouseholdRecords(raw === null ? household : normalizePreview(JSON.parse(raw)), change); localStorage.setItem(storageKey, JSON.stringify(next)); setHousehold(next); setStorageError(""); window.dispatchEvent(new Event("wattsnap-preview-change")); return true; }
    catch { setStorageError("Your changes could not be saved in this browser. Please try again."); return false; }
  }
  return { household: ready ? householdRecords(household) : emptyPreview, update, ready, storageError };
}
