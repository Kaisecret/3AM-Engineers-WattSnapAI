# Supabase Auth and Household Data Design Specification

Date: 2026-10-10. Branch: `feat/supabase-auth`. Status: approved design, not yet implemented.

## Overview

WattSnap currently ships a complete interface with no backend behind it. The auth screens wait on a timer (`fakeDelay`) and then redirect, every household page is reachable without an account, and all household data lives in the browser under the `localStorage` key `wattsnap-ui-preview-v1`.

This specification replaces that with a hosted Supabase project: real accounts, a Postgres schema derived from the fields the screens already show, row-level security that isolates each household, and a data layer that the existing screens read from and write to.

It implements the foundation described in [docs/features/00-authentication-foundation.md](../../features/00-authentication-foundation.md) and follows [docs/03-architecture.md](../../03-architecture.md), [docs/05-shared-contracts.md](../../05-shared-contracts.md) and [docs/09-quality-security.md](../../09-quality-security.md).

## Decisions made during design

| Decision | Choice | Consequence |
| --- | --- | --- |
| Database host | One hosted Supabase project, free tier, Singapore region | No local database. See "Known limitations". |
| Sign-in methods | Email + password, and Google | Google needs an OAuth client created in Google Cloud Console. |
| Login identifier | Email or username | Username lookup needs the Supabase secret key on the server, plus an attempt limiter. |
| Email delivery | Gmail SMTP with an app password | About 500 emails per day. Suitable for demo and class use, not for launch. |
| Session handling | Cookie sessions through `@supabase/ssr`, with a middleware guard | Logged-out visitors are redirected before a protected page renders. |
| New account contents | Same sample bills, appliances and advisories the preview shows today | Rows are flagged as samples so the existing "Clear samples" controls keep working. |
| Delivery branch | `feat/supabase-auth`, merged to `main` after verification | `main` deploys to production automatically, so unfinished auth must not land there. |

## Scope

In scope:

- Database schema, constraints, row-level security policies and a private Storage bucket.
- Sign-up, email verification, Google sign-in, login, password recovery, logout.
- Route protection for every household page and the AI API routes.
- Moving bills, appliances, budget, profile, notification preferences, profile photo, advisory location and the brownout checklist from the browser into Supabase.
- Correcting interface text that would become untrue once data is stored in an account.

Out of scope, each handled separately:

- Gemini bill scanning and the assistant chat. Both keep returning sample values, and their "preview" labels stay because they remain accurate.
- Offline access and IndexedDB (feature F09). After this work the household pages need a connection.
- The four empty pages `/onboarding`, `/tips`, `/simulator`, `/brownout-ready`, and the general interface polish. These belong to a second specification written after this one is delivered.
- GitHub Actions workflows. The files in `.github/workflows/` stay empty.
- Importing data from the old browser preview. It was demonstration data.
- Account deletion. No screen offers it today.

## Environment variables

| Name | Where it is read | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser and server | Project URL. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser and server | Publishable key (older dashboards call it `anon`). Safe to expose; row-level security is what protects the data. |
| `SUPABASE_SECRET_KEY` | Server only | Secret key (older name `service_role`). Bypasses row-level security. Used only for username login. Never prefixed with `NEXT_PUBLIC_`, never committed, marked Sensitive in Vercel. |

`.env.example` lists the three names with empty values. `src/lib/config/env.ts` validates them at startup and throws a clear error naming any that are missing.

## Database schema

All tables live in the `public` schema. Every table has `created_at` and `updated_at` (`timestamptz`, default `now()`), and a trigger keeps `updated_at` current. Money is stored as integer centavos and energy as kWh, following the shared contracts.

### `providers`

Reference data, read-only to signed-in users.

| Column | Type | Rules |
| --- | --- | --- |
| `id` | `text` | Primary key. |
| `name` | `text` | Required. |
| `coverage_note` | `text` | Optional. |
| `is_supported` | `boolean` | Default `true`. |

