# Shared contracts and data meanings

These are conceptual application interfaces, not database schema definitions. Column types, indexes, policies, and migrations will be designed separately before implementation.

## Common conventions

- Every household-owned record carries a stable ID, household identity, created/updated timestamps, and revision metadata for synchronization.
- Household identity comes from authenticated authorization; do not trust a browser-supplied household ID on its own.
- PHP amounts are represented consistently in centavos at application boundaries. Display PHP explicitly.
- Consumption uses kWh, power uses watts, duration uses hours/days. Calculate at full precision and round display output to two decimals.
- Store exact instants with timezone information; interpret household schedules in Asia/Manila. Date-only bill fields remain date-only.
- Unknown extracted values are absent, not zero. Preserve the distinction between a confirmed zero and a missing value.
- Errors distinguish validation, authentication, authorization, network/offline, provider timeout, malformed AI output, and synchronization conflict.

## Feature exchanges

| Contract | Producer → consumer | Required meanings |
| --- | --- | --- |
| HouseholdContext | F01 → all | Household ID, saved province/municipality/barangay, provider ID, optional consented coordinates |
| ProviderSuggestion | F01 → onboarding | Provider ID/name, coverage evidence/version, match reason, confirmed versus suggested state |
| BillDraft | F02 → review screen | Available billing period, amount, due date, kWh, extraction warnings, source reference |
| ConfirmedBill | F02 → F03/F06/F07/F11 | Reviewed fields, provider snapshot, billing period, confirmed status, source reference |
| ConfirmedAppliance | F04 → F05/F07/F10/F11 | Name/type/model, watts, quantity, hours per day, days in period, verified assumptions |
| ApplianceEstimate | F05 → F07/F10/F11 | Estimated kWh, period, source appliance revision, exact input assumptions |
| ConsumptionChange | F06 → F03/F07 | Current and previous bill IDs, absolute/percentage change, comparison qualification |
| SavedTips | F07 → UI/F09 | Recommendation text, input-record revisions, generation time, model/prompt version |
| AdvisoryInterpretation | F08 → F12/F09 | Type, original, source/provider, areas, schedule/restoration if present, reason, review status |
| LocationMatch | F08 → F12 | Affected/Possibly Affected/Not Listed, rationale, household-location revision |
| SimulationResult | F10 → UI | Baseline/scenario kWh, difference, assumptions; does not update appliances implicitly |
| BudgetStatus | F11 → dashboard | Period, target/unit, estimated used/remaining/projected use, risk status, basis/rate |
| BrownoutPlan | F12 → UI/F09 | Advisory ID/revision, reviewed match, schedule, countdown basis, reminder completion |
| SyncState | F09 → all | Locally saved/pending/synced/conflict state, last sync time, operation ID |

## Operational contracts

AI draft requests are authenticated, cancellable, validated, and subject to limits. A retry must not create a duplicate confirmed record. Use operation IDs for save/sync requests. Return missing-field warnings instead of invented data.

A save publishes an updated confirmed record and its revision; consumers recompute derived outputs. Changed appliance inputs mark saved tips and estimates stale. Location/provider changes require re-evaluating advisory matches and preserving the prior interpretation for audit.

For offline edits, retain a base revision. Apply only when that revision still matches remotely; otherwise show both versions and ask the user to resolve. Do not silently overwrite a newer cloud record. Deletions need tombstones until synchronization completes.

## Calculation contracts

- Appliance kWh = watts × quantity × hours per day × days in period ÷ 1,000.
- Absolute consumption change = current kWh − previous kWh.
- Percentage change = absolute change ÷ previous kWh × 100; undefined when previous kWh is zero.
- Simulation savings = baseline kWh − scenario kWh; negative means increased use.
- Budget remaining = target − estimated use in the same period and unit. Preserve negative remaining amounts.
- Estimated PHP = estimated kWh × explicit PHP/kWh rate. A historical amount/kWh ratio is an approximate effective rate, not an official tariff.
- Countdown = interruption start instant − current instant. Missing start time means no countdown; missing end means duration unknown.
