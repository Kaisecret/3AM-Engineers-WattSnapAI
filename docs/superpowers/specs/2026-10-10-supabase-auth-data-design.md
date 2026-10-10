# Supabase Backend Foundation Design Specification

Date: 2026-10-10. Branch: `feat/supabase-auth`. Status: revised design, awaiting review. Not yet implemented.

This revision replaces the first version of this document, which was written against commit `ed2b287`. It was rewritten after `main` advanced to `9c34526` and after the unmerged branch `frontend/final-enhancements-2026-10-10` was reviewed.

## Overview

WattSnap has a complete interface and no backend. Sign-in is a local demonstration, every household page is reachable without an account, and all household data lives in the browser's `localStorage`, scoped to a locally chosen identity.

This work adds the backend: a hosted Supabase project with a Postgres schema derived from the data the screens already save, row-level security that isolates each household, real authentication services, and data-access code for every feature.

It follows [docs/features/00-authentication-foundation.md](../../features/00-authentication-foundation.md), [docs/03-architecture.md](../../03-architecture.md), [docs/05-shared-contracts.md](../../05-shared-contracts.md) and [docs/09-quality-security.md](../../09-quality-security.md).

## Why the work is split into two phases

The frontend is changing quickly. Another developer has fifteen unmerged commits on `frontend/final-enhancements-2026-10-10` that replace the login and sign-up pages, change the household data hooks and the service worker, and remove sample data. Editing those same screens now would collide with that work.

That branch also carries a guard, `scripts/check-frontend-boundaries.cjs`, which names the files the frontend must not touch. Those files are the backend's:

- `src/lib/supabase/`, `src/lib/gemini/`, `src/lib/offline/`
- every `src/features/<feature>/service.ts` and `repository.ts`
- `src/features/auth/schemas.ts`, `types.ts`, `index.ts`
- `src/app/api/`
- `.env*`, `.github/`, `next.config.*`, `vercel.json`

**Phase A (this specification)** stays inside those files, plus new files that nobody else has. It delivers the deployed database, the security rules, the authentication services and the data repositories, all tested against the hosted project. It changes no screen, hook, stylesheet or page. The running application behaves exactly as before.

**Phase B (a later specification)** connects the screens to Phase A once the frontend branch has merged. It is outlined at the end of this document so that Phase A is built to fit it.

## Decisions

| Decision | Choice | Consequence |
| --- | --- | --- |
| Database host | One hosted Supabase project, free tier, Singapore region | No local database. See "Known limitations". |
| Build base | `main`, backend-reserved files only | No conflict with the frontend branch. Login screens are not connected in Phase A. |
| Schema source | Data shapes on the frontend branch, which are a superset of `main` | The schema will not need an immediate follow-up migration when that branch merges. |
| Sign-in methods | Email + password, and Google | Google needs an OAuth client created in Google Cloud Console. |
| Login identifier | Email or username | Username lookup needs the Supabase secret key on the server, plus an attempt limiter. |
| Email delivery | Gmail SMTP with an app password | About 500 emails per day. Suitable for demo and class use, not for launch. |
| Sample data | None stored | The frontend branch removes sample data. Records marked as samples are never uploaded. |
| Delivery branch | `feat/supabase-auth` | `main` deploys to production automatically. |

## Phase A scope

In scope:

- One migration: twelve tables, constraints, triggers, functions, row-level security policies, grants and two private Storage buckets.
- Supabase clients for the browser, the server and the secret-key administrative path, with environment validation.
- Authentication services: sign-up, email code verification, Google, login by email or username, password recovery, profile completion, logout.
- A data repository for each feature, converting between database rows and the shapes the screens already use.
- Unit tests, and an isolation test that runs against the hosted project.

Out of scope for Phase A:

- Any change to a screen, hook, page, stylesheet, the service worker, or interface text.
- The route guard. A guard that redirects visitors to `/login` would break the current local-access pages, so it arrives with the screens in Phase B.
- Gemini integration, offline synchronisation, push notifications, GitHub Actions workflows, account deletion.

## Environment variables