Seeded with one row: `anteco`, "ANTECO", "Antique · bills and advisories supported".

### `profiles`

One row per account. Source screens: sign-up, profile setup, Settings.

| Column | Type | Rules |
| --- | --- | --- |
| `id` | `uuid` | Primary key, references `auth.users(id)`, deleted with the account. |
| `full_name` | `text` | Required, at most 50 characters. |
| `username` | `text` | Unique, optional until profile setup. 3 to 30 characters from `a-z`, `0-9`, `_`, `.`. |
| `birth_date` | `date` | Optional until profile setup. Not before 1900-01-01. The app also rejects future dates. |
| `avatar_path` | `text` | Path of the profile photo in the `avatars` bucket. |
| `notify_brownouts` | `boolean` | Default `true`. |
| `notify_bill_reminders` | `boolean` | Default `true`. |
| `notify_tips` | `boolean` | Default `false`. |
| `onboarded_at` | `timestamptz` | Set when profile setup is completed. |

The account email is not copied here. It is read from the Supabase session.

### `households`

One row per account. Source screens: Settings, Budget, Advisories.

| Column | Type | Rules |
| --- | --- | --- |
| `id` | `uuid` | Primary key, generated. |
| `owner_id` | `uuid` | Required, **unique**, references `auth.users(id)`, deleted with the account. |
| `location` | `text` | Required, 1 to 120 characters. Default "San Jose de Buenavista, Antique". |
| `provider_id` | `text` | Required, references `providers(id)`. Default `anteco`. |
| `monthly_budget_centavos` | `integer` | Required, 1 to 10,000,000 (₱100,000). Default 350,000. |
| `samples_seeded_at` | `timestamptz` | Set once sample data has been inserted. Not writable by clients. |

The unique `owner_id` is what guarantees one household per account, including when onboarding is retried.

### `bills`

Source screens: Snap AI, Energy, Home, Budget.

| Column | Type | Rules |
| --- | --- | --- |
| `id` | `uuid` | Primary key, generated. |
| `household_id` | `uuid` | Required, references `households(id)`, deleted with the household. |
| `billing_month` | `date` | Required, always the first day of the month. |
| `kwh` | `numeric(10,2)` | Required, greater than zero. |
| `amount_centavos` | `integer` | Required, greater than zero. |
| `due_date` | `date` | Optional. |
| `source` | `text` | One of `scan`, `manual`, `sample`. |

Unique on (`household_id`, `billing_month`). Saving a bill for a month that already has one replaces it, which is the behaviour the review screen already warns about.

### `appliances`

Source screen: Appliances.

| Column | Type | Rules |
| --- | --- | --- |
| `id` | `uuid` | Primary key, generated. |
| `household_id` | `uuid` | Required, references `households(id)`, deleted with the household. |
| `name` | `text` | Required, 1 to 80 characters after trimming. |
| `kind` | `text` | One of `fan`, `aircon`, `fridge`, `tv`, `rice-cooker`, `washer`, `lights`, `laptop`, `phone`, `microwave`, `iron`, `other`. |
| `watts` | `numeric(8,2)` | Required, greater than zero. |
| `hours_per_day` | `numeric(4,2)` | Required, greater than zero and at most 24. |
| `quantity` | `integer` | Required, 1 to 50. |
| `is_sample` | `boolean` | Default `false`. Replaces the `sample-` id prefix the preview used. |

### `advisories`

Source screens: Advisories, the brownout checklist, the assistant's context.

| Column | Type | Rules |
| --- | --- | --- |
| `id` | `uuid` | Primary key, generated. |
| `household_id` | `uuid` | Required, references `households(id)`, deleted with the household. |
| `provider_id` | `text` | Required, references `providers(id)`. Default `anteco`. |
| `type` | `text` | One of `scheduled`, `unscheduled`, `notice`, `restored`. |
| `starts_at` | `timestamptz` | Required. |
| `ends_at` | `timestamptz` | Optional; missing means the end is not announced. Must be after `starts_at` when present. |
| `area` | `text` | Required, at most 200 characters. |
| `reason` | `text` | Required, at most 300 characters. |
| `match_status` | `text` | One of `affected`, `possibly-affected`, `not-listed`. |
| `checklist_done` | `text[]` | Default empty. Only the five checklist keys are allowed. |
| `is_sample` | `boolean` | Default `false`. |

