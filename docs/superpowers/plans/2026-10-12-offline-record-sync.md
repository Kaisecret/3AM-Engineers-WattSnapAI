# Offline record sync implementation plan

**Goal:** Upload all saved household records to Supabase when connectivity returns, including records already stored on the device.

**Architecture:** Retain account-scoped local storage for immediate offline saves. Compare each record with a durable acknowledgement baseline, send only changes and explicit deletions, merge remote records, and advance acknowledgements only after successful requests. A lifecycle component retries on saves, reconnect, refreshed sessions, focus, and a periodic timer. Supabase RLS remains the authority for account ownership.

**Scope:** Household settings, profile name/contact/photo/notifications, bills with subsidy/charges/readings, appliances, reviewed advisories and images, preparation checklists, brownout plans, tips, scenarios, setup progress, and dismissed provider posts. Draft scans and theme preferences remain device preferences.

- [x] Add failing sync tests for existing local records, network failure/retry, durable deletions, merging another device's records, account changes, and edits during an upload.
- [x] Implement store descriptors and the durable sync engine in `src/lib/offline/`.
- [x] Add a Supabase adapter using existing tables and private image storage. Add a migration for bill detail fields and household/profile preferences absent from the initial schema; test database constraints and ownership.
- [x] Mount sync for the verified account and listen to every record change event. Per the user's follow-up, keep sync status internal and run uploads/retries silently without status messages in the interface.
- [x] Run focused tests, migration tests, the full test suite, TypeScript checks, and a production build; review the changes and document any live verification limitation.

Conflict policy: local changed fields/records win for that item; untouched remote items are retained. Missing local storage is never treated as a request to clear the database. A failed table must not prevent independent tables from syncing. Record IDs are preserved; sample fixtures are excluded.
