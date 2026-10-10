# Supabase Backend Foundation Design Specification

Date: 2026-10-10. Branch: `feat/supabase-auth`. Status: approved and stress-tested. Not yet implemented.

This is the third revision. The first was written against commit `ed2b287`. The second followed `main` advancing to `9c34526` and a review of the unmerged branch `frontend/final-enhancements-2026-10-10`. This one applies the stress-test results recorded at the end.

## Overview

WattSnap has a complete interface and no backend. Sign-in is a local demonstration, every household page is reachable without an account, and all household data lives in the browser's `localStorage`, scoped to a locally chosen identity.

This work adds the backend: a hosted Supabase project with a real Postgres database, a schema derived from the data the screens already save, row-level security that isolates each household, and authentication services.

The database is a production database. It will hold real accounts and real household records, so its design, its limits and its operating procedures are chosen for real use.

It follows [docs/features/00-authentication-foundation.md](../../features/00-authentication-foundation.md), [docs/03-architecture.md](../../03-architecture.md), [docs/05-shared-contracts.md](../../05-shared-contracts.md) and [docs/09-quality-security.md](../../09-quality-security.md).

## Why the work is split into two phases

The frontend is changing quickly. Another developer has fifteen unmerged commits on `frontend/final-enhancements-2026-10-10` that replace the login and sign-up pages, change the household data hooks and the service worker, and remove sample data. Their remaining work includes a pass over the frontend's data contracts. Editing the same screens now, or writing code against shapes that are about to change, would be wasted.

That branch also carries a guard, `scripts/check-frontend-boundaries.cjs`, which names the files the frontend must not touch. Those files are the backend's:

- `src/lib/supabase/`, `src/lib/gemini/`, `src/lib/offline/`
- every `src/features/<feature>/service.ts` and `repository.ts`
- `src/features/auth/schemas.ts`, `types.ts`, `index.ts`
- `src/app/api/`
- `.env*`, `.github/`, `next.config.*`, `vercel.json`

**Phase A (this specification)** delivers everything that can be built and proven without a screen: the deployed database, the security rules, the authentication logic, and a test that exercises them against the hosted project. It stays inside the backend's files and adds new files nobody else has. The running application behaves exactly as before.

**Phase B (a later specification)** connects the screens once the frontend branch has merged. It is outlined near the end so that Phase A is built to fit it.

## Decisions

| Decision | Choice | Consequence |
| --- | --- | --- |
| Operating stance | Production database on the Supabase free plan | Row limits, file rules, bot protection and a backup procedure are part of the design. The free plan's limits are listed under "Known limitations". |
| Database host | One hosted Supabase project, Singapore region | No local database. |
| Build base | `main`, backend-reserved files only | No conflict with the frontend branch. |
| Schema source | Data shapes on the frontend branch, which are a superset of `main` | The schema will not need an immediate follow-up migration when that branch merges. |
| Sign-in methods | Email + password, and Google | Google needs an OAuth client created in Google Cloud Console. Connected in Phase B. |
| Login identifier | Email or username | Username lookup needs the Supabase secret key on the server, plus an attempt limiter. |
| Sample data | None stored | The frontend branch removes sample data. |
| Delivery | Push `feat/supabase-auth` as its own branch; hold the merge to `main` | Merge after the frontend branch lands, or when its author agrees. |
| Email delivery | Re-decided in Phase B | Gmail SMTP was chosen as a demonstration option. A production mailer needs a verified domain. |
| Preview and production data | Re-decided in Phase B | Until screens connect, nothing reads the database, so the question does not arise in Phase A. |

## Phase A scope

In scope:

- One migration: twelve tables, constraints, triggers, row limits, row-level security policies, grants and two private Storage buckets.
- Authentication logic in `src/features/auth/`: validation, the service functions, and the username lookup and attempt limiter.
- Environment validation in `src/lib/config/env.ts`.
- Generated database types.
- Unit tests, and an isolation test that runs against the hosted project.
- An operations document covering migrations, backup and restore.

Out of scope for Phase A:

