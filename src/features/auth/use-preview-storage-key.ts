"use client";
import { useSyncExternalStore } from "react";
import { previewSessionEvent, previewSessionKey, readPreviewIdentity } from "./preview-session";
import { localHouseholdKey, readLocalHousehold } from "../household-profile/local-household";

export function previewStorageFor(base: string) {
  const local = readLocalHousehold();
  if (local) return local.scopeId ? `${base}:household:${encodeURIComponent(local.scopeId)}` : base;
  const identity = readPreviewIdentity();
  return identity ? `${base}:household:${encodeURIComponent(identity.id)}` : base;
}

function subscribe(changed: () => void) {
  const storage = (event: StorageEvent) => { if (event.key === previewSessionKey || event.key === localHouseholdKey || event.key === null) changed(); };
  window.addEventListener(previewSessionEvent, changed);
  window.addEventListener("storage", storage);
  return () => { window.removeEventListener(previewSessionEvent, changed); window.removeEventListener("storage", storage); };
}

/** Keep each read/write bound to its household, including cross-tab identity changes. */
export function usePreviewStorageKey(base: string) {
  return useSyncExternalStore(subscribe, () => {
    try { return previewStorageFor(base); } catch { return `${base}:storage-unavailable`; }
  }, () => base);
}
