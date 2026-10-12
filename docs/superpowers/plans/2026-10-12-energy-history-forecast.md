# Energy history forecast implementation plan

**Goal:** Add a transparent next-month household estimate and year filters to the existing Energy screen.

**Architecture:** Pure calculation and filtering modules consume `PreviewBill[]`; a focused React forecast panel consumes their output. The existing household store supplies offline and synced records. No database migrations, dependencies, or edits to the in-progress Tipid Tips forecast.

## Tasks

- [x] Write failing `src/features/dashboard/next-month-forecast.test.mjs` tests for seasonal estimates, median adjustment, recent/limited/stale history, invalid and sample records, duplicates, period normalization, latest rate, ordering and Manila year boundaries. Run `node --test src/features/dashboard/next-month-forecast.test.mjs`.
- [x] Implement `next-month-forecast.ts`, exporting `forecastNextMonth(bills: PreviewBill[], now?: Date): NextMonthForecast` and `manilaMonth(now?: Date): string`. Seasonal: complete recent year, target month's baseline, latest three same-month ratios if available. Fallback: recent three-month mean or latest bill. Return explicit method, source months, rate month, notes and null estimates when history is insufficient. Run the tests again.
- [x] Write failing `bill-history-filter.test.mjs` tests and implement `bill-history-filter.ts`, exporting `filterBillHistory(bills, filter, now)` and `billHistoryFilters(bills, now)`. Use `recent`, `all`, `this-year`, `last-year`, or a four-digit recorded year. Recent returns six chronologically sorted saved bills; year filters never fill missing months. Run `node --test src/features/dashboard/bill-history-filter.test.mjs`.
- [x] Add `components/NextMonthForecast.tsx`. Render a forecast heading, kWh/cost, method and disclosure. Integrate the select and panel into `EnergyScreen.tsx`; filtered chart/list/stats share the same bills, while latest-bill summary and forecast use all bills. Add responsive, scrollable and dark-mode styles in `energy.css`.
- [x] Add `tests/e2e/energy-forecast.cjs` using the existing Playwright setup and synthetic records. Check filtering, all twelve last-year months, chart-unit selection, empty periods, forecast independence, live record changes, offline persistence, dark mode and 390/1440px layout. Run it against the local server.
- [x] Run `npm test`, `npx tsc --noEmit`, `npm run build`, inspect the diff and request a focused review. Fix material failures and report the implemented behavior with verification results.