- Any change to a screen, hook, page, stylesheet, the service worker, or interface text.
- The feature data repositories. They translate between database rows and screen shapes, and those shapes are still moving. They are built in Phase B against the final shapes. The translation rules they will follow are recorded below.
- Everything that only runs inside the Next.js server or a browser page: the cookie-based Supabase clients, the secret-key client wrapper, the authorization helper, the route guard, the Google return route and the username login server action. None of them can be exercised until a screen calls them, so they arrive in Phase B with the screens.
- Gemini integration, offline synchronisation, push notifications, GitHub Actions workflows, account deletion.

## Environment variables

| Name | Where it is read | Needed in Phase A |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser and server | In `.env.local` only, for the isolation test. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser and server | In `.env.local` only. Older dashboards call it `anon`. Safe to expose; row-level security protects the data. |
| `SUPABASE_SECRET_KEY` | Server only | In `.env.local` only. Older name `service_role`. Bypasses row-level security. Never prefixed with `NEXT_PUBLIC_`, never committed. |

Nothing is added to Vercel in Phase A. No deployed code reads these values yet, and the secret key should not sit in a hosting environment before something needs it.

`.env.example` lists the three names with empty values. `src/lib/config/env.ts` exposes functions that read and validate them and throw an error naming any that are missing. They run when called, not at import time, so the application builds and runs unchanged without the variables.

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
| `full_name` | `text` | At most 50 characters. May be empty until profile setup. |
| `username` | `text` | Unique, optional until profile setup. 3 to 30 characters from `a-z`, `0-9`, `_`, `.`. |
| `avatar_path` | `text` | Path of the profile photo in the `avatars` bucket. |
| `notify_brownouts` | `boolean` | Default `true`. |
| `notify_bill_reminders` | `boolean` | Default `true`. |
| `notify_tips` | `boolean` | Default `false`. |
| `onboarded_at` | `timestamptz` | Set when profile setup is completed. |

The account email is read from the Supabase session and is not copied here. The three notification columns hold the preference only; nothing sends notifications yet.

There is no birth date column. The earlier sign-up form asked for one, but no screen on the newest frontend collects it and nothing uses it, and a production database should not hold personal data without a purpose. If the sign-up form returns in Phase B and the team decides the field is needed, it is added then.

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

Unique on (`household_id`, `billing_month`). The interface replaces an existing bill when one is saved for the same month; Phase B adds a database function that performs that replacement as a single step.

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

`details` and `match` are stored as documents because the interface already defines them as versioned, nested structures with its own validators (`normalizeReviewedAdvisory`). Splitting them into a dozen more tables would duplicate rules that are still changing. The database checks their type and size and derives the two columns worth filtering on; the interface's validators check the contents whenever a record is read. A household can only ever write to its own rows, so a malformed document harms nobody else.

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

Only failed attempts are recorded. Rows older than 24 hours are deleted whenever the limiter runs.

### What is deliberately not stored

| Data | Reason |
| --- | --- |
| Sample bills, appliances, tips, scenarios and gallery advisories | Demonstration data. The frontend branch removes it. |
| Bill photos and appliance nameplate photos | The interface treats them as temporary references and saves only the reviewed values. |
| Unfinished bill drafts | Kept in the browser tab's session storage by design. |
| Introduction progress and light or dark theme | Device preferences that exist before an account does. |
| Assistant chat messages | The interface does not keep them. |
| Birth date | No current screen collects it and nothing uses it. |

### Functions and triggers

- `handle_new_user()` runs after a row is inserted into `auth.users`. It inserts the matching `profiles` row (taking `full_name` from the sign-up form or the Google profile, truncated to 50 characters, or leaving it empty) and the `households` row. Both inserts ignore conflicts, so a retry cannot create duplicates. It runs with definer rights and an empty `search_path`. Because a failure here would block every sign-up, it does nothing else, and the isolation test creates accounts through it.
- `set_updated_at()` maintains `updated_at` on every table.
- `enforce_household_row_limit()` rejects an insert once a household already holds the maximum for that table.

### Row limits

The browser talks to the database directly, so the database itself has to stop one account from filling it.

| Table | Maximum rows per household |
| --- | --- |
| `bills` | 240 |
| `appliances` | 150 |
| `advisories` | 200 |
| `advisory_preparation` | 500 |
| `brownout_plans` | 100 |
| `scenarios` | 50 |

`tips_snapshots` and `setup_progress` hold one row per household by their primary key.