| Name | Where it is read | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser and server | Project URL. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser and server | Publishable key (older dashboards call it `anon`). Safe to expose; row-level security protects the data. |
| `SUPABASE_SECRET_KEY` | Server only | Secret key (older name `service_role`). Bypasses row-level security. Used for username login and by the isolation test. Never prefixed with `NEXT_PUBLIC_`, never committed, marked Sensitive in Vercel. |

`.env.example` lists the three names with empty values. `src/lib/config/env.ts` validates them when a Supabase client is first created and throws an error naming any that are missing. It does not run at import time, so the application still builds and runs in local mode before the variables are set.

## Database schema

All tables live in the `public` schema. Every table has `created_at` and `updated_at` (`timestamptz`, default `now()`); a trigger keeps `updated_at` current. Money is stored as integer centavos and energy as kWh, as the shared contracts require.

Records the browser creates already carry a UUID from `crypto.randomUUID()`. The database keeps that id, so a record has the same identity on the device and in the cloud. Household-owned collections use a composite primary key of (`household_id`, `id`), which means one household can never collide with or probe another household's ids.

### `providers`

Reference data, read-only to signed-in users. Seeded with the seven providers the interface offers.

| Column | Type | Rules |
| --- | --- | --- |
| `id` | `text` | Primary key: `anteco`, `akelco`, `capelco`, `ileco-1`, `ileco-2`, `ileco-3`, `more-power`. |
| `name` | `text` | Required. |
| `area` | `text` | Province label shown in the interface. |
| `detail` | `text` | Full organisation name. |
| `is_coverage_verified` | `boolean` | Default `false`. No provider's service area has been verified yet. |

A provider the user typed in ("Other") is not a row here. Wherever a provider is recorded there are two columns, `provider_id` and `provider_custom_name` (at most 80 characters), and at most one of them is set. The interface value `custom:<name>` maps to the second column.

### `profiles`

One row per account.

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

The account email is read from the Supabase session and is not copied here. The three notification columns hold the preference only; nothing sends notifications yet.

### `households`

One row per account.

| Column | Type | Rules |
| --- | --- | --- |
| `id` | `uuid` | Primary key, generated. |
| `owner_id` | `uuid` | Required, **unique**, references `auth.users(id)`, deleted with the account. |
| `name` | `text` | Optional, at most 50 characters. |
| `location` | `text` | Optional, at most 120 characters. The single-line label the screens display. |
| `province`, `municipality`, `barangay` | `text` | Optional, at most 100 characters each. |
| `provider_id`, `provider_custom_name` | `text` | As described under `providers`. |
| `monthly_budget_centavos` | `integer` | Optional; 1 to 10,000,000 (₱100,000) when set. No value means no budget has been chosen. |

The unique `owner_id` guarantees one household per account, including when onboarding is retried.

### `bills`

Primary key (`household_id`, `id`).

| Column | Type | Rules |
| --- | --- | --- |
| `id` | `uuid` | Supplied by the client. |
| `household_id` | `uuid` | References `households(id)`, deleted with the household. |
| `billing_month` | `date` | Required, always the first day of the month. |
| `kwh` | `numeric(10,2)` | Required, greater than zero. |
| `amount_centavos` | `integer` | Required, greater than zero. |
| `due_date`, `billing_date` | `date` | Optional. The due date cannot precede the billing date. |
| `period_start`, `period_end` | `date` | Both set or both empty. The end cannot precede the start. |
| `provider_id`, `provider_custom_name` | `text` | The provider printed on this bill, which may differ from the household's. |
| `source` | `text` | `scan` or `manual`. |
| `source_name` | `text` | Optional file name of the reference photo, at most 200 characters. The photo itself is not stored. |
| `notes` | `text` | Optional, at most 500 characters, the limit the bill review form already applies. |

Unique on (`household_id`, `billing_month`): saving a bill for a month that already has one replaces it.

### `appliances`

Primary key (`household_id`, `id`).

