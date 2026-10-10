# Vercel authentication and Gmail email Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Deploy WattSnap with verified Supabase sessions and Gmail delivery through Nodemailer.

**Architecture:** Cookie clients share sessions between the existing UI and Next.js server. A signed Supabase email hook invokes a Node.js Nodemailer transport. Existing household records remain device-local and use verified user IDs for storage scope.

**Tech Stack:** Next.js 15, TypeScript, Supabase JS and SSR, Nodemailer, Standard Webhooks, Vercel CLI.

## Global Constraints

- Keep the current visual design.
- Never authorize with a browser preview identity.
- Validate the raw body and Standard Webhooks signature before using Nodemailer.
- Credentials are entered locally or in Vercel, never pasted into chat or committed.
- Preserve existing local user changes.
- Full cloud persistence for every feature is separate from this authentication/deployment setup.

### Task 1: Supabase sessions and authentication screens

**Files:** `src/lib/supabase/{browser,server,authorization,middleware,admin}.ts`, `src/middleware.ts`, `src/features/auth/{session,actions}.ts`, `src/features/auth/components/*.tsx`, `src/app/(household)/layout.tsx`, `src/app/auth/callback/route.ts`, `src/app/(auth)/complete-profile/page.tsx`, `src/features/dashboard/components/LogoutDialog.tsx`, `src/features/onboarding/components/AppEntry.tsx`, `src/features/auth/preview-session.ts`, `public/sw.js`.

**Interfaces:** `getBrowserSupabase()` returns `SupabaseClient<Database>`; `getServerSupabase()` asynchronously returns the cookie client; `getAdminSupabase()` uses server-only secret credentials. `rememberAccount(account: Account)` caches display identity only and never authorizes. Existing `service.ts` exports the auth operations, `schemas.ts` exports `safeNextPath` and identifier parsing, `repository.ts` handles username lookup and limits.

- [x] Add failing behavioral tests for signed-in storage identity and protected routes/cache behavior. Run the specific tests and inspect the expected failures before implementation.
- [x] Create browser/server/middleware clients following current official SSR docs. Middleware uses verified claims, copies refreshed cookies on redirects and sets private no-store headers. Household layout also verifies the user server-side.
- [x] Wire the existing signup, six-digit verification, resend, profile completion, password login, Google OAuth callback, recovery, reset and logout screens to real services. Username lookup remains on the server; never return its email or tokens to the client. Failed sends and invalid codes keep users on the current step with visible error feedback. Profile completion stores only columns the migration defines; remove birth-date collection because no persistence exists.
- [x] Store only verified Supabase account IDs for local record namespacing. A server-verified household layout hands identity to a small client synchronizer before household data hooks mount; account changes clear the old display identity.
- [x] Update AppEntry to check real authentication. Replace fake Google account selection with OAuth. Ensure callback paths remain same-origin through `safeNextPath`.
- [x] Revise service worker to cache static assets and public offline fallback only. Delete old shell caches and never cache authenticated documents or auth responses.
- [x] Run relevant auth tests and `npx tsc --noEmit`. Report exact evidence and any external provider settings needed. Commit only task files after self-review.

### Task 2: Signed Nodemailer email hook

**Files:** `src/lib/email/{config,auth-email,send-email-hook,smtp}.ts`, `src/lib/email/*.test.mjs`, `src/app/api/auth/send-email/route.ts`, `.env.example`.

**Interfaces:** `readSmtpEnv()` returns validated server settings. `authEmails(payload)` returns recipient/subject/text/html messages. `handleSendEmailHook(request, dependencies)` verifies signature then sends messages and returns a Response. The route injects configured Nodemailer sending.

- [x] Write behavioral tests: signed signup/recovery produces the exact Supabase code; invalid/stale signature sends nothing; modified raw body is rejected; malformed payload sends nothing; secure email change uses the documented token/address mapping; SMTP failure returns non-success without leaking secrets. Run `node --test src/lib/email/*.test.mjs` and confirm expected feature-missing failures.
- [x] Pin Nodemailer and Standard Webhooks versions and implement the transport with bounded network timeouts. No arbitrary recipient route is added. Parse the complete signed body, validate recipient and action, HTML-escape all variable content, and use the Supabase tokens unchanged.
- [x] Document Gmail environment names and hook endpoint. Add empty SMTP entries to `.env.local` without changing existing settings; generate a local hook secret without printing it.
- [x] Run hook tests and TypeScript check. Commit only task files after self-review.

### Task 3: Deployment, configuration, and end-to-end verification

**Files:** `docs/12-vercel-auth-email.md`, `vercel.json`, `.vercelignore`, setup scripts as needed.

- [x] Read hosted table metadata using the configured Supabase project. Do not rerun existing migration. Check Gmail configuration without printing values.
- [x] Link to the existing `wattsnapai` Vercel project, inspect its environment variable names, and configure needed variables using stdin or structured API bodies, never command-line secret interpolation.
- [x] Run `npm test`, `npx tsc --noEmit`, and `npm run build`. Review all authentication and email changes before deploying.
- [x] Deploy to Vercel using the authorized CLI. Configure the Supabase live site origin and Send Email hook only when SMTP is ready. Keep existing email sending functional while credentials are pending.
- [x] Inspect the production deployment and verify unauthenticated protected-route redirects, rejected forged hooks, and invalid-password feedback. Test actual signup/recovery delivery when Gmail credentials are present.
- [x] Record the live URL, checks performed, exact pending configuration, and known scope limits in the operations guide. Report completion accurately.
