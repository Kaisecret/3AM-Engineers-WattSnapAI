import type { Account } from "./types";
import { isDeviceOffline } from "../offline-access/connectivity";
export const displayIdentityKey = "wattsnap-account-display-v1";
export const displayIdentityEvent = "wattsnap-preview-session-change";
export interface DisplayIdentity { id: string; email: string; name: string; username?: string }
let current: DisplayIdentity | null = null;
/** Display and local data scope only; server authorization never reads this cache. */
export function rememberAccount(account: Account) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(account.id)) throw new Error("A verified account ID is required.");
  current = { id: account.id, email: account.email, name: account.profile.fullName, ...(account.profile.username ? { username: account.profile.username } : {}) };
  localStorage.removeItem("wattsnap-preview-session-v1");
  localStorage.removeItem("wattsnap-preview-identities-v1");
  localStorage.setItem(displayIdentityKey, JSON.stringify({ version: 1, identity: current }));
  window.dispatchEvent(new Event(displayIdentityEvent));
}
/** Persisted values never establish a signed-in account. */
export function readDisplayIdentity() { return current; }
/** Device-local scope only. Reconnecting must go through the server's normal account check. */
export function restoreOfflineAccount(): DisplayIdentity | null {
  if (!isDeviceOffline()) return null;
  current = null;
  try {
    const saved = JSON.parse(localStorage.getItem(displayIdentityKey) ?? "null");
    const identity = saved?.version === 1 ? saved.identity : null;
    if (!identity || typeof identity.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identity.id) || typeof identity.name !== "string" || !identity.name.trim() || typeof identity.email !== "string") return null;
    current = { id: identity.id, name: identity.name.slice(0, 80), email: identity.email.slice(0, 254) };
    window.dispatchEvent(new Event(displayIdentityEvent));
    return current;
  } catch { return null; }
}
export function forgetAccount() {
  current = null;
  try {
    localStorage.removeItem(displayIdentityKey);
    localStorage.removeItem("wattsnap-preview-session-v1");
    localStorage.removeItem("wattsnap-preview-identities-v1");
  } finally { window.dispatchEvent(new Event(displayIdentityEvent)); }
}
/** Drop this tab's local scope without removing another tab's newly verified account. */
export function clearDisplayIdentityMemory() { current = null; }
