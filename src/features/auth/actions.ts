"use server";
import { headers } from "next/headers";
import { getServerSupabase } from "../../lib/supabase/server";
import { getAdminSupabase } from "../../lib/supabase/admin";
import { readPublicSupabaseEnv, readSupabaseSecretKey } from "../../lib/config/env";
import { parseIdentifier } from "./schemas";
import { hashIp, countRecentFailures, attemptAllowed, findEmailByUsername, recordFailure } from "./repository";
import { GENERIC_LOGIN_FAILURE, signInWithEmail, toFailure } from "./service";
import type { AuthResult } from "./types";
/** Username lookup and privileged credentials never cross the server boundary. */
export async function loginWithIdentifier(input: { identifier: string; password: string }): Promise<AuthResult> {
  const identifier = parseIdentifier(input.identifier);
  const incorrect: AuthResult = { ok: false, kind: "authentication", message: GENERIC_LOGIN_FAILURE };
  if (!identifier || !input.password) return incorrect;
  try {
    const client = await getServerSupabase();
    if (identifier.kind === "email") return await signInWithEmail(client, { email: identifier.email, password: input.password });
    const admin = getAdminSupabase();
    const requestHeaders = await headers();
    // Vercel provides the trusted proxy address; unknown hosts share a conservative bucket.
    const ip = requestHeaders.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const attempt = { username: identifier.username, ipHash: hashIp(ip, readSupabaseSecretKey()) };
    if (!attemptAllowed(await countRecentFailures(admin, attempt))) return { ok: false, kind: "rate-limit", message: "Too many attempts. Please wait a moment and try again." };
    const email = await findEmailByUsername(admin, identifier.username);
    const result = email ? await signInWithEmail(client, { email, password: input.password }) : incorrect;
    if (!result.ok) await recordFailure(admin, attempt);
    return result;
  } catch (error) { return toFailure(error, "login"); }
}

/** The Auth settings endpoint exposes enabled providers using the public API key. */
export async function checkGoogleProvider(): Promise<AuthResult> {
  try {
    const { url, publishableKey } = readPublicSupabaseEnv();
    const response = await fetch(`${url.replace(/\/$/, "")}/auth/v1/settings`, { headers: { apikey: publishableKey }, cache: "no-store", signal: AbortSignal.timeout(10000) });
    if (!response.ok) return { ok: false, kind: "network", message: "Google sign-in could not be checked. Please try again." };
    const settings = await response.json();
    if (settings?.external?.google !== true) return { ok: false, kind: "authorization", message: "Google sign-in is not available yet. Please use your email and password." };
    return { ok: true, value: undefined };
  } catch { return { ok: false, kind: "network", message: "Google sign-in could not be checked. Please try again." }; }
}
