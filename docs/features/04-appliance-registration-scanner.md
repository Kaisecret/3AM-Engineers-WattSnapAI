# F04 — Appliance registration and wattage scanner

Owner: Dev 3. Reviewer: Dev 2. Goals: G05, G16, G17.

## Behavior

Let users select recognizable appliance icons with text labels or enter a name/type manually. Capture model if known, watts, quantity, daily operating hours, and days in the selected period. Optional nameplate upload/camera scanning extracts available name/model/wattage through Gemini. User verifies or corrects all calculation inputs before save.

Ambiguous electrical labels, voltage-only labels, or unclear units require user correction. Do not invent wattage from an appliance category. Approximate user inputs are labeled as such even after confirmation.

## Interfaces and dependencies

Consumes HouseholdContext and optional Gemini draft. Produces ConfirmedAppliance for estimator/tips/simulator/budget. Changing usage or watts updates revision and marks derived outputs stale.

## Future files

- `src/features/appliance-registration/components/appliance-picker.tsx`: labeled icons.
- `src/features/appliance-registration/components/appliance-form.tsx`: confirmed details.
- `src/features/appliance-registration/components/nameplate-review.tsx`: extraction correction.
- `src/features/appliance-registration/service.ts`: manual/scanned registration.
- `src/app/api/ai/appliances/route.ts`: authenticated extraction.
- `src/features/appliance-registration/schemas.test.ts`: input/unknown-wattage validation.

## Offline and errors

Manual entry and saved appliances work locally. Nameplate AI needs connectivity. Handle failed image parsing, duplicate appliances, invalid units, negative watts, quantity below one, and hours outside 0–24.

## Acceptance

- [ ] Manual and scan-assisted paths produce the same reviewed contract.
- [ ] Extraction cannot save an appliance without confirmation.
- [ ] Icons have readable names; unknown wattage is never fabricated.
- [ ] Quantity/hours/days are explicit and validated for the period.
- [ ] Appliance edits refresh estimates and do not overwrite simulated scenarios.
