# Supabase Backend Foundation (Phase A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use beads-superpowers:subagent-driven-development (recommended) or beads-superpowers:executing-plans to implement this plan task-by-task. Each Task becomes a bead (`bd create -t task --parent <epic-id>`). Steps within tasks use checkbox (`- [ ]`) syntax for human readability.

**Goal:** Deliver a production Supabase database for WattSnap (twelve tables, row-level security, two private file buckets) and tested authentication logic, without changing any screen.

**Architecture:** One SQL migration defines the schema and every security rule. It is proven twice: first in an embedded Postgres on the developer machine, then through the real API of the hosted project. Authentication logic is plain TypeScript functions that take a Supabase client as an argument, so they run under `node --test` with a stand-in client and against the real project with a real one.

**Tech Stack:** Next.js 15, TypeScript 5.7 (strict), Node 25 (`node --test`, native TypeScript stripping), `@supabase/supabase-js` v2, `@electric-sql/pglite` (embedded Postgres, tests only), Supabase hosted Postgres.

**Specification:** [docs/superpowers/specs/2026-10-10-supabase-auth-data-design.md](../specs/2026-10-10-supabase-auth-data-design.md)

## Global Constraints

- Work on branch `feat/supabase-auth`. Never commit to `main`. Do not merge to `main` in this plan.
- Touch only these files: `supabase/migrations/*.sql`, `supabase/tests/*.test.mjs`, `src/lib/config/env.ts`, `src/lib/config/env.test.mjs`, `src/features/auth/{types,schemas,service,repository,index}.ts`, `src/features/auth/{schemas,service,repository}.test.mjs`, `src/generated/database.types.ts`, `docs/11-database-operations.md`, `.env.example`, `package.json`, `package-lock.json`. Nothing under any `components/` folder, no hook, no page, no stylesheet, not `public/sw.js`.
- New runtime dependency: `@supabase/supabase-js` only. New development dependency: `@electric-sql/pglite` only.
- Environment variable names, exactly: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`. The secret key is never given a `NEXT_PUBLIC_` name, never committed, never printed, never added to Vercel in this plan. A fourth name, `WATTSNAP_TEST_PROJECT_REF`, is not a secret and is read only by the isolation test.
- Money is integer centavos. Energy is kWh.
- Messages shown to people never contain raw provider or database error text.
- Login failures always use this exact message: `Incorrect email, username, or password.`
- TypeScript must run under Node's type stripping: no `enum`, no `namespace`, no constructor parameter properties. Import types with `import type`.
- Tests are `*.test.mjs` files run by `node --test`. A test that loads a `.ts` file which itself imports a sibling without an extension must register the resolver hook shown in Task 3.
- Two hosted projects: `wattsnap-dev` for testing and `wattsnap` for production. `.env.local` holds `wattsnap-dev` values only. No test runs against `wattsnap`.
- A migration file that has been applied to production is never edited. A correction is a new file with a later timestamp.
- Commit messages use Conventional Commits. Do not add `Co-Authored-By` lines or any tool attribution.
- The 76 feature tests that exist today must keep passing.

## File Structure

| File | Responsibility |
| --- | --- |
| `.env.example` | Names the three variables. No values. |
| `src/lib/config/env.ts` | Reads and validates the three variables when asked. |
| `src/features/auth/types.ts` | Result, failure and account types shared by the auth files. |
| `src/features/auth/schemas.ts` | Pure validation: email, password, username, code, identifier, next path. |
| `src/features/auth/service.ts` | One function per auth use case; maps provider errors to safe messages. |
| `src/features/auth/repository.ts` | Server-side username lookup and login attempt limiter. Imports `node:crypto`. |
| `src/features/auth/index.ts` | Public exports for browser-safe code. Does not export the repository. |
| `supabase/migrations/20261010000000_initial_schema.sql` | Tables, constraints, triggers, row limits, policies, grants, buckets. |
| `supabase/tests/migration.test.mjs` | Applies every migration in an embedded Postgres and checks the rules. No network. |
| `supabase/tests/isolation.test.mjs` | Checks the same rules through the hosted project's real API. |
| `src/generated/database.types.ts` | Generated from the hosted schema. Never edited by hand. |
| `docs/11-database-operations.md` | Applying migrations, running the tests, keeping the project active, backup and restore. |

Tasks 1 to 8 need no Supabase project. Tasks 9 to 11 need both projects, and the three values of `wattsnap-dev` in `.env.local`.

---

## Part 1: Work that needs no Supabase project

### Task 1: Dependency, environment template and environment validation

**Files:**
- Modify: `package.json` (dependency and `test` script)
- Modify: `.env.example` (currently empty)
- Modify: `src/lib/config/env.ts` (currently empty)
- Create: `src/lib/config/env.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `readPublicSupabaseEnv(source?: { url?: string; publishableKey?: string }): { url: string; publishableKey: string }` — throws `Error` naming missing or invalid variables.
  - `readSupabaseSecretKey(value?: string): string` — throws `Error` when missing or when called in a browser.
  - `npm test` runs every `src/**/*.test.mjs`.

**Acceptance Criteria:**
- `npm test` passes and reports the 76 existing tests plus the new ones.
- A missing variable is named in the thrown message.
- A secret key supplied as the publishable key is refused.
- Importing `env.ts` with no variables set does not throw.

- [x] **Step 1: Install the Supabase client**

Run: `npm install @supabase/supabase-js@^2`
Expected: `package.json` gains `@supabase/supabase-js` under `dependencies`; exit code 0.

- [x] **Step 2: Add the test script**

In `package.json`, replace the `scripts` block with:

```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "node --test \"src/**/*.test.mjs\""
  },
```

Run: `npm test`
Expected: `pass 76`, `fail 0`.

- [x] **Step 3: Write the environment template**

Write `.env.example`:

```
# Supabase project settings.
# Copy this file to .env.local and fill in the values. Never commit .env.local.

# Project URL, for example https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_URL=

# Publishable key. Starts with sb_publishable_. Safe for the browser.
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

# Secret key. Starts with sb_secret_. Server only. It bypasses row-level security.
SUPABASE_SECRET_KEY=

# Only for `npm run test:isolation`. The reference of the TEST project: the first part
# of its URL. The test refuses to run unless this matches the URL above.
# Never set this to the production project's reference.
WATTSNAP_TEST_PROJECT_REF=
```

- [x] **Step 4: Write the failing test**

Create `src/lib/config/env.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
const { readPublicSupabaseEnv, readSupabaseSecretKey } = await import("./env.ts");

const url = "https://abcdefgh.supabase.co";
const publishableKey = "sb_publishable_example";
const jwt = role => `header.${Buffer.from(JSON.stringify({ role })).toString("base64url")}.signature`;

test("public settings are returned trimmed", () => {
  assert.deepEqual(readPublicSupabaseEnv({ url: ` ${url} `, publishableKey: ` ${publishableKey} ` }), { url, publishableKey });
});

test("every missing variable is named", () => {
  assert.throws(() => readPublicSupabaseEnv({}), /NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  assert.throws(() => readPublicSupabaseEnv({ url }), error => /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/.test(error.message) && !/NEXT_PUBLIC_SUPABASE_URL/.test(error.message));
  assert.throws(() => readPublicSupabaseEnv({ url: "   ", publishableKey }), /NEXT_PUBLIC_SUPABASE_URL/);
});

test("the project URL must be https, except on this machine", () => {
  assert.throws(() => readPublicSupabaseEnv({ url: "http://abcdefgh.supabase.co", publishableKey }), /https/);
  assert.throws(() => readPublicSupabaseEnv({ url: "abcdefgh.supabase.co", publishableKey }), /https/);
  assert.equal(readPublicSupabaseEnv({ url: "http://localhost:54321", publishableKey }).url, "http://localhost:54321");
});

test("a secret key is refused under the public name", () => {
  assert.throws(() => readPublicSupabaseEnv({ url, publishableKey: "sb_secret_example" }), /secret key/);
  assert.throws(() => readPublicSupabaseEnv({ url, publishableKey: jwt("service_role") }), /secret key/);
  assert.equal(readPublicSupabaseEnv({ url, publishableKey: jwt("anon") }).publishableKey, jwt("anon"));
});

test("the secret key is named when missing and returned when present", () => {
  assert.throws(() => readSupabaseSecretKey(""), /SUPABASE_SECRET_KEY/);
  assert.throws(() => readSupabaseSecretKey("   "), /SUPABASE_SECRET_KEY/);
  assert.equal(readSupabaseSecretKey(" sb_secret_example "), "sb_secret_example");
});
```

- [x] **Step 5: Run the test to verify it fails**

Run: `node --test src/lib/config/env.test.mjs`
Expected: FAIL. `readPublicSupabaseEnv is not a function`, because `env.ts` is empty.

- [x] **Step 6: Write the implementation**

Write `src/lib/config/env.ts`:

```ts
/** Supabase settings. Read when a client is created, never when this file is imported. */
export interface PublicSupabaseEnv { url: string; publishableKey: string }

function isSecretKey(value: string) {
  if (value.startsWith("sb_secret_")) return true;
  const payload = value.split(".")[1];
  if (!payload) return false;
  try { return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))).role === "service_role"; }
  catch { return false; }
}

function isProjectUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname));
  } catch { return false; }
}

// Next.js only places a NEXT_PUBLIC_ value in the browser bundle when it is written out in full.
export function readPublicSupabaseEnv(
  source: { url?: string; publishableKey?: string } = { url: process.env.NEXT_PUBLIC_SUPABASE_URL, publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY },
): PublicSupabaseEnv {
  const url = source.url?.trim() ?? "";
  const publishableKey = source.publishableKey?.trim() ?? "";
  const missing = [!url && "NEXT_PUBLIC_SUPABASE_URL", !publishableKey && "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"].filter(Boolean);
  if (missing.length) throw new Error(`Missing environment variable${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}. See .env.example.`);
  if (!isProjectUrl(url)) throw new Error("NEXT_PUBLIC_SUPABASE_URL must be an https URL, like https://abcdefgh.supabase.co.");
  if (isSecretKey(publishableKey)) throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY holds a secret key. Put the publishable key there; the secret key belongs in SUPABASE_SECRET_KEY only.");
  return { url, publishableKey };
}

export function readSupabaseSecretKey(value: string | undefined = process.env.SUPABASE_SECRET_KEY): string {
  if (typeof window !== "undefined") throw new Error("SUPABASE_SECRET_KEY must never be read in the browser.");
  const key = value?.trim() ?? "";
  if (!key) throw new Error("Missing environment variable: SUPABASE_SECRET_KEY. See .env.example.");
  return key;
}
```

- [x] **Step 7: Run the tests to verify they pass**

Run: `npm test`
Expected: `pass 81`, `fail 0`.

- [x] **Step 8: Check types**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

- [x] **Step 9: Commit**

```bash
git add package.json package-lock.json .env.example src/lib/config/env.ts src/lib/config/env.test.mjs
git commit -m "feat: add Supabase client dependency and environment validation"
```

---

### Task 2: Auth types and validation rules

**Files:**
- Modify: `src/features/auth/types.ts` (currently empty)
- Modify: `src/features/auth/schemas.ts` (currently empty)
- Create: `src/features/auth/schemas.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces, from `types.ts`:
  - `type AuthFailureKind = "validation" | "authentication" | "authorization" | "network" | "rate-limit" | "conflict" | "unknown"`
  - `type AuthFailure = { ok: false; kind: AuthFailureKind; message: string }`
  - `type AuthResult<T = undefined> = { ok: true; value: T } | AuthFailure`
  - `interface AccountProfile { fullName: string; username: string | null; avatarPath: string | null; onboardedAt: string | null; notifications: { brownouts: boolean; billReminders: boolean; tips: boolean } }`
  - `interface Account { id: string; email: string; profile: AccountProfile }`
  - `type Identifier = { kind: "email"; email: string } | { kind: "username"; username: string }`
- Produces, from `schemas.ts`: `EMAIL_PATTERN`, `USERNAME_PATTERN`, `normalizeEmail(value)`, `normalizeUsername(value)`, `validateEmail(value): string | null`, `passwordRules(password): { label: string; met: boolean }[]`, `validatePassword(password): string | null`, `validateFullName(value): string | null`, `validateUsername(value): string | null`, `validateCode(value): string | null`, `parseIdentifier(value): Identifier | null`, `safeNextPath(value, fallback = "/dashboard"): string`. Validators return `null` when the value is acceptable.

**Acceptance Criteria:**
- The three password rules match the reset screen's wording: "Be at least 8 characters long", "Include a letter and a number", "Not be commonly used".
- `parseIdentifier` treats a value containing `@` as an email and anything else as a username, ignoring surrounding spaces and letter case.
- `safeNextPath` accepts `/bills` and returns `/dashboard` for `//evil.example`, `https://evil.example`, `/\evil.example`, an empty string and `null`.

- [x] **Step 1: Write the types**

Write `src/features/auth/types.ts`:

```ts
export type AuthFailureKind = "validation" | "authentication" | "authorization" | "network" | "rate-limit" | "conflict" | "unknown";
/** `message` is always safe to show. Raw provider text never reaches it. */
export type AuthFailure = { ok: false; kind: AuthFailureKind; message: string };
export type AuthResult<T = undefined> = { ok: true; value: T } | AuthFailure;

export interface AccountProfile {
  fullName: string;
  username: string | null;
  avatarPath: string | null;
  onboardedAt: string | null;
  notifications: { brownouts: boolean; billReminders: boolean; tips: boolean };
}
export interface Account { id: string; email: string; profile: AccountProfile }

export type Identifier = { kind: "email"; email: string } | { kind: "username"; username: string };
```

- [x] **Step 2: Write the failing test**

