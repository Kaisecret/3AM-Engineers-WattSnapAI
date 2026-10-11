# Automatic household record sync

Saved records stay in account-scoped browser storage for immediate offline access. While the signed-in app is open, WattSnap synchronizes them with the household owned by that verified Supabase account. Existing device records are imported on the first pass; the user does not need to add them again.

Sync runs after a save, reconnect, sign-in/token refresh, focus, reopening a page, and every 30 seconds. The cached offline app checks reachability every 30 seconds and returns to the verified app when the server recovers, including when no new browser `online` event fires. A expired session requires signing in again before uploading.

The synchronized records are household/profile preferences, avatar, bills and receipt details, appliances, reviewed advisories and their private originals, preparation checklists, brownout plans, tip snapshots, scenarios, setup progress, and dismissed provider posts. Theme preferences, unreviewed scanner drafts, and sample fixtures remain device data.

Each record has a small SHA-256 acknowledgement. Pending upload intentions are persisted before requests, and acknowledgements advance after each successful request. Interrupted responses, partial failures, later edits, and deletions remain replayable after reopening the app. Clearing a device copy restores remote records rather than deleting them. Local changed records/fields win when reconciling; untouched records from another device remain available.

Supabase row-level security authorizes every request. No service key is used in the app. Verified identity, local account scope, and owned household must match; account switches stop the pass. Web Locks serialize passes across tabs. The timeout resets as requests make progress, so slow connections can finish a large backlog. SDK waits stop when the pass is aborted.

Images use the existing private buckets. Unreferenced deleted/replaced originals are reclaimed after syncing, while images used by saved plans remain. Periodic cleanup leaves fresh uploads time to acquire their database references. Sync states remain internal: the interface shows no syncing, pending, success, or failed-sync status, banners, or announcements. Unsuccessful uploads remain on the device and retry quietly.

## Database migration

`supabase/migrations/20261012010000_offline_record_sync.sql` adds missing bill subsidy/charge/meter fields, household monthly subsidy and dismissed posts, profile contact email, and provider-post provenance. It retains existing ownership policies and grants only the new preference updates. Contact email does not alter the Auth login email.

This migration was applied to the project configured in `.env.local`; public database types were regenerated. The existing Vercel production environment also uses that project (`xhamkqmhxewqjfxktagj`), so its database is already prepared for this release. Keep the existing connection to preserve accounts and records. Apply the migration to any other project before deploying this version of the app against it. The migration was generated through the CLI and dated after the existing provider migration for deployment ordering.

## Verification

- `npm test`: complete rule/unit/migration suite.
- `npm run test:sync`: real development database upload, fresh-device restore, offline edit/delete, and private-image cleanup tests. Only the explicitly configured `WATTSNAP_TEST_PROJECT_REF` may be used. Temporary users and files are removed afterward.
- `npm run test:sync:browser`: headless Chrome with the real sync component and Supabase, covering reconnect, offline save/edit/delete, rejected requests, reopen, and cleared device copies. Uses the existing external Playwright/esbuild tools under `SCANNER_TOOLS` or the repository's scanner tools directory.
- `npx tsc --noEmit` and `npm run build`: type and production build checks.

Regression coverage includes shared-key hydration after logout cleanup, uncertain responses, failures partway through a collection, edits during uploads, account changes, merged history reader limits, stalled authentication, and equivalent database/JavaScript timestamps in saved plans.

Verified on October 12, 2026: 406 rule/unit/migration tests passed; all four real database tests passed; the browser reconnect test passed; TypeScript checks and the production build passed. The build reports the repository's existing missing ESLint configuration warning, so these results do not claim a lint pass. Supabase security advisors reported no errors; existing informational findings and a project warning remain.

The silent-interface follow-up passed TypeScript checks, all 25 focused sync tests, and the real browser test, including checks that reconnects and failed requests produce no sync messages or announcements.
