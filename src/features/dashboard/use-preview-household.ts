"use client";
import { useEffect, useRef, useState } from "react";
import { previewStorageFor, usePreviewStorageKey } from "@/features/auth/use-preview-storage-key";
import { normalizePreview, emptyPreview, previewStorageKey, type PreviewHousehold } from "./preview-data";
import { householdRecords, mergeHouseholdRecords } from "./local-records";
import { readPreviewIdentity } from "@/features/auth/preview-session";

export function usePreviewHousehold() {
  const storageKey = usePreviewStorageKey(previewStorageKey);
  const stored = useRef<string | null>(null);
  const [household, setHousehold] = useState(emptyPreview);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const ready = loadedKey === storageKey;
  const [storageError, setStorageError] = useState("");
  const [loadError, setLoadError] = useState(false);
  useEffect(() => {
    function read() {
      try {
        if (previewStorageFor(previewStorageKey) !== storageKey) { setLoadedKey(null); return; }
        const saved = localStorage.getItem(storageKey); stored.current = saved;
        const candidate = readPreviewIdentity();
        const identity = candidate && storageKey.endsWith(`:household:${encodeURIComponent(candidate.id)}`) ? candidate : null;
        if (saved !== null) { const parsed = JSON.parse(saved); if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Unreadable household"); const normalized = normalizePreview(parsed); if ((parsed.bills && (!Array.isArray(parsed.bills) || parsed.bills.length !== normalized.bills.length)) || (parsed.appliances && (!Array.isArray(parsed.appliances) || parsed.appliances.length !== normalized.appliances.length))) throw new Error("Unreadable records"); }
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
    try { if (previewStorageFor(previewStorageKey) !== storageKey) return false; const raw = localStorage.getItem(storageKey); if (raw !== stored.current) throw new Error("Saved household changed"); const parsed = raw === null ? household : JSON.parse(raw); const next = { ...parsed, ...mergeHouseholdRecords(raw === null ? household : normalizePreview(parsed), change) }; localStorage.setItem(storageKey, JSON.stringify(next)); stored.current = JSON.stringify(next); setHousehold(next); setStorageError(""); window.dispatchEvent(new Event("wattsnap-preview-change")); return true; }
    catch { setStorageError("Your changes could not be saved in this browser. Please try again."); return false; }
  }
  return { household: ready ? householdRecords(household) : emptyPreview, update, ready, storageError };
}