The screen's "Active" and "History" tabs are derived rather than stored: an advisory is active while its end (or, with no end, one day after its start) is still in the future and its type is not `restored`. Date, time range and duration labels are formatted from `starts_at` and `ends_at` in the Asia/Manila time zone.

Checklist keys: `charge-devices`, `prepare-lights`, `unplug-sensitive`, `keep-fridge-closed`, `store-water`. The labels stay in the interface code.

### `auth_login_attempts`

Supports the username login limiter. No client can read or write it.

| Column | Type | Rules |
| --- | --- | --- |
| `id` | `bigint` | Primary key, generated. |
| `username` | `text` | The username that was submitted, lower-cased, whether or not it exists. |
| `ip_hash` | `text` | HMAC-SHA256 of the caller's IP address, keyed with the secret key. The raw address is not stored. |
| `attempted_at` | `timestamptz` | Default `now()`. |

Only failed attempts are recorded. Rows older than 24 hours are deleted whenever the login action runs.

### Database functions and triggers

- `handle_new_user()` runs after a row is inserted into `auth.users`. It inserts the matching `profiles` row (taking `full_name` from the sign-up form or the Google profile, truncated to 50 characters) and the `households` row. Both inserts ignore conflicts, so a retry cannot create duplicates.
- `seed_sample_data()` is called once when profile setup completes. Inside a single transaction it inserts six monthly sample bills ending last month, five sample appliances and seven sample advisories dated relative to the current time, then sets `samples_seeded_at`. It does nothing if that column is already set.
- `set_updated_at()` maintains `updated_at` on every table.

`handle_new_user()` and `seed_sample_data()` run with definer rights, set an empty `search_path`, and scope every statement to the calling account. Execute permission on `seed_sample_data()` is granted to signed-in users only.

### Storage

A private bucket named `avatars`, limited to 1 MB per file and to JPEG, PNG and WebP. Each account stores a single object, `<user id>/avatar.jpg`, which is the format the photo editor already produces. The interface displays the photo through a signed URL that expires after one hour.

## Row-level security

Row-level security is enabled on every table. Policies name the specific owner; being signed in is never enough on its own.

| Table | Signed-in user may | Rule |
| --- | --- | --- |
| `providers` | Read | All rows. |
| `profiles` | Read, update | Only the row whose `id` is their user id. |
| `households` | Read, update | Only the row whose `owner_id` is their user id. |
| `bills`, `appliances`, `advisories` | Read, insert, update, delete | Only rows whose `household_id` belongs to a household they own. |
| `auth_login_attempts` | Nothing | No policies exist. |
| `storage.objects` in `avatars` | Read, insert, update, delete | Only objects inside the folder named with their user id. |

Further restrictions:

- Clients cannot insert or delete `profiles` or `households` rows. The trigger creates them and account deletion removes them.
- Update permission is granted column by column. On `households` clients may change `location`, `provider_id` and `monthly_budget_centavos` only. On `profiles` they may change everything except `id`.
- All privileges on these tables are revoked from the anonymous role.

## Authentication flows

The screens and their order stay as they are. Each timer is replaced with a real call.

### Sign-up with email

1. **Create account.** Full name, email, password and the terms checkbox. The password must satisfy the same three rules the reset screen already enforces: at least 8 characters, a letter and a number, not a common password. The app calls Supabase sign-up with the full name attached.
2. **Verify email.** Supabase emails a 6-digit code. The user types it and the app verifies it, which starts the session. "Resend" requests a new code. The resend countdown changes from 30 to 60 seconds, because Supabase refuses a second email to the same address inside 60 seconds.
3. **Profile setup.** Full name, birth date and username are saved to `profiles`, `onboarded_at` is set, and `seed_sample_data()` runs. A username that is already taken shows "That username is taken."
4. **Welcome**, then the dashboard.

