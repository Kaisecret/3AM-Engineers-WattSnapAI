import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../generated/database.types";
import { readPublicSupabaseEnv, readSupabaseSecretKey } from "../config/env";
export function getAdminSupabase() {
  return createClient<Database>(readPublicSupabaseEnv().url, readSupabaseSecretKey(), { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}
