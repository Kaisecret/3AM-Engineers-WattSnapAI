import assert from "node:assert/strict";
import test, { mock } from "node:test";
import { registerHooks } from "node:module";
// Project .ts files import their siblings without an extension, as Next.js allows.
registerHooks({ resolve(specifier, context, nextResolve) {
  try { return nextResolve(specifier, context); }
  catch (error) {
    if (error.code === "ERR_MODULE_NOT_FOUND" && specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) return nextResolve(`${specifier}.ts`, context);
    throw error;
  }
} });
const service = await import("./service.ts");

// The service logs raw errors. Keep the test output readable.
mock.method(console, "error", () => {});

/** A stand-in client. `replies` maps an auth method name to its reply, or to a function that builds one. */
function fakeClient(replies = {}, from) {
  const calls = [];
  const auth = new Proxy({}, { get: (_, method) => async (...args) => {
    calls.push([method, ...args]);
    const reply = replies[method];
    return typeof reply === "function" ? reply(...args) : reply ?? { data: {}, error: null };
  } });
  return { client: { auth, from: from ?? (() => { throw new Error("unexpected table access"); }) }, calls };
}
/** A stand-in for client.from("profiles"): `.maybeSingle()` answers `current`; awaiting an update answers `save`. */
function profilesTable({ current, save = { error: null } }) {
  const writes = [];
  const from = () => {
    let saving = false;
    const chain = {
      select: () => chain,
      update: change => { saving = true; writes.push(change); return chain; },
      eq: () => chain,
      maybeSingle: async () => current,
      then: (resolve, reject) => Promise.resolve(saving ? save : current).then(resolve, reject),
    };
    return chain;
  };
  return { from, writes };
}
const user = { id: "11111111-1111-4111-8111-111111111111", email: "maria@gmail.com" };
const good = { fullName: "Maria Santos", email: "Maria@Gmail.com", password: "abc12345x" };

test("invalid input is refused before any request", async () => {
  const { client, calls } = fakeClient();
  assert.deepEqual(await service.signUpWithEmail(client, { ...good, fullName: " " }), { ok: false, kind: "validation", message: "Please enter your full name." });
  assert.deepEqual(await service.signUpWithEmail(client, { ...good, email: "maria" }), { ok: false, kind: "validation", message: "Please enter a valid email address." });
  assert.deepEqual(await service.signUpWithEmail(client, { ...good, password: "short" }), { ok: false, kind: "validation", message: "Password must be at least 8 characters long." });
  assert.deepEqual(await service.verifySignupCode(client, { email: good.email, code: "12" }), { ok: false, kind: "validation", message: "Enter the 6-digit code from your email." });
  assert.deepEqual(await service.updatePassword(client, { password: "Password123" }), { ok: false, kind: "validation", message: "Password must not be commonly used." });
  assert.deepEqual(await service.completeProfile(client, { fullName: "Maria", username: "M" }), { ok: false, kind: "validation", message: "Usernames use 3 to 30 lowercase letters, numbers, dots or underscores." });
  assert.equal(calls.length, 0);
});

test("sign-up sends the normalised email, the name and the bot-check token", async () => {
  const { client, calls } = fakeClient();
  assert.deepEqual(await service.signUpWithEmail(client, { ...good, fullName: " Maria Santos ", captchaToken: "token" }), { ok: true, value: { email: "maria@gmail.com" } });
  assert.deepEqual(calls, [["signUp", { email: "maria@gmail.com", password: "abc12345x", options: { data: { full_name: "Maria Santos" }, captchaToken: "token" } }]]);
});

test("sign-up answers the same for a new address and a registered one", async () => {
  const expected = { ok: true, value: { email: "maria@gmail.com" } };
  const replies = [
    { data: { user: { identities: [{}] } }, error: null },
    { data: { user: { identities: [] } }, error: null },
    { data: { user: null }, error: { code: "user_already_exists", status: 422, message: "User already registered" } },
    { data: { user: null }, error: { code: "email_exists", status: 422, message: "Email exists" } },
  ];
  for (const reply of replies) assert.deepEqual(await service.signUpWithEmail(fakeClient({ signUp: reply }).client, good), expected);
});

