# F03 — Bill history and consumption dashboard

Owner: Dev 2. Reviewer: Dev 3. Goals: G04, G11, G16.

## Behavior

List confirmed bills by period, show monthly kWh and PHP amount graphs, and expose readable comparisons. Users can open, correct, or delete their records with downstream calculations refreshed. Keep official bill consumption separate from modeled appliance totals.

Do not fill missing months with zero bills. Explain empty history, one-record history, and duplicate/overlapping periods. Use accessible text summaries alongside charts.

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
