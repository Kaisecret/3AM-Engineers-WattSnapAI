import { previewAccountsKey, readPreviewIdentity, previewSessionEvent } from "../auth/preview-session";

export const localHouseholdKey = "wattsnap-local-household-v1";
type LocalHousehold = { version: 1; scopeId?: string };
export function readLocalHousehold(): LocalHousehold | null {
  const raw = localStorage.getItem(localHouseholdKey);
  if (raw === null) return null;
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object" || (value as LocalHousehold).version !== 1 || ((value as LocalHousehold).scopeId !== undefined && (typeof (value as LocalHousehold).scopeId !== "string" || !(value as LocalHousehold).scopeId?.trim()))) throw new Error("Your saved household selection could not be read. Existing records are unchanged.");
  return value as LocalHousehold;
}
export function hasLocalHousehold() {
  return !!(readLocalHousehold() || readPreviewIdentity() || localStorage.getItem("wattsnap-ui-preview-v1") || localStorage.getItem(previewAccountsKey));
}
/** A storage pointer, never authentication. Retain every previous scope untouched. */
export function openLocalHousehold() {
  const existing = readLocalHousehold(); if (existing) return existing;
  let scopeId = readPreviewIdentity()?.id;
  if (!scopeId && localStorage.getItem("wattsnap-ui-preview-v1") === null) {
    const directory = JSON.parse(localStorage.getItem(previewAccountsKey) ?? "null");
    const last = directory?.version === 1 && Array.isArray(directory.accounts) ? directory.accounts.at(-1) : null;
    if (last && typeof last.id === "string" && last.id.trim()) scopeId = last.id;
  }
  const next: LocalHousehold = { version: 1, ...(scopeId ? { scopeId } : {}) };
  localStorage.setItem(localHouseholdKey, JSON.stringify(next));
  window.dispatchEvent(new Event(previewSessionEvent));
  return next;
}