test("each provider error maps to a safe kind and message", async () => {
  const cases = [
    ["invalid_credentials", 400, "authentication", "Incorrect email, username, or password."],
    ["email_not_confirmed", 400, "authentication", "Please verify your email before logging in."],
    ["otp_expired", 403, "authentication", "That code is incorrect or has expired. Request a new one."],
    ["captcha_failed", 400, "authentication", "The security check did not pass. Please try again."],
    ["session_not_found", 403, "authentication", "Your session has ended. Please log in again."],
    ["weak_password", 422, "validation", "Choose a stronger password."],
    ["same_password", 422, "validation", "Choose a password you have not used before."],
    ["email_address_invalid", 400, "validation", "Please enter a valid email address."],
    ["over_email_send_rate_limit", 429, "rate-limit", "Please wait a minute before requesting another code."],
    ["over_request_rate_limit", 429, "rate-limit", "Too many attempts. Please wait a moment and try again."],
    ["user_banned", 403, "authorization", "This account cannot be used."],
    ["provider_disabled", 400, "authorization", "This sign-in method is not available right now."],
    ["42501", 403, "authorization", "You do not have access to that."],
    ["something_new", 429, "rate-limit", "Too many attempts. Please wait a moment and try again."],
    ["something_new", 500, "unknown", "Something went wrong. Please try again."],
    ["constructor", 500, "unknown", "Something went wrong. Please try again."],
  ];
  for (const [code, status, kind, message] of cases) assert.deepEqual(service.toFailure({ code, status, message: "raw text" }), { ok: false, kind, message }, code);
});

test("raw error text never reaches the message", async () => {
  const raw = 'duplicate key value violates unique constraint "profiles_username_key" for maria@gmail.com';
  const { client } = fakeClient({ signInWithPassword: { data: {}, error: { code: "unexpected_failure", status: 500, message: raw } } });
  const result = await service.signInWithEmail(client, good);
  assert.deepEqual(result, { ok: false, kind: "unknown", message: "Something went wrong. Please try again." });
  for (const input of [null, undefined, "boom", 42]) assert.equal(service.toFailure(input).kind, "unknown");
});

test("a failed connection is reported as a network failure", async () => {
  const offline = "You're offline or the server can't be reached. Please try again.";
  const thrown = fakeClient({ signInWithPassword: () => { throw new TypeError("fetch failed"); } }).client;
  assert.deepEqual(await service.signInWithEmail(thrown, good), { ok: false, kind: "network", message: offline });
  const returned = fakeClient({ signInWithPassword: { data: {}, error: { name: "AuthRetryableFetchError", status: 0, message: "Failed to fetch" } } }).client;
  assert.deepEqual(await service.signInWithEmail(returned, good), { ok: false, kind: "network", message: offline });
});

test("login gives one message for a malformed email, an empty password and a wrong password", async () => {
  const generic = { ok: false, kind: "authentication", message: "Incorrect email, username, or password." };
  const { client, calls } = fakeClient({ signInWithPassword: { data: {}, error: { code: "invalid_credentials", status: 400, message: "Invalid login credentials" } } });
  assert.deepEqual(await service.signInWithEmail(client, { email: "maria", password: "abc12345x" }), generic);
  assert.deepEqual(await service.signInWithEmail(client, { email: good.email, password: "" }), generic);
  assert.equal(calls.length, 0);
  assert.deepEqual(await service.signInWithEmail(client, good), generic);
  assert.deepEqual(calls, [["signInWithPassword", { email: "maria@gmail.com", password: "abc12345x", options: { captchaToken: undefined } }]]);
});

test("codes are verified with the right type", async () => {
  const { client, calls } = fakeClient();
  assert.deepEqual(await service.verifySignupCode(client, { email: good.email, code: " 123456 " }), { ok: true, value: undefined });
  assert.deepEqual(await service.verifyRecoveryCode(client, { email: good.email, code: "654321" }), { ok: true, value: undefined });
  assert.deepEqual(await service.resendSignupCode(client, { email: good.email }), { ok: true, value: undefined });
  assert.deepEqual(await service.requestPasswordReset(client, { email: good.email, captchaToken: "token" }), { ok: true, value: undefined });
  assert.deepEqual(calls, [
    ["verifyOtp", { email: "maria@gmail.com", token: "123456", type: "email" }],
    ["verifyOtp", { email: "maria@gmail.com", token: "654321", type: "recovery" }],
    ["resend", { type: "signup", email: "maria@gmail.com", options: { captchaToken: undefined } }],
    ["resetPasswordForEmail", "maria@gmail.com", { captchaToken: "token" }],
  ]);
});

