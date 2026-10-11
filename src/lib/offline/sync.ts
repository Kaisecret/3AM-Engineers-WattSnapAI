export type Records = Record<string, unknown>;
export interface RecordStore {
  name: string;
  key: string;
  event: string;
  read(raw: string | null): Records;
  write(records: Records, raw: string | null): string | null;
}
export interface RecordBackend {
  read(store: string): Promise<Records>;
  put(store: string, id: string, value: unknown): Promise<void>;
  remove(store: string, id: string): Promise<void>;
  cleanup?(): Promise<void>;
}
export type SyncState = "syncing" | "synced" | "pending" | "offline" | "cancelled";

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Records;
    return `{${Object.keys(record).filter(key => record[key] !== undefined).sort().map(key => `${JSON.stringify(key)}:${canonical(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}
async function signatures(records: Records): Promise<Record<string, string>> {
  const entries = await Promise.all(Object.entries(records).map(async ([id, value]) => {
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical(value)));
    return [id, Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, "0")).join("")] as const;
  }));
  return Object.fromEntries(entries);
}

/** Local records are the durable outbox; small per-record hashes acknowledge successful writes.
 * An absent key is never a deletion. Only removals relative to an acknowledged baseline delete.
 * Each store is independent, so a failed image or unreadable record cannot block bills/devices.
 */
export async function syncRecords(options: {
  accountId: string; stores: RecordStore[];
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">; backend: RecordBackend;
  isCurrent(): boolean; isOffline(): boolean; changed(event: string): void; onError?(store: string, error: unknown): void;
}): Promise<{ state: SyncState; failed: string[] }> {
  const { accountId, stores, storage, backend, isCurrent, isOffline, changed } = options;
  const failed: string[] = [];
  let pending = false;
  if (!isCurrent()) return { state: "cancelled", failed };
  if (isOffline()) return { state: "offline", failed };
  // Several descriptors share the household key. Remember missing keys before
  // any descriptor hydrates them, so clearing device copies never clears the DB.
  const absentKeys = new Set<string>();
  for (const store of stores) {
    try { if (storage.getItem(store.key) === null) absentKeys.add(store.key); } catch { /* The affected store reports the error below. */ }
  }
  for (const store of stores) {
    if (!isCurrent()) return { state: "cancelled", failed };
    if (isOffline()) return { state: "offline", failed };
    try {
      const raw = storage.getItem(store.key);
      const local = store.read(raw), localHashes = await signatures(local);
      const ackKey = `wattsnap-sync-ack-v1:${accountId}:${store.name}`;
      const saved = JSON.parse(storage.getItem(ackKey) ?? "null");
      if (saved !== null && (saved.version !== 1 || !saved.hashes || typeof saved.hashes !== "object" || Array.isArray(saved.hashes) || Object.values(saved.hashes).some(hash => typeof hash !== "string" || !/^[a-f0-9]{64}$/.test(hash)))) throw new Error("Unreadable sync acknowledgement");
      const baseline: Record<string, string> = saved?.hashes ?? {};
      const attempts: Record<string, string> = saved?.attempts ?? {};
      if (!attempts || typeof attempts !== "object" || Array.isArray(attempts) || Object.values(attempts).some(hash => typeof hash !== "string" || !/^[a-f0-9]{64}$/.test(hash))) throw new Error("Unreadable pending sync writes");
      const acknowledge = () => storage.setItem(ackKey, JSON.stringify({ version: 1, hashes: baseline, attempts }));
      const remote = await backend.read(store.name);
      // Delete before inserts, including replacement bills at the same billing month.
      for (const id of new Set([...Object.keys(baseline), ...Object.keys(attempts)])) {
        if (raw === null || absentKeys.has(store.key) || id in local) continue;
        if (!isCurrent()) return { state: "cancelled", failed };
        await backend.remove(store.name, id);
        delete remote[id];
        delete baseline[id]; delete attempts[id]; acknowledge();
      }
      for (const [id, value] of Object.entries(local)) {
        if (localHashes[id] === baseline[id] && !(id in attempts)) continue;
        if (!isCurrent()) return { state: "cancelled", failed };
        // Persist intent before the request: a lost response may still have
        // inserted the row, so a later offline deletion must be replayable.
        attempts[id] = localHashes[id]; acknowledge();
        await backend.put(store.name, id, value);
        remote[id] = value;
        baseline[id] = localHashes[id]; delete attempts[id]; acknowledge();
      }
      if (!isCurrent()) return { state: "cancelled", failed };
      const remoteHashes = await signatures(remote);
      if (!isCurrent()) return { state: "cancelled", failed };
      // Re-read after all requests. Edits/deletions made while uploading must survive hydration.
      const latestRaw = storage.getItem(store.key), latest = store.read(latestRaw);
      const latestHashes = await signatures(latest), merged = { ...remote };
      for (const id of new Set([...Object.keys(local), ...Object.keys(latest)])) {
        if (latestHashes[id] === localHashes[id]) continue;
        pending = true;
        if (id in latest) merged[id] = latest[id]; else delete merged[id];
      }
      if (!isCurrent()) return { state: "cancelled", failed };
      // No await between the final compare and writes: a concurrent tab cannot be overwritten.
      if (storage.getItem(store.key) !== latestRaw) { pending = true; continue; }
      const nextRaw = latestRaw === null && Object.keys(merged).length === 0 ? null : store.write(merged, latestRaw);
      store.read(nextRaw); // Never acknowledge a merged document the offline UI cannot read.
      if (nextRaw !== latestRaw) {
        if (nextRaw === null) storage.removeItem(store.key); else storage.setItem(store.key, nextRaw);
      }
      storage.setItem(ackKey, JSON.stringify({ version: 1, hashes: remoteHashes }));
      if (nextRaw !== latestRaw) changed(store.event);
    } catch (error) {
      failed.push(store.name);
      options.onError?.(store.name, error);
    }
  }
  if (isCurrent() && !isOffline() && backend.cleanup) {
    try { await backend.cleanup(); } catch (error) { failed.push("images"); options.onError?.("images", error); }
  }
  return { state: failed.length || pending ? "pending" : "synced", failed };
}
