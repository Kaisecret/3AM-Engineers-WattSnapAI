import type { SyncStatus } from "./lifecycle";
export const syncStatusEvent = "wattsnap-sync-status";
const statuses = new Map<string, SyncStatus>();
const initial: SyncStatus = { state: "pending", failed: [] };
export function readSyncStatus(accountId: string | null) { return accountId ? statuses.get(accountId) ?? initial : initial; }
export function publishSyncStatus(accountId: string, status: SyncStatus) {
  statuses.set(accountId, status);
  window.dispatchEvent(new Event(syncStatusEvent));
}