Create `src/features/auth/schemas.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
const { normalizeEmail, parseIdentifier, passwordRules, safeNextPath, validateCode, validateEmail, validateFullName, validatePassword, validateUsername } = await import("./schemas.ts");

test("email is trimmed, lower-cased and checked", () => {
  assert.equal(normalizeEmail("  Maria@Gmail.com "), "maria@gmail.com");
  assert.equal(validateEmail(" Maria@Gmail.com "), null);
  for (const bad of ["", "maria", "maria@", "@gmail.com", "maria@gmail", "ma ria@gmail.com", `${"a".repeat(250)}@x.co`]) assert.equal(validateEmail(bad), "Please enter a valid email address.", bad);
});

test("password rules use the reset screen's wording", () => {
  assert.deepEqual(passwordRules("abc12345x").map(rule => rule.label), ["Be at least 8 characters long", "Include a letter and a number", "Not be commonly used"]);
  assert.equal(validatePassword("abc12345x"), null);
  assert.equal(validatePassword("abc1"), "Password must be at least 8 characters long.");
  assert.equal(validatePassword("abcdefghij"), "Password must include a letter and a number.");
  assert.equal(validatePassword("1234567890"), "Password must include a letter and a number.");
  assert.equal(validatePassword("Password123"), "Password must not be commonly used.");
  assert.equal(validatePassword(`a1${"x".repeat(71)}`), "Use a password of 72 characters or fewer.");
});

test("full name is required and at most 50 characters", () => {
  assert.equal(validateFullName(" Maria Santos "), null);
  assert.equal(validateFullName("   "), "Please enter your full name.");
  assert.equal(validateFullName("a".repeat(51)), "Use 50 characters or fewer for your name.");
});

test("usernames use 3 to 30 lowercase letters, numbers, dots or underscores", () => {
  for (const good of ["maria", "maria.santos_01", " Maria ", "abc", "a".repeat(30)]) assert.equal(validateUsername(good), null, good);
  for (const bad of ["", "ab", "a".repeat(31), "maria santos", "maria@home", "maría", "maria-santos"]) assert.equal(validateUsername(bad), "Usernames use 3 to 30 lowercase letters, numbers, dots or underscores.", bad);
});

test("a code is exactly six digits", () => {
  assert.equal(validateCode(" 123456 "), null);
  for (const bad of ["", "12345", "1234567", "12a456"]) assert.equal(validateCode(bad), "Enter the 6-digit code from your email.", bad);
});

test("an identifier with @ is an email; anything else is a username", () => {
  assert.deepEqual(parseIdentifier("  Maria@Gmail.com "), { kind: "email", email: "maria@gmail.com" });
  assert.deepEqual(parseIdentifier(" Maria.Santos "), { kind: "username", username: "maria.santos" });
  for (const bad of ["", "   ", "maria@", "ab", "maria santos"]) assert.equal(parseIdentifier(bad), null, bad);
});

test("only same-site paths may follow a sign-in", () => {
  assert.equal(safeNextPath("/bills"), "/bills");
  assert.equal(safeNextPath("/bills/new?from=setup"), "/bills/new?from=setup");
  for (const bad of ["", null, undefined, "bills", "//evil.example", "https://evil.example", "/\\evil.example", "/bills\nSet-Cookie: x"]) assert.equal(safeNextPath(bad), "/dashboard", String(bad));
  assert.equal(safeNextPath("//evil.example", "/setup"), "/setup");
});
```

- [x] **Step 3: Run the test to verify it fails**

Run: `node --test src/features/auth/schemas.test.mjs`
Expected: FAIL. `normalizeEmail is not a function`, because `schemas.ts` is empty.

- [x] **Step 4: Write the implementation**

Write `src/features/auth/schemas.ts`:

```ts
import type { Identifier } from "./types";

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const USERNAME_PATTERN = /^[a-z0-9_.]{3,30}$/;
const COMMON_PASSWORDS = new Set(["password", "password1", "password123", "12345678", "123456789", "1234567890", "qwerty123", "11111111", "iloveyou", "abc12345", "wattsnap123"]);

export const normalizeEmail = (value: string) => value.trim().toLowerCase();
export const normalizeUsername = (value: string) => value.trim().toLowerCase();

export function validateEmail(value: string) {
  const email = normalizeEmail(value);
  return email.length <= 254 && EMAIL_PATTERN.test(email) ? null : "Please enter a valid email address.";
}

/** The same three rules, in the same words, as the reset-password screen. */
export function passwordRules(password: string) {
  return [
    { label: "Be at least 8 characters long", met: password.length >= 8 },
    { label: "Include a letter and a number", met: /[a-z]/i.test(password) && /\d/.test(password) },
    { label: "Not be commonly used", met: password.length > 0 && !COMMON_PASSWORDS.has(password.toLowerCase()) },
  ];
}
export function validatePassword(password: string) {
  // Supabase hashes with bcrypt, which ignores everything after 72 characters.
  if (password.length > 72) return "Use a password of 72 characters or fewer.";
  const failed = passwordRules(password).find(rule => !rule.met);
  return failed ? `Password must ${failed.label.charAt(0).toLowerCase()}${failed.label.slice(1)}.` : null;
}

export function validateFullName(value: string) {
  const name = value.trim();
  if (!name) return "Please enter your full name.";
  return name.length > 50 ? "Use 50 characters or fewer for your name." : null;
}
export function validateUsername(value: string) {
  return USERNAME_PATTERN.test(normalizeUsername(value)) ? null : "Usernames use 3 to 30 lowercase letters, numbers, dots or underscores.";
}
export function validateCode(value: string) {
  return /^\d{6}$/.test(value.trim()) ? null : "Enter the 6-digit code from your email.";
}

/** One login field serves both: a value containing @ is an email, anything else a username. */
export function parseIdentifier(value: string): Identifier | null {
  const text = value.trim().toLowerCase();
  if (!text) return null;
  if (text.includes("@")) return EMAIL_PATTERN.test(text) ? { kind: "email", email: text } : null;
  return USERNAME_PATTERN.test(text) ? { kind: "username", username: text } : null;
}

/** Only a path on this site may follow a sign-in. Browsers read a backslash as a slash. */
export function safeNextPath(value: string | null | undefined, fallback = "/dashboard") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\u0000-\u001f]/.test(value)) return fallback;
  return value;
}
```

- [x] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: `pass 88`, `fail 0`.

- [x] **Step 6: Check types and commit**

Run: `npx tsc --noEmit`
Expected: no output.

```bash
git add src/features/auth/types.ts src/features/auth/schemas.ts src/features/auth/schemas.test.mjs
git commit -m "feat: add auth validation rules and result types"
```

---

### Task 3: Auth service functions

**Files:**
- Modify: `src/features/auth/service.ts` (currently empty)
- Modify: `src/features/auth/index.ts` (currently empty)
- Create: `src/features/auth/service.test.mjs`

**Interfaces:**
- Consumes: everything Task 2 produces.
- Produces, from `service.ts`. Every function's first argument is a Supabase client (`SupabaseClient` from `@supabase/supabase-js`):
  - `GENERIC_LOGIN_FAILURE = "Incorrect email, username, or password."`
  - `toFailure(error: unknown, context?: string): AuthFailure`
  - `signUpWithEmail(client, { fullName, email, password, captchaToken? }): Promise<AuthResult<{ email: string }>>`
  - `verifySignupCode(client, { email, code }): Promise<AuthResult>`
  - `resendSignupCode(client, { email, captchaToken? }): Promise<AuthResult>`
  - `signInWithEmail(client, { email, password, captchaToken? }): Promise<AuthResult>`
  - `signInWithGoogle(client, { origin, next? }): Promise<AuthResult>`
  - `requestPasswordReset(client, { email, captchaToken? }): Promise<AuthResult>`
  - `verifyRecoveryCode(client, { email, code }): Promise<AuthResult>`
  - `updatePassword(client, { password }): Promise<AuthResult>`
  - `completeProfile(client, { fullName, username }): Promise<AuthResult>`
  - `signOut(client): Promise<AuthResult>`
  - `getAccount(client): Promise<AuthResult<Account | null>>` — `value` is `null` when signed out.

**Acceptance Criteria:**
- Invalid input returns a `validation` failure and makes no network call.
- Each mapped Supabase error code returns the kind and message in the table inside `service.ts`.
- Text from a raw error never appears in a returned message.
- `signUpWithEmail` returns the identical success for a new address and for one that already has an account.
- `updatePassword` signs out every session after the password changes.
- `completeProfile` reports a taken username as a `conflict` with "That username is taken."

- [x] **Step 1: Write the failing test**

Create `src/features/auth/service.test.mjs`:

```js
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
```

- [x] **Step 2: Run the test to verify it fails**

Run: `node --test src/features/auth/service.test.mjs`
Expected: FAIL. `service.signUpWithEmail is not a function`, because `service.ts` is empty.

- [x] **Step 3: Write the implementation**

Write `src/features/auth/service.ts`:

```ts
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
```

- [x] **Step 4: Write the public exports**

Write `src/features/auth/index.ts`:

```ts
export * from "./types";
export * from "./schemas";
export * from "./service";
// repository.ts is deliberately not exported here. It uses node:crypto and a secret-key
// client, so only server code may import it, and it does so by its own path.
```

- [x] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: `pass 102`, `fail 0`.

- [x] **Step 6: Check types and commit**

Run: `npx tsc --noEmit`
Expected: no output.

```bash
git add src/features/auth/service.ts src/features/auth/index.ts src/features/auth/service.test.mjs
git commit -m "feat: add auth service functions with safe failure mapping"
```

---

### Task 4: Username lookup and login attempt limiter

**Files:**
- Modify: `src/features/auth/repository.ts` (currently empty)
- Create: `src/features/auth/repository.test.mjs`

**Interfaces:**
- Consumes: nothing from earlier tasks. Uses tables `profiles` and `auth_login_attempts`, created in Task 5.
- Produces, from `repository.ts`. `admin` is a Supabase client created with the secret key:
  - `MAX_USERNAME_FAILURES = 5`, `MAX_IP_FAILURES = 20`, `ATTEMPT_WINDOW_MS = 900000`, `ATTEMPT_RETENTION_MS = 86400000`
  - `interface AttemptCounts { username: number; ip: number }`
  - `attemptAllowed(counts: AttemptCounts): boolean`
  - `hashIp(ip: string, secret: string): string` — 64 lowercase hex characters
  - `findEmailByUsername(admin, username: string): Promise<string | null>`
  - `countRecentFailures(admin, { username, ipHash, now? }): Promise<AttemptCounts>`
  - `recordFailure(admin, { username, ipHash, now? }): Promise<void>`
  - The three async functions throw `Error` on a database failure. The message carries the error code, never the raw text.

**Acceptance Criteria:**
- With 4 earlier failures an attempt is allowed; with 5 it is refused. With 19 failures from one address an attempt is allowed; with 20 it is refused.
- Failures older than 15 minutes are not counted.
- `recordFailure` deletes records older than 24 hours.
- The stored address hash is 64 hex characters and does not contain the address.

- [x] **Step 1: Write the failing test**

Create `src/features/auth/repository.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
const { ATTEMPT_RETENTION_MS, ATTEMPT_WINDOW_MS, attemptAllowed, countRecentFailures, findEmailByUsername, hashIp, recordFailure } = await import("./repository.ts");

/** A stand-in secret-key client that records every query it is asked to run. */
function fakeAdmin({ profile = null, user = null, counts = {}, error = null } = {}) {
  const log = [];
  return {
    log,
    from(table) {
      const query = { table, filters: [] };
      const chain = {
        select: (...args) => { query.select = args; return chain; },
        insert: row => { query.insert = row; return chain; },
        delete: () => { query.delete = true; return chain; },
        eq: (column, value) => { query.filters.push(["eq", column, value]); return chain; },
        gte: (column, value) => { query.filters.push(["gte", column, value]); return chain; },
        lt: (column, value) => { query.filters.push(["lt", column, value]); return chain; },
        maybeSingle: async () => { log.push(query); return { data: profile, error }; },
        then: (resolve, reject) => {
          log.push(query);
          const column = query.filters.find(filter => filter[0] === "eq")?.[1];
          return Promise.resolve(query.select ? { count: counts[column] ?? 0, error } : { error }).then(resolve, reject);
        },
      };
      return chain;
    },
    auth: { admin: { getUserById: async id => { log.push({ getUserById: id }); return { data: { user }, error: null }; } } },
  };
}
const now = new Date("2026-10-10T08:00:00.000Z");

test("the fifth failure is allowed and the sixth is refused", () => {
  assert.equal(attemptAllowed({ username: 0, ip: 0 }), true);
  assert.equal(attemptAllowed({ username: 4, ip: 0 }), true);
  assert.equal(attemptAllowed({ username: 5, ip: 0 }), false);
  assert.equal(attemptAllowed({ username: 0, ip: 19 }), true);
  assert.equal(attemptAllowed({ username: 0, ip: 20 }), false);
});

test("an address is stored only as a keyed hash", () => {
  const hash = hashIp(" 203.0.113.9 ", "secret-one");
  assert.match(hash, /^[0-9a-f]{64}$/);
  assert.equal(hash.includes("203"), false);
  assert.equal(hash, hashIp("203.0.113.9", "secret-one"));
  assert.notEqual(hash, hashIp("203.0.113.9", "secret-two"));
  assert.notEqual(hash, hashIp("203.0.113.10", "secret-one"));
});

test("a username resolves to its account email, or to nothing", async () => {
  const found = fakeAdmin({ profile: { id: "user-1" }, user: { email: "maria@gmail.com" } });
  assert.equal(await findEmailByUsername(found, "maria"), "maria@gmail.com");
  assert.deepEqual(found.log[0].filters, [["eq", "username", "maria"]]);
  assert.deepEqual(found.log[1], { getUserById: "user-1" });
  const missing = fakeAdmin();
  assert.equal(await findEmailByUsername(missing, "nobody"), null);
  assert.equal(missing.log.length, 1);
});

test("only failures inside the last 15 minutes are counted", async () => {
  const admin = fakeAdmin({ counts: { username: 3, ip_hash: 7 } });
  assert.deepEqual(await countRecentFailures(admin, { username: "maria", ipHash: "abc", now }), { username: 3, ip: 7 });
  const since = new Date(now.getTime() - ATTEMPT_WINDOW_MS).toISOString();
  assert.equal(since, "2026-10-10T07:45:00.000Z");
  assert.deepEqual(admin.log.map(query => query.filters), [
    [["eq", "username", "maria"], ["gte", "attempted_at", since]],
    [["eq", "ip_hash", "abc"], ["gte", "attempted_at", since]],
  ]);
  assert.deepEqual(admin.log[0].select, ["id", { count: "exact", head: true }]);
});

test("recording a failure also removes records older than 24 hours", async () => {
  const admin = fakeAdmin();
  await recordFailure(admin, { username: "maria", ipHash: "abc", now });
  assert.deepEqual(admin.log[0].insert, { username: "maria", ip_hash: "abc", attempted_at: "2026-10-10T08:00:00.000Z" });
  assert.equal(admin.log[1].delete, true);
  assert.deepEqual(admin.log[1].filters, [["lt", "attempted_at", new Date(now.getTime() - ATTEMPT_RETENTION_MS).toISOString()]]);
});

test("a database failure throws its code and never the raw text", async () => {
  const admin = fakeAdmin({ error: { code: "57014", message: "canceling statement for maria@gmail.com" } });
  for (const run of [() => findEmailByUsername(admin, "maria"), () => countRecentFailures(admin, { username: "maria", ipHash: "abc", now }), () => recordFailure(admin, { username: "maria", ipHash: "abc", now })]) {
    await assert.rejects(run(), error => /57014/.test(error.message) && !/maria@gmail/.test(error.message));
  }
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `node --test src/features/auth/repository.test.mjs`
Expected: FAIL. `attemptAllowed is not a function`, because `repository.ts` is empty.

- [x] **Step 3: Write the implementation**

Write `src/features/auth/repository.ts`:

```ts
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
```

Note for the test in Step 1: `countRecentFailures` runs its two counts with `Promise.all`, and the stand-in logs each query when it is awaited, so the username query is logged first.

- [x] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: `pass 108`, `fail 0`.

- [x] **Step 5: Check types and commit**

Run: `npx tsc --noEmit`
Expected: no output.

```bash
git add src/features/auth/repository.ts src/features/auth/repository.test.mjs
git commit -m "feat: add username lookup and login attempt limiter"
```

---

### Task 5: Migration, part one — tables, constraints, triggers and row limits

**Files:**
- Modify: `package.json` (development dependency and `test` script)
- Create: `supabase/tests/migration.test.mjs`
- Create: `supabase/migrations/20261010000000_initial_schema.sql`

**Interfaces:**
- Consumes: nothing.
- Produces: twelve tables in schema `public` — `providers`, `profiles`, `households`, `bills`, `appliances`, `advisories`, `advisory_preparation`, `brownout_plans`, `tips_snapshots`, `scenarios`, `setup_progress`, `auth_login_attempts` — with the columns listed in the specification. Functions `set_updated_at()`, `is_unique_subset(text[], text[])`, `handle_new_user()`, `enforce_household_row_limit()`. A row-limit violation raises SQLSTATE `P0001` with message `household row limit reached for <table>`.
- The test file exports nothing. It defines `db`, `sql(text, params)`, `rejects(promise, code)`, and the fixed user ids `A`, `B`, `C` that Task 6 reuses.

**Acceptance Criteria:**
- `npm test` applies the migration in an embedded Postgres with no network.
- Inserting a row into `auth.users` creates exactly one profile and one household; a second household for the same owner is refused.
- Every out-of-range value in the test's constraint table is refused with the listed SQLSTATE.
- Each of the six capped tables accepts exactly its cap and refuses the next row: bills 240, appliances 150, advisories 200, advisory_preparation 500, brownout_plans 100, scenarios 50.

- [x] **Step 1: Install the embedded Postgres and extend the test script**

Run: `npm install --save-dev @electric-sql/pglite`
Expected: `package.json` gains `@electric-sql/pglite` under `devDependencies`.

In `package.json`, change the `test` script to:

```json
    "test": "node --test \"src/**/*.test.mjs\" supabase/tests/migration.test.mjs"