| Column | Type | Rules |
| --- | --- | --- |
| `id` | `uuid` | Supplied by the client. |
| `household_id` | `uuid` | References `households(id)`, deleted with the household. |
| `name` | `text` | Required, 1 to 80 characters after trimming. |
| `model` | `text` | Optional, at most 80 characters. |
| `kind` | `text` | One of `fan`, `aircon`, `fridge`, `tv`, `rice-cooker`, `washer`, `lights`, `laptop`, `phone`, `microwave`, `iron`, `other`. |
| `watts` | `numeric(9,2)` | Required, greater than zero. |
| `hours_per_day` | `numeric(4,2)` | Required, 0 to 24. Zero means the appliance is not in use this period. |
| `quantity` | `integer` | Required, 1 to 50. |
| `days_in_period` | `integer` | Required, 1 to 366. Default 30. |
| `wattage_basis` | `text` | `nameplate` or `approximate`. Default `approximate`. |

### `advisories`

A reviewed provider advisory. Primary key (`household_id`, `id`).

| Column | Type | Rules |
| --- | --- | --- |
| `id` | `uuid` | Supplied by the client. |
| `household_id` | `uuid` | References `households(id)`, deleted with the household. |
| `revision` | `integer` | Required, at least 1. Rises each time the review is corrected. |
| `details` | `jsonb` | Required object, at most 32 KB. The reviewed fields: type, title, provider, publisher, source link, dates and times, restoration wording, area wording, structured areas, reason, related advisory. |
| `match` | `jsonb` | Required object, at most 16 KB. The household match: status, rationale, and the household details it was matched against. |
| `type` | `text` | Generated from `details`. One of `scheduled`, `unscheduled`, `notice`, `restored`. |
| `match_status` | `text` | Generated from `match`. One of `affected`, `possibly-affected`, `not-listed`. |
| `original_kind` | `text` | `text` or `image`. |
| `original_name` | `text` | Required, at most 200 characters. |
| `original_text` | `text` | At most 12,000 characters. Required when the original is text. |
| `original_image_path` | `text` | Path in the `advisory-originals` bucket. Required when the original is an image. |
| `original_captured_at` | `timestamptz` | Required. |
| `reviewed_at` | `timestamptz` | Required. |

`details` and `match` are stored as documents because the interface already defines them as versioned, nested structures with its own validators (`normalizeReviewedAdvisory`). Splitting them into a dozen more tables would duplicate rules that are still changing. The database checks their type and size and derives the two columns worth filtering on; the existing validators check the contents whenever a record is read.

### `advisory_preparation`

Checklist progress for one advisory, at one revision, for one set of household details.

| Column | Type | Rules |
| --- | --- | --- |
| `id` | `bigint` | Primary key, generated. |
| `household_id` | `uuid` | References `households(id)`, deleted with the household. |
| `advisory_id` | `uuid` | Required. |
| `revision` | `integer` | Required, at least 1. |
| `household_signature` | `text` | Required, at most 2,000 characters. |
| `checked` | `text[]` | Subset of `charge`, `lights`, `unplug`, `fridge`, `water`, with no repeats. |

Unique on (`household_id`, `advisory_id`, `revision`, `household_signature`), which is exactly how the interface keys this progress today.

### `brownout_plans`

A saved Brownout Ready plan. Primary key (`household_id`, `advisory_id`).

| Column | Type | Rules |
| --- | --- | --- |
| `advisory_id` | `uuid` | The advisory the plan was made from. Not a foreign key: a plan deliberately outlives a deleted advisory. |
| `household_id` | `uuid` | References `households(id)`, deleted with the household. |
| `advisory_snapshot` | `jsonb` | Required object, at most 64 KB. The advisory as it was when the plan was saved, without image data. |
| `snapshot_image_path` | `text` | Optional path of the snapshot's original image in `advisory-originals`. |
| `relevance_confirmed` | `boolean` | Required. |
| `source_confirmed` | `boolean` | Required, must be `true`. |
| `checked` | `text[]` | Subset of `charge`, `work`, `lights`, `unplug`, `fridge`, with no repeats. |
| `acknowledged_updates` | `jsonb` | Array, at most 100 entries. Default empty. |

### `tips_snapshots`

The household's saved Tipid Tips. Primary key `household_id`, so one row per household.

| Column | Type | Rules |
| --- | --- | --- |
| `household_id` | `uuid` | References `households(id)`, deleted with the household. |
| `snapshot` | `jsonb` | Required object, at most 128 KB. |
| `generated_at` | `timestamptz` | Required. |
| `input_signature` | `text` | Required, at most 256 KB. Identifies the bills and appliances the tips were made from. |

