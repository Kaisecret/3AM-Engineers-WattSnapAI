/** Compatibility names for local display/data hooks. No authorization. */
export { displayIdentityKey as previewSessionKey, displayIdentityEvent as previewSessionEvent, readDisplayIdentity as readPreviewIdentity, forgetAccount as endPreviewSession } from "./session";
export type { DisplayIdentity as PreviewIdentity } from "./session";
