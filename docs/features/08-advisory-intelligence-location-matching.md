# F08 — Electricity advisory intelligence and location matching

Owner: Dev 4. Reviewer: Dev 1. Goals: G09, G10, G15, G16, G17.

## Behavior

Accept original official-provider screenshot upload, supported-app share intake where available, or pasted text. Gemini extracts advisory type, affected areas, date, start/end time, expected restoration, and reason where present, and produces a simplified summary. Keep the original and provider/source attribution available.

Match extracted areas against the saved household location and selected provider using deterministic, verified locality/coverage rules. Report exactly Affected, Possibly Affected, or Not Listed. Not Listed means the household was not listed in this advisory, not a guarantee of uninterrupted power.

Review ambiguous extracted dates/areas before readiness activation. Uploading a screenshot does not independently verify authenticity; retain source and review status. Distinguish restoration updates from a new interruption and avoid silently overwriting a previous advisory.

## Interfaces and dependencies

Consumes HouseholdContext, original image/text, Gemini adapter, locality aliases, and coverage evidence. Produces AdvisoryInterpretation and LocationMatch for F12. Match includes rationale and household/advisory revision.

## Automatic source: ANTECO's Facebook page

Besides what a person adds, the server collects ANTECO's public Facebook posts, reads the advisories among them with Gemini, and publishes them to a shared table (`provider_advisories`). In the browser, an ANTECO household with a province and municipality gets the ones that are Affected or Possibly Affected saved automatically, marked as read by AI and linked to the original post; the others are listed with a Save button. The same matching rules apply: a place that is not a verified Antique town or barangay never gives an exact match. Set-up and operation: [ANTECO advisory collection](../13-anteco-advisory-ingestion.md).

## Future files

- `src/features/advisory-intelligence/components/advisory-intake.tsx`: upload/paste/share fallback.
- `src/features/advisory-intelligence/components/advisory-review.tsx`: original and extracted details.
- `src/features/advisory-intelligence/location-matching.ts`: conservative deterministic matching.
- `src/features/advisory-intelligence/service.ts`: extraction and result orchestration.
- `src/app/api/ai/advisories/route.ts`: protected server adapter.
- `src/features/advisory-intelligence/location-matching.test.ts`: exact, partial, ambiguous, wrong-provider matches.

## Offline and errors

Processed advisories, originals saved locally, and match rationale remain readable offline. Fresh parsing requires connectivity. Preserve absent end/restoration as unknown. Unsupported share intake always has upload/paste fallbacks.

## Acceptance

- [ ] Screenshot and text paths retain the original and available structured fields.
- [ ] Missing schedules are not invented; uncertain areas cannot yield an unqualified exact match.
- [ ] Same-name barangays in different municipalities are distinguished.
- [ ] All three match statuses explain their meaning and source basis.
- [ ] Saved-location changes trigger re-evaluation before F12 autoactivation.
- [ ] Advisory originals remain the official reference, including offline when locally saved.