When someone signs up with an email that already has an account, Supabase sends nothing and does not report an error, to avoid revealing which emails are registered. The app keeps that protection: the verify screen is shown either way, with a line that reads "No code? You may already have an account. Try logging in or resetting your password."

### Sign-in with Google

The "Continue with Google" button redirects to Google's own page. Google returns to Supabase, which returns to `/auth/callback`. That route exchanges the code for a session and then sends a new account to the profile step (`/signup?step=profile`) and a returning account to the dashboard.

The existing `GoogleChooserStep` and its demonstration account are deleted. Google presents the real account chooser, and an imitation of it must not remain in the product.

### Login

The single field keeps its "Email or Username" label.

- **If the value contains `@`** it is treated as an email and the browser signs in directly with Supabase.
- **Otherwise** it is treated as a username and sent to a server action. The action checks the limiter, looks up the email with the secret key, signs in on the server so that the session cookies are set, and never returns the email to the browser.

Every failure, whichever path it took, shows the same message: "Incorrect email, username, or password." When a username does not exist the action still performs a sign-in attempt against a placeholder address, so that response time does not reveal whether the username is real.

**Limiter.** The username path allows 5 failed attempts per username and 20 per IP address in any 15 minutes. Beyond that it answers "Too many attempts. Try again in 15 minutes, or log in with your email." Attempts are counted for the submitted text whether or not that username exists. A locked username can still log in by email, so the limiter cannot be used to lock someone out of their account.

If the password is correct but the email was never verified, the user is taken to the verify step with a fresh code.

### Forgot password

1. The user enters an email. The app always proceeds to the code screen, whether or not that email is registered.
2. The user enters the 6-digit code. Verifying it starts a recovery session.
3. `/reset-password` accepts the new password under the three rules, updates it, and signs out every session for that account.
4. The "Password Updated" screen links back to login.

`/reset-password` requires a session. Without one it redirects to `/forgot-password`.

### Logout

The logout dialog ends the session, removes the old `wattsnap-ui-preview-v1` key if it is still present, and returns to `/login`.

### Route protection

| Route | Rule |
| --- | --- |
| `/`, `/login`, `/signup`, `/forgot-password`, `/auth/callback` | Public. |
| `/login`, `/signup` when signed in and onboarded | Redirect to `/dashboard`. |
| `/reset-password` | Requires a session, otherwise redirect to `/forgot-password`. |
| `/dashboard`, `/bills`, `/bills/new`, `/appliances`, `/advisories`, `/assistant`, `/budget`, `/settings`, `/tips`, `/simulator`, `/brownout-ready`, `/onboarding` | Require a session, otherwise redirect to `/login?next=<path>`. Signed in but not onboarded: redirect to `/signup?step=profile`. |
| `/api/ai/*` | Require a session, otherwise respond `401` with a JSON error. |

Two layers enforce this. The middleware refreshes the session on each request and turns away visitors who have none. The household layout then confirms the user again on the server before it loads any data, and it is the layout that sends an account without `onboarded_at` to the profile step. Both ask the Supabase Auth server to validate the token and do not trust the cookie contents alone.

The `next` parameter is accepted only when it is a path on this site: it must start with a single `/`. Anything else is ignored in favour of `/dashboard`.

## Data layer

### Loading

`src/app/(household)/layout.tsx` becomes a server component. It confirms the user, loads the profile, household, bills, appliances and advisories in parallel, and passes them to a client `HouseholdProvider`. Pages therefore render with data already present and no loading flash.

### Reading and writing from screens

Screens replace `usePreviewHousehold()` with `useHousehold()`. The `household` object keeps the shape the screens already use (pesos as numbers, months as `YYYY-MM`, `hours`), so the calculation and formatting functions in `preview-data.ts` are not modified.