### Storage

| Bucket | Visibility | Limits | Accepted object path |
| --- | --- | --- | --- |
| `avatars` | Private | 1 MB; JPEG, PNG, WebP | Exactly `<user id>/avatar.jpg`. One file per account. |
| `advisory-originals` | Private | 2 MB, the interface's own limit; JPEG, PNG, WebP | `<user id>/<advisory id>/r<revision>.<ext>`. At most 60 files per account. |

The policies check the full path, not just the folder, so an account cannot store arbitrary files. Files are shown through signed URLs that expire after one hour.

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
| `storage.objects` in both buckets | Read, insert, update, delete | Only objects at the accepted paths inside the folder named with their user id. |

Further restrictions:

- Clients cannot insert or delete `profiles` or `households` rows. The trigger creates them and account deletion removes them.
- Update permission on `profiles` and `households` is granted column by column and excludes `id` and `owner_id`.
- All privileges on these tables are revoked from the anonymous role.

## Authentication logic

Phase A builds this as functions. No screen calls them yet.

### Validation, `src/features/auth/schemas.ts`

Pure functions with no dependencies: email format; the three password rules (at least 8 characters, a letter and a number, not a common password); username rules; identifier parsing, where a value containing `@` is an email and anything else is a username; and `next` path validation, which accepts only a path that starts with a single `/`.

### Service functions, `src/features/auth/service.ts`

One function per use case. Each takes a Supabase client and plain values, and resolves to either a success value or a failure with a category and a message that is safe to show. Functions that Supabase protects with a bot check accept an optional verification token, so that Phase B can switch the protection on without changing them.

| Function | Behaviour |
| --- | --- |
| `signUpWithEmail` | Checks name, email and password, then creates the account. Supabase emails a 6-digit code. |
| `verifySignupCode` | Verifies the code, which starts the session. |
| `resendSignupCode` | Requests a new code. Supabase refuses a second email to the same address within 60 seconds; that refusal is reported as "Please wait a minute before requesting another code." |
| `signInWithEmail` | Signs in with email and password. |
| `signInWithGoogle` | Starts the Google redirect. |
| `requestPasswordReset` | Sends a 6-digit recovery code. Reports success whether or not the email is registered. |
| `verifyRecoveryCode` | Verifies the code, which starts a recovery session. |
| `updatePassword` | Applies the three rules, updates the password, then signs out every session for the account. |
| `completeProfile` | Saves full name and username and sets `onboarded_at`. A taken username is reported as "That username is taken." |
| `signOut` | Ends the session. |
| `getAccount` | Returns the user id, email and profile, or nothing when signed out. |

When someone signs up with an email that already has an account, Supabase sends nothing and reports no error, so that registered emails cannot be discovered. `signUpWithEmail` keeps that protection and returns the same success either way.

Failures are reported in the categories the shared contracts define: validation, authentication, authorization, network or offline, rate limit, and conflict. Raw provider and database error text is logged and never returned in the message.

### Username lookup and limiter, `src/features/auth/repository.ts`

Functions that take a secret-key client:

- Find the email for a username.
- Count recent failed attempts, and decide whether another is allowed: at most 5 per username and 20 per IP address in any 15 minutes.
- Record a failed attempt, and delete records older than 24 hours.

Attempts are counted for the submitted text whether or not that username exists. A locked username can still log in by email, so the limiter cannot be used to lock someone out of their account.

Phase B wraps these in a server action that performs the sign-in on the server and never returns the email to the browser. Every failure there gives the same message, "Incorrect email, username, or password", and an unknown username still triggers a sign-in attempt against a placeholder address so that response time reveals nothing.

## Translation rules for Phase B

The repositories built in Phase B convert between the shapes the screens use and the database. The schema above was designed around these rules:

| Screen shape | Database |
| --- | --- |
| `amount` and `budget` in pesos | Integer centavos, rounded to the nearest centavo. A budget of `0` is stored as no value. |
| `month` as `YYYY-MM` | `billing_month`, first day of that month. |
| `hours`, `days` | `hours_per_day`, `days_in_period`. |
| `provider` as an id or `custom:<name>` | `provider_id` or `provider_custom_name`. |
| `locality` object | `province`, `municipality`, `barangay`. |
| Advisory `original.image` as a data URL | An object in `advisory-originals`, referenced by `original_image_path`. |
| A record whose `source` or `origin` is `sample`, or whose id starts with `sample-` | Not uploaded. |

