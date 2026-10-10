import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "../../generated/database.types";
import { readPublicSupabaseEnv } from "../config/env";
export async function getServerSupabase() {
  const store = await cookies();
  const { url, publishableKey } = readPublicSupabaseEnv();
  return createServerClient<Database>(url, publishableKey, { cookies: {
    getAll: () => store.getAll(),
    setAll(values) {
      try { values.forEach(({ name, value, options }) => store.set(name, value, options)); }
      catch { /* Components cannot write cookies; middleware refreshes them. */ }
    },
  } });
}
