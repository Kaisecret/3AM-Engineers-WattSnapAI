import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeEmail, normalizeUsername, safeNextPath, validateCode, validateEmail, validateFullName, validatePassword, validateUsername } from "./schemas";
import type { Account, AuthFailure, AuthFailureKind, AuthResult } from "./types";

type Client = SupabaseClient;
type ErrorLike = { code?: string; status?: number; name?: string; message?: string };

export const GENERIC_LOGIN_FAILURE = "Incorrect email, username, or password.";
const SESSION_ENDED = "Your session has ended. Please log in again.";
const OFFLINE = "You're offline or the server can't be reached. Please try again.";
const TOO_MANY = "Too many attempts. Please wait a moment and try again.";
const UNAVAILABLE = "This sign-in method is not available right now.";
const PROFILE_MISSING = "Your profile could not be found. Please log in again.";
const UNKNOWN = "Something went wrong. Please try again.";

/** Supabase Auth and Postgres error codes, and what a person is told instead. */
const FAILURES = new Map<string, [AuthFailureKind, string]>([
  ["invalid_credentials", ["authentication", GENERIC_LOGIN_FAILURE]],
  ["email_not_confirmed", ["authentication", "Please verify your email before logging in."]],
  ["otp_expired", ["authentication", "That code is incorrect or has expired. Request a new one."]],
  ["captcha_failed", ["authentication", "The security check did not pass. Please try again."]],
  ["session_not_found", ["authentication", SESSION_ENDED]],
  ["session_expired", ["authentication", SESSION_ENDED]],
  ["refresh_token_not_found", ["authentication", SESSION_ENDED]],
  ["bad_jwt", ["authentication", SESSION_ENDED]],
  ["PGRST301", ["authentication", SESSION_ENDED]],
  ["weak_password", ["validation", "Choose a stronger password."]],
  ["same_password", ["validation", "Choose a password you have not used before."]],
  ["email_address_invalid", ["validation", "Please enter a valid email address."]],
  ["validation_failed", ["validation", "Please check what you entered and try again."]],
  ["over_email_send_rate_limit", ["rate-limit", "Please wait a minute before requesting another code."]],
  ["over_request_rate_limit", ["rate-limit", TOO_MANY]],
  ["user_banned", ["authorization", "This account cannot be used."]],
  ["signup_disabled", ["authorization", UNAVAILABLE]],
  ["email_provider_disabled", ["authorization", UNAVAILABLE]],
  ["provider_disabled", ["authorization", UNAVAILABLE]],
  ["42501", ["authorization", "You do not have access to that."]],
]);
const SIGNED_OUT = new Set(["session_not_found", "session_expired", "refresh_token_not_found", "bad_jwt", "user_not_found"]);

const ok = <T>(value: T): AuthResult<T> => ({ ok: true, value });
const done = (): AuthResult => ({ ok: true, value: undefined });
const fail = (kind: AuthFailureKind, message: string): AuthFailure => ({ ok: false, kind, message });
const invalid = (message: string) => fail("validation", message);
const asError = (error: unknown): ErrorLike => (error && typeof error === "object" ? error as ErrorLike : {});

function isNetwork(error: ErrorLike) {
  return error.name === "AuthRetryableFetchError" || error.status === 0 || error.name === "TypeError" || /fetch failed|failed to fetch|networkerror/i.test(error.message ?? "");
}
function isSignedOut(error: ErrorLike) {
  return error.name === "AuthSessionMissingError" || (!!error.code && SIGNED_OUT.has(error.code));
}

/** Turns any provider or database error into a failure that is safe to show. */
export function toFailure(error: unknown, context = "auth"): AuthFailure {
  const issue = asError(error);
  // The raw text stays in the log. People only ever see the messages above.
  console.error(`[wattsnap:${context}]`, issue.code || issue.name || "error", issue.status ?? "", issue.message ?? "");
  if (isNetwork(issue)) return fail("network", OFFLINE);
  const known = issue.code ? FAILURES.get(issue.code) : undefined;
  if (known) return fail(known[0], known[1]);
  if (issue.status === 429) return fail("rate-limit", TOO_MANY);
  return fail("unknown", UNKNOWN);
}

async function attempt<T>(run: () => Promise<AuthResult<T>>): Promise<AuthResult<T>> {
  try { return await run(); }
  catch (error) { return toFailure(error); }
}

export async function signUpWithEmail(client: Client, input: { fullName: string; email: string; password: string; captchaToken?: string }): Promise<AuthResult<{ email: string }>> {
  const issue = validateFullName(input.fullName) ?? validateEmail(input.email) ?? validatePassword(input.password);
  if (issue) return invalid(issue);
  const email = normalizeEmail(input.email);
  return attempt(async () => {
    const { error } = await client.auth.signUp({ email, password: input.password, options: { data: { full_name: input.fullName.trim() }, captchaToken: input.captchaToken } });
    // An address that already has an account answers exactly like a new one, so addresses cannot be probed.
    if (error && error.code !== "user_already_exists" && error.code !== "email_exists") return toFailure(error);
    return ok({ email });
  });
}

export async function verifySignupCode(client: Client, input: { email: string; code: string }): Promise<AuthResult> {
  const issue = validateEmail(input.email) ?? validateCode(input.code);
  if (issue) return invalid(issue);
  return attempt(async () => {
    const { error } = await client.auth.verifyOtp({ email: normalizeEmail(input.email), token: input.code.trim(), type: "email" });
    return error ? toFailure(error) : done();
  });
}

