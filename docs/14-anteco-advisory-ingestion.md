# ANTECO advisory collection

WattSnap reads ANTECO's public Facebook page (`facebook.com/antecoPH`), finds the posts that are power
advisories, and shows them to ANTECO households. This page explains how it works, how to set it up, and how
to check that it is running.

## How it works

```
ANTECO posts on Facebook
  -> Facebook emails the project's Gmail account   (a Facebook account made for the project follows the page)
  -> a script in that Gmail account, every minute  -> POST /api/advisories/ingest
Vercel Cron, once a day at 06:00 Manila time       -> GET  /api/advisories/ingest

/api/advisories/ingest
  fetch   Apify returns the posts not seen yet; every one is stored
  read    Gemini reads the caption and images of each post that could be an advisory
  -> published advisories appear in the app
```

- **The email is only a signal.** Its contents are never read by the app. The app asks Apify for the page's
  posts and skips the ones it already has, so a late, repeated or missing email cannot lose or duplicate an
  advisory. The daily run catches anything the emails miss.
- **In the app**, an ANTECO household with a province and municipality set gets the advisories that list, or
  may list, its area saved automatically when the app is opened online. An advisory that names no town at all
  (a reminder, general information) is not saved for anyone; it stays in the list below. They appear on Home and in Advisories,
  marked "From ANTECO · read by AI", with a link to the original post. Other current ANTECO advisories are
  listed under "More from ANTECO's Facebook page" with a Save button.
- **AI can misread.** A town or barangay that is not in the app's Antique list is never treated as an exact
  match. Neither is part of a barangay (a sitio, a street, "portion of"): that is "Possibly affected" for the
  town, not "Affected" for everyone in the barangay. Missing dates and times stay empty, and every
  advisory links to the original post.
- **Nothing about a household leaves the device.** Matching happens in the browser.

Code: `src/features/advisory-intelligence/ingest.ts` (rules), `repository.ts` and `service.ts` (database, Apify,
Gemini), `provider-feed.ts` (what the app saves), `src/lib/apify/facebook-posts.ts`,
`src/lib/gemini/advisory-reading.ts`, `src/app/api/advisories/ingest/route.ts`.

## Secrets

| Variable | What it is | Where it goes |
| --- | --- | --- |
| `APIFY_API_TOKEN` | Apify Console -> Settings -> API & Integrations | `.env.local`; Vercel -> Settings -> Environment Variables -> Production |
| `CRON_SECRET` | A random value you create: `openssl rand -hex 32` | `.env.local`; Vercel (Production); the Gmail script's Script Properties |
| `GEMINI_API_KEY`, `SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_SUPABASE_URL` | Already used by the app | Must also be set in Vercel: this is server code that writes with the secret key |

Never give any of these a `NEXT_PUBLIC_` name, never paste them into the Gmail script's code, a chat or an
issue. Vercel gives a new variable only to deployments made after it was added: redeploy after adding one.
If a token was ever pasted somewhere, create a new one and delete the old one.

## Set-up, in order

1. **Database.** Apply `supabase/migrations/20261012000000_provider_advisories.sql` as described in
   [Database operations](11-database-operations.md): `npm test`, apply to `wattsnap-dev`,
   `npm run test:isolation`, then apply to `wattsnap` and compare the schema summary.
2. **Types.** After applying to `wattsnap-dev`, regenerate the database types and remove the two untyped
   client casts marked `ponytail:` in `repository.ts` and `use-provider-advisories.ts`:
   ```
   npx --yes supabase gen types typescript --project-id "<wattsnap-dev reference>" --schema public > src/generated/database.types.ts
   ```
3. **Confirm the Apify actor.** Done on 11 October 2026 against ANTECO's page: the field names, the
   newest-first order and both date filters (`onlyPostsNewerThan`, `onlyPostsOlderThan`, exact to the second)
   behave as the code expects, and a call takes 10 to 20 seconds.
   `src/lib/apify/facebook-posts.fixture.json` is a trimmed copy of that real answer. Things learned from it:
   ANTECO writes headings in styled letters (𝗣𝗢𝗪𝗘𝗥 𝗜𝗡𝗧𝗘𝗥𝗥𝗨𝗣𝗧𝗜𝗢𝗡), which the keyword check turns into
   ordinary letters first; its advisories usually carry the full details in the caption; images arrive about
   600 pixels wide; and the actor's `ocrText` is only a description ("May be an image of text"), never the
   printed text. Still to do with the app running: run one collection by hand (see "Run it by hand"), check
   that posts are stored, and that a second run a few minutes later stores nothing new.
4. **Vercel.** Add `APIFY_API_TOKEN` and `CRON_SECRET` (Production), confirm the other three exist, and
   deploy. `vercel.json` schedules the daily run; Vercel sends `Authorization: Bearer <CRON_SECRET>` by itself.
   **The route needs a 300-second function limit**, which on Vercel means Fluid Compute. Check the
   project's limit and time one run on the deployment before relying on it. A 60-second limit is not
   supported: one Apify call and one Gemini read can each take longer than that. Supporting it would mean
   starting the Apify run without waiting and letting Apify call the route back when it finishes, which is
   not built.
5. **Email signal.** Follow "Gmail trigger" below.

## Gmail trigger

There is no Gmail API key, OAuth client or Google Cloud project. The script runs inside the project's Gmail
account and reads that mailbox with the account's own permission.