### `scenarios`

Saved Watt-If scenarios. Primary key (`household_id`, `id`).

| Column | Type | Rules |
| --- | --- | --- |
| `id` | `uuid` | Supplied by the client. |
| `household_id` | `uuid` | References `households(id)`, deleted with the household. |
| `title` | `text` | Required, 1 to 60 characters. |
| `payload` | `jsonb` | Required object, at most 128 KB: baseline appliances, scenario entries, days, rate, rate basis, baseline signature. |

### `setup_progress`

Home setup checklist state. Primary key `household_id`.

| Column | Type | Rules |
| --- | --- | --- |
| `household_id` | `uuid` | References `households(id)`, deleted with the household. |
| `reviewed_tips` | `text` | Optional, at most 256 KB. |
| `acknowledged` | `text` | Optional, at most 256 KB. |

The five checklist steps themselves are not stored. The interface derives them from the household's real records.

### `auth_login_attempts`

Supports the username login limiter. No client can read or write it.

| Column | Type | Rules |
| --- | --- | --- |
| `id` | `bigint` | Primary key, generated. |
| `username` | `text` | The username that was submitted, lower-cased, whether or not it exists. |
| `ip_hash` | `text` | HMAC-SHA256 of the caller's IP address, keyed with the secret key. The raw address is not stored. |
| `attempted_at` | `timestamptz` | Default `now()`. |

Only failed attempts are recorded. Rows older than 24 hours are deleted whenever the login path runs.

### What is deliberately not stored

| Data | Reason |
| --- | --- |
| Sample bills, appliances, tips, scenarios and gallery advisories | Demonstration data. The frontend branch removes it. Repositories refuse to upload a record marked as a sample. |
| Bill photos and appliance nameplate photos | The interface treats them as temporary references and saves only the reviewed values. |
| Unfinished bill drafts | Kept in the browser tab's session storage by design. |
| Introduction progress and light or dark theme | Device preferences that exist before an account does. |
| Assistant chat messages | The interface does not keep them. |

### Functions and triggers

- `handle_new_user()` runs after a row is inserted into `auth.users`. It inserts the matching `profiles` row (taking `full_name` from the sign-up form or the Google profile, truncated to 50 characters) and the `households` row. Both inserts ignore conflicts, so a retry cannot create duplicates. It runs with definer rights and an empty `search_path`.
- `set_updated_at()` maintains `updated_at` on every table.
- `enforce_household_row_limit()` rejects an insert once a household already holds the maximum for that table: 600 bills, 300 appliances, 500 advisories, 2,000 preparation rows, 300 plans, 200 scenarios. Because the browser talks to the database directly, these limits stop one account from filling the shared database.

### Storage

| Bucket | Visibility | Limits | Object path |
| --- | --- | --- | --- |
| `avatars` | Private | 1 MB; JPEG, PNG, WebP | `<user id>/avatar.jpg` |
| `advisory-originals` | Private | 3 MB; JPEG, PNG, WebP | `<user id>/<advisory id>/r<revision>.<ext>` |

Files are shown through signed URLs that expire after one hour. An advisory image is deleted once neither the advisory row nor a plan snapshot still refers to that revision.

## Row-level security

Row-level security is enabled on every table. Policies name the specific owner; being signed in is never enough on its own.

| Table | Signed-in user may | Rule |
| --- | --- | --- |
| `providers` | Read | All rows. |
| `profiles` | Read, update | Only the row whose `id` is their user id. |
| `households` | Read, update | Only the row whose `owner_id` is their user id. |
| `bills`, `appliances`, `advisories`, `advisory_preparation`, `brownout_plans`, `scenarios` | Read, insert, update, delete | Only rows whose `household_id` belongs to a household they own. |
| `tips_snapshots`, `setup_progress` | Read, insert, update, delete | Same rule. |
| `auth_login_attempts` | Nothing | No policies exist. |
| `storage.objects` in both buckets | Read, insert, update, delete | Only objects inside the folder named with their user id. |

Further restrictions:

