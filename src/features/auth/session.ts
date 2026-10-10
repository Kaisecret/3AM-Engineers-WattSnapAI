import type { Account } from "./types";
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
export function forgetAccount() {
  current = null;
  try {
    localStorage.removeItem(displayIdentityKey);
    localStorage.removeItem("wattsnap-preview-session-v1");
    localStorage.removeItem("wattsnap-preview-identities-v1");
  } finally { window.dispatchEvent(new Event(displayIdentityEvent)); }
}
