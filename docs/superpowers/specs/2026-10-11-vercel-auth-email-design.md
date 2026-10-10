# WattSnap Vercel authentication and Gmail email delivery

Date: 2026-10-11. Sender choice: Gmail SMTP with a Gmail App Password.

## Outcome

Deploy the existing Next.js application to Vercel with real Supabase email/password login, signup email verification, password recovery, profile completion, logout, and authenticated household routes. Keep the current visual design.

## Architecture

- Supabase remains the authority for users, passwords, verification codes, and sessions. Use the existing typed authentication services and database migration.
- Use cookie-based browser and server clients through `@supabase/ssr`. Verify users server-side before rendering household pages and refresh sessions in Next.js middleware. Never authorize with a browser preview identity.
- Wire the existing signup and password-recovery code screens to Supabase. Store profile completion in `public.profiles`. Email and username login use the existing username repository and failure limiter; secret-key lookup stays server-side.
- Replace the fake Google chooser with real OAuth and a safe callback. Google works when the provider is enabled in the Supabase project.
- Supabase invokes a signed Send Email hook at `/api/auth/send-email`. Validate the raw body and Standard Webhooks signature before using Nodemailer. Deliver Supabase-generated signup and recovery codes through Gmail SMTP. Do not expose a public arbitrary-recipient email endpoint.
- Support other standard Supabase email actions safely, including secure email changes. Report delivery failures to Supabase; never show or log tokens, passwords, or SMTP credentials.
- Keep existing household feature records in browser storage for this deployment, scoped to the verified Supabase user ID. Full cloud persistence for every feature is separate from this authentication/deployment setup.
- Stop the service worker from caching authenticated documents, redirects, and auth endpoints. Keep static assets and the public offline fallback.

## Configuration and deployment

Reuse existing Supabase settings in `.env.local`. Add documented server-only Gmail SMTP and Send Email hook variables. Credentials are entered locally or in Vercel, never pasted into chat or committed. The same Supabase URL and keys must be used by a deployment and its auth hook configuration.

Use the existing Vercel configuration and CLI connection if authenticated. Build and test before deploying. Configure the live origin in Supabase URL settings and the Send Email hook only when the endpoint and SMTP credentials are ready. Preserve existing migration history; inspect the hosted schema before any database mutation.

## Validation

- Tests for signed email-hook verification, stale or forged signatures, valid email action rendering, and malformed payload rejection.
- Existing authentication and database migration tests; TypeScript check and production build.
- Local browser check for invalid-password failure, authenticated route redirects, signup/recovery error feedback, and logout.
- Hosted schema and Vercel deployment checks where account access permits.
- Gmail delivery verification and a live signup/recovery check require the configured Gmail sender credentials and Supabase hook access. Record any unfinished external configuration explicitly.

## Boundaries

No new password database, locally accepted verification code, automatic migration rerun, Gemini integration, or changes to unrelated electricity calculations. Preserve existing local user changes.
