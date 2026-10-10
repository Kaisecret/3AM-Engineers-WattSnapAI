import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../generated/database.types";
/** Pages that need a signed-in account. src/middleware.ts must list the same roots. */
export const protectedRoots = ["dashboard", "setup", "onboarding", "bills", "appliances", "tips", "settings", "assistant", "budget", "brownout-ready", "simulator", "advisories", "complete-profile"];
export function isProtectedPath(path: string) {
  return protectedRoots.some(root => path === `/${root}` || path.startsWith(`/${root}/`));
}
export async function hasVerifiedClaims(client: SupabaseClient<Database>) {
  try {
    const { data, error } = await client.auth.getClaims();
    return !error && !!data?.claims.sub && data.claims.role === "authenticated" && data.claims.is_anonymous !== true;
  } catch { return false; }
}