Every record read from the database passes through the interface's existing validator for that type.

## File map

New files:

| File | Purpose |
| --- | --- |
| `supabase/migrations/20261010000000_initial_schema.sql` | Everything under "Database schema" and "Row-level security". |
| `supabase/tests/isolation.test.mjs` | Isolation test against the hosted project. |
| `src/generated/database.types.ts` | Types generated from the schema. Never edited by hand. |
| `docs/11-database-operations.md` | How to apply a migration, back up and restore the database, keep a free-plan project active, and run the isolation test. |
| Unit test files beside their subjects | Named `*.test.mjs`, the convention the 76 existing tests use. |

Existing empty placeholders that receive their implementation:

`src/lib/config/env.ts`, and in `src/features/auth/`: `schemas.ts`, `types.ts`, `service.ts`, `repository.ts`, `index.ts`.

Other files that change: `.env.example`, `package.json`, `package-lock.json`.

New dependency: `@supabase/supabase-js`.

No other file changes.

## Testing

**Unit tests**, run with `node --test`:

- Email, password, username and identifier rules, including surrounding spaces and mixed case.
- `next` validation: accepts `/bills`; rejects `//evil.example`, `https://evil.example`, and an empty value.
- Environment validation: each missing variable is named in the error; a secret key is never accepted under a public name.
- Failure mapping, using a stand-in client: each Supabase error code maps to the intended category and message, and no raw error text reaches the message.
- `signUpWithEmail` returns the same result for a new and an already registered email.
- Limiter arithmetic with a fixed clock: the fifth failure is allowed, the sixth is refused, and attempts older than 15 minutes do not count.

**Isolation test**, `supabase/tests/isolation.test.mjs`, run with `node --test` against the hosted project using the variables in `.env.local`. It first deletes any test accounts left by an earlier interrupted run, creates two new ones through the administrative API, signs in as each with the publishable key, and asserts through the real API that:

- a new account has exactly one profile and one household, and a second household for the same owner is rejected;
- each account can write and read back a valid row in every table;
- account A cannot read, insert into, update or delete account B's rows in any table, including by supplying B's ids;
- account A cannot read, overwrite or delete account B's files in either bucket, and cannot store a file at a path outside the accepted pattern;
- a client with no session can read nothing;
- `auth_login_attempts` is unreachable from both accounts;
- an out-of-range value is rejected for each constrained column family: money, kWh, hours, quantity, budget, dates, checklist items, document size;
- the row limit rejects the insert after the last allowed row, and the file limit rejects the file after the last allowed file;
- the service functions `signInWithEmail`, `getAccount`, `completeProfile` and `signOut` work against the real project, and a taken username is reported as taken;
- the username lookup finds the right account, and the limiter refuses the sixth failed attempt.

It deletes both accounts at the end, including when an assertion fails, and removal of the accounts removes their rows. Test accounts use addresses in a reserved test domain. It skips with a clear message when the environment variables are absent.

**Static checks:** `npm run build`, TypeScript with no errors, and the 76 existing feature tests still passing.

**Not verifiable in Phase A:** the email code, Google and password-recovery flows from end to end. They need a person, an inbox and a screen. Phase A verifies their inputs, their error handling and the database they depend on.

## Acceptance criteria

- [ ] The migration applies cleanly to a new Supabase project.
- [ ] The isolation test passes against that project.
- [ ] All unit tests pass, and the 76 existing tests still pass.
- [ ] `npm run build` succeeds without the environment variables set.
- [ ] `git diff main --stat` shows changes only in the files listed under "File map".
- [ ] The backup command in the operations document has been run once and its output restored into a scratch schema or inspected.
- [ ] The deployed application behaves exactly as it does on `main`.

## Rollout

1. The Supabase project is created, and the minimum auth settings in Appendix A are applied.
2. The migration is applied. It only creates objects, and the running application does not use the database, so nothing can break.
3. The three environment variables are set in `.env.local`.
4. The isolation test is run.
5. `feat/supabase-auth` is pushed to GitHub as its own branch. Vercel builds a preview for it; production is untouched.
6. The branch is merged to `main` only after the frontend branch has merged, or when its author agrees. Their guard script compares the backend-reserved files against commit `9c34526`, and merging first would make it fail.

