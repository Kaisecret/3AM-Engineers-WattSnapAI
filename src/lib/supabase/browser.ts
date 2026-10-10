"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "../../generated/database.types";
import { readPublicSupabaseEnv } from "../config/env";
export function getBrowserSupabase() {
  const { url, publishableKey } = readPublicSupabaseEnv();
  return createBrowserClient<Database>(url, publishableKey);
}
