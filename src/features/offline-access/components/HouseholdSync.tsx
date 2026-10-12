"use client";
import { useEffect } from "react";
import { getBrowserSupabase } from "../../../lib/supabase/browser";
import { readDisplayIdentity, displayIdentityKey } from "../../auth/session";
import { isNetworkOffline } from "../connectivity";
import { householdStores } from "../../../lib/offline/database";
import { syncRecords } from "../../../lib/offline/sync";
import { createSupabaseBackend } from "../../../lib/offline/supabase-backend";
import { startRecordSync } from "../../../lib/offline/lifecycle";
import { publishSyncStatus } from "../../../lib/offline/status";

export default function HouseholdSync({ accountId }: { accountId: string }) {
  useEffect(() => {
    const stores = householdStores(accountId), client = getBrowserSupabase();
    const current = () => {
      try { return readDisplayIdentity()?.id === accountId && JSON.parse(localStorage.getItem(displayIdentityKey) ?? "null")?.identity?.id === accountId; }
      catch { return false; }
    };
    return startRecordSync({
      accountId, host: window, events: [...new Set(stores.map(store => store.event))], keys: [...new Set(stores.map(store => store.key))],
      isCurrent: current, isOffline: isNetworkOffline,
      status: status => publishSyncStatus(accountId, status),
      subscribeAuth(listener) {
        const { data: { subscription } } = client.auth.onAuthStateChange(event => listener(event));
        return () => subscription.unsubscribe();
      },
      async sync(signal, progress) {
        const backend = await createSupabaseBackend(client, accountId, current, signal, progress);
        return syncRecords({ accountId, stores, storage: localStorage, backend,
          isCurrent: () => current() && !signal.aborted, isOffline: isNetworkOffline,
          changed: event => window.dispatchEvent(new CustomEvent(event, { detail: { source: "database-sync" } })),
        });
      },
    });
  }, [accountId]);
  return null;
}