export async function resendSignupCode(client: Client, input: { email: string; captchaToken?: string }): Promise<AuthResult> {
  const issue = validateEmail(input.email);
  if (issue) return invalid(issue);
  return attempt(async () => {
    const { error } = await client.auth.resend({ type: "signup", email: normalizeEmail(input.email), options: { captchaToken: input.captchaToken } });
    return error ? toFailure(error) : done();
  });
}

export async function signInWithEmail(client: Client, input: { email: string; password: string; captchaToken?: string }): Promise<AuthResult> {
  // A malformed email or an empty password gets the same answer as a wrong one.
  if (validateEmail(input.email) || !input.password) return fail("authentication", GENERIC_LOGIN_FAILURE);
  return attempt(async () => {
    const { error } = await client.auth.signInWithPassword({ email: normalizeEmail(input.email), password: input.password, options: { captchaToken: input.captchaToken } });
    return error ? toFailure(error) : done();
  });
}

export async function signInWithGoogle(client: Client, input: { origin: string; next?: string | null }): Promise<AuthResult> {
  return attempt(async () => {
    const redirectTo = `${input.origin}/auth/callback?next=${encodeURIComponent(safeNextPath(input.next))}`;
    const { error } = await client.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
    return error ? toFailure(error) : done();
  });
}

/** Succeeds whether or not the address is registered. Supabase does not reveal which. */
export async function requestPasswordReset(client: Client, input: { email: string; captchaToken?: string }): Promise<AuthResult> {
  const issue = validateEmail(input.email);
  if (issue) return invalid(issue);
  return attempt(async () => {
    const { error } = await client.auth.resetPasswordForEmail(normalizeEmail(input.email), { captchaToken: input.captchaToken });
    return error ? toFailure(error) : done();
  });
}

export async function verifyRecoveryCode(client: Client, input: { email: string; code: string }): Promise<AuthResult> {
  const issue = validateEmail(input.email) ?? validateCode(input.code);
  if (issue) return invalid(issue);
  return attempt(async () => {
    const { error } = await client.auth.verifyOtp({ email: normalizeEmail(input.email), token: input.code.trim(), type: "recovery" });
    return error ? toFailure(error) : done();
  });
}

export async function updatePassword(client: Client, input: { password: string }): Promise<AuthResult> {
  const issue = validatePassword(input.password);
  if (issue) return invalid(issue);
  return attempt(async () => {
    const { error } = await client.auth.updateUser({ password: input.password });
    if (error) return toFailure(error);
    // A changed password should end every session, including one someone else opened.
    const { error: signOutError } = await client.auth.signOut({ scope: "global" });
    if (signOutError) {
      toFailure(signOutError);
      return fail("unknown", "Your password was updated, but your other devices could not be signed out. Log out and log in again.");
    }
    return done();
  });
}

export async function completeProfile(client: Client, input: { fullName: string; username: string }): Promise<AuthResult> {
  const issue = validateFullName(input.fullName) ?? validateUsername(input.username);
  if (issue) return invalid(issue);
  return attempt(async () => {
    const { data: { user }, error } = await client.auth.getUser();
    if (error) return isSignedOut(asError(error)) ? fail("authentication", SESSION_ENDED) : toFailure(error);
    if (!user) return fail("authentication", SESSION_ENDED);
    const { data: current, error: readError } = await client.from("profiles").select("onboarded_at").eq("id", user.id).maybeSingle();
    if (readError) return toFailure(readError, "profile");
    if (!current) return fail("authorization", PROFILE_MISSING);
    const change = {
      full_name: input.fullName.trim(),
      username: normalizeUsername(input.username),
      ...(current.onboarded_at ? {} : { onboarded_at: new Date().toISOString() }),
    };
    const { error: saveError } = await client.from("profiles").update(change).eq("id", user.id);
    if (saveError) return saveError.code === "23505" ? fail("conflict", "That username is taken.") : toFailure(saveError, "profile");
    return done();
  });
}

/** Ends the session on this device. Other devices stay signed in. */
export async function signOut(client: Client): Promise<AuthResult> {
  return attempt(async () => {
    const { error } = await client.auth.signOut({ scope: "local" });
    return error ? toFailure(error) : done();
  });
}

/** The signed-in account with its profile, or `null` when nobody is signed in. */
export async function getAccount(client: Client): Promise<AuthResult<Account | null>> {
  return attempt<Account | null>(async () => {
    const { data: { user }, error } = await client.auth.getUser();
    if (error) return isSignedOut(asError(error)) ? ok(null) : toFailure(error);
    if (!user) return ok(null);
    const { data: row, error: readError } = await client.from("profiles")
      .select("full_name, username, avatar_path, onboarded_at, notify_brownouts, notify_bill_reminders, notify_tips")
      .eq("id", user.id).maybeSingle();
    if (readError) return toFailure(readError, "profile");
    if (!row) return fail("authorization", PROFILE_MISSING);
    return ok({
      id: user.id,
      email: user.email ?? "",
      profile: {
        fullName: row.full_name, username: row.username, avatarPath: row.avatar_path, onboardedAt: row.onboarded_at,
        notifications: { brownouts: row.notify_brownouts, billReminders: row.notify_bill_reminders, tips: row.notify_tips },
      },
    });
  });
}