- Clients cannot insert or delete `profiles` or `households` rows. The trigger creates them and account deletion removes them.
- Update permission on `profiles` and `households` is granted column by column and excludes `id` and `owner_id`.
- All privileges on these tables are revoked from the anonymous role.

## Authentication services

Phase A builds these as functions. No screen calls them yet.

### Service functions

`src/features/auth/service.ts` exposes one function per use case. Each takes a Supabase client and plain values, and resolves to either a success value or a failure with a category and a message that is safe to show.

| Function | Behaviour |
| --- | --- |
| `signUpWithEmail` | Checks name, email and the three password rules (8 characters, a letter and a number, not a common password), then creates the account. Supabase emails a 6-digit code. |
| `verifySignupCode` | Verifies the code, which starts the session. |
| `resendSignupCode` | Requests a new code. Supabase refuses a second email to the same address within 60 seconds; that refusal is reported as "Please wait a minute before requesting another code." |
| `signIn` | Takes the single "Email or Username" value. A value containing `@` is an email and goes to `signInWithEmail`; anything else goes to the username server action below. |
| `signInWithEmail` | Signs in with email and password, directly from the browser. |
| `signInWithGoogle` | Starts the Google redirect, returning to `/auth/callback`. |
| `requestPasswordReset` | Sends a 6-digit recovery code. Reports success whether or not the email is registered. |
| `verifyRecoveryCode` | Verifies the code, which starts a recovery session. |
| `updatePassword` | Applies the three rules, updates the password, then signs out every session for the account. |
| `completeProfile` | Saves full name, birth date and username and sets `onboarded_at`. A taken username is reported as "That username is taken." |
| `signOut` | Ends the session. |
| `getAccount` | Returns the user id, email and profile, or nothing when signed out. |

When someone signs up with an email that already has an account, Supabase sends nothing and reports no error, so that registered emails cannot be discovered. `signUpWithEmail` keeps that protection and returns the same success either way.

### Login by username

`src/features/auth/actions.ts` holds one server action, `signInWithUsername`. Email logins never pass through it; they go from the browser straight to Supabase, so Supabase's own per-visitor rate limiting applies to them. For a username the action does three things:

1. The limiter is checked: at most 5 failed attempts per username and 20 per IP address in any 15 minutes. Beyond that the answer is "Too many attempts. Try again in 15 minutes, or log in with your email."
2. The email is looked up with the secret-key client.
3. The sign-in runs on the server, so the session cookies are set there. The email is never returned to the browser.

Every failure gives the same message: "Incorrect email, username, or password." When a username does not exist the action still performs a sign-in attempt against a placeholder address, so that response time does not reveal whether the username is real. Attempts are counted for the submitted text whether or not it exists, and a locked username can still log in by email, so the limiter cannot be used to lock someone out.

The lookup and the limiter live in `src/features/auth/repository.ts` as functions that take the administrative client, so they can be tested without a running web server.

### Google return route

`src/app/auth/callback/route.ts` exchanges the code Google returns for a session, then redirects to the `next` path. `next` is accepted only when it starts with a single `/`; anything else becomes `/dashboard`. A failed exchange redirects to `/login`. Nothing links to this route until Phase B.

### Failure categories

Services report failures in the categories the shared contracts define: validation, authentication, authorization, network or offline, rate limit, and conflict. Raw provider and database error text is logged and never returned in the message.

## Data repositories

Each feature's `repository.ts` holds the functions that read and write that feature's rows. Every function takes a Supabase client and works in the shapes the screens already use, so Phase B can connect them without changing any calculation or validation code.

| File | Functions |
| --- | --- |
| `household-profile/repository.ts` | Load and save household details; load and save the profile; upload, remove and sign the profile photo. |
| `bill-scanner/repository.ts` | Save a confirmed bill, replacing any bill for the same month. |
| `bill-history/repository.ts` | List bills; remove a bill. |
| `appliance-registration/repository.ts` | List, save and remove appliances. |
| `smart-energy-budget/repository.ts` | Read and set the monthly budget. |
| `advisory-intelligence/repository.ts` | List, save and remove reviewed advisories, including their original images; read and set preparation progress. |
| `brownout-ready/repository.ts` | List, save and remove plans. |
| `tipid-tips/repository.ts` | Load and save the tips snapshot. |
| `watt-if-simulator/repository.ts` | List, save and remove scenarios. |
| `onboarding/repository.ts` | Load and save setup progress. New file. |

