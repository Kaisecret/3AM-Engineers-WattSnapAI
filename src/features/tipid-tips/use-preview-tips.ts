"use client";
import { useEffect, useState } from "react";
import { previewStorageFor, usePreviewStorageKey } from "@/features/auth/use-preview-storage-key";
import { normalizeTipsSnapshot, tipsStorageKey } from "./preview-tips";
import type { PreviewTipsSnapshot } from "./types";

export function usePreviewTips() {
  const storageKey = usePreviewStorageKey(tipsStorageKey);
  const [snapshot, setSnapshot] = useState<PreviewTipsSnapshot | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const ready = loadedKey === storageKey;
  const [error, setError] = useState("");
  useEffect(() => {
    function read() {
      try {
        if (previewStorageFor(tipsStorageKey) !== storageKey) { setLoadedKey(null); return; }
        const raw = localStorage.getItem(storageKey);
        const saved = raw === null ? null : normalizeTipsSnapshot(JSON.parse(raw));
        setSnapshot(saved); setError(raw !== null && !saved ? "Saved tips could not be read. Refresh the preview to create a new set." : "");
      } catch { setSnapshot(null); setError("Saved tips could not be opened in this browser. You can try refreshing the preview."); }
      setLoadedKey(storageKey);
    }
    read(); const sync = (event: StorageEvent) => { if (event.key === storageKey || event.key === null) read(); };
    window.addEventListener("storage", sync); window.addEventListener("wattsnap-tips-change", read);
    return () => { window.removeEventListener("storage", sync); window.removeEventListener("wattsnap-tips-change", read); };
  }, [storageKey]);
  function save(next: PreviewTipsSnapshot) {
    if (!ready) return false;
    try { if (previewStorageFor(tipsStorageKey) !== storageKey) return false; localStorage.setItem(storageKey, JSON.stringify(next)); setSnapshot(next); setError(""); window.dispatchEvent(new Event("wattsnap-tips-change")); return true; }
    catch { setError(snapshot ? "The refreshed tips could not be saved in this browser. Your previous saved tips are still available." : "The preview tips could not be saved in this browser. No tips have been saved yet; please try again."); return false; }
  }
  return { snapshot: ready && snapshot?.origin !== "sample" && !snapshot?.context.sample ? snapshot : null, ready, error, save };
}
