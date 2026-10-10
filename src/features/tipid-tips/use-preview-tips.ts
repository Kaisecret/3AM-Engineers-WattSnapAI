"use client";
import { useEffect, useRef, useState } from "react";
import { previewStorageFor, usePreviewStorageKey } from "@/features/auth/use-preview-storage-key";
import { normalizeTipsSnapshot, tipsStorageKey } from "./preview-tips";
import type { PreviewTipsSnapshot } from "./types";

export function usePreviewTips() {
  const storageKey = usePreviewStorageKey(tipsStorageKey);
  const stored = useRef<string | null>(null);
  const [snapshot, setSnapshot] = useState<PreviewTipsSnapshot | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const ready = loadedKey === storageKey;
  const [loadError, setLoadError] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    function read() {
      try {
        if (previewStorageFor(tipsStorageKey) !== storageKey) { setLoadedKey(null); return; }
        const raw = localStorage.getItem(storageKey); stored.current = raw;
        const saved = raw === null ? null : normalizeTipsSnapshot(JSON.parse(raw));
        setLoadError(raw !== null && !saved); setSnapshot(saved); setError(raw !== null && !saved ? "Saved tips could not be read. Your existing data is unchanged; reopen the page before saving." : "");
      } catch { setLoadError(true); setSnapshot(null); setError("Saved tips could not be opened in this browser. You can try reopening the page."); }
      setLoadedKey(storageKey);
    }
    read(); const sync = (event: StorageEvent) => { if (event.key === storageKey || event.key === null) read(); };
    window.addEventListener("storage", sync); window.addEventListener("wattsnap-tips-change", read);
    return () => { window.removeEventListener("storage", sync); window.removeEventListener("wattsnap-tips-change", read); };
  }, [storageKey]);
  function save(next: PreviewTipsSnapshot) {
    if (!ready || loadError) return false;
    try { if (previewStorageFor(tipsStorageKey) !== storageKey || localStorage.getItem(storageKey) !== stored.current) return false; localStorage.setItem(storageKey, JSON.stringify(next)); stored.current = JSON.stringify(next); setSnapshot(next); setError(""); window.dispatchEvent(new Event("wattsnap-tips-change")); return true; }
    catch { setError(snapshot ? "The refreshed tips could not be saved in this browser. Your previous saved tips are still available." : "The tips could not be saved in this browser. No tips have been saved yet; please try again."); return false; }
  }
  return { snapshot: ready && snapshot?.origin !== "sample" && !snapshot?.context.sample ? snapshot : null, ready, error, save };
}