Conversion rules, applied in the repositories and nowhere else:

| Screen shape | Database |
| --- | --- |
| `amount` and `budget` in pesos | Integer centavos, rounded to the nearest centavo. A budget of `0` is stored as no value. |
| `month` as `YYYY-MM` | `billing_month`, first day of that month. |
| `hours`, `days` | `hours_per_day`, `days_in_period`. |
| `provider` as an id or `custom:<name>` | `provider_id` or `provider_custom_name`. |
| `locality` object | `province`, `municipality`, `barangay`. |
| Advisory `original.image` as a data URL | An object in `advisory-originals`, referenced by `original_image_path`. |
| A record whose `source` or `origin` is `sample`, or whose id starts with `sample-` | Not uploaded. The function reports it as skipped. |

Every record read from the database passes through the interface's existing validator for that type. A row that fails is left out of the result and logged, which is how the interface already treats unreadable local records.

## File map

New files:

| File | Purpose |
| --- | --- |
| `supabase/migrations/20261010000000_initial_schema.sql` | Everything under "Database schema" and "Row-level security". |
| `supabase/tests/isolation.test.mjs` | Isolation test against the hosted project. |
| `src/lib/supabase/admin.ts` | Secret-key client. Marked server-only so that importing it from browser code fails the build. |
| `src/app/auth/callback/route.ts` | Google return route. |
| `src/features/auth/actions.ts` | Server action for login by username. |
| `src/features/onboarding/repository.ts` | Setup progress access. |
| `src/generated/database.types.ts` | Types generated from the schema. Never edited by hand. |
| Unit test files beside their subjects | Named `*.test.mjs`, the convention the 76 existing tests use. |

Existing empty placeholders that receive their implementation:

`src/lib/config/env.ts`, `src/lib/supabase/browser.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/authorization.ts`, `src/features/auth/service.ts`, `repository.ts`, `schemas.ts`, `types.ts`, `index.ts`, and the `repository.ts` of `household-profile`, `bill-scanner`, `bill-history`, `appliance-registration`, `smart-energy-budget`, `advisory-intelligence`, `brownout-ready`, `tipid-tips` and `watt-if-simulator`.

Other files that change: `.env.example`, `package.json`, `package-lock.json`.

New dependencies: `@supabase/supabase-js`, `@supabase/ssr`, `server-only`.

No other file changes. In particular, nothing under `src/features/*/components/`, no hook, no page under `src/app/(auth)/` or `src/app/(household)/`, no stylesheet, and not `public/sw.js`.

## Testing

**Unit tests**, run with `node --test`:

- Each conversion rule above, in both directions: centavo rounding, month boundaries, an unset budget, both provider forms, missing optional dates, a locality with an empty barangay.
- Samples are skipped and never produce a write.
- Identifier parsing: email versus username, surrounding spaces, mixed case.
- Username rules, the three password rules, and birth-date limits.
- `next` validation: accepts `/bills`; rejects `//evil.example`, `https://evil.example`, and an empty value.
- Failure mapping: each Supabase error code maps to the intended category and message, and no raw error text reaches the message.
- Limiter arithmetic with a fixed clock: the fifth failure is allowed, the sixth is refused, and attempts older than 15 minutes do not count.

**Isolation test**, `supabase/tests/isolation.test.mjs`, run with `node --test` against the hosted project using the variables in `.env.local`. It creates two throwaway accounts through the administrative API, signs in as each with the publishable key, and asserts through the real API that:

- a new account has exactly one profile and one household, and a second household for the same owner is rejected;
- each account can write and read back its own rows in every table, through the repositories;
- account A cannot read, insert into, update or delete account B's rows in any table, including by supplying B's ids;
- account A cannot read, overwrite or delete account B's files in either bucket;
- a client with no session can read nothing;
- `auth_login_attempts` is unreachable from both accounts;
- an out-of-range value is rejected for each constrained column family: money, kWh, hours, quantity, budget, checklist items;
- the row limit rejects the insert after the last allowed row;
- the username lookup finds the right account, and the limiter refuses the sixth failed attempt.

