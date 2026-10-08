"use client";
import { useSyncExternalStore } from "react";

export type AppTheme = "light" | "dark";
export const themeStorageKey = "wattsnap-theme-v1";
const themeEvent = "wattsnap-theme-change";
function readTheme(): AppTheme {
  try { return localStorage.getItem(themeStorageKey) === "dark" ? "dark" : "light"; }
  catch { return "light"; }
}
function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(themeEvent, listener);
  return () => { window.removeEventListener("storage", listener); window.removeEventListener(themeEvent, listener); };
}
export function useAppTheme() { return useSyncExternalStore(subscribe, readTheme, () => "light" as const); }
export function saveAppTheme(theme: AppTheme) {
  try { localStorage.setItem(themeStorageKey, theme); window.dispatchEvent(new Event(themeEvent)); return true; }
  catch { return false; }
}