Once the migration has been applied to the real project it is never edited. Every later schema change is a new migration file.

## Phase B outline

Phase B gets its own specification once the frontend branch has merged. The following are not yet decided:

- **Sign-in screens.** The frontend branch keeps `LoginForm`, `SignupFlow`, `ForgotPasswordFlow` and `ResetPasswordForm` in the repository, unused. Phase B would put them back on the account pages, connected to the services above, and remove the imitation Google account chooser.
- **Server pieces.** The cookie-based Supabase clients, the secret-key client wrapper, the authorization helper, the Google return route, the username login server action, and a middleware that refreshes the session and redirects signed-out visitors away from household pages and the AI API routes.
- **Feature repositories**, following the translation rules above, and the database function that replaces a bill for the same month.
- **Where data lives.** The recommendation is that Supabase becomes the source of truth and the existing account-scoped `localStorage` records become a read cache, with the account's user id as the scope. Saved information stays readable offline; saving requires a connection. Full offline editing with conflict handling is feature F09.
- **Service worker.** Its cached page shells contain no household data, so they can stay. Its install step must stop caching a redirect to `/login` under a protected page's address.
- **Logout.** [docs/features/00](../../features/00-authentication-foundation.md) requires that sign-out clears private local records. The current local-access design keeps them. Phase B has to reconcile the two.
- **Bot protection.** Cloudflare Turnstile on sign-up, login and password reset: the widget on the forms, and the setting switched on in Supabase.
- **Production email.** A transactional email provider with a verified domain, in place of Gmail SMTP.
- **Separate databases.** A second Supabase project so that preview deployments never read or write production data, as [docs/07-ci-cd-pipeline.md](../../07-ci-cd-pipeline.md) requires.
- **Account deletion.** People must be able to delete their account and data before the application is opened to the public.
- **Interface text** that describes data as stored only on the device.

## Known limitations

- **Nothing visible changes in Phase A.** The database, security rules and authentication logic exist and are tested, but people still use the local-access screens until Phase B.
- **Free plan limits.** 500 MB of database, 1 GB of files, no automatic backups, and the project is paused after seven days without activity. During Phase A no application traffic reaches the project, so it must be kept active by running the isolation test weekly, or restored from the dashboard after a pause. Supabase Pro removes these limits and is a cost decision for the team.
- **Backups are manual.** The operations document gives the command and the restore steps. Someone has to run it on a schedule once real data exists.
- **Residual abuse risk.** Row and file limits bound what one account can store, and email verification and bot protection slow the creation of accounts. A determined attacker with many verified accounts could still fill a free-plan project. Usage should be watched once the application is public.
- **The isolation test writes to the production project.** It creates and deletes two accounts in a reserved test domain and nothing else. This is acceptable while the project holds no real users. Once it does, the test should move to a separate project.
- **Username login throttling.** In Phase B, username sign-ins run on the server and therefore reach Supabase from the hosting provider's address. Heavy abuse could cause Supabase to throttle username login for everyone for a short time. Login by email is unaffected.
- **The secret key.** In Phase A it exists only in `.env.local` on a developer machine. [docs/09-quality-security.md](../../09-quality-security.md) asks that privileged use be explicitly reviewed; its two uses, the username lookup and the isolation test, are reviewed here, and any further use requires a new review.
- **Advisory images are kept until the household deletes the advisory.** [docs/10-decisions.md](../../10-decisions.md) leaves the retention period open. This is the default adopted here, and the team may shorten it.
- **No automated pipeline.** Checks are run by hand until the workflows are written.
- **No account deletion yet.** Until Phase B, a deletion request has to be carried out in the Supabase dashboard.

## Appendix A: Setup

These steps are done by a person in a browser. None of the values below belong in Git or in a chat message.

### Needed for Phase A

**A1. Create the project.** At supabase.com create a project named `wattsnap` in the Southeast Asia (Singapore) region. Store the database password somewhere safe.

