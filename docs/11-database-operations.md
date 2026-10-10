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