```

- [x] **Step 2: Write the failing test**

Create `supabase/tests/migration.test.mjs`:

```js
import assert from "node:assert/strict";
import test, { before } from "node:test";
import { readdir, readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

// The parts of the Supabase platform the migration relies on, reduced to what it touches.
// Like a classic Supabase project, new public tables are granted to every API role by default,
// so the migration has to take those privileges away itself.
const PLATFORM = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;

  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb not null default '{}');
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;

  create schema storage;
  create table storage.buckets (id text primary key, name text not null, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets (id), name text not null, owner_id text, unique (bucket_id, name));
  alter table storage.objects enable row level security;
  grant usage on schema storage to anon, authenticated, service_role;
  grant all on storage.objects to anon, authenticated, service_role;
`;

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const C = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const db = new PGlite();
const household = {};

const sql = async (text, params = []) => (await db.query(text, params)).rows;
async function rejects(promise, code, label = "") {
  await assert.rejects(promise, error => { assert.equal(error.code, code, `${label}: ${error.message}`); return true; }, label);
}

before(async () => {
  await db.exec(PLATFORM);
  const folder = new URL("../migrations/", import.meta.url);
  for (const name of (await readdir(folder)).filter(file => file.endsWith(".sql")).sort()) await db.exec(await readFile(new URL(name, folder), "utf8"));
  // JSON travels as text and is cast in SQL, so it arrives the same way whatever the driver does with objects.
  await db.query("insert into auth.users (id, email, raw_user_meta_data) values ($1, 'a@example.com', $2::text::jsonb), ($3, 'b@example.com', $4::text::jsonb), ($5, 'c@example.com', '{}')",
    [A, JSON.stringify({ full_name: "  Ana Santos  " }), B, JSON.stringify({ name: "B".repeat(80) }), C]);
  for (const [key, id] of [["a", A], ["b", B], ["c", C]]) household[key] = (await sql("select id from public.households where owner_id = $1", [id]))[0].id;
});

test("signing up creates exactly one profile and one household", async () => {
  assert.deepEqual(await sql("select full_name, username, onboarded_at from public.profiles where id = $1", [A]), [{ full_name: "Ana Santos", username: null, onboarded_at: null }]);
  assert.equal((await sql("select full_name from public.profiles where id = $1", [B]))[0].full_name, "B".repeat(50));
  assert.equal((await sql("select full_name from public.profiles where id = $1", [C]))[0].full_name, "");
  assert.equal((await sql("select count(*)::int as n from public.households where owner_id = $1", [A]))[0].n, 1);
  await rejects(db.query("insert into public.households (owner_id) values ($1)", [A]), "23505", "second household");
});

test("the seven providers are seeded and unverified", async () => {
  assert.deepEqual((await sql("select id from public.providers order by id")).map(row => row.id), ["akelco", "anteco", "capelco", "ileco-1", "ileco-2", "ileco-3", "more-power"]);
  assert.equal((await sql("select count(*)::int as n from public.providers where is_coverage_verified"))[0].n, 0);
});

test("out-of-range values are refused", async () => {
  const h = household.a;
  const bill = "insert into public.bills (household_id, billing_month, kwh, amount_centavos, source";
  const appliance = "insert into public.appliances (household_id, name, kind, watts, hours_per_day, quantity";
  const advisory = "insert into public.advisories (household_id, id, revision, details, match, original_kind, original_name, original_text, original_captured_at, reviewed_at) values ($1, gen_random_uuid(), 1,";
  const cases = [
    ["bill amount zero", `${bill}) values ($1, '2030-01-01', 100, 0, 'manual')`, "23514"],
    ["bill kwh zero", `${bill}) values ($1, '2030-01-01', 0, 100, 'manual')`, "23514"],
    ["bill month not first day", `${bill}) values ($1, '2030-01-15', 100, 100, 'manual')`, "23514"],
    ["bill sample source", `${bill}) values ($1, '2030-01-01', 100, 100, 'sample')`, "23514"],
    ["bill due before billing", `${bill}, billing_date, due_date) values ($1, '2030-01-01', 100, 100, 'manual', '2030-01-20', '2030-01-10')`, "23514"],
    ["bill half a period", `${bill}, period_start) values ($1, '2030-01-01', 100, 100, 'manual', '2030-01-01')`, "23514"],
    ["bill period reversed", `${bill}, period_start, period_end) values ($1, '2030-01-01', 100, 100, 'manual', '2030-01-31', '2030-01-01')`, "23514"],
    ["bill two providers", `${bill}, provider_id, provider_custom_name) values ($1, '2030-01-01', 100, 100, 'manual', 'anteco', 'Other Coop')`, "23514"],
    ["bill unknown provider", `${bill}, provider_id) values ($1, '2030-01-01', 100, 100, 'manual', 'nowhere')`, "23503"],
    ["bill long notes", `${bill}, notes) values ($1, '2030-01-01', 100, 100, 'manual', repeat('n', 501))`, "23514"],
    ["appliance hours over 24", `${appliance}) values ($1, 'Fan', 'fan', 55, 24.5, 1)`, "23514"],
    ["appliance negative hours", `${appliance}) values ($1, 'Fan', 'fan', 55, -1, 1)`, "23514"],
    ["appliance quantity zero", `${appliance}) values ($1, 'Fan', 'fan', 55, 8, 0)`, "23514"],
    ["appliance quantity 51", `${appliance}) values ($1, 'Fan', 'fan', 55, 8, 51)`, "23514"],
    ["appliance watts zero", `${appliance}) values ($1, 'Fan', 'fan', 0, 8, 1)`, "23514"],
    ["appliance unknown kind", `${appliance}) values ($1, 'Toaster', 'toaster', 800, 1, 1)`, "23514"],
    ["appliance blank name", `${appliance}) values ($1, '   ', 'fan', 55, 8, 1)`, "23514"],
    ["appliance days 367", `${appliance}, days_in_period) values ($1, 'Fan', 'fan', 55, 8, 1, 367)`, "23514"],
    ["appliance unknown basis", `${appliance}, wattage_basis) values ($1, 'Fan', 'fan', 55, 8, 1, 'guess')`, "23514"],
    ["household budget zero", "update public.households set monthly_budget_centavos = 0 where id = $1", "23514"],
    ["household budget over cap", "update public.households set monthly_budget_centavos = 10000001 where id = $1", "23514"],
    ["household long name", "update public.households set name = repeat('n', 51) where id = $1", "23514"],
    ["household two providers", "update public.households set provider_id = 'anteco', provider_custom_name = 'Other Coop' where id = $1", "23514"],
    ["advisory unknown type", `${advisory} '{"type":"party"}', '{"status":"affected"}', 'text', 'Pasted', 'words', now(), now())`, "23514"],
    ["advisory missing status", `${advisory} '{"type":"notice"}', '{}', 'text', 'Pasted', 'words', now(), now())`, "23502"],
    ["advisory details not an object", `${advisory} '[]', '{"status":"affected"}', 'text', 'Pasted', 'words', now(), now())`, "23502"],
    ["advisory text original empty", `${advisory} '{"type":"notice"}', '{"status":"affected"}', 'text', 'Pasted', '  ', now(), now())`, "23514"],
    ["advisory image original without a path", `${advisory} '{"type":"notice"}', '{"status":"affected"}', 'image', 'photo.png', '', now(), now())`, "23514"],
    ["advisory oversize details", `${advisory} jsonb_build_object('type', 'notice', 'reason', repeat('r', 33000)), '{"status":"affected"}', 'text', 'Pasted', 'words', now(), now())`, "23514"],
    ["preparation repeated item", "insert into public.advisory_preparation (household_id, advisory_id, revision, household_signature, checked) values ($1, gen_random_uuid(), 1, '[]', '{charge,charge}')", "23514"],
    ["preparation unknown item", "insert into public.advisory_preparation (household_id, advisory_id, revision, household_signature, checked) values ($1, gen_random_uuid(), 1, '[]', '{dance}')", "23514"],
    ["plan source not confirmed", "insert into public.brownout_plans (household_id, advisory_id, advisory_snapshot, relevance_confirmed, source_confirmed) values ($1, gen_random_uuid(), '{}', true, false)", "23514"],
    ["plan item from the other checklist", "insert into public.brownout_plans (household_id, advisory_id, advisory_snapshot, relevance_confirmed, source_confirmed, checked) values ($1, gen_random_uuid(), '{}', true, true, '{water}')", "23514"],
    ["plan updates not a list", "insert into public.brownout_plans (household_id, advisory_id, advisory_snapshot, relevance_confirmed, source_confirmed, acknowledged_updates) values ($1, gen_random_uuid(), '{}', true, true, '{}')", "23514"],
    ["scenario blank title", "insert into public.scenarios (household_id, title, payload) values ($1, '  ', '{}')", "23514"],
    ["scenario long title", "insert into public.scenarios (household_id, title, payload) values ($1, repeat('t', 61), '{}')", "23514"],
    ["tips snapshot not an object", "insert into public.tips_snapshots (household_id, snapshot, generated_at, input_signature) values ($1, '[]', now(), '[]')", "23514"],
  ];
  for (const [label, statement, code] of cases) await rejects(db.query(statement, [h]), code, label);

  await rejects(db.query("update public.profiles set username = 'AB' where id = $1", [A]), "23514", "short username");
  await rejects(db.query("update public.profiles set username = 'Maria' where id = $1", [A]), "23514", "uppercase username");
  await rejects(db.query("update public.profiles set avatar_path = 'someone-else/avatar.jpg' where id = $1", [A]), "23514", "foreign avatar path");
  await db.query("update public.profiles set username = 'ana.santos' where id = $1", [A]);
  await rejects(db.query("update public.profiles set username = 'ana.santos' where id = $1", [B]), "23505", "taken username");
});

test("one bill per month, and preparation progress keyed by its full basis", async () => {
  const h = household.a;
  await db.query("insert into public.bills (household_id, billing_month, kwh, amount_centavos, source) values ($1, '2031-03-01', 120.5, 137950, 'manual')", [h]);
  await rejects(db.query("insert into public.bills (household_id, billing_month, kwh, amount_centavos, source) values ($1, '2031-03-01', 99, 100000, 'scan')", [h]), "23505", "second bill for a month");
  const advisory = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
  const add = (revision, signature) => db.query("insert into public.advisory_preparation (household_id, advisory_id, revision, household_signature, checked) values ($1, $2, $3, $4, '{charge}')", [h, advisory, revision, signature]);
  await add(1, "[\"anteco\",\"Payao\"]");
  await rejects(add(1, "[\"anteco\",\"Payao\"]"), "23505", "same basis twice");
  await add(2, "[\"anteco\",\"Payao\"]");
  await add(1, "[\"anteco\",\"Atabay\"]");
  await db.query("delete from public.bills where household_id = $1", [h]);
  await db.query("delete from public.advisory_preparation where household_id = $1", [h]);
});

test("advisory type and match status are derived from the documents", async () => {
  const id = (await sql(`insert into public.advisories (household_id, id, revision, details, match, original_kind, original_name, original_text, original_captured_at, reviewed_at)
    values ($1, gen_random_uuid(), 1, '{"type":"scheduled","title":"Scheduled Power Interruption"}', '{"status":"possibly-affected","rationale":[]}', 'text', 'Pasted advisory', 'Line maintenance in Payao', now(), now()) returning id`, [household.a]))[0].id;
  assert.deepEqual(await sql("select type, match_status from public.advisories where id = $1", [id]), [{ type: "scheduled", match_status: "possibly-affected" }]);
  await db.query(`update public.advisories set revision = 2, match = '{"status":"not-listed"}' where id = $1`, [id]);
  assert.equal((await sql("select match_status from public.advisories where id = $1", [id]))[0].match_status, "not-listed");
  await rejects(db.query("update public.advisories set type = 'notice' where id = $1", [id]), "428C9", "writing a derived column");
  await db.query("delete from public.advisories where id = $1", [id]);
});

test("updated_at moves when a row changes", async () => {
  const before = (await sql("select updated_at from public.households where id = $1", [household.a]))[0].updated_at;
  await new Promise(resolve => setTimeout(resolve, 20));
  await db.query("update public.households set name = 'Santos household' where id = $1", [household.a]);
  const after = (await sql("select updated_at from public.households where id = $1", [household.a]))[0].updated_at;
  assert.ok(new Date(after) > new Date(before));
});

test("each capped table accepts its cap and refuses the next row", async () => {
  const h = household.c;
  const caps = [
    ["bills", 240, "insert into public.bills (household_id, billing_month, kwh, amount_centavos, source) select $1, (date '2000-01-01' + make_interval(months => n))::date, 100, 100000, 'manual' from generate_series($2::int, $3::int) n"],
    ["appliances", 150, "insert into public.appliances (household_id, name, kind, watts, hours_per_day, quantity) select $1, 'Fan ' || n, 'fan', 55, 8, 1 from generate_series($2::int, $3::int) n"],
    ["advisories", 200, `insert into public.advisories (household_id, id, revision, details, match, original_kind, original_name, original_text, original_captured_at, reviewed_at) select $1, gen_random_uuid(), 1, '{"type":"notice"}', '{"status":"not-listed"}', 'text', 'Pasted', 'words ' || n, now(), now() from generate_series($2::int, $3::int) n`],
    ["advisory_preparation", 500, "insert into public.advisory_preparation (household_id, advisory_id, revision, household_signature) select $1, gen_random_uuid(), 1, '[]' from generate_series($2::int, $3::int) n"],
    ["brownout_plans", 100, "insert into public.brownout_plans (household_id, advisory_id, advisory_snapshot, relevance_confirmed, source_confirmed) select $1, gen_random_uuid(), '{}', true, true from generate_series($2::int, $3::int) n"],
    ["scenarios", 50, "insert into public.scenarios (household_id, title, payload) select $1, 'Scenario ' || n, '{}' from generate_series($2::int, $3::int) n"],
  ];
  for (const [table, cap, statement] of caps) {
    await db.query(statement, [h, 1, cap]);
    assert.equal((await sql(`select count(*)::int as n from public.${table} where household_id = $1`, [h]))[0].n, cap, table);
    await assert.rejects(db.query(statement, [h, cap + 1, cap + 1]), error => { assert.equal(error.code, "P0001", table); assert.match(error.message, new RegExp(`household row limit reached for ${table}`)); return true; });
    // Replacing a row that already exists is not a new row, so it is still allowed at the cap.
    await db.query(`update public.${table} set updated_at = now() where household_id = $1`, [h]);
    await db.query(`delete from public.${table} where household_id = $1`, [h]);
  }
});

test("deleting an account removes everything it owned", async () => {
  const id = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
  await db.query("insert into auth.users (id, email) values ($1, 'e@example.com')", [id]);
  const h = (await sql("select id from public.households where owner_id = $1", [id]))[0].id;
  await db.query("insert into public.scenarios (household_id, title, payload) values ($1, 'Temporary', '{}')", [h]);
  await db.query("insert into public.setup_progress (household_id, reviewed_tips) values ($1, '[]')", [h]);
  await db.query("delete from auth.users where id = $1", [id]);
  for (const [table, column, value] of [["profiles", "id", id], ["households", "id", h], ["scenarios", "household_id", h], ["setup_progress", "household_id", h]]) {
    assert.equal((await sql(`select count(*)::int as n from public.${table} where ${column} = $1`, [value]))[0].n, 0, table);
  }
});
```

