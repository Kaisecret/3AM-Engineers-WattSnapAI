# Authentication wiring report ? 2026-10-11

Task 1 is implemented on `feat/supabase-auth`. The current visual structure, form classes, mascot artwork and layout remain in place.

## Implemented behavior

- Cookie-backed browser and server Supabase clients use `@supabase/ssr`; the privileged admin client is marked `server-only`, uses secret credentials and disables session persistence and refresh.
- Middleware verifies claims, denies anonymous access, copies refreshed cookies onto protected-route redirects, preserves a same-origin `next` path, and applies private/no-store headers. The signed email API is excluded from middleware and remains controlled by its signature handler.
- The household layout independently calls verified `getUser` through `getAccount`, checks profile completion, then hands the account to `AccountSynchronizer`. Household children mount only after the server-provided UUID is installed as their in-memory storage identity. Signout and account changes unmount children and refresh verified server state.
- Persisted preview identities no longer establish an account. Compatibility display hooks read only the in-memory account installed from verified server data. Old display identity caches are removed; local household storage continues to be namespaced by Supabase UUID. Cached display identity stores no passwords, verification codes or access/refresh tokens.
- Email/password and username login use a server action. Username resolution, address lookup, keyed IP hashes and existing attempt limits stay server-side. The client receives only a safe result, never the resolved address or session tokens. On Vercel the limiter uses `x-vercel-forwarded-for`; other hosts share a conservative `unknown` IP bucket.
- Signup, six-digit signup and recovery verification, resend, profile completion, password recovery/reset, logout and AppEntry use real Supabase services. Failed sends, invalid codes and exceptions display feedback while keeping the current step. Password changes use the existing global-signout service. Logout optionally removes only this account's namespaced local records.
- The fake Google chooser is removed. The official public Auth `/settings` endpoint is checked server-side with a bounded ten-second timeout before OAuth starts. Disabled Google support visibly says to use email/password. Enabled support launches Supabase Google OAuth.
- `/auth/callback` exchanges PKCE codes. `/auth/confirm` verifies token hashes with a whitelist of email OTP types, sends recovery to reset-password, signup/invite to complete-profile, and otherwise uses `safeNextPath`. Redirects use the request origin and private/no-store responses. Reauthentication is deliberately excluded from the OTP whitelist.
- Signup, recovery and resend set same-origin PKCE callback destinations when given the browser origin, supporting Supabase's built-in confirmation links as well as the Gmail hook's direct token-hash links. A recovery callback goes to reset-password even before profile onboarding.
- Birth-date collection is removed. Profile completion persists only existing profile columns.
- The service worker deletes old shell caches and caches only static public assets plus the generic offline fallback. It never stores authenticated or auth documents; offline wording now requires reconnection to verify the account.

## Verification evidence

Initial red runs were inspected before implementing the behavior: seven identity/route/cache tests failed, six action/callback tests failed, three screen event tests failed, and subsequent anonymous-account, disabled-Google, default-email-link and pre-onboarding recovery regressions each failed for the expected missing behavior before their fixes.

Final commands and results:

- `node --test src/features/auth/*.test.mjs src/features/auth/components/flows.test.mjs src/lib/supabase/authorization.test.mjs`: **50 tests passed, 0 failed**.
- `npm test`: **161 tests passed, 0 failed**, including migration isolation tests and root-owned email tests.
- `npx tsc --noEmit`: **exit 0**.
- `git diff --check`: **exit 0**; Git emitted only normal CRLF conversion notices for existing repository line-ending policy.

The new tests exercise code verification failures, failed signup/login/reset screen handlers, UUID display/cache isolation, privileged username boundaries and limits, callback/confirmation redirects, invalid OTP types, disabled Google availability, copied refresh cookies, anonymous user denial, default-provider PKCE redirect options and protected-document service-worker behavior. Network/provider and framework dependencies are substituted locally. Existing Node module-type warnings remain; package settings were outside this task's ownership.

A concurrent Next build briefly removed generated `.next/types` during one TypeScript run; a later clean run passed after those files stabilized. No production build, hosted account creation, real-user email sending, hosted auth-flow tests or deployment was performed by this task worker. Root owns those external checks and provider configuration.

## External configuration and remaining scope

- Root must set the Supabase email OTP length to six, require confirmations, and allowlist the live/local callback and confirmation URLs. The root worker reported doing this against the live project.
- Google requires provider credentials and enablement in Supabase. Until then the button displays a clear unavailable-provider message; no fake account is selected.
- The default Supabase email template may provide a confirmation link without a six-digit code. The UI and PKCE callback support that alternative while Gmail configuration is pending or being enabled by root.
- Household records remain device-local. Existing preview records keyed by email/username are not automatically moved to verified UUIDs, and legacy data is not treated as authorization. Full cloud feature persistence remains outside this task.
- The existing username counter design is retained; it is not an atomic global abuse-control system. Ordinary email/password auth continues to use Supabase's rate limits.

Only authentication source/tests, the service-worker/offline companion and this report are staged for the Task 1 commit. Dependency/env/email/configuration/deployment files belong to root and are excluded.