test("Google sign-in returns to the callback with a safe next path", async () => {
  const { client, calls } = fakeClient();
  await service.signInWithGoogle(client, { origin: "https://wattsnap.example", next: "/bills/new" });
  await service.signInWithGoogle(client, { origin: "https://wattsnap.example", next: "https://evil.example" });
  assert.deepEqual(calls.map(call => call[1].options.redirectTo), ["https://wattsnap.example/auth/callback?next=%2Fbills%2Fnew", "https://wattsnap.example/auth/callback?next=%2Fdashboard"]);
  assert.equal(calls[0][1].provider, "google");
});

test("changing the password signs out every session", async () => {
  const { client, calls } = fakeClient();
  assert.deepEqual(await service.updatePassword(client, { password: "abc12345x" }), { ok: true, value: undefined });
  assert.deepEqual(calls, [["updateUser", { password: "abc12345x" }], ["signOut", { scope: "global" }]]);
  const failing = fakeClient({ updateUser: { data: {}, error: { code: "same_password", status: 422, message: "raw" } } });
  assert.equal((await service.updatePassword(failing.client, { password: "abc12345x" })).kind, "validation");
  assert.deepEqual(failing.calls.map(call => call[0]), ["updateUser"]);
});

test("logging out ends this device's session only", async () => {
  const { client, calls } = fakeClient();
  assert.deepEqual(await service.signOut(client), { ok: true, value: undefined });
  assert.deepEqual(calls, [["signOut", { scope: "local" }]]);
});

test("completing a profile saves the name and username and marks onboarding once", async () => {
  const fresh = profilesTable({ current: { data: { onboarded_at: null }, error: null } });
  const signedIn = { getUser: { data: { user }, error: null } };
  assert.deepEqual(await service.completeProfile(fakeClient(signedIn, fresh.from).client, { fullName: " Maria Santos ", username: " Maria.Santos " }), { ok: true, value: undefined });
  assert.equal(fresh.writes[0].full_name, "Maria Santos");
  assert.equal(fresh.writes[0].username, "maria.santos");
  assert.ok(Number.isFinite(Date.parse(fresh.writes[0].onboarded_at)));

  const returning = profilesTable({ current: { data: { onboarded_at: "2026-10-01T00:00:00Z" }, error: null } });
  await service.completeProfile(fakeClient(signedIn, returning.from).client, { fullName: "Maria Santos", username: "maria.santos" });
  assert.deepEqual(returning.writes[0], { full_name: "Maria Santos", username: "maria.santos" });
});

test("a taken username is a conflict; a missing session is an authentication failure", async () => {
  const signedIn = { getUser: { data: { user }, error: null } };
  const taken = profilesTable({ current: { data: { onboarded_at: null }, error: null }, save: { error: { code: "23505", message: 'duplicate key value violates unique constraint "profiles_username_key"' } } });
  assert.deepEqual(await service.completeProfile(fakeClient(signedIn, taken.from).client, { fullName: "Maria", username: "maria" }), { ok: false, kind: "conflict", message: "That username is taken." });
  const signedOut = fakeClient({ getUser: { data: { user: null }, error: { name: "AuthSessionMissingError", status: 400, message: "Auth session missing!" } } });
  assert.deepEqual(await service.completeProfile(signedOut.client, { fullName: "Maria", username: "maria" }), { ok: false, kind: "authentication", message: "Your session has ended. Please log in again." });
});

test("the account is read with its profile, or is null when signed out", async () => {
  const row = { full_name: "Maria Santos", username: "maria", avatar_path: null, onboarded_at: "2026-10-01T00:00:00Z", notify_brownouts: true, notify_bill_reminders: false, notify_tips: false };
  const table = profilesTable({ current: { data: row, error: null } });
  assert.deepEqual(await service.getAccount(fakeClient({ getUser: { data: { user }, error: null } }, table.from).client), { ok: true, value: {
    id: user.id, email: "maria@gmail.com",
    profile: { fullName: "Maria Santos", username: "maria", avatarPath: null, onboardedAt: "2026-10-01T00:00:00Z", notifications: { brownouts: true, billReminders: false, tips: false } },
  } });
  const signedOut = fakeClient({ getUser: { data: { user: null }, error: { name: "AuthSessionMissingError", status: 400, message: "Auth session missing!" } } });
  assert.deepEqual(await service.getAccount(signedOut.client), { ok: true, value: null });
  const offline = fakeClient({ getUser: { data: { user: null }, error: { name: "AuthRetryableFetchError", status: 0, message: "Failed to fetch" } } });
  assert.equal((await service.getAccount(offline.client)).kind, "network");
});