- [x] **Step 3: Run the test to verify it fails**

Run: `node --test supabase/tests/migration.test.mjs`
Expected: FAIL in the `before` hook with `relation "public.households" does not exist`, because no migration file exists yet.

If instead the failure mentions `create role`, `set role`, or an unknown `error.code`, the embedded Postgres differs from what this test assumes. Stop and report that message; do not weaken the test.

- [x] **Step 4: Write the migration, part one**

Create `supabase/migrations/20261010000000_initial_schema.sql`:

```sql
-- =====================================================================
-- WattSnap initial schema
-- Accounts, households, household records, row limits.
-- Security rules and storage follow in the second half of this file.
--
-- Never edit this file after it has run on the production project.
-- A correction is a new migration file with a later timestamp.
-- =====================================================================

-- Everything below is one transaction: if any statement fails, nothing is applied.
begin;

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------
create function public.set_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- True when every item is allowed and none is repeated. Used by checklist columns.
create function public.is_unique_subset(items text[], allowed text[]) returns boolean
language sql
immutable
set search_path = ''
as $$
  select items <@ allowed
     and cardinality(items) = (select count(distinct item) from unnest(items) as item);
$$;

-- ---------------------------------------------------------------------
-- providers: reference data
-- ---------------------------------------------------------------------
create table public.providers (
  id text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  name text not null check (char_length(name) between 1 and 80),
  area text not null default '' check (char_length(area) <= 80),
  detail text not null default '' check (char_length(detail) <= 160),
  is_coverage_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.providers (id, name, area, detail) values
  ('anteco', 'ANTECO', 'Antique', 'Antique Electric Cooperative'),
  ('akelco', 'AKELCO', 'Aklan', 'Aklan Electric Cooperative'),
  ('capelco', 'CAPELCO', 'Capiz', 'Capiz Electric Cooperative'),
  ('ileco-1', 'ILECO I', 'Iloilo', 'Iloilo I Electric Cooperative'),
  ('ileco-2', 'ILECO II', 'Iloilo', 'Iloilo II Electric Cooperative'),
  ('ileco-3', 'ILECO III', 'Iloilo', 'Iloilo III Electric Cooperative'),
  ('more-power', 'MORE Power', 'Iloilo', 'Distribution utility');

-- ---------------------------------------------------------------------
-- profiles: one per account
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 50),
  username text unique check (username ~ '^[a-z0-9_.]{3,30}$'),
  avatar_path text check (avatar_path = id::text || '/avatar.jpg'),
  notify_brownouts boolean not null default true,
  notify_bill_reminders boolean not null default true,
  notify_tips boolean not null default false,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- households: one per account
-- ---------------------------------------------------------------------
create table public.households (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users (id) on delete cascade,
  name text check (char_length(name) <= 50),
  location text check (char_length(location) <= 120),
  province text check (char_length(province) <= 100),
  municipality text check (char_length(municipality) <= 100),
  barangay text check (char_length(barangay) <= 100),
  provider_id text references public.providers (id),
  provider_custom_name text check (char_length(btrim(provider_custom_name)) between 1 and 80),
  monthly_budget_centavos integer check (monthly_budget_centavos between 1 and 10000000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint households_one_provider check (provider_id is null or provider_custom_name is null)
);

-- ---------------------------------------------------------------------
-- bills
-- ---------------------------------------------------------------------
create table public.bills (
  household_id uuid not null references public.households (id) on delete cascade,
  id uuid not null default gen_random_uuid(),
  billing_month date not null check (extract(day from billing_month) = 1),
  kwh numeric(10, 2) not null check (kwh > 0),
  amount_centavos integer not null check (amount_centavos > 0),
  due_date date,
  billing_date date,
  period_start date,
  period_end date,
  provider_id text references public.providers (id),
  provider_custom_name text check (char_length(btrim(provider_custom_name)) between 1 and 80),
  source text not null check (source in ('scan', 'manual')),
  source_name text check (char_length(source_name) <= 200),
  notes text check (char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (household_id, id),
  constraint bills_one_per_month unique (household_id, billing_month),
  constraint bills_one_provider check (provider_id is null or provider_custom_name is null),
  constraint bills_due_after_billing check (due_date is null or billing_date is null or due_date >= billing_date),
  constraint bills_period_complete check ((period_start is null) = (period_end is null)),
  constraint bills_period_order check (period_end is null or period_end >= period_start)
);

-- ---------------------------------------------------------------------
-- appliances
-- ---------------------------------------------------------------------
create table public.appliances (
  household_id uuid not null references public.households (id) on delete cascade,
  id uuid not null default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  model text check (char_length(model) <= 80),
  kind text not null default 'other' check (kind in ('fan', 'aircon', 'fridge', 'tv', 'rice-cooker', 'washer', 'lights', 'laptop', 'phone', 'microwave', 'iron', 'other')),
  watts numeric(9, 2) not null check (watts > 0),
  hours_per_day numeric(4, 2) not null check (hours_per_day between 0 and 24),
  quantity integer not null default 1 check (quantity between 1 and 50),
  days_in_period integer not null default 30 check (days_in_period between 1 and 366),
  wattage_basis text not null default 'approximate' check (wattage_basis in ('nameplate', 'approximate')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (household_id, id)
);

-- ---------------------------------------------------------------------
-- advisories: reviewed provider advisories
-- details and match are documents the interface already validates on read.
-- ---------------------------------------------------------------------
create table public.advisories (
  household_id uuid not null references public.households (id) on delete cascade,
  id uuid not null default gen_random_uuid(),
  revision integer not null check (revision >= 1),
  details jsonb not null check (octet_length(details::text) <= 32768),
  match jsonb not null check (octet_length(match::text) <= 16384),
  type text not null generated always as (details ->> 'type') stored
    check (type in ('scheduled', 'unscheduled', 'notice', 'restored')),
  match_status text not null generated always as (match ->> 'status') stored
    check (match_status in ('affected', 'possibly-affected', 'not-listed')),
  original_kind text not null check (original_kind in ('text', 'image')),
  original_name text not null check (char_length(original_name) between 1 and 200),
  original_text text not null default '' check (char_length(original_text) <= 12000),
  original_image_path text check (original_image_path ~ ('^[0-9a-f-]{36}/' || id::text || '/r[1-9][0-9]{0,5}\.(jpg|png|webp)$')),
  original_captured_at timestamptz not null,
  reviewed_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (household_id, id),
  constraint advisories_original_present check (
    (original_kind = 'text' and btrim(original_text) <> '' and original_image_path is null)
    or (original_kind = 'image' and original_image_path is not null)
  )
);

-- ---------------------------------------------------------------------
-- advisory_preparation: checklist progress for one advisory, revision and household basis
-- ---------------------------------------------------------------------
create table public.advisory_preparation (
  id bigint generated always as identity primary key,
  household_id uuid not null references public.households (id) on delete cascade,
  advisory_id uuid not null,
  revision integer not null check (revision >= 1),
  household_signature text not null check (char_length(household_signature) between 1 and 2000),
  -- The signature can be too long for an index entry, so uniqueness uses its hash.
  signature_hash text not null generated always as (md5(household_signature)) stored,
  checked text[] not null default '{}'
    check (public.is_unique_subset(checked, array['charge', 'lights', 'unplug', 'fridge', 'water'])),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint advisory_preparation_basis unique (household_id, advisory_id, revision, signature_hash)
);

-- ---------------------------------------------------------------------
-- brownout_plans: a plan keeps its own snapshot and outlives a deleted advisory
-- ---------------------------------------------------------------------
create table public.brownout_plans (
  household_id uuid not null references public.households (id) on delete cascade,
  advisory_id uuid not null,
  advisory_snapshot jsonb not null check (jsonb_typeof(advisory_snapshot) = 'object' and octet_length(advisory_snapshot::text) <= 65536),
  snapshot_image_path text check (snapshot_image_path ~ ('^[0-9a-f-]{36}/' || advisory_id::text || '/r[1-9][0-9]{0,5}\.(jpg|png|webp)$')),
  relevance_confirmed boolean not null,
  source_confirmed boolean not null check (source_confirmed),
  checked text[] not null default '{}'
    check (public.is_unique_subset(checked, array['charge', 'work', 'lights', 'unplug', 'fridge'])),
  acknowledged_updates jsonb not null default '[]'
    check (case when jsonb_typeof(acknowledged_updates) = 'array' then jsonb_array_length(acknowledged_updates) <= 100 else false end),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (household_id, advisory_id)
);

-- ---------------------------------------------------------------------
-- tips_snapshots: one saved set of tips per household
-- ---------------------------------------------------------------------
create table public.tips_snapshots (
  household_id uuid primary key references public.households (id) on delete cascade,
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object' and octet_length(snapshot::text) <= 131072),
  generated_at timestamptz not null,
  input_signature text not null check (octet_length(input_signature) <= 262144),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- scenarios: saved Watt-If scenarios
-- ---------------------------------------------------------------------
create table public.scenarios (
  household_id uuid not null references public.households (id) on delete cascade,
  id uuid not null default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 60 and char_length(title) <= 60),
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 131072),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (household_id, id)
);

-- ---------------------------------------------------------------------
-- setup_progress: home setup checklist acknowledgements
-- ---------------------------------------------------------------------
create table public.setup_progress (
  household_id uuid primary key references public.households (id) on delete cascade,
  reviewed_tips text check (octet_length(reviewed_tips) <= 262144),
  acknowledged text check (octet_length(acknowledged) <= 262144),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- auth_login_attempts: failed username sign-ins, for the limiter
-- ---------------------------------------------------------------------
create table public.auth_login_attempts (
  id bigint generated always as identity primary key,
  username text not null check (char_length(username) between 1 and 64),
  ip_hash text not null check (ip_hash ~ '^[0-9a-f]{64}$'),
  attempted_at timestamptz not null default now()
);
create index auth_login_attempts_username_idx on public.auth_login_attempts (username, attempted_at);
create index auth_login_attempts_ip_idx on public.auth_login_attempts (ip_hash, attempted_at);

-- ---------------------------------------------------------------------
-- updated_at on every table that has it
-- ---------------------------------------------------------------------
do $$
declare
  target text;
begin
  foreach target in array array[
    'providers', 'profiles', 'households', 'bills', 'appliances', 'advisories',
    'advisory_preparation', 'brownout_plans', 'tips_snapshots', 'scenarios', 'setup_progress'
  ] loop
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', target);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- Every new account gets exactly one profile and one household.
-- A failure here would block every sign-up, so this does nothing else.
-- ---------------------------------------------------------------------
create function public.handle_new_user() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, left(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')), 50))
  on conflict (id) do nothing;
  insert into public.households (owner_id)
  values (new.id)
  on conflict (owner_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Row limits. The browser writes to these tables directly, so the database
-- itself stops one account from filling it. An AFTER trigger counts only rows
-- that were really added, so replacing an existing row is still allowed at the cap.
-- ---------------------------------------------------------------------
create function public.enforce_household_row_limit() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  cap integer;
  held integer;
begin
  cap := tg_argv[0]::integer;
  -- One household's inserts into one table run one at a time, so the count is exact.
  perform pg_advisory_xact_lock(hashtextextended(tg_table_name || ':' || new.household_id::text, 0));
  execute format('select count(*) from public.%I where household_id = $1', tg_table_name)
    into held using new.household_id;
  if held > cap then
    raise exception 'household row limit reached for %', tg_table_name
      using hint = 'row_limit', detail = format('limit=%s', cap);
  end if;
  return null;
end;
$$;

create trigger enforce_row_limit after insert on public.bills
  for each row execute function public.enforce_household_row_limit('240');
create trigger enforce_row_limit after insert on public.appliances
  for each row execute function public.enforce_household_row_limit('150');
create trigger enforce_row_limit after insert on public.advisories
  for each row execute function public.enforce_household_row_limit('200');
create trigger enforce_row_limit after insert on public.advisory_preparation
  for each row execute function public.enforce_household_row_limit('500');
create trigger enforce_row_limit after insert on public.brownout_plans
  for each row execute function public.enforce_household_row_limit('100');
create trigger enforce_row_limit after insert on public.scenarios
  for each row execute function public.enforce_household_row_limit('50');

commit;
```

- [x] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: `pass 116`, `fail 0` (108 from before, plus the 8 tests in this file).

If a constraint case fails with a different SQLSTATE than listed, read the error message first. Change the test only when the database refused the value for the same reason under a different code; otherwise fix the SQL.

- [x] **Step 6: Commit**

```bash
git add package.json package-lock.json supabase/migrations/20261010000000_initial_schema.sql supabase/tests/migration.test.mjs
git commit -m "feat: add initial schema with constraints, sign-up trigger and row limits"
```

---

### Task 6: Migration, part two — row-level security, grants and storage rules

**Files:**
- Modify: `supabase/migrations/20261010000000_initial_schema.sql` (insert above the final `commit;`; it has not been applied anywhere yet)
- Modify: `supabase/tests/migration.test.mjs` (append)

**Interfaces:**
- Consumes: the tables, `db`, `sql`, `rejects`, `A`, `B`, `C` and `household` from Task 5.
- Produces: row-level security on all twelve tables; privileges for roles `authenticated` and `service_role`; none for `anon`; private buckets `avatars` and `advisory-originals` with path policies; function `advisory_original_count(): integer`, which counts the caller's stored advisory images. A denied write raises SQLSTATE `42501`. A denied read returns no rows.

