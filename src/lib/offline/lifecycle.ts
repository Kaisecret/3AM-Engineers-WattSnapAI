import type { SyncState } from "./sync";
export interface SyncStatus { state: SyncState; failed: string[] }

/** One pass per account at a time, with a cross-tab lock where Web Locks is available. */
export function startRecordSync(options: {
  accountId: string; host: Window; events: string[]; keys: string[];
  isCurrent(): boolean; isOffline(): boolean;
  subscribeAuth(listener: (event: string) => void): () => void;
  sync(signal: AbortSignal, progress: () => void): Promise<SyncStatus>;
  status(status: SyncStatus): void;
}): () => void {
  const { host, isCurrent, isOffline, status } = options;
  let active = true, running = false, again = false, timer: number | null = null, controller: AbortController | null = null;
  const publish = (state: SyncState, failed: string[] = []) => { if (active && isCurrent()) status({ state, failed }); };
  const schedule = (event?: Event) => {
    if (event && "detail" in event && (event as CustomEvent).detail?.source === "database-sync") return;
    if (!active || !isCurrent()) return;
    publish(isOffline() ? "offline" : "pending");
    if (running) { again = true; return; }
    if (timer !== null) host.clearTimeout(timer);
    timer = host.setTimeout(() => { timer = null; void run(); }, 250);
  };
  const run = async () => {
    if (!active || !isCurrent()) return;
    if (isOffline()) { publish("offline"); return; }
    running = true; again = false;
    const request = new AbortController(); controller = request;
    let timeout: number | null = null;
    const progress = () => {
      if (!active || request.signal.aborted) return;
      if (timeout !== null) host.clearTimeout(timeout);
      // Limit stalled requests, not the total size of a valid sync. A large
      // offline backlog must keep advancing on a slow but working connection.
      timeout = host.setTimeout(() => request.abort(), 45_000);
    };
    progress();
    try {
      const work = async () => {
        if (!active || !isCurrent() || request.signal.aborted) return;
        publish("syncing");
        const result = await options.sync(request.signal, progress);
        if (result.state === "cancelled" && request.signal.aborted) publish(isOffline() ? "offline" : "pending");
        else if (result.state !== "cancelled" && active && isCurrent()) status(result);
      };
      if (host.navigator.locks) await host.navigator.locks.request(`wattsnap-record-sync:${options.accountId}`, { signal: request.signal }, work);
      else await work();
    } catch { publish(isOffline() ? "offline" : "pending"); }
    finally {
      if (timeout !== null) host.clearTimeout(timeout); controller = null; running = false;
      if (active && again) schedule();
    }
  };
  const offline = () => { controller?.abort(); publish("offline"); };
  const storage = (event: StorageEvent) => { if (event.key === null || options.keys.includes(event.key)) schedule(); };
  const auth = options.subscribeAuth(event => {
    if (event === "SIGNED_OUT" || !isCurrent()) { controller?.abort(); return; }
    // Schedule outside the auth callback so refresh/getUser does not deadlock Auth.
    if (["SIGNED_IN", "INITIAL_SESSION", "TOKEN_REFRESHED", "USER_UPDATED"].includes(event)) schedule();
  });
  const events = [...new Set([...options.events, "online", "focus", "pageshow"])];
  for (const event of events) host.addEventListener(event, schedule);
  host.addEventListener("offline", offline);
  host.addEventListener("storage", storage);
  const retry = host.setInterval(schedule, 30_000);
  schedule();
  return () => {
    active = false; controller?.abort(); auth();
    if (timer !== null) host.clearTimeout(timer);
    host.clearInterval(retry);
    for (const event of events) host.removeEventListener(event, schedule);
    host.removeEventListener("offline", offline);
    host.removeEventListener("storage", storage);
  };
}
