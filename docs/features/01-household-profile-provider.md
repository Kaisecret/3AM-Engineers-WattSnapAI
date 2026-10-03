# F01 — Household profile and location-aware provider selection

Owner: Dev 1. Reviewer: Dev 4. Goals: G01, G02, G15, G17.

## Behavior

Save household name, province, municipality/city, barangay, and confirmed provider. Request device location only with permission to suggest likely providers. A suggestion is not saved as the selected provider until confirmed. Manual selection works without coordinates. Initial verified coverage is ANTECO; other providers are included only with verified evidence.

Provider suggestions use deterministic coverage/locality lookup. Gemini does not decide authoritative service boundaries. Allow multiple suggestions or no match, show uncertainty, and avoid silently treating current GPS as the household's saved location.

## Interfaces and dependencies

Consumes authorized account context, manual locality input, optional location consent/coordinates, and versioned provider coverage. Produces HouseholdContext and ProviderSuggestion for all downstream features. A saved-location change invalidates previous advisory matches; provider changes do not rewrite old bill provider snapshots.

## Future files

- `src/features/household-profile/components/profile-form.tsx`: household/location form.
- `src/features/household-profile/components/provider-picker.tsx`: suggestions and confirmation.
- `src/features/household-profile/provider-matching.ts`: deterministic lookup.
- `src/features/household-profile/repository.ts`: authorized profile access.
- `src/features/household-profile/provider-matching.test.ts`: unknown/ambiguous coverage.

## Offline and errors

Saved profile and provider remain readable locally. Denied geolocation, inaccurate GPS, missing coverage, or disconnected lookup retain manual entry. Offline edits are marked pending under F09's conflict rules.

## Acceptance

- [ ] Permission is optional; denial allows manual onboarding.
- [ ] User confirms suggested provider before saving.
- [ ] Unknown/overlapping coverage produces uncertainty rather than a guessed definitive provider.
- [ ] Saved household location stays separate from temporary device location.
- [ ] Profile is private and saved location changes trigger advisory re-evaluation.