**Acceptance Criteria:**
- No table in `public` lacks row-level security, and role `anon` holds no privilege on any of them.
- Account A can read and write its own rows in all eight household tables and cannot read, insert, update or delete account B's.
- A signed-in account cannot insert or delete a profile or household, and cannot change `households.owner_id` or `profiles.id`.
- `avatars` accepts only `<user id>/avatar.jpg`. `advisory-originals` accepts only `<user id>/<uuid>/r<revision>.<jpg|png|webp>` and at most 60 files per account.
- `auth_login_attempts` is closed to `authenticated` and usable by `service_role`.

- [x] **Step 1: Append the failing tests**

Append to `supabase/tests/migration.test.mjs`:

```js

// ---------------------------------------------------------------------
// Security rules. These run as the API roles, the way requests arrive.
// ---------------------------------------------------------------------
async function as(role, userId, run) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId ?? ""]);
  await db.exec(`set role ${role}`);
  try { return await run(); }
  finally { await db.exec("reset role"); }
}
const asUser = (userId, run) => as("authenticated", userId, run);
const affected = async (text, params = []) => (await db.query(text, params)).affectedRows;

const OWNED = {
  bills: "insert into public.bills (household_id, billing_month, kwh, amount_centavos, source) values ($1, '2026-01-01', 120.5, 137950, 'manual')",
  appliances: "insert into public.appliances (household_id, name, kind, watts, hours_per_day, quantity) values ($1, 'Electric fan', 'fan', 55, 8, 2)",
  advisories: `insert into public.advisories (household_id, revision, details, match, original_kind, original_name, original_text, original_captured_at, reviewed_at) values ($1, 1, '{"type":"scheduled"}', '{"status":"affected"}', 'text', 'Pasted advisory', 'Line maintenance in Payao', now(), now())`,
  advisory_preparation: "insert into public.advisory_preparation (household_id, advisory_id, revision, household_signature, checked) values ($1, gen_random_uuid(), 1, '[]', '{charge}')",
  brownout_plans: "insert into public.brownout_plans (household_id, advisory_id, advisory_snapshot, relevance_confirmed, source_confirmed, checked) values ($1, gen_random_uuid(), '{}', true, true, '{charge,work}')",
  tips_snapshots: "insert into public.tips_snapshots (household_id, snapshot, generated_at, input_signature) values ($1, '{}', now(), '[]')",
  scenarios: "insert into public.scenarios (household_id, title, payload) values ($1, 'My Watt-If scenario', '{}')",
  setup_progress: "insert into public.setup_progress (household_id, reviewed_tips) values ($1, '[]')",
};
const ALL_TABLES = ["providers", "profiles", "households", ...Object.keys(OWNED), "auth_login_attempts"];

test("every table has row-level security and anon holds no privilege", async () => {
  assert.deepEqual((await sql("select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' order by 1")).map(row => row.relname), [...ALL_TABLES].sort());
  assert.deepEqual(await sql("select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity"), []);
  assert.deepEqual(await sql("select table_name, privilege_type from information_schema.role_table_grants where table_schema = 'public' and grantee = 'anon'"), []);
  assert.deepEqual(await sql("select table_name, column_name from information_schema.column_privileges where table_schema = 'public' and grantee = 'anon'"), []);
  for (const table of ALL_TABLES) await rejects(as("anon", null, () => db.query(`select 1 from public.${table} limit 1`)), "42501", `anon reads ${table}`);
});

test("an account reads and writes only its own household", async () => {
  for (const [table, insert] of Object.entries(OWNED)) {
    await asUser(A, () => db.query(insert, [household.a]));
    await asUser(B, () => db.query(insert, [household.b]));
    assert.equal((await asUser(A, () => sql(`select household_id from public.${table}`))).every(row => row.household_id === household.a), true, `${table}: A sees only its own`);
    assert.equal((await asUser(A, () => sql(`select 1 from public.${table} where household_id = $1`, [household.b]))).length, 0, `${table}: A cannot read B`);
    await rejects(asUser(A, () => db.query(insert, [household.b])), "42501", `${table}: A inserts into B`);
    assert.equal(await asUser(A, () => affected(`update public.${table} set updated_at = now() where household_id = $1`, [household.b])), 0, `${table}: A updates B`);
    assert.equal(await asUser(A, () => affected(`delete from public.${table} where household_id = $1`, [household.b])), 0, `${table}: A deletes B`);
    await rejects(asUser(A, () => db.query(`update public.${table} set household_id = $1 where household_id = $2`, [household.b, household.a])), "42501", `${table}: A moves a row to B`);
    assert.equal((await sql(`select count(*)::int as n from public.${table} where household_id = $1`, [household.b]))[0].n, 1, `${table}: B's row survives`);
    assert.equal(await asUser(A, () => affected(`update public.${table} set updated_at = now() where household_id = $1`, [household.a])), 1, `${table}: A updates its own`);
    assert.equal(await asUser(A, () => affected(`delete from public.${table} where household_id = $1`, [household.a])), 1, `${table}: A deletes its own`);
  }
});

test("profiles and households are private, and cannot be created, removed or re-owned", async () => {
  assert.deepEqual((await asUser(A, () => sql("select id from public.profiles"))).map(row => row.id), [A]);
  assert.deepEqual((await asUser(A, () => sql("select owner_id from public.households"))).map(row => row.owner_id), [A]);
  assert.equal(await asUser(A, () => affected("update public.profiles set full_name = 'Hacked' where id = $1", [B])), 0);
  assert.equal(await asUser(A, () => affected("update public.households set name = 'Hacked' where id = $1", [household.b])), 0);
  assert.equal(await asUser(A, () => affected("update public.profiles set full_name = 'Ana S.', notify_tips = true where id = $1", [A])), 1);
  assert.equal(await asUser(A, () => affected("update public.households set location = 'Payao, San Jose de Buenavista, Antique', provider_id = 'anteco', monthly_budget_centavos = 160000 where id = $1", [household.a])), 1);
  const denied = [
    ["insert a profile", "insert into public.profiles (id) values (gen_random_uuid())"],
    ["delete own profile", `delete from public.profiles where id = '${A}'`],
    ["change a profile id", `update public.profiles set id = gen_random_uuid() where id = '${A}'`],
    ["insert a household", `insert into public.households (owner_id) values ('${A}')`],
    ["delete own household", `delete from public.households where owner_id = '${A}'`],
    ["re-own a household", `update public.households set owner_id = '${B}' where owner_id = '${A}'`],
    ["edit a provider", "update public.providers set name = 'Mine' where id = 'anteco'"],
  ];
  for (const [label, statement] of denied) await rejects(asUser(A, () => db.query(statement)), "42501", label);
  assert.equal((await asUser(A, () => sql("select id from public.providers"))).length, 7);
});

test("login attempts are closed to accounts and open to the service role", async () => {
  const hash = "a".repeat(64);
  await rejects(asUser(A, () => db.query("select 1 from public.auth_login_attempts")), "42501", "account reads attempts");
  await rejects(asUser(A, () => db.query("insert into public.auth_login_attempts (username, ip_hash) values ('maria', $1)", [hash])), "42501", "account writes attempts");
  await as("service_role", null, () => db.query("insert into public.auth_login_attempts (username, ip_hash) values ('maria', $1)", [hash]));
  assert.equal((await as("service_role", null, () => sql("select count(*)::int as n from public.auth_login_attempts where username = 'maria'")))[0].n, 1);
  assert.equal(await as("service_role", null, () => affected("delete from public.auth_login_attempts where username = 'maria'")), 1);
});

test("the service role reaches every table", async () => {
  for (const table of ALL_TABLES) await as("service_role", null, () => db.query(`select 1 from public.${table} limit 1`));
});

test("buckets are private and limited", async () => {
  const rows = await sql("select id, public, file_size_limit::int as file_size_limit, allowed_mime_types from storage.buckets order by id");
  assert.deepEqual(rows, [
    { id: "advisory-originals", public: false, file_size_limit: 2097152, allowed_mime_types: ["image/jpeg", "image/png", "image/webp"] },
    { id: "avatars", public: false, file_size_limit: 1048576, allowed_mime_types: ["image/jpeg"] },
  ]);
});

test("an avatar lives at exactly one path, and only its owner can touch it", async () => {
  const put = (name, bucket = "avatars") => db.query("insert into storage.objects (bucket_id, name) values ($1, $2)", [bucket, name]);
  await asUser(A, () => put(`${A}/avatar.jpg`));
  await rejects(asUser(A, () => put(`${A}/other.jpg`)), "42501", "another file name");
  await rejects(asUser(A, () => put(`${A}/avatar.png`)), "42501", "another extension");
  await rejects(asUser(A, () => put(`${B}/avatar.jpg`)), "42501", "another account's folder");
  await rejects(as("anon", null, () => put(`${A}/avatar.jpg`)), "42501", "no session");
  assert.equal((await asUser(B, () => sql("select name from storage.objects where bucket_id = 'avatars'"))).length, 0);
  assert.equal(await asUser(B, () => affected("update storage.objects set name = $1 where bucket_id = 'avatars'", [`${B}/avatar.jpg`])), 0);
  assert.equal(await asUser(B, () => affected("delete from storage.objects where bucket_id = 'avatars'")), 0);
  assert.equal((await asUser(A, () => sql("select name from storage.objects where bucket_id = 'avatars'"))).length, 1);
  assert.equal(await asUser(A, () => affected("delete from storage.objects where bucket_id = 'avatars'")), 1);
});

test("advisory originals follow the path pattern and stop at 60 files", async () => {
  const advisory = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
  const put = name => db.query("insert into storage.objects (bucket_id, name) values ('advisory-originals', $1)", [name]);
  await asUser(A, () => put(`${A}/${advisory}/r1.png`));
  for (const bad of [`${A}/notes.txt`, `${A}/${advisory}/r0.png`, `${A}/${advisory}/r1.gif`, `${A}/${advisory}/r1.png/extra`, `${A}/not-a-uuid/r1.png`, `${B}/${advisory}/r1.png`]) {
    await rejects(asUser(A, () => put(bad)), "42501", bad);
  }
  assert.equal((await asUser(B, () => sql("select name from storage.objects where bucket_id = 'advisory-originals'"))).length, 0);
  assert.equal(await asUser(B, () => affected("delete from storage.objects where bucket_id = 'advisory-originals'")), 0);
  for (let revision = 2; revision <= 60; revision += 1) await asUser(A, () => put(`${A}/${advisory}/r${revision}.jpg`));
  assert.equal((await asUser(A, () => sql("select count(*)::int as n from storage.objects where bucket_id = 'advisory-originals'")))[0].n, 60);
  await rejects(asUser(A, () => put(`${A}/${advisory}/r61.webp`)), "42501", "the 61st file");
  // Another account's count is its own.
  await asUser(B, () => put(`${B}/${advisory}/r1.webp`));
  assert.equal(await asUser(A, () => affected("delete from storage.objects where bucket_id = 'advisory-originals'")), 60);
});
```

- [x] **Step 2: Run the tests to verify they fail**

Run: `node --test supabase/tests/migration.test.mjs`
Expected: the 8 tests from Task 5 pass; the 8 new tests FAIL. The first reports that tables lack row-level security.

- [x] **Step 3: Add the security rules to the migration**

The file ends with the line `commit;`. Insert the following immediately above that line, so the security rules are inside the same transaction and `commit;` stays last.

Insert into `supabase/migrations/20261010000000_initial_schema.sql`, above the final `commit;`:

```sql

-- =====================================================================
-- Security rules
-- Being signed in is never enough. Every policy names the owner.
-- =====================================================================

-- Trigger-only functions that run with the owner's rights are not callable by API roles.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.enforce_household_row_limit() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Privileges. Start from nothing, then grant exactly what each role needs.
-- ---------------------------------------------------------------------
revoke all on table
  public.providers, public.profiles, public.households, public.bills, public.appliances,
  public.advisories, public.advisory_preparation, public.brownout_plans, public.tips_snapshots,
  public.scenarios, public.setup_progress, public.auth_login_attempts
from public, anon, authenticated;

grant select on table public.providers to authenticated;

-- Profiles and households are created by the sign-up trigger and removed with the account.
-- Their identity columns are not in the lists below, so they cannot be changed.
grant select on table public.profiles to authenticated;
grant update (full_name, username, avatar_path, notify_brownouts, notify_bill_reminders, notify_tips, onboarded_at)
  on table public.profiles to authenticated;
grant select on table public.households to authenticated;
grant update (name, location, province, municipality, barangay, provider_id, provider_custom_name, monthly_budget_centavos)
  on table public.households to authenticated;

grant select, insert, update, delete on table
  public.bills, public.appliances, public.advisories, public.advisory_preparation,
  public.brownout_plans, public.tips_snapshots, public.scenarios, public.setup_progress
to authenticated;

grant all on table
  public.providers, public.profiles, public.households, public.bills, public.appliances,
  public.advisories, public.advisory_preparation, public.brownout_plans, public.tips_snapshots,
  public.scenarios, public.setup_progress, public.auth_login_attempts
to service_role;

-- ---------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------
alter table public.providers enable row level security;
create policy "providers: signed-in users read" on public.providers
  for select to authenticated using (true);

alter table public.profiles enable row level security;
create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

alter table public.households enable row level security;
create policy "households: read own" on public.households
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "households: update own" on public.households
  for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

-- No policies: only the secret key, which bypasses row-level security, can reach this table.
alter table public.auth_login_attempts enable row level security;

do $$
declare
  target text;
  owned constant text := 'household_id in (select id from public.households where owner_id = (select auth.uid()))';
begin
  foreach target in array array[
    'bills', 'appliances', 'advisories', 'advisory_preparation',
    'brownout_plans', 'tips_snapshots', 'scenarios', 'setup_progress'
  ] loop
    execute format('alter table public.%I enable row level security', target);
    execute format('create policy "own household: read" on public.%I for select to authenticated using (%s)', target, owned);
    execute format('create policy "own household: add" on public.%I for insert to authenticated with check (%s)', target, owned);
    execute format('create policy "own household: change" on public.%I for update to authenticated using (%s) with check (%s)', target, owned, owned);
    execute format('create policy "own household: remove" on public.%I for delete to authenticated using (%s)', target, owned);
  end loop;
end;
$$;

-- =====================================================================
-- Storage: two private buckets. Policies check the whole path.
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars', 'avatars', false, 1048576, array['image/jpeg']),
  ('advisory-originals', 'advisory-originals', false, 2097152, array['image/jpeg', 'image/png', 'image/webp']);

-- avatars: exactly one file per account, at <user id>/avatar.jpg
create policy "avatars: read own" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and name = (select auth.uid())::text || '/avatar.jpg');
create policy "avatars: add own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and name = (select auth.uid())::text || '/avatar.jpg');
create policy "avatars: replace own" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and name = (select auth.uid())::text || '/avatar.jpg')
  with check (bucket_id = 'avatars' and name = (select auth.uid())::text || '/avatar.jpg');
create policy "avatars: remove own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and name = (select auth.uid())::text || '/avatar.jpg');

-- advisory-originals: <user id>/<advisory id>/r<revision>.<ext>, at most 60 files per account.
-- The count lives in a function so that it can take a lock and be exact.
-- It runs as the person uploading, so it counts exactly the files that person may read: their own.
create function public.advisory_original_count() returns integer
language plpgsql
set search_path = ''
as $$
declare
  owner_folder text;
  held integer;