In place of the single `update()` function the hook provides one action per operation:

`saveBill`, `removeBill`, `loadSampleBills`, `saveAppliance`, `removeAppliance`, `setBudget`, `saveProfile`, `setNotifications`, `setPhoto`, `removePhoto`, `clearSamples`, `setLocation`, `toggleChecklistItem`.

`loadSampleBills` serves the "Load sample history" button on the empty Energy screen and inserts the same six sample months. Each action writes to Supabase from the browser under row-level security, waits for the stored row to come back, and then updates the in-memory state. It resolves to either success or a message the screen can display. Controls are disabled while a write is in flight.

Converting between database rows and the screen shape (centavos and pesos, dates and `YYYY-MM`, `hours_per_day` and `hours`, advisory timestamps and their labels) happens in each feature's `repository.ts`. Those files exist today as empty placeholders.

### Behaviour changes users will notice

- The location chosen on the Advisories screen is saved and shared with Settings. Today it is lost on leaving the page.
- Brownout checklist ticks are saved per advisory. Today they are lost on leaving the page.
- The profile photo is uploaded to the `avatars` bucket rather than stored in the browser.
- The Settings email field shows the account email and is read-only.

### Interface text that changes

These statements stop being true once data is stored in an account:

| Location | Current text | Change |
| --- | --- | --- |
| Home, desktop footer | "Preview • Saved in this browser" | Removed. |
| Settings footer | "WattSnap AI · Preview build" | "WattSnap AI". |
| Settings, Privacy & data | "Saved on this device … stay in this browser." | "Saved to your account. Only you can see your household's records." |
| Logout dialog | Checkbox "Also remove my data from this device" | Removed. |
| Advisories location dialog | "This preview keeps your location until you leave the page." | Removed; the sample-advisory note stays. |
| Verify step | Resend countdown of 30 seconds | 60 seconds. |

The scanner's "AI reading isn't connected yet" note and the assistant's "Preview assistant" note stay, because both remain accurate.

### Errors

| Situation | What the user sees |
| --- | --- |
| A value breaks a database rule | The same validation message the form already shows for that field. |
| Username already taken | "That username is taken." |
| No connection, or Supabase unreachable | "You're offline or the server can't be reached. Your change was not saved." The form keeps what was typed. |
| Session expired and cannot be refreshed | Redirect to `/login?next=<current path>`. |
| Email rate limit reached | "Please wait a minute before requesting another code." |
| Google sign-in cancelled or failed | Return to `/login` with "Google sign-in didn't finish. Please try again." |

Raw database and provider error text is logged to the console and never shown to the user.

## File map

New files:

| File | Purpose |
| --- | --- |
| `supabase/migrations/20261010000000_initial_schema.sql` | Tables, constraints, triggers, functions, policies, grants, bucket, provider seed. |
| `supabase/tests/rls_isolation.sql` | Isolation test described under "Testing". |
| `src/middleware.ts` | Session refresh and route guard. |
| `src/lib/supabase/middleware.ts` | Helper that builds the Supabase client for the middleware. |
| `src/lib/supabase/admin.ts` | Secret-key client. Marked server-only so that importing it from browser code fails the build. |
| `src/app/auth/callback/route.ts` | Google sign-in return route. |
| `src/features/auth/actions.ts` | Server action for username login. |
| `src/features/dashboard/household-provider.tsx` | `HouseholdProvider` and `useHousehold()`. |
| `src/generated/database.types.ts` | Types generated from the schema. Never edited by hand. |

Existing placeholders that receive their implementation:

`src/lib/config/env.ts`, `src/lib/supabase/browser.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/authorization.ts`, and within `src/features/`: `auth/service.ts`, `auth/repository.ts`, `auth/schemas.ts`, `auth/types.ts`, `auth/index.ts`, `household-profile/repository.ts`, `bill-history/repository.ts`, `appliance-registration/repository.ts`, `smart-energy-budget/repository.ts`, `advisory-intelligence/repository.ts`.

