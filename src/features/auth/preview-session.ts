/** Compatibility names for local display/data hooks. No authorization. */
import { displayIdentityKey, displayIdentityEvent, readDisplayIdentity, forgetAccount, type DisplayIdentity } from "./session";

export { displayIdentityKey as previewSessionKey, displayIdentityEvent as previewSessionEvent, forgetAccount as endPreviewSession };
export type { DisplayIdentity as PreviewIdentity } from "./session";
export const previewAccountsKey = "wattsnap-preview-identities-v1";

export function readPreviewIdentity(): DisplayIdentity | null {
  const mem = readDisplayIdentity();
  if (mem) return mem;
  try {
    const raw = typeof localStorage !== "undefined" ? JSON.parse(localStorage.getItem("wattsnap-preview-session-v1") ?? "null") : null;
    return raw?.version === 1 && raw?.identity ? raw.identity : null;
  } catch {
    return null;
  }
}