begin
  owner_folder := (select auth.uid())::text || '/';
  -- One account's uploads are counted one at a time, so the limit is exact.
  perform pg_advisory_xact_lock(hashtextextended('advisory-originals:' || owner_folder, 0));
  select count(*) into held
    from storage.objects stored
   where stored.bucket_id = 'advisory-originals' and starts_with(stored.name, owner_folder);
  return held;
end;
$$;
revoke all on function public.advisory_original_count() from public, anon;
grant execute on function public.advisory_original_count() to authenticated;

create policy "advisory originals: read own" on storage.objects
  for select to authenticated
  using (bucket_id = 'advisory-originals' and name like (select auth.uid())::text || '/%');
create policy "advisory originals: add own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'advisory-originals'
    and name ~ ('^' || (select auth.uid())::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/r[1-9][0-9]{0,5}\.(jpg|png|webp)$')
    and public.advisory_original_count() < 60
  );
create policy "advisory originals: replace own" on storage.objects
  for update to authenticated
  using (bucket_id = 'advisory-originals' and name like (select auth.uid())::text || '/%')
  with check (
    bucket_id = 'advisory-originals'
    and name ~ ('^' || (select auth.uid())::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/r[1-9][0-9]{0,5}\.(jpg|png|webp)$')
  );
create policy "advisory originals: remove own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'advisory-originals' and name like (select auth.uid())::text || '/%');
```

- [x] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: `pass 124`, `fail 0`.

- [x] **Step 5: Commit**

```bash
git add supabase/migrations/20261010000000_initial_schema.sql supabase/tests/migration.test.mjs
git commit -m "feat: add row-level security, grants and storage rules"
```

---

### Task 7: Isolation test for the hosted project

**Files:**
- Modify: `package.json` (`test:isolation` script)
- Create: `supabase/tests/isolation.test.mjs`

**Interfaces:**
- Consumes: `readPublicSupabaseEnv`, `readSupabaseSecretKey` (Task 1); `signInWithEmail`, `getAccount`, `completeProfile`, `signOut` (Task 3); `findEmailByUsername`, `countRecentFailures`, `recordFailure`, `attemptAllowed`, `hashIp` (Task 4); the schema (Tasks 5 and 6).
- Produces: `npm run test:isolation`. With no `.env.local` it reports every test as skipped and exits 0.

**Acceptance Criteria:**
- Without the three variables, `npm run test:isolation` skips every test with a message that names what is missing, and exits 0.
- With them but without `WATTSNAP_TEST_PROJECT_REF` matching the project in the URL, it skips every test with a message saying it refuses to run against that project, and exits 0.
- With them, it creates two accounts in the test domain, proves every bullet under "Isolation test" in the specification through the real API, and deletes both accounts even when an assertion fails.
- It never prints a key.

- [x] **Step 1: Add the script**

In `package.json`, add this line to `scripts`, after `test`:

```json
    "test:isolation": "node --env-file-if-exists=.env.local --test supabase/tests/isolation.test.mjs"
```

- [x] **Step 2: Write the test**

Create `supabase/tests/isolation.test.mjs`:

```js
// Proves, through the hosted project's real API, that one household cannot reach another's data.
// It creates two throwaway accounts and deletes them again. Run: npm run test:isolation
import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { registerHooks } from "node:module";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

registerHooks({ resolve(specifier, context, nextResolve) {
  try { return nextResolve(specifier, context); }
  catch (error) {
    if (error.code === "ERR_MODULE_NOT_FOUND" && specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) return nextResolve(`${specifier}.ts`, context);
    throw error;
  }
} });
const { readPublicSupabaseEnv, readSupabaseSecretKey } = await import("../../src/lib/config/env.ts");
const service = await import("../../src/features/auth/service.ts");
const repository = await import("../../src/features/auth/repository.ts");

let config = null;
let skip = false;
try { config = { ...readPublicSupabaseEnv(), secretKey: readSupabaseSecretKey() }; }
catch (error) { skip = `Supabase is not configured. ${error.message}`; }
// This test creates accounts and fills tables to their limits. It must never touch production,
// so it runs only when .env.local names this exact project as the test project.
const projectRef = config ? new URL(config.url).hostname.split(".")[0] : "";
if (config && process.env.WATTSNAP_TEST_PROJECT_REF !== projectRef) {
  skip = `Refusing to run against project ${projectRef}. If it is the test project, and never production, add WATTSNAP_TEST_PROJECT_REF=${projectRef} to .env.local.`;
}
const options = { skip, timeout: 240_000 };

// A reserved domain: no mail is ever delivered to it. Accounts are created already confirmed.
const DOMAIN = process.env.WATTSNAP_TEST_EMAIL_DOMAIN || "example.com";
const PREFIX = "wattsnap-isolation-";
const run = randomUUID().slice(0, 8);
const password = `Iso1-${randomUUID()}`;
const limiterName = `wattsnap-isolation-${run}`;
const connect = key => createClient(config.url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const OWNED = ["bills", "appliances", "advisories", "advisory_preparation", "brownout_plans", "tips_snapshots", "scenarios", "setup_progress"];
const CAPS = { bills: 240, appliances: 150, advisories: 200, advisory_preparation: 500, brownout_plans: 100, scenarios: 50 };
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
const JPEG = Buffer.from("/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=", "base64");
const stamp = () => new Date().toISOString();

/** A valid row for each household table. `n` keeps rows distinct where the table requires it. */
function row(table, householdId, n = 0) {
  const month = new Date(Date.UTC(2000, n, 1)).toISOString().slice(0, 10);
  return {
    bills: { household_id: householdId, id: randomUUID(), billing_month: month, kwh: 120.5, amount_centavos: 137950, source: "manual" },
    appliances: { household_id: householdId, id: randomUUID(), name: `Electric fan ${n}`, kind: "fan", watts: 55, hours_per_day: 8, quantity: 2 },
    advisories: { household_id: householdId, id: randomUUID(), revision: 1, details: { type: "scheduled", title: "Scheduled Power Interruption" }, match: { status: "affected", rationale: [] }, original_kind: "text", original_name: "Pasted advisory", original_text: `Line maintenance in Payao ${n}`, original_captured_at: stamp(), reviewed_at: stamp() },
    advisory_preparation: { household_id: householdId, advisory_id: randomUUID(), revision: 1, household_signature: "[\"anteco\",\"Payao\"]", checked: ["charge"] },
    brownout_plans: { household_id: householdId, advisory_id: randomUUID(), advisory_snapshot: { revision: 1 }, relevance_confirmed: true, source_confirmed: true, checked: ["charge", "work"] },
    tips_snapshots: { household_id: householdId, snapshot: { version: "tips-ui-v1", tips: [] }, generated_at: stamp(), input_signature: "[]" },
    scenarios: { household_id: householdId, id: randomUUID(), title: `Scenario ${n}`, payload: { days: "30", entries: [] } },
    setup_progress: { household_id: householdId, reviewed_tips: "[]" },
  }[table];
}

const world = { admin: null, anon: null, a: null, b: null };

async function emptyFolder(bucket, prefix) {
  const { data } = await world.admin.storage.from(bucket).list(prefix, { limit: 1000 });
  for (const entry of data ?? []) {
    const path = `${prefix}/${entry.name}`;
    if (entry.id === null) await emptyFolder(bucket, path);
    else await world.admin.storage.from(bucket).remove([path]);
  }
}
/** Removes every account this test has ever created, including ones left by an interrupted run. */
async function removeTestAccounts() {
  for (let page = 1; ; page += 1) {
    const { data, error } = await world.admin.auth.admin.listUsers({ page, perPage: 200 });
    assert.equal(error, null, "listing accounts needs a valid secret key");
    const mine = data.users.filter(user => user.email?.startsWith(PREFIX) && user.email.endsWith(`@${DOMAIN}`));
    for (const user of mine) {
      await emptyFolder("avatars", user.id);
      await emptyFolder("advisory-originals", user.id);
      const { error: removeError } = await world.admin.auth.admin.deleteUser(user.id);
      assert.equal(removeError, null, `could not remove test account ${user.id}`);
    }
    if (data.users.length < 200) break;
  }
  await world.admin.from("auth_login_attempts").delete().like("username", `${PREFIX}%`);
}
async function createAccount(label) {
  const email = `${PREFIX}${label}-${run}@${DOMAIN}`;
  const { data, error } = await world.admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: `Isolation ${label.toUpperCase()}` } });
  assert.equal(error, null, `creating a test account failed (${error?.code}). If the address was refused, set WATTSNAP_TEST_EMAIL_DOMAIN in .env.local to a domain you control.`);
  const client = connect(config.publishableKey);
  const signedIn = await service.signInWithEmail(client, { email, password });
  assert.deepEqual(signedIn, { ok: true, value: undefined });
  const { data: households } = await client.from("households").select("id, owner_id");
  assert.equal(households.length, 1);
  return { id: data.user.id, email, client, householdId: households[0].id };
}
const count = async (client, table, householdId) => {
  const { count: total, error } = await client.from(table).select("*", { count: "exact", head: true }).eq("household_id", householdId);
  assert.equal(error, null);
  return total;
};

if (!skip) {
  before(async () => {
    world.admin = connect(config.secretKey);
    world.anon = connect(config.publishableKey);
    await removeTestAccounts();
    world.a = await createAccount("a");
    world.b = await createAccount("b");
  }, { timeout: 120_000 });
  after(async () => { await removeTestAccounts(); }, { timeout: 120_000 });
}

test("a new account has exactly one profile and one household", options, async () => {
  const { a, admin } = world;
  const { data: profiles } = await a.client.from("profiles").select("id, full_name, username, onboarded_at");
  assert.deepEqual(profiles, [{ id: a.id, full_name: "Isolation A", username: null, onboarded_at: null }]);
  const { data: households } = await a.client.from("households").select("owner_id");
  assert.deepEqual(households, [{ owner_id: a.id }]);
  assert.equal((await a.client.from("households").insert({ owner_id: a.id })).error?.code, "42501");
  assert.equal((await admin.from("households").insert({ owner_id: a.id })).error?.code, "23505");
  const { data: providers } = await a.client.from("providers").select("id");
  assert.equal(providers.length, 7);
});

test("each account writes and reads back a row in every table", options, async () => {
  for (const account of [world.a, world.b]) {
    for (const table of OWNED) {
      const { error } = await account.client.from(table).insert(row(table, account.householdId));
      assert.equal(error, null, `${table}: ${error?.code}`);
      assert.equal(await count(account.client, table, account.householdId), 1, table);
    }
  }
});

test("account A cannot read, add to, change or remove account B's rows", options, async () => {
  const { a, b, admin } = world;
  for (const table of OWNED) {
    const read = await a.client.from(table).select("household_id").eq("household_id", b.householdId);
    assert.deepEqual(read.data, [], `${table}: read`);
    assert.equal((await a.client.from(table).insert(row(table, b.householdId, 1))).error?.code, "42501", `${table}: insert`);
    const changed = await a.client.from(table).update({ updated_at: stamp() }).eq("household_id", b.householdId).select("household_id");
    assert.deepEqual(changed.data, [], `${table}: update`);
    const removed = await a.client.from(table).delete().eq("household_id", b.householdId).select("household_id");
    assert.deepEqual(removed.data, [], `${table}: delete`);
    assert.equal((await a.client.from(table).update({ household_id: b.householdId }).eq("household_id", a.householdId)).error?.code, "42501", `${table}: move a row`);
    assert.equal(await count(admin, table, b.householdId), 1, `${table}: B's row survives`);
    assert.equal(await count(admin, table, a.householdId), 1, `${table}: A's row stays`);
  }
  assert.deepEqual((await a.client.from("profiles").select("id").eq("id", b.id)).data, []);
  assert.deepEqual((await a.client.from("households").select("id").eq("id", b.householdId)).data, []);
  assert.deepEqual((await a.client.from("profiles").update({ full_name: "Hacked" }).eq("id", b.id).select("id")).data, []);
  assert.deepEqual((await a.client.from("households").update({ name: "Hacked" }).eq("id", b.householdId).select("id")).data, []);
  assert.equal((await a.client.from("households").update({ owner_id: b.id }).eq("id", a.householdId)).error?.code, "42501");
  assert.equal((await a.client.from("profiles").delete().eq("id", a.id)).error?.code, "42501");
});

test("a client with no session reads nothing, and login attempts are closed to accounts", options, async () => {
  const { a, anon } = world;
  for (const table of ["providers", "profiles", "households", ...OWNED, "auth_login_attempts"]) {
    const { data, error } = await anon.from(table).select("*").limit(1);
    assert.ok(error || data.length === 0, `anon: ${table}`);
  }
  assert.ok((await anon.storage.from("avatars").download(`${a.id}/avatar.jpg`)).error);
  const read = await a.client.from("auth_login_attempts").select("id").limit(1);
  assert.ok(read.error || read.data.length === 0);
  assert.ok((await a.client.from("auth_login_attempts").insert({ username: limiterName, ip_hash: "a".repeat(64) })).error);
});

test("out-of-range values are refused", options, async () => {
  const { a } = world;
  const h = a.householdId;
  const bad = [
    ["money", "bills", { ...row("bills", h, 2), amount_centavos: 0 }],
    ["kWh", "bills", { ...row("bills", h, 2), kwh: 0 }],
    ["month", "bills", { ...row("bills", h, 2), billing_month: "2030-01-15" }],
    ["dates", "bills", { ...row("bills", h, 2), billing_date: "2030-01-20", due_date: "2030-01-10" }],
    ["period", "bills", { ...row("bills", h, 2), period_start: "2030-01-01" }],
    ["sample", "bills", { ...row("bills", h, 2), source: "sample" }],
    ["hours", "appliances", { ...row("appliances", h, 2), hours_per_day: 25 }],
    ["quantity", "appliances", { ...row("appliances", h, 2), quantity: 51 }],
    ["kind", "appliances", { ...row("appliances", h, 2), kind: "toaster" }],
    ["checklist", "advisory_preparation", { ...row("advisory_preparation", h), checked: ["charge", "charge"] }],
    ["plan checklist", "brownout_plans", { ...row("brownout_plans", h), checked: ["water"] }],
    ["plan source", "brownout_plans", { ...row("brownout_plans", h), source_confirmed: false }],
    ["advisory type", "advisories", { ...row("advisories", h, 2), details: { type: "party" } }],
    ["document size", "advisories", { ...row("advisories", h, 2), details: { type: "notice", reason: "r".repeat(33000) } }],
    ["title", "scenarios", { ...row("scenarios", h, 2), title: "t".repeat(61) }],
  ];
  for (const [label, table, value] of bad) assert.ok((await a.client.from(table).insert(value)).error, label);
  assert.ok((await a.client.from("households").update({ monthly_budget_centavos: 0 }).eq("id", h)).error, "budget zero");
  assert.ok((await a.client.from("households").update({ monthly_budget_centavos: 10000001 }).eq("id", h)).error, "budget over the cap");
  assert.ok((await a.client.from("households").update({ provider_id: "anteco", provider_custom_name: "Other Coop" }).eq("id", h)).error, "two providers");
  assert.equal((await a.client.from("households").update({ monthly_budget_centavos: 160000, provider_id: "anteco", province: "Antique", municipality: "San Jose de Buenavista", barangay: "Payao" }).eq("id", h)).error, null);
  assert.ok((await a.client.from("profiles").update({ username: "AB" }).eq("id", a.id)).error, "short username");
});

