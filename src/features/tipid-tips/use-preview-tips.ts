"use client";
import { useEffect, useState } from "react";
import { usePreviewStorageKey } from "@/features/auth/use-preview-storage-key";
import { normalizeTipsSnapshot, tipsStorageKey } from "./preview-tips";
import type { PreviewTipsSnapshot } from "./types";

export function usePreviewTips() {
  const storageKey = usePreviewStorageKey(tipsStorageKey);
  const [snapshot, setSnapshot] = useState<PreviewTipsSnapshot | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    function read() {
      try {
        const raw = localStorage.getItem(storageKey);
        const saved = raw === null ? null : normalizeTipsSnapshot(JSON.parse(raw));
        setSnapshot(saved); setError(raw !== null && !saved ? "Saved tips could not be read. Refresh the preview to create a new set." : "");
      } catch { setError("Saved tips could not be opened in this browser. You can try refreshing the preview."); }
      setReady(true);
    }
    read(); const sync = (event: StorageEvent) => { if (event.key === storageKey) read(); };
    window.addEventListener("storage", sync); window.addEventListener("wattsnap-tips-change", read);
    return () => { window.removeEventListener("storage", sync); window.removeEventListener("wattsnap-tips-change", read); };
  }, [storageKey]);
  function save(next: PreviewTipsSnapshot) {
    try { localStorage.setItem(storageKey, JSON.stringify(next)); setSnapshot(next); setError(""); window.dispatchEvent(new Event("wattsnap-tips-change")); return true; }
    catch { setError(snapshot ? "The refreshed tips could not be saved in this browser. Your previous saved tips are still available." : "The preview tips could not be saved in this browser. No tips have been saved yet; please try again."); return false; }
  }
  return { snapshot, ready, error, save };
}
