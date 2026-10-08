"use client";
import { useEffect, useState } from "react";
import { usePreviewStorageKey } from "@/features/auth/use-preview-storage-key";
import { normalizePreview, emptyPreview, previewStorageKey, samplePreview, type PreviewHousehold } from "./preview-data";
import { readPreviewIdentity } from "@/features/auth/preview-session";

export function usePreviewHousehold() {
  const storageKey = usePreviewStorageKey(previewStorageKey);
  const [household, setHousehold] = useState(samplePreview);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [loadError, setLoadError] = useState(false);
  useEffect(() => {
    function read() {
      try {
        const saved = localStorage.getItem(storageKey);
        // A first visit starts with example history; anything saved afterwards wins.
        const identity = readPreviewIdentity();
        setHousehold(saved === null ? identity ? { ...emptyPreview, name: identity.name, email: identity.email || undefined } : samplePreview : normalizePreview(JSON.parse(saved)));
        setStorageError(""); setLoadError(false);
      }
      catch { setLoadError(true); setStorageError("Browser storage is unavailable. Changes cannot be saved."); }
      setReady(true);
    }
    read();
    const sync = (event: StorageEvent) => { if (event.key === storageKey) read(); };
    window.addEventListener("storage", sync);
    window.addEventListener("wattsnap-preview-change", read);
    return () => { window.removeEventListener("storage", sync); window.removeEventListener("wattsnap-preview-change", read); };
  }, [storageKey]);
  function update(change: Partial<PreviewHousehold>) {
    if (!ready || loadError) return false;
    try { const raw = localStorage.getItem(storageKey); const next = { ...(raw === null ? household : normalizePreview(JSON.parse(raw))), ...change }; localStorage.setItem(storageKey, JSON.stringify(next)); setHousehold(next); setStorageError(""); window.dispatchEvent(new Event("wattsnap-preview-change")); return true; }
    catch { setStorageError("Your changes could not be saved in this browser. Please try again."); return false; }
  }
  return { household, update, ready, storageError };
}