**A2. Minimum auth settings.** In the dashboard under Authentication, Sign In / Providers, Email: Confirm email on, minimum password length 8.

**A3. Local environment.** Copy the Project URL, the publishable key and the secret key from the dashboard's API Keys page into `.env.local` in the project folder, using the three names under "Environment variables".

**A4. Apply the migration.** Either run the Supabase CLI from the project folder:

```
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

or open the dashboard's SQL Editor, paste the contents of the migration file, and run it.

### Needed for Phase B

**B1. URL configuration.** Site URL: the production address. Redirect URLs: `http://localhost:3000/**`, the production address followed by `/**`, and the preview pattern for the Vercel project.

**B2. Code emails.** Email OTP length 6. In the "Confirm signup" and "Reset password" templates, replace the link with the code: `<p>Your WattSnap code is <strong>{{ .Token }}</strong>. It expires in one hour.</p>`

**B3. Outgoing email.** Custom SMTP with the provider chosen in Phase B.

**B4. Google sign-in.** In Google Cloud Console create an OAuth client of type Web application with the redirect URI `https://<your-project-ref>.supabase.co/auth/v1/callback`, then paste its Client ID and secret into Authentication, Sign In / Providers, Google.

**B5. Bot protection.** Create a Cloudflare Turnstile site and enter its secret under Authentication, Attack Protection.

**B6. Hosting variables.** Add the three variables to Vercel for Production, Preview and Development, with `SUPABASE_SECRET_KEY` marked Sensitive, and redeploy.

## Stress Test Results: Supabase backend foundation

Thirteen branches were examined: eleven mapped at the start and two added by the self-review. Four were confirmed as written and nine changed the design.

### Resolved Decisions

- **Documents stored as `jsonb`.** Kept. The interface already validates these structures on read, each household can write only its own rows, and the two fields worth filtering on are derived columns.
- **Schema derived from an unmerged branch.** Kept. The extra columns are optional, so they are harmless if that branch changes.
- **Sign-up trigger as a single point of failure.** Kept minimal, with `full_name` allowed to be empty, and exercised by the isolation test.
- **Username login.** The earlier choice stands. Its residual risk, shared-address throttling, is recorded under "Known limitations".
- **Operating stance.** The database is a production database on the free plan, not a demonstration. This was the project owner's correction during the stress test.
- **Merge timing.** The branch is pushed on its own and merged to `main` only after the frontend branch lands or its author agrees.

### Changes Made

- Feature repositories moved from Phase A to Phase B, because the screen shapes they translate are still changing. Their translation rules stay in this document.
- Code that only runs inside the Next.js server or a browser page moved to Phase B: the cookie-based clients, the secret-key wrapper, the authorization helper, the Google return route and the username server action. The dependencies `@supabase/ssr` and `server-only` move with them.
- Row limits lowered, and stated in their own table.
- Storage policies tightened to exact accepted paths, with one avatar per account, a 2 MB limit and at most 60 advisory images per account.
- Bot protection added to the design: service functions accept a verification token now; the form widget and the setting follow in Phase B.
- A backup and restore procedure added as `docs/11-database-operations.md`, with an acceptance criterion that it has been run once.
- Setup reduced for Phase A to the project, two auth settings, `.env.local` and the migration. Email, Google, bot protection and hosting variables are Phase B steps. Nothing is added to Vercel in Phase A.
- `birth_date` removed from `profiles`: no current screen collects it and nothing uses it.
- The isolation test now removes leftovers from an interrupted run before it starts.
- The atomic replace-a-bill-for-the-same-month function is noted for Phase B.
- Gmail SMTP and the shared preview and production database, both chosen as demonstration options, are marked for a new decision in Phase B.

### Deferred / Parking Lot

- Production email provider and domain.
- A second Supabase project for production.
- Account deletion by the user.
- Whether the sign-up form returns, and whether it asks for a birth date.
- Whether to move to Supabase Pro.
- Automated checks in GitHub Actions.

### Confidence Assessment

- Overall: High for Phase A. It is small, changes no visible behaviour, and its central claim, that one household cannot reach another's data, is proven by a test against the real project.
- Areas of concern: Phase B depends on a frontend that is still moving and on several decisions that have only been deferred. The free plan has no automatic backups, so real data is only as safe as the manual backup routine.