Existing files that change:

- Auth components: `LoginForm`, `SignupFlow`, `AuthSteps`, `ForgotPasswordFlow`, `ResetPasswordForm`, `AuthUi` (`fakeDelay` removed).
- Auth pages: `login`, `signup`, `reset-password`, to apply the redirects above.
- Household screens: `HomeScreen`, `EnergyScreen`, `ScanScreen`, `AppliancesScreen`, `BudgetScreen`, `SettingsScreen`, `AdvisoriesScreen`, `ChatScreen`, `LogoutDialog`, `AppHeader`, `DesktopHomeCards`.
- `src/app/(household)/layout.tsx`, `.env.example`, `package.json`.
- `tests/e2e/auth-ui-preview.cjs`, a layout check that walks the sign-up screens. It currently passes because any code is accepted; it is changed to stop at the verify screen, which is the last screen reachable without a real email code.

Removed: `src/features/dashboard/use-preview-household.ts`, and from `preview-data.ts` the storage key and `normalizePreview`, which only served browser storage.

New dependencies: `@supabase/supabase-js`, `@supabase/ssr`, `server-only`.

Type names beginning with `Preview` are left as they are to keep this change reviewable. Renaming them is follow-up work.

## Testing

**Unit tests**, run with `node --test` in the same style as the existing `preview-data.test.mjs`:

- Row and screen-shape conversion for bills, appliances, household and advisories, including centavo rounding, the month boundary, a missing due date and a missing advisory end.
- Advisory tab derivation with a fixed clock: future, in progress, ended, no end time, `restored`.
- Identifier parsing: email versus username, surrounding spaces, mixed case.
- Username rules and the three password rules.
- `next` validation: accepts `/bills`, rejects `//evil.example`, `https://evil.example`, and an empty value.

**Database isolation test**, `supabase/tests/rls_isolation.sql`. Inside one transaction that is rolled back at the end, it creates two accounts, acts as each in turn, and asserts that account A cannot read, insert into, update or delete account B's `profiles`, `households`, `bills`, `appliances` or `advisories` rows, that the anonymous role can read nothing, that `auth_login_attempts` is unreachable for both, and that a second household for the same owner is rejected.

**Static checks:** `npm run build`, `npm run lint`, and TypeScript with no errors.

**Manual verification on the hosted project**, on the Vercel preview URL for the branch:

- [ ] Sign up with email, receive the code, verify, complete profile, reach the dashboard with sample data.
- [ ] Wrong code is rejected. Resend works after 60 seconds.
- [ ] Log in by email. Log in by username. A wrong password shows the generic message on both paths.
- [ ] A sixth wrong attempt on one username shows the "Too many attempts" message, and email login still works.
- [ ] Sign in with Google as a new account (profile step appears) and as a returning account (dashboard appears).
- [ ] Forgot password: code, new password, old password no longer works.
- [ ] Opening `/dashboard` while logged out redirects to `/login`. Opening `/login` while logged in redirects to `/dashboard`.
- [ ] Add, edit and delete a bill and an appliance; change the budget, profile, photo, notifications and location; tick the checklist. Reload and confirm each persisted.
- [ ] Log in on a second device and see the same data.
- [ ] A second account sees none of the first account's data.
- [ ] Log out returns to `/login`, and the browser Back button does not reveal household pages.

## Acceptance criteria

From [docs/features/00-authentication-foundation.md](../../features/00-authentication-foundation.md):

- [ ] Sign-up, login, recovery, invalid credentials and expired-session paths work.
- [ ] Repeated onboarding produces one household.
- [ ] Account A cannot read or write account B's records or files by changing ids.
- [ ] Sign-out leaves no private records in the browser. With no local cache in this release, that means the session is cleared and the old preview key is removed.

The fifth criterion in that document, about offline views, belongs to feature F09 and is not addressed here.

Added by this specification:

