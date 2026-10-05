"use client";
import { useEffect, useState } from "react";
import { normalizePreview, previewStorageKey, samplePreview, type PreviewHousehold } from "./preview-data";

export function usePreviewHousehold() {
  const [household, setHousehold] = useState(samplePreview);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  useEffect(() => {
    function read() {
      try {
        const saved = localStorage.getItem(previewStorageKey);
        // A first visit starts with example history; anything saved afterwards wins.
        setHousehold(saved === null ? samplePreview : normalizePreview(JSON.parse(saved)));
      }
      catch { setStorageError("Browser storage is unavailable. Changes cannot be saved."); }
      setReady(true);
    }
    read();
    const sync = (event: StorageEvent) => { if (event.key === previewStorageKey) read(); };
    window.addEventListener("storage", sync);
    window.addEventListener("wattsnap-preview-change", read);
    return () => { window.removeEventListener("storage", sync); window.removeEventListener("wattsnap-preview-change", read); };
  }, []);
  function update(change: Partial<PreviewHousehold>) {
    const next = { ...household, ...change };
    try { localStorage.setItem(previewStorageKey, JSON.stringify(next)); setHousehold(next); setStorageError(""); window.dispatchEvent(new Event("wattsnap-preview-change")); return true; }
    catch { setStorageError("Your changes could not be saved in this browser. Please try again."); return false; }
  }
  return { household, update, ready, storageError };
}
