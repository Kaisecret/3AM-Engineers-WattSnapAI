# F09 — Offline access to saved information

Owner: Dev 1 for infrastructure; every feature owner for integration. Reviewer: Dev 4. Goals: G11, G17.

## Behavior

After initial online setup, retain confirmed bills, appliances, calculations, graph inputs, generated tips, processed advisory summaries/originals selected for local saving, and readiness reminders. A cached app shell allows repeat visits. Use IndexedDB for account-scoped records and controlled service-worker caching for static assets.

Local calculations and manual draft/record edits can work offline. New AI extraction, generated recommendations, fresh cloud records, and sign-up need connectivity. Distinguish locally saved, pending sync, synced, and conflict states.

## Synchronization policy

Use stable operation IDs for idempotent replay. Reauthenticate before upload/sync. Compare base revisions; a conflicting remote edit requires user resolution and retains both versions. Retry transient failures with bounded backoff; stop unauthorized/invalid operations. Preserve deletion tombstones until acknowledged. Do not depend exclusively on browser background sync: sync on an online foreground visit too.

## Interfaces and dependencies

Consumes shared confirmed-record contracts. Produces SyncState and local read/save APIs. Feature owners integrate account context, revisions, and local views from their first delivery batch.

## Future files

- `src/lib/offline/database.ts`: account-scoped IndexedDB access.
- `src/lib/offline/sync.ts`: queue, replay, and conflicts.
- `src/features/offline-access/components/sync-status.tsx`: visible persistence state.
- `src/features/offline-access/service.ts`: cache lifecycle and account clearing.
- `tests/e2e/offline-household.spec.ts`: disconnect/reload and account change.

## Acceptance

- [ ] Saved bill graphs, appliances, tips, advisories, and readiness views survive disconnect/reload.
- [ ] New AI tasks explicitly require connectivity and offer manual alternatives where applicable.
- [ ] Replay cannot duplicate records; conflicting edits never overwrite silently.
- [ ] Sign-out/account switch clears private caches, including saved originals.
- [ ] Storage eviction and failed local persistence are reported accurately.
- [ ] Application/cache upgrades preserve or intentionally migrate saved record formats.
