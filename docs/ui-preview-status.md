# UI-first delivery

This delivery implements the seven UI workflows selected from the proposal. It preserves the existing WattSnap artwork, colors, responsive navigation, and account-screen design. Data and interactions use this browser's local preview storage.

| Step | Proposal feature | Preview route | Implemented UI |
| --- | --- | --- | --- |
| 1 | F01 Household profile and provider | `/onboarding` | Household name and structured locality, optional location-permission demonstration, explicit provider selection, review and save, settings integration. Provider choices are labeled as unverified coverage. |
| 2 | F02 Bill scanner review | `/bills/new` | Camera/upload reference, labeled sample reading, manual fallback, editable bill fields and period dates, original viewer, explicit review confirmation, duplicate replacement decision, locally saved history. |
| 3 | F04 Appliance registration | `/appliances/new` | Labeled appliance types, optional nameplate reference, reviewed watts/kW, explicit usage and quantity, unknown-power validation, approximate-input labels, original viewer, duplicate decision and saved appliance edits. |
| 4 | F10 Watt-If simulator | `/simulator` | Separate baseline and scenario, equal periods, aircon/LED/fan examples, increased-use results, explicit rate basis, named saved scenarios, changed-baseline review and reset. Registered appliances stay independent. |
| 5 | F07 Personalized Tipid Tips | `/tips` | Local rules using supplied household inputs, explanations and assumptions, qualified bill comparisons, sample/limited-input states, saved timestamps, stale-input labels, explicit refresh, filtering, retry/cancel demonstrations that retain previous tips. |
| 6 | F08 Advisory intelligence | `/advisories`, `/advisories/new` | Screenshot/pasted originals, editable or unknown fields, qualified three-state location match, source attribution, review revisions, explicit household-match rechecks, separate restoration updates, saved versus fictional-sample views, inline affected-user preparation checklist and All Set Icon confirmation. |
| 7 | F12 Brownout Ready Mode | `/brownout-ready` | Reviewed-advisory selection, future matching-schedule recommendation, explicit uncertain-relevance confirmation, Manila countdown and duration, retained source and household basis, five saved checklist items, source/location change review, separate update acknowledgment, elapsed-schedule state. |

The Home, Energy, Appliances, Tips, Advisories, Settings, and Assistant screens provide links into these workflows. Advisories link to preparation plans, including the selected reviewed source. The assistant uses saved relevant advisory reviews instead of its old fixture announcements.

Review match also includes the original five preparation steps for affected active interruptions. Checking all five and selecting Done opens the “You’re all set!” confirmation with `All Set Icon.png`. Selecting Done with an incomplete checklist closes the dialog without a toast or confirmation popup. A separate footer Close button always closes the dialog. Home shows a matching Checklist Progress card until all five items are checked. Saved review progress persists in this browser, stays separate for each advisory, review revision, and household basis, and resumes at the first unchecked item from Home. Gallery sample progress remains within the current page visit; saved Brownout Ready Mode plans retain their existing browser persistence.

## Verification

The production build checks TypeScript and completes static page generation. The feature test suite contains 67 passing checks covering calculations, unknown inputs, date validation, source preservation, matching, stale inputs, saved data contracts, and preparation progress.

Browser verification lives in `tests/e2e`:

- `household-setup-preview.cjs`: household entry, field errors, permission demonstration, provider confirmation, persistence, settings, offline edits and save failure at 1440, 390 and 320 pixels.
- `bill-review-preview.cjs`: original image/PDF references, corrections, explicit confirmation, duplicates, unknown optional fields, invalid files, saved history, offline entry and failed storage.
- `nameplate-review-preview.cjs`: manual/photo/sample paths, W/kW conversion, unknown wattage, quantity/hours/days, duplicates, editing, originals and failed storage.
- `simulator-ui-preview.cjs`: independent scenario edits, equal periods, explicit rates, increased use, substitutions, saved snapshots, changed-baseline review and offline calculations.
- `tips-ui-preview.cjs`: input-based advice, filters, empty/sample/limited contexts, stale inputs, offline reads, refresh timeout/quota demonstrations, cancellation and persistence.
- `advisory-review-preview.cjs`: upload/paste, review validation, original preservation, all match states, corrected revisions, household rechecks, separate updates, local storage failure and recovery.
- `advisory-preparation-preview.cjs`: inline checklist and All Set Icon, footer Close, incomplete Done closing without popups, Home progress and resume, reload persistence, completion hiding, separate advisory/sample progress, revision and household changes, failed storage and unreadable-progress recovery, keyboard focus, desktop/phone/small-phone layout.
- `brownout-ready-preview.cjs`: fixed-clock 13:00–17:00 Manila example, confirmation gates, offline checklist/source access, persisted progress, missing times, elapsed schedules, source/location changes, restoration-update acknowledgment, deletion cancellation and storage recovery.
- `ui-workflow-navigation.cjs`: desktop/phone links across all seven workflows, stylesheet isolation between bill review and readiness, notification copy and assistant preview boundaries.
- `landing-performance-preview.cjs`: public SEO metadata, sitemap/robots, visible homepage without JavaScript, compressed backgrounds and local fonts, account/household noindex, desktop/tablet/phone/small-phone layout, menu, walkthrough and chat. See [mobile performance and SEO](./mobile-performance-seo.md) for the production-build audit.

Steps 2–7 have desktop/tablet/phone/small-phone checks at 1440, 1024, 390 and 320 pixels. Screenshots are generated in the corresponding `wattsnap-*-preview` directories under the system temporary directory. The existing account-screen checks remain in `auth-ui-preview.cjs`.

Run feature checks from PowerShell:

```powershell
$featureChecks = @(rg --files src/features -g '*.test.mjs')
node --test $featureChecks
npm.cmd run build
```

Browser scripts require Playwright and Chrome. Set `PLAYWRIGHT_MODULE` to an installed Playwright package if it is not available through the project's module resolution, then run `node tests/e2e/<script>.cjs` with the development server running. The in-app browser runtime failed initialization in this session; verification used Playwright with installed Chrome and isolated synthetic browser contexts.

## Implementation boundaries

- Backend authentication, household access controls, database integrations, Gemini calls, automatic web scraping, push notifications and background synchronization remain future work.
- Bill and nameplate extraction screens use clearly labeled samples or user-entered fields. Tipid Tips use local rules. Advisory matching compares entered labels; it does not verify the source, geographic aliases, or provider coverage.
- Saved data can be read or changed offline in an already open preview. The checklist, reviewed schedule and advisory original persist in browser storage. Offline cold opening/reloading of the application shell is not implemented. Tests exercise offline use in the open app and persistence after reconnecting and reloading.
- A countdown uses device time and the published schedule. A missing start has no countdown; an unknown end has no duration. An elapsed schedule does not assert restored power. Restoration updates retain their own source and require review.
- A plan keeps a snapshot of its reviewed advisory and household basis. Later corrections, removed advisories or changed household inputs leave the earlier original/checklist available and prompt review. Saving reviewed changes retains checklist progress.
- Browser storage is shared by anyone using the same browser profile. Originals are local UI references; the planned account privacy and server authorization have not been implemented.

This status describes the UI-first goal, not completion of the proposal's backend or offline PWA requirements.