1. Use a Gmail account made for the project, not a personal one.
2. With that address, create the project's Facebook account, open `facebook.com/antecoPH`, Follow, set the
   page's notifications to all posts (Favorites), and in Facebook Settings -> Notifications -> Email turn on
   email for pages you follow.
3. Wait for two or three ANTECO posts. Check that an email arrives for each, and note the sender and subject.
   If Facebook does not send them reliably, the daily run is the only source and advisories can be up to a
   day late: decide then whether to add more scheduled runs.
4. Signed in as the project Gmail, open `script.google.com` -> New project -> paste
   `scripts/gmail-advisory-trigger.gs`. Adjust the `SEARCH` line to the sender and subject seen in step 3.
5. Project Settings (gear) -> Script Properties: add `WEBHOOK_URL`
   (`https://www.wattsnapai.dev/api/advisories/ingest`) and `CRON_SECRET`. Use the `www` address exactly:
   `wattsnapai.dev` without it redirects, and a redirect drops the secret, so the app would answer 401.
6. Select `checkMail`, press Run once, and allow the permissions Google asks for (for a personal script it
   shows an "unverified app" screen first: Advanced -> continue).
7. Triggers (clock icon) -> Add Trigger -> `checkMail`, time-driven, minutes timer, every minute.
8. Run `testPing`: the Executions log shows `202` (a run started) or `409` (one started a moment ago).

Each minute the script sends the time the newest notification arrived (`?since=`). It labels the notification
`wattsnap-handled` only when the app answers `200 served` (new posts were fetched after the email arrived and
none of them is still waiting to be read) or
`429` (the day's runs are used up; the daily run covers it). A `202` only means a run started: that run can
still fail, so the email stays and the next minute asks again. So do `409`, `503` and network errors.
Free Gmail accounts allow about 90 minutes of trigger run time a day; each check takes a second or two. If
Google reports the quota is reached, change the trigger to every 5 minutes.

## Run it by hand

```
curl -X POST "http://localhost:3000/api/advisories/ingest?wait=1&trigger=manual" -H "Authorization: Bearer <CRON_SECRET>"
```

`wait=1` runs the collection inside the request and returns its counts. Without it the route answers at once
and continues in the background.

| Answer | Meaning |
| --- | --- |
| `200 served: true` | Only with `since`: new posts were fetched after that time and all of them have been read. Nothing to do |
| `202 accepted` | A run started |
| `409 retry: true` | A run is fetching, or one started under two minutes ago. Send again |
| `429 retry: false` | 30 runs already started today (Manila time) |
| `401` | Wrong or missing bearer |
| `503` | `CRON_SECRET`, `APIFY_API_TOKEN` or `GEMINI_API_KEY` is not set, or the database could not be reached |

## Check that it is running

In the Supabase SQL Editor (check the project name first):

```sql
-- The latest runs: when, what started them, and how they went.
select started_at, trigger, outcome, fetched, inserted, detected, queued_left, error
  from public.provider_advisory_runs order by started_at desc limit 20;

-- What each post became.
select status, count(*) from public.provider_advisories group by status;

-- Posts that could not be read, and why.
select posted_at, post_url, attempts, failure from public.provider_advisories
 where status = 'failed' order by posted_at desc;

-- Ranges of time whose posts are not all fetched yet. Empty means nothing is missing.
select pending_ranges, lease_until from public.provider_advisory_state;
```

- `outcome = failed` with `error` starting `fetch:` means Apify did not answer; waiting posts are still read.
- `queued_left` above zero means the run ran out of time; the next run continues. Run it by hand to finish
  sooner (two minutes apart).
- A post is read at most 3 times. One that is still `failed` after that stays `failed`: open its `post_url`
  to read it on ANTECO's page. The app has no manual way to add an advisory.
- `failure = images-unavailable` means the post's image links had expired. A later fetch that returns the
  post again refreshes them.
- A non-empty `pending_ranges` after many posts arrived at once is normal; each run fetches 30 more. A range
  with a `limit` is one where many posts share the same time; it asks for more per call until it gets past them.
- While a range is pending, runs take it first every second time, so a new post can wait one extra run
  (about two minutes). The notification stays pending until its post is fetched and read.

## Limits and cost

- The very first run, when nothing is stored yet, looks back two days. After that a run fetches only posts
  newer than the newest one stored.
- One run starts at most every two minutes and 30 times a day. A run makes at most two Apify calls of up to
  30 posts each. The actor is billed per post returned; check its pricing tab for the current rate.
- Gemini is called once per new post that mentions an outage or has an image, sharing the app's
  `GEMINI_API_KEY` quota. When the reading model (`GEMINI_SCAN_MODEL`, default `gemini-3.5-flash`) is
  overloaded, busy or missing, the chat model (`GEMINI_MODEL`) reads the post instead. In the first real run
  6 of 9 reads met an overloaded model; the retry with this fallback read all of them.
- Rows older than 180 days are deleted, except published advisories that have not ended more than 30 days ago.
  Run rows are kept for 30 days.
- People learn of an advisory when they open the app. There are no push notifications or emails.
- Each run also looks six hours behind the newest post it has, to catch posts that appeared late. If 30 or
  more posts lie inside those six hours, a late post beneath them is not seen. ANTECO posts a few times a day.
- Meta's terms restrict automated collection, and a Facebook account made for a project can be restricted. If
  collection stops, no new advisories reach the app: manual "Add advisory" was removed, so there is no in-app
  fallback. Advisories already saved stay readable.
