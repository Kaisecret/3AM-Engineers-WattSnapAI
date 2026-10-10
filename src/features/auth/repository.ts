import { createHmac } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Server only. Every function here takes a client created with the secret key. */
type Admin = SupabaseClient;

export const MAX_USERNAME_FAILURES = 5;
export const MAX_IP_FAILURES = 20;
export const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
export const ATTEMPT_RETENTION_MS = 24 * 60 * 60 * 1000;

export interface AttemptCounts { username: number; ip: number }

/** May this caller try a username sign-in now? `counts` are failures inside the window. */
export function attemptAllowed(counts: AttemptCounts) {
  return counts.username < MAX_USERNAME_FAILURES && counts.ip < MAX_IP_FAILURES;
}

/** The address itself is never stored, only this keyed hash of it. */
export function hashIp(ip: string, secret: string) {
  return createHmac("sha256", secret).update(ip.trim()).digest("hex");
}

const failed = (action: string, error: { code?: string }) => new Error(`${action} failed (${error.code || "unknown"})`);

export async function findEmailByUsername(admin: Admin, username: string): Promise<string | null> {
  const { data, error } = await admin.from("profiles").select("id").eq("username", username).maybeSingle();
  if (error) throw failed("Username lookup", error);
  if (!data) return null;
  const { data: found, error: userError } = await admin.auth.admin.getUserById(data.id);
  if (userError) throw failed("Account lookup", userError);
  return found.user?.email ?? null;
}

export async function countRecentFailures(admin: Admin, input: { username: string; ipHash: string; now?: Date }): Promise<AttemptCounts> {
  const since = new Date((input.now ?? new Date()).getTime() - ATTEMPT_WINDOW_MS).toISOString();
  const count = async (column: "username" | "ip_hash", value: string) => {
    const { count: total, error } = await admin.from("auth_login_attempts").select("id", { count: "exact", head: true }).eq(column, value).gte("attempted_at", since);
    if (error) throw failed("Attempt count", error);
    return total ?? 0;
  };
  const [username, ip] = await Promise.all([count("username", input.username), count("ip_hash", input.ipHash)]);
  return { username, ip };
}

export async function recordFailure(admin: Admin, input: { username: string; ipHash: string; now?: Date }): Promise<void> {
  const now = input.now ?? new Date();
  const { error } = await admin.from("auth_login_attempts").insert({ username: input.username, ip_hash: input.ipHash, attempted_at: now.toISOString() });
  if (error) throw failed("Attempt record", error);
  const { error: pruneError } = await admin.from("auth_login_attempts").delete().lt("attempted_at", new Date(now.getTime() - ATTEMPT_RETENTION_MS).toISOString());
  if (pruneError) throw failed("Attempt cleanup", pruneError);
}
