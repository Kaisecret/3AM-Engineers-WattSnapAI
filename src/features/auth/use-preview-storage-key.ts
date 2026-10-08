"use client";
import { useSyncExternalStore } from "react";
import { previewSessionEvent, previewSessionKey, readPreviewIdentity } from "./preview-session";

export function previewStorageFor(base: string) {
  const identity = readPreviewIdentity();
  return identity ? `${base}:household:${encodeURIComponent(identity.id)}` : base;
}

function subscribe(changed: () => void) {
  const storage = (event: StorageEvent) => { if (event.key === previewSessionKey || event.key === null) changed(); };
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
