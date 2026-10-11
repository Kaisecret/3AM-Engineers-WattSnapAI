# F03 — Bill history and consumption dashboard

Owner: Dev 2. Reviewer: Dev 3. Goals: G04, G11, G16.

## Behavior

List confirmed bills by period, show monthly kWh and PHP amount graphs, and expose readable comparisons. Users can open, correct, or delete their records with downstream calculations refreshed. Keep official bill consumption separate from modeled appliance totals.

Do not fill missing months with zero bills. Explain empty history, one-record history, and duplicate/overlapping periods. Use accessible text summaries alongside charts.

## Implemented Energy screen

The `/bills` screen offers Recent 6 bills, All years, This year, Last year, and individual recorded years. One filter controls the chart, average/low/high summaries, comparisons and history list. Missing months stay absent. Newly saved historical bills open in their year. The newest-bill summary always remains the newest saved bill.

Mobile comparisons use short month labels and two compact change summaries. Billing-period qualifications and the review threshold remain available under Comparison details. The history selector shows a live bill count beside it; summary and chart labels stay short. Bill attribution displays WattSnap AI while stored scan/manual source values remain unchanged.

The Next month estimate panel uses eligible real saved history independently of the viewing filter. A complete recent calendar year supplies the matching month's seasonal baseline. At least three later matching months can adjust that baseline once using the median ratio of the latest three. Otherwise, three recent calendar months supply an average; one or two provide a clearly marked latest-bill starting estimate. Old incomplete history supplies no estimate.

Reliable billing periods are normalized to 30-day use and labeled accordingly. Peso estimates multiply unrounded consumption by the latest eligible bill's amount before subsidy divided by its kWh. The explanation identifies source months, assumptions and missing history. These are planning estimates, not guaranteed charges or evidence of recurring seasonality. Sample, duplicate-month, future-issued and overlapping-period bills do not train the calculation.

Calculation and filtering run locally, including after reopening or reloading the prepared app offline. No AI call or database migration is required for these views.

Verification: `node --test src/features/dashboard/next-month-forecast.test.mjs src/features/dashboard/bill-history-filter.test.mjs`, `node tests/e2e/energy-forecast.cjs`, and `node tests/e2e/energy-forecast-offline.cjs` (production server at `OFFLINE_BASE`, default `http://127.0.0.1:3122`). Browser checks use the existing external Playwright/esbuild tools.

## Interfaces and dependencies

Consumes ConfirmedBill and ConsumptionChange. Produces ordered confirmed history for F06/F07/F11. Correction/deletion updates record revisions, derived views, saved tips' freshness, and offline sync state.

## Future files

- `src/features/bill-history/components/bill-list.tsx`: period history.
- `src/features/bill-history/components/consumption-chart.tsx`: chart and text summary.
- `src/features/bill-history/service.ts`: ordering/grouping and derived views.
- `src/features/bill-history/repository.ts`: household-scoped records.
- `src/features/bill-history/service.test.ts`: missing/overlapping periods.

## Offline and errors

Read saved records locally; indicate last synchronization and pending edits. Empty history prompts manual entry/scanning. Cloud failure does not hide locally saved history.

## Acceptance

- [ ] Only confirmed bills appear in official-history totals.
- [ ] kWh and PHP charts are clearly labeled and chronologically ordered.
- [ ] Missing periods are visibly absent, not zero consumption.
- [ ] Correct/delete updates derived views without mixing household records.
- [ ] Saved graphs and history load after an offline reload.