test("files are private to their owner and restricted to the accepted paths", options, async () => {
  const { a, b, admin } = world;
  const advisory = randomUUID();
  const avatar = `${a.id}/avatar.jpg`;
  const original = `${a.id}/${advisory}/r1.png`;
  const jpeg = { contentType: "image/jpeg" };
  const png = { contentType: "image/png" };

  assert.equal((await a.client.storage.from("avatars").upload(avatar, JPEG, jpeg)).error, null);
  assert.equal((await a.client.storage.from("advisory-originals").upload(original, PNG, png)).error, null);
  assert.equal((await a.client.storage.from("avatars").download(avatar)).error, null);

  assert.ok((await a.client.storage.from("avatars").upload(`${a.id}/other.jpg`, JPEG, jpeg)).error, "another avatar name");
  assert.ok((await a.client.storage.from("avatars").upload(`${a.id}/avatar.png`, PNG, png)).error, "an avatar that is not a JPEG");
  assert.ok((await a.client.storage.from("advisory-originals").upload(`${a.id}/notes.txt`, Buffer.from("hello"), { contentType: "text/plain" })).error, "a text file");
  assert.ok((await a.client.storage.from("advisory-originals").upload(`${a.id}/${advisory}/photo.png`, PNG, png)).error, "a free file name");

  assert.ok((await b.client.storage.from("avatars").download(avatar)).error, "B downloads A's avatar");
  assert.ok((await b.client.storage.from("advisory-originals").download(original)).error, "B downloads A's original");
  assert.ok((await b.client.storage.from("avatars").upload(avatar, JPEG, { ...jpeg, upsert: true })).error, "B overwrites A's avatar");
  assert.ok((await b.client.storage.from("advisory-originals").upload(`${a.id}/${advisory}/r2.png`, PNG, png)).error, "B writes into A's folder");
  await b.client.storage.from("avatars").remove([avatar]);
  await b.client.storage.from("advisory-originals").remove([original]);
  assert.equal((await admin.storage.from("avatars").download(avatar)).error, null, "A's avatar survives");
  assert.equal((await admin.storage.from("advisory-originals").download(original)).error, null, "A's original survives");
  assert.ok((await b.client.storage.from("avatars").createSignedUrl(avatar, 60)).error, "B signs a link to A's avatar");

  // 59 more files reach the limit of 60; the next one is refused.
  for (let start = 2; start <= 60; start += 10) {
    const batch = Array.from({ length: Math.min(10, 61 - start) }, (_, index) => start + index);
    const results = await Promise.all(batch.map(revision => a.client.storage.from("advisory-originals").upload(`${a.id}/${advisory}/r${revision}.png`, PNG, png)));
    for (const [index, result] of results.entries()) assert.equal(result.error, null, `file r${batch[index]}`);
  }
  assert.ok((await a.client.storage.from("advisory-originals").upload(`${a.id}/${advisory}/r61.png`, PNG, png)).error, "the 61st file");
});

test("the auth services work against the real project", options, async () => {
  const { a, b } = world;
  const account = await service.getAccount(a.client);
  assert.equal(account.ok, true);
  assert.equal(account.value.id, a.id);
  assert.equal(account.value.email, a.email);
  assert.equal(account.value.profile.fullName, "Isolation A");
  assert.equal(account.value.profile.onboardedAt, null);

  const username = `iso_${run}`;
  assert.deepEqual(await service.completeProfile(a.client, { fullName: "Isolation A", username }), { ok: true, value: undefined });
  const completed = await service.getAccount(a.client);
  assert.equal(completed.value.profile.username, username);
  assert.ok(Number.isFinite(Date.parse(completed.value.profile.onboardedAt)));
  assert.deepEqual(await service.completeProfile(b.client, { fullName: "Isolation B", username }), { ok: false, kind: "conflict", message: "That username is taken." });

  const wrong = await service.signInWithEmail(connect(config.publishableKey), { email: a.email, password: `${password}-wrong` });
  assert.deepEqual(wrong, { ok: false, kind: "authentication", message: "Incorrect email, username, or password." });
  const unknown = await service.signInWithEmail(connect(config.publishableKey), { email: `${PREFIX}nobody-${run}@${DOMAIN}`, password });
  assert.deepEqual(unknown, wrong);

  const second = connect(config.publishableKey);
  assert.equal((await service.signInWithEmail(second, { email: a.email, password })).ok, true);
  assert.deepEqual(await service.signOut(second), { ok: true, value: undefined });
  assert.deepEqual(await service.getAccount(second), { ok: true, value: null });
  assert.equal((await service.getAccount(a.client)).value.id, a.id, "the first session is still signed in");

  assert.equal(await repository.findEmailByUsername(world.admin, username), a.email);
  assert.equal(await repository.findEmailByUsername(world.admin, `nobody_${run}`), null);
});

test("the limiter allows five failed attempts and refuses the sixth", options, async () => {
  const { admin } = world;
  const ipHash = repository.hashIp("203.0.113.9", config.secretKey);
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const counts = await repository.countRecentFailures(admin, { username: limiterName, ipHash });
    assert.equal(counts.username, attempt - 1);
    assert.equal(repository.attemptAllowed(counts), true, `attempt ${attempt}`);
    await repository.recordFailure(admin, { username: limiterName, ipHash });
  }
  const counts = await repository.countRecentFailures(admin, { username: limiterName, ipHash });
  assert.equal(counts.username, 5);
  assert.equal(repository.attemptAllowed(counts), false);
});

test("each capped table accepts its cap and refuses the next row", options, async () => {
  const { a } = world;
  for (const [table, cap] of Object.entries(CAPS)) {
    assert.equal((await a.client.from(table).delete().eq("household_id", a.householdId)).error, null, `${table}: clear`);
    const rows = Array.from({ length: cap }, (_, index) => row(table, a.householdId, index + 10));
    const filled = await a.client.from(table).insert(rows);
    assert.equal(filled.error, null, `${table}: ${cap} rows (${filled.error?.code})`);
    const over = await a.client.from(table).insert(row(table, a.householdId, cap + 10));
    assert.equal(over.error?.code, "P0001", `${table}: row ${cap + 1}`);
    assert.match(over.error.message, /household row limit reached/);
    assert.equal(await count(a.client, table, a.householdId), cap, `${table}: still at the cap`);
  }
});
```

- [x] **Step 3: Run it without configuration to verify it skips**

Run: `npm run test:isolation`
Expected: 9 tests, each marked as skipped with `Supabase is not configured. Missing environment variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. See .env.example.`; `fail 0`; exit code 0.

- [x] **Step 4: Confirm the other tests are unaffected**

Run: `npm test`
Expected: `pass 124`, `fail 0`.

- [x] **Step 5: Commit**

```bash
git add package.json supabase/tests/isolation.test.mjs
git commit -m "test: add isolation test for the hosted project"
```

---

### Task 8: Operations document and a build with no configuration

**Files:**
- Create: `docs/11-database-operations.md`

**Interfaces:**
- Consumes: the script names from Tasks 1, 5 and 7 and the migration file name from Task 5.
- Produces: the procedures Tasks 9 and 11 follow.

**Acceptance Criteria:**
- The document tells a person how to apply a migration by either method, run both tests, keep a free-plan project active, back up and restore.
- `npm run build` succeeds with no `.env.local` present.

- [x] **Step 1: Write the document**

Create `docs/11-database-operations.md`:

````markdown
# Database operations

WattSnap uses two hosted Supabase projects.

| Project | Purpose | Rules |
| --- | --- | --- |
| `wattsnap` | Production. Real accounts and real household records. | No test ever runs here. Its secret key is not kept on developer machines. |
| `wattsnap-dev` | Testing. | Every migration is applied here first. The isolation test runs here. It may be emptied at any time. |

Design reference: [Supabase backend foundation](superpowers/specs/2026-10-10-supabase-auth-data-design.md).

## Secrets

Three values connect the code to a project. On a developer machine they are the values of `wattsnap-dev`, and they live in `.env.local` in the project folder, which Git ignores. A fourth value, `WATTSNAP_TEST_PROJECT_REF`, names the test project. The names are listed in `.env.example`.

- The **publishable key** is safe in a browser.
- The **secret key** bypasses every security rule. It must never be committed, pasted into a chat or an issue, given a `NEXT_PUBLIC_` name, or added to a hosting environment before server code needs it.
- The **database password** is needed only for the backup and restore commands below.

If this folder is inside a synchronised location such as OneDrive, `.env.local` is uploaded to that service along with everything else. Keep the repository outside synchronised folders, or accept that the secret key is stored in that account. If the secret key is ever exposed, create a new one in the dashboard under API Keys and delete the old one.

## Migrations

Schema changes are SQL files in `supabase/migrations/`, named with a timestamp. They are applied in name order.

A file that has been applied to production is never edited. A correction is a new file with a later timestamp.

Each file starts with `begin;` and ends with `commit;`, so it is applied completely or not at all.

The order is always the same: check locally, apply to `wattsnap-dev`, run the isolation test, apply to `wattsnap`, compare the schema summary.

### Check a migration before it reaches a hosted database

```
npm test
```

This applies every migration file to an embedded Postgres on this machine and checks ownership, grants, constraints, row limits and file path rules. It needs no network. Do not apply a migration that fails here.

### Apply a migration

Migrations are applied through the dashboard. Open the project, check its name at the top of the page, open SQL Editor, paste the whole migration file, and run it. If any statement fails, none of them take effect.

The Supabase CLI can also apply migrations (`npx supabase link`, then `npx supabase db push`). It has not been used on these projects. The dashboard does not record which files it has run, so before the CLI is used for the first time it must be told, once for each project, or it will try to run them again:

```
npx supabase migration repair --status applied 20261010000000
```

### After applying to `wattsnap-dev`

```
npm run test:isolation
```

### Schema summary

Run this in the SQL Editor of both projects after applying a migration to production. The two results must be identical.

```sql
select 'tables' as item, count(*)::text as value from pg_tables where schemaname = 'public'
union all
select 'tables without row-level security', count(*)::text
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
union all
select 'policies on public tables', count(*)::text from pg_policies where schemaname = 'public'
union all
select 'policies on stored files', count(*)::text from pg_policies
 where schemaname = 'storage' and tablename = 'objects'
   and (policyname like 'avatars:%' or policyname like 'advisory originals:%')
union all
select 'triggers', count(*)::text
  from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
 where not t.tgisinternal
   and (n.nspname = 'public' or (n.nspname = 'auth' and t.tgname = 'on_auth_user_created'))
union all
select 'privileges held by anon', count(*)::text from information_schema.role_table_grants
 where table_schema = 'public' and grantee = 'anon'
union all
select 'buckets', coalesce(string_agg(id, ', ' order by id), '') from storage.buckets
 where id in ('avatars', 'advisory-originals')
union all
select 'providers', count(*)::text from public.providers;
```

After the initial migration the values are: 12, 0, 37, 8, 18, 0, `advisory-originals, avatars`, 7.

### Starting the test project again

When a migration has to be corrected before production has received it, `wattsnap-dev` must be empty before the corrected file is applied. There is deliberately no SQL statement here that empties a database: such a statement, run in the wrong project, would destroy production.

Instead, delete the test project and create it again:

1. Open `wattsnap-dev`. Check the name at the top of the page.
2. Project Settings, General, Delete project. Supabase asks for the project name to be typed before it deletes anything.
3. Create a new project named `wattsnap-dev` in the same region, and apply the same auth settings.
4. Replace the four values in `.env.local` with the new project's URL, keys and reference.

## The two tests

| Command | What it checks | Needs |
| --- | --- | --- |
| `npm test` | Every unit test, and the migration in an embedded Postgres. | Nothing. |
| `npm run test:isolation` | The same security rules through the hosted project's real API, plus file storage and the auth services. | `.env.local` with the four values of `wattsnap-dev`. |

The isolation test creates two accounts with addresses beginning `wattsnap-isolation-` in the reserved domain `example.com`, and deletes them when it finishes, including after a failure. At its start it also removes any such accounts left by an interrupted run. If Supabase refuses the addresses, set `WATTSNAP_TEST_EMAIL_DOMAIN` in `.env.local` to a domain you control.

It refuses to run unless `WATTSNAP_TEST_PROJECT_REF` in `.env.local` equals the project reference in the URL, which is the first part of the address: `abcdefgh` in `https://abcdefgh.supabase.co`. Set it to the reference of `wattsnap-dev` and nothing else. If production values are ever placed in `.env.local`, the mismatch stops the test from touching production.

## Keeping a free-plan project active

Supabase pauses a free-plan project after seven days without requests. A paused project is restored from its dashboard page. Supabase limits how long a paused project can still be restored; the notice on the paused project gives the date.

`wattsnap-dev` may pause; restore it when it is next needed. `wattsnap` holds nothing until the application uses it, so a pause before then loses nothing, but it must be restored and checked before the application is connected. Once the application is live, its own traffic keeps the project active.

## Free-plan limits

500 MB of database, 1 GB of files, no automatic backups. The schema limits how much one household can store, but many accounts can still fill the project. Check Database and Storage usage in the dashboard regularly once the application is public.

## Backup

The free plan makes no backups. Without the procedure below, a mistake or an outage loses every account.

Backups contain personal data and password hashes. Store them outside this repository, outside any synchronised folder, and encrypted.

### What is needed

`pg_dump` and `pg_restore`, at least as new as the Postgres version shown on the project's dashboard (17 when this was written). They are part of the PostgreSQL installer for Windows (the server component is not needed). Check with:

```
pg_dump --version
```

The connection string comes from the dashboard: Connect, then Session pooler. It contains the database password.

### Take a backup

```
pg_dump "<session-pooler-connection-string>" --format=custom --no-owner --no-privileges --schema=public --schema=auth --schema=storage --file "<backup-folder>/wattsnap-YYYY-MM-DD.dump"
```

This captures accounts (`auth`), household records (`public`) and the list of stored files (`storage`). It does not capture the files themselves. Download those from Storage in the dashboard, or accept that profile photos and advisory images would need to be uploaded again.

Back up `wattsnap`, the production project. Take a backup every week once real data exists, and before applying any migration to it.

### Check a backup

A backup that has never been read is not a backup. After taking one, list its contents:

```
pg_restore --list "<backup-folder>/wattsnap-YYYY-MM-DD.dump"
```

The list must include `TABLE DATA public households`, `TABLE DATA public profiles` and `TABLE DATA auth users`.

### Restore

**This procedure has not been rehearsed.** Rehearse it once, by restoring a backup into a fresh `wattsnap-dev`, before real users depend on it. Until then, treat the steps below as an outline.

1. Restore into a new, empty Supabase project, never over the live one.
2. Apply every migration to the new project, in order.
3. Load the data for the `auth` and `public` schemas from the backup. Supabase's own guide, "Backup and Restore using the CLI" in its documentation, gives the exact commands and the session setting that lets a non-superuser load rows without firing triggers. Follow the current version of that guide.
4. Compare the new project with the schema summary above.
5. Sign in as a real account and confirm its records are present.
6. Point the application at the new project's URL and keys.