- [ ] No household page or AI API route responds to a request without a valid session.
- [ ] The secret key appears in no browser bundle. Verified by searching the build output for its value.
- [ ] Every flow above works on the deployed preview, not only on a developer machine.

## Rollout

1. Work happens on `feat/supabase-auth`. Vercel builds a preview URL for the branch.
2. The migration is applied to the Supabase project before the code that depends on it is deployed.
3. The dashboard settings in Appendix A are completed.
4. The three environment variables are set in Vercel for Production, Preview and Development.
5. Manual verification is run against the preview URL.
6. The branch is merged to `main`, which deploys production.

The migration is additive: it only creates objects. The current production site does not use the database, so applying the migration first cannot break it.

## Known limitations

- **Preview and production share one database.** [docs/07-ci-cd-pipeline.md](../../07-ci-cd-pipeline.md) says a preview must never connect to production data. This is accepted until launch because there are no real users yet. A second Supabase project for production must exist before real users sign up.
- **Gmail SMTP is a demo-grade mailer.** It is capped near 500 emails per day and relies on an app password that grants sending rights for that Gmail account. A dedicated Gmail account should be used, not a personal one. Before launch this moves to a transactional email provider with a verified domain.
- **The secret key is in the application.** It is confined to `src/lib/supabase/admin.ts` and used by one server action. [docs/09-quality-security.md](../../09-quality-security.md) asks that such use be explicitly reviewed; this specification is that review, and any further use requires a new one.
- **Google sign-in starts in testing mode.** Only test users listed in Google Cloud Console can sign in until the consent screen is published.
- **No automated pipeline.** Checks are run by hand until the workflows are written.
- **No account deletion.** A deletion request has to be carried out in the Supabase dashboard.
- **Sample advisories are static.** They are dated relative to the moment of sign-up and move into History on their own as time passes.

## Appendix A: Supabase and Google setup

These steps are done by a person in a browser. None of the values below belong in Git or in a chat message.

### A1. Apply the migration

Either run the Supabase CLI from the project folder:

```
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

or open the Supabase dashboard, go to SQL Editor, paste the contents of the migration file, and run it.

### A2. Auth settings

In the Supabase dashboard under Authentication:

- **URL Configuration.** Site URL: the production address. Redirect URLs: `http://localhost:3000/**`, the production address followed by `/**`, and `https://*-<vercel-team-slug>.vercel.app/**` so that branch previews are accepted.
- **Sign In / Providers, Email.** Confirm email: on. Email OTP length: 6. Minimum password length: 8.
- **Email Templates, "Confirm signup" and "Reset password".** Replace the link in each body with the code, for example: `<p>Your WattSnap code is <strong>{{ .Token }}</strong>. It expires in one hour.</p>`

### A3. Gmail SMTP

1. Create or choose a Gmail account used only for WattSnap.
2. In that Google Account, open Security, turn on 2-Step Verification, then create an App password named "WattSnap". Google shows a 16-character password once.
3. In Supabase, open Authentication, Emails, SMTP Settings and enable custom SMTP: sender email is the Gmail address, sender name "WattSnap", host `smtp.gmail.com`, port `465`, username is the Gmail address, password is the app password.
4. Under Authentication, Rate Limits, confirm the emails-per-hour limit suits a demo.

If the app password is ever exposed, revoke it in the Google Account and create a new one.

### A4. Google sign-in

1. In Google Cloud Console create a project, then configure the OAuth consent screen: user type External, app name "WattSnap", a support email, and add the test users who need access.
2. Under Credentials create an OAuth client ID of type Web application. Authorized JavaScript origins: `http://localhost:3000` and the production address. Authorized redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`.
3. In Supabase, open Authentication, Sign In / Providers, Google. Enable it and paste the Client ID and Client secret.

### A5. Environment variables

Add the three variables from "Environment variables" to `.env.local` on each developer machine and to Vercel under Settings, Environment Variables, for Production, Preview and Development. Mark `SUPABASE_SECRET_KEY` as Sensitive. Redeploy afterwards, because new values apply only to new deployments.