It deletes both accounts at the end, including when an assertion fails, and removal of the accounts removes their rows. It skips with a clear message when the environment variables are absent.

**Static checks:** `npm run build`, TypeScript with no errors, and the 76 existing feature tests still passing.

**Not verifiable in Phase A:** the email code, Google and password-recovery flows from end to end. They need a person, an inbox and a screen. They are verified in Phase B. Phase A verifies their inputs, their error handling and the database they depend on.

## Acceptance criteria

- [ ] The migration applies cleanly to a new Supabase project.
- [ ] The isolation test passes against that project.
- [ ] All unit tests pass, and the 76 existing tests still pass.
- [ ] `npm run build` succeeds, both with the environment variables set and without them.
- [ ] The secret key appears in no browser bundle. Verified by searching the build output for its value.
- [ ] `git diff main --stat` shows changes only in the files listed under "File map".
- [ ] The deployed application behaves exactly as it does on `main`.

## Rollout

1. The migration is applied to the Supabase project. It only creates objects, and the running application does not use the database, so nothing can break.
2. The dashboard settings in Appendix A are completed.
3. The three environment variables are set locally and in Vercel.
4. The isolation test is run.
5. The branch is merged to `main`. Since no screen uses the new code, production behaves as before.

The frontend developer should be told that the backend-reserved files are changing on `feat/supabase-auth`, because their guard script compares those files against commit `9c34526`.

## Phase B outline

Phase B gets its own specification once the frontend branch has merged. Phase A is built to support the following, which are not yet decided:

- **Sign-in screens.** The frontend branch keeps `LoginForm`, `SignupFlow`, `ForgotPasswordFlow` and `ResetPasswordForm` in the repository, unused. Phase B would put them back on the account pages, connected to the services above, and remove the imitation Google account chooser.
- **Route guard.** A middleware that refreshes the session and redirects signed-out visitors away from household pages and the AI API routes.
- **Where data lives.** The recommendation is that Supabase becomes the source of truth and the existing account-scoped `localStorage` records become a read cache, with the account's user id as the scope. Saved information stays readable offline; saving requires a connection. Full offline editing with conflict handling is feature F09.
- **Service worker.** Its cached page shells contain no household data, so they can stay. Its install step must stop caching a redirect to `/login` under a protected page's address.
- **Logout.** [docs/features/00](../../features/00-authentication-foundation.md) requires that sign-out clears private local records. The current local-access design keeps them. Phase B has to reconcile the two.
- **Interface text** that describes data as stored only on the device.

## Known limitations

- **Nothing visible changes in Phase A.** The database, security rules and services exist and are tested, but people still use the local-access screens until Phase B.
- **Preview and production share one database.** [docs/07-ci-cd-pipeline.md](../../07-ci-cd-pipeline.md) says a preview must never connect to production data. This is accepted until launch because there are no real users yet. A second Supabase project for production must exist before real users sign up.
- **The isolation test writes to that shared database.** It creates and deletes two accounts with addresses in a reserved test domain. It must not be pointed at a project that holds real users without a review.
- **Gmail SMTP is a demo-grade mailer.** It is capped near 500 emails per day and relies on an app password that grants sending rights for that Gmail account. A dedicated Gmail account should be used. Before launch this moves to a transactional email provider with a verified domain.
- **The secret key is in the application.** It is confined to `src/lib/supabase/admin.ts` and used by one server action and the isolation test. [docs/09-quality-security.md](../../09-quality-security.md) asks that such use be explicitly reviewed; this specification is that review, and any further use requires a new one.
- **Advisory images are kept until the household deletes the advisory.** [docs/10-decisions.md](../../10-decisions.md) leaves the retention period open. This is the default adopted here, and the team may shorten it.
- **Google sign-in starts in testing mode.** Only test users listed in Google Cloud Console can sign in until the consent screen is published.
- **No automated pipeline.** Checks are run by hand until the workflows are written.
- **No account deletion.** A deletion request has to be carried out in the Supabase dashboard.

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