Do not run the isolation test against a restored production project.

Restoring is disruptive and can lose whatever was written after the backup. Decide who is responsible for it before it is needed.
````

- [x] **Step 2: Build with no configuration**

Run: `ls .env.local`
Expected: `No such file or directory`. If the file exists, skip this step; the build without configuration was already demonstrated before the file was created, or will be recorded as not verified.

Run: `npm run build`
Expected: the build completes and lists the same routes as on `main`, with no error.

- [x] **Step 3: Confirm only planned files changed**

Run: `git diff main --stat -- . ":(exclude)docs/superpowers"`
Expected: only `.env.example`, `docs/11-database-operations.md`, `package.json`, `package-lock.json`, `src/features/auth/*`, `src/lib/config/*`, `supabase/migrations/*`, `supabase/tests/*`.

- [x] **Step 4: Commit**

```bash
git add docs/11-database-operations.md
git commit -m "docs: add database operations guide"
```

- [x] **Step 5: Offer to push the branch**

Part 1 is complete and exists only on this machine. Ask the owner whether to push it now with `git push -u origin feat/supabase-auth`. Push only on a yes. Do not open a pull request.

---

## Part 2: Work that needs the Supabase projects

There are two Supabase projects. `wattsnap-dev` is where the migration is applied first and where the isolation test runs. `wattsnap` is production: it receives the migration only after `wattsnap-dev` passes, and no test ever runs against it.

These tasks need a person to have completed Appendix A of the specification: both projects exist; on both, "Confirm email" is on, the minimum password length is 8 and passwords must contain letters and digits; and `.env.local` holds the three values of **`wattsnap-dev`** together with `WATTSNAP_TEST_PROJECT_REF` set to the `wattsnap-dev` reference. Production keys are not placed on this machine in Phase A. Before starting, confirm:

Run: `npm run test:isolation`
Expected, if not ready: every test skipped with a message naming the missing variable, or refusing the project. Stop and ask for the setup to be completed. Never ask for a key to be pasted into the conversation.

### Task 9: Prove the migration on `wattsnap-dev`, then apply it to production

**Files:**
- No file changes when everything passes.
- Create, only if a defect is found after production has the schema: `supabase/migrations/<later-timestamp>_<what-it-fixes>.sql`

**Interfaces:**
- Consumes: the migration (Tasks 5 and 6), the isolation test (Task 7), the procedures (Task 8).
- Produces: two hosted databases with the same schema; `wattsnap-dev` proven by the isolation test, `wattsnap` shown to match it.

**Acceptance Criteria:**
- The migration is applied to `wattsnap-dev`, and `npm run test:isolation` reports 9 passed, 0 failed, 0 skipped against it.
- After the run, no account whose email starts with `wattsnap-isolation-` exists in `wattsnap-dev`.
- The migration is applied to `wattsnap`, and the schema summary query returns the same eight values on both projects.
- No test account was ever created in `wattsnap`.

- [x] **Step 1: Run the local checks once more**

Run: `npm test`
Expected: `pass 124`, `fail 0`.

- [x] **Step 2: Apply the migration to `wattsnap-dev`**

Follow "Apply a migration" in `docs/11-database-operations.md`. This step is done by the project owner. With the dashboard method, the owner opens the **`wattsnap-dev`** project, pastes the full contents of `supabase/migrations/20261010000000_initial_schema.sql` into SQL Editor and runs it.

Expected: `Success. No rows returned`.

If it fails, nothing was applied, because the file is one transaction. Read the error, correct the migration file (allowed, because production has not received it), run `npm test` again, and repeat this step. Add a case to `supabase/tests/migration.test.mjs` that would have caught the problem.

- [x] **Step 3: Run the isolation test**

Run: `npm run test:isolation`
Expected: `pass 9`, `fail 0`, `skipped 0`. It takes one to three minutes.

- [x] **Step 4: If a test fails, correct it before production sees anything**

Decide which of these it is:

- **The hosted platform behaves differently from the embedded Postgres** (for example a different error code for the same refusal). Correct the test's expectation, and say so in the commit message.
- **A security rule or constraint is wrong.** Production has not received the migration, so the file may still be corrected. Fix `supabase/migrations/20261010000000_initial_schema.sql`, add the case to `supabase/tests/migration.test.mjs`, and run `npm test`. Then the owner starts `wattsnap-dev` again from empty by following "Starting the test project again" in `docs/11-database-operations.md`, applies the corrected file, and `npm run test:isolation` is run again.

Do not continue until the result is `pass 9`, `fail 0`, `skipped 0`.

- [x] **Step 5: Confirm the test cleaned up after itself**

In the `wattsnap-dev` dashboard, open Authentication, Users, and search for `wattsnap-isolation-`.
Expected: no users.

- [x] **Step 6: Commit any corrections**

Only if Step 4 changed files. Name what was corrected in the message, for example:

```bash
git add supabase/
git commit -m "fix: correct storage path rule after hosted verification"
```

- [ ] **Step 7: Apply the migration to production**

The owner opens the **`wattsnap`** project, checks the project name at the top of the page, pastes the same file into SQL Editor and runs it.

Expected: `Success. No rows returned`.

From this moment the file is frozen. Any later correction is a new migration file, applied to `wattsnap-dev` first.

- [ ] **Step 8: Show that production matches the tested project**

The owner runs the query from "Schema summary" in `docs/11-database-operations.md` in the SQL Editor of both projects.

Expected on both, identically:

| item | value |
| --- | --- |
| tables | 12 |
| tables without row-level security | 0 |
| policies on public tables | 37 |
| policies on stored files | 8 |
| triggers | 18 |
| privileges held by anon | 0 |
| buckets | advisory-originals, avatars |
| providers | 7 |

If production differs from `wattsnap-dev` in any row, stop and report the difference. Do not run the isolation test against production to investigate.

---

### Task 10: Generated types, typed clients, final checks and push

**Files:**
- Create: `src/generated/database.types.ts` (generated)
- Modify: `src/features/auth/service.ts` (the `Client` type line)
- Modify: `src/features/auth/repository.ts` (the `Admin` type line)

**Interfaces:**
- Consumes: the applied schema (Task 9).
- Produces: `Database` type exported from `src/generated/database.types.ts`; `service.ts` and `repository.ts` typed against it.

**Acceptance Criteria:**
- `src/generated/database.types.ts` is the unedited output of the generator and names all twelve tables.
- `npx tsc --noEmit` passes with the service and repository typed against `Database`.
- `npm test` and `npm run test:isolation` pass.
- `git diff main --stat` shows only planned files.
- The branch is pushed to `origin`. `main` is unchanged.

- [ ] **Step 1: Generate the types**

This needs `npx supabase login` to have been run by the project owner in a terminal on this machine; ask them to run it once. The types are generated from `wattsnap-dev`, whose URL is the one in `.env.local`. Both projects have the same schema.

Read the project reference from the URL without printing any key. In Git Bash:

```bash
REF=$(grep '^NEXT_PUBLIC_SUPABASE_URL=' .env.local | sed -E 's#.*https://([a-z0-9]+)\.supabase\.co.*#\1#')
npx --yes supabase gen types typescript --project-id "$REF" --schema public > src/generated/database.types.ts
```

Run: `grep -c "Row:" src/generated/database.types.ts`
Expected: `12`.

Do not edit the generated file.

- [ ] **Step 2: Type the service and the repository against the schema**

In `src/features/auth/service.ts`, replace:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
```

with:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../generated/database.types";
```

and replace:

```ts
type Client = SupabaseClient;
```

with:

```ts
type Client = SupabaseClient<Database>;
```

In `src/features/auth/repository.ts`, replace:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
```

with:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../generated/database.types";
```

and replace:

```ts
type Admin = SupabaseClient;
```

with:

```ts
type Admin = SupabaseClient<Database>;
```

- [ ] **Step 3: Check types**

Run: `npx tsc --noEmit`
Expected: no output.

If the compiler reports that a column does not exist or has a different type, the code and the schema disagree. Fix the code to match the schema. Do not edit the generated file and do not add a cast.

- [ ] **Step 4: Run everything**

Run: `npm test`
Expected: `pass 124`, `fail 0`.

Run: `npm run test:isolation`
Expected: `pass 9`, `fail 0`, `skipped 0`.

Run: `npm run build`
Expected: the build completes with the same routes as on `main`.

- [ ] **Step 5: Confirm no key reached the build output or Git**

In Git Bash:

```bash
SECRET=$(grep '^SUPABASE_SECRET_KEY=' .env.local | cut -d= -f2-)
grep -rlF -- "$SECRET" .next src supabase docs package.json .env.example 2>/dev/null | wc -l
git ls-files | grep -c '^\.env\.local$'
```

Expected: `0` and `0`.

- [ ] **Step 6: Confirm the scope of the change**

Run: `git diff main --stat -- . ":(exclude)docs/superpowers"`
Expected: only `.env.example`, `docs/11-database-operations.md`, `package.json`, `package-lock.json`, `src/features/auth/*`, `src/generated/database.types.ts`, `src/lib/config/*`, `supabase/migrations/*`, `supabase/tests/*`.

- [ ] **Step 7: Commit**

```bash
git add src/generated/database.types.ts src/features/auth/service.ts src/features/auth/repository.ts
git commit -m "feat: add generated database types and type the auth clients against them"
```

- [ ] **Step 8: Push the branch**

```bash
git push -u origin feat/supabase-auth
```

Expected: the branch appears on GitHub. Do not open a pull request into `main` and do not merge. The merge waits for the frontend branch, as the specification's rollout section says.

---

### Task 11: First backup

**Files:**
- No file changes.

**Interfaces:**
- Consumes: the backup procedure in `docs/11-database-operations.md` (Task 8).
- Produces: one verified backup file outside the repository.

**Acceptance Criteria:**
- A backup file of the production project, `wattsnap`, exists outside the repository and outside any synchronised folder.
- `pg_restore --list` on it shows `TABLE DATA public households`, `TABLE DATA public profiles` and `TABLE DATA auth users`.

- [ ] **Step 1: Check the tool is installed**

Run: `pg_dump --version`
Expected: `pg_dump (PostgreSQL) 17` or newer.

If the command is not found, stop. Installing software on this machine is the owner's decision. Report that the PostgreSQL client tools are needed for backups, that the Windows installer from postgresql.org provides them, and that this task stays open until they are installed. Do not mark the task done.

- [ ] **Step 2: Take the backup**

The project owner runs the command from "Take a backup" in `docs/11-database-operations.md`, because the connection string contains the database password and must not pass through the conversation.

- [ ] **Step 3: Check the backup**

The owner runs the `pg_restore --list` command from "Check a backup" and confirms the three expected lines appear.

- [ ] **Step 4: Record the result**

Report the date of the backup and that the three lines were present. Do not record the file's location or any connection detail in the repository.

---

## Self-Review

**Specification coverage**

| Specification requirement | Task |
| --- | --- |
| One migration: twelve tables, constraints, triggers | 5 |
| Row limits per household | 5 |
| Row-level security, grants, anonymous role holds nothing | 6 |
| Two private buckets with exact path rules and a 60-file limit | 6 |
| Environment variable names, template and validation | 1 |
| Validation rules; `next` path rule | 2 |
| Service functions, failure categories, no raw text, bot-check token accepted | 3 |
| Sign-up answers the same for a registered address | 3 |
| Username lookup and limiter (5 per username, 20 per address, 15 minutes, 24-hour cleanup) | 4 |
| Migration test in an embedded Postgres | 5, 6 |
| Isolation test against the hosted project, with cleanup before and after | 7, 9 |
| Generated database types | 10 |
| Operations document: migrations, tests, keeping the project active, backup, restore | 8 |
| Build succeeds without environment variables | 8 |
| Change limited to the file map | 8, 10 |
| Backup run once and checked | 11 |
| Push the branch; do not merge to `main` | 10 |
| Nothing added to Vercel | Global Constraints |

Deliberately not in this plan, because the specification places them in Phase B: feature repositories, cookie-based clients, the secret-key client wrapper, the authorization helper, the route guard, the Google return route, the username login server action, email, Google and bot-protection setup.

**Known dependencies on a person**

- Tasks 9 to 11 cannot start until the Supabase project exists and `.env.local` is filled in.
- Task 10, Step 1 needs `npx supabase login` to have been run in a terminal by the project owner.
- Task 11 needs the PostgreSQL client tools, which are not installed on this machine.

**Tracking**

The `bd` tool is not installed on this machine, so the deterministic `bd lint` checks were not run and tasks are tracked by the checkboxes in this file.

## Stress Test Results: Supabase backend foundation plan

Eleven branches were examined: nine mapped at the start and two added by the self-review. Four were confirmed as written and seven changed the plan.

### Evidence

Every code block in this plan was extracted into a scratch folder outside the repository and run there:

- The 32 unit tests for Tasks 1 to 4 pass.
- The migration from Tasks 5 and 6 applies in the embedded Postgres, and its 16 rule tests pass.
- Four rules were broken on purpose. The tests caught three: the 60-file limit, the privileges of the anonymous role, and a missing row-limit trigger. The fourth, an update policy that no longer checked ownership of the changed row, was still refused, because Postgres also applies the read policy to a changed row.
- The schema summary query returns 12, 0, 37, 8, 18, 0, `advisory-originals, avatars`, 7.

### Resolved Decisions

- **The plan's code runs as written.** Confirmed by the evidence above.
- **Embedded Postgres is not Supabase.** Kept as the first check only. The isolation test against a hosted project remains the proof.
- **Replacing a saved row at a row limit.** Confirmed: the replacement is allowed and a new row is refused.
- **Test leftovers.** Confirmed: accounts and files are removed before and after each run.

### Changes Made

- **Two hosted projects.** `wattsnap-dev` receives every migration first and hosts the isolation test. `wattsnap`, production, receives a migration only after `wattsnap-dev` passes, and is compared with it using the schema summary. Production keys are not placed on a developer machine in Phase A.
- **The isolation test refuses to run against a project that is not named as the test project** in `WATTSNAP_TEST_PROJECT_REF`.
- **The migration is one explicit transaction.** A file that fails part-way was shown to leave nothing behind.
- **The file-count function runs as the person uploading.** The earlier version ran with the migration role's rights and assumed that role could see every stored file on the hosted platform.
- **Correcting a migration on the test project** is done by deleting and recreating that project. No statement that empties a database is kept in the repository.
- **Password rules on the server.** Both projects require letters and digits, so the rule does not depend on the application's own check.
- **Pushing after Part 1** is offered to the owner, so finished work does not sit on one machine while the hosted setup is pending.

### Deferred / Parking Lot

- Which database the hosting provider's preview deployments use. This is decided in Phase B, when the application first reads the database.
- A scheduled backup. Phase A takes one by hand.

### Confidence Assessment

- Overall: High. The SQL and the TypeScript in this plan have already run, and the rules they implement were shown to fail when broken.
- Areas of concern: the hosted platform can still differ from the embedded Postgres in storage behaviour and error codes, which Task 9 exists to find. Tasks 9 to 11 depend on setup that only the project owner can do, and Task 11 needs software that is not yet installed.
