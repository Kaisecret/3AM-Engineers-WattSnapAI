# Bill-pattern forecast in Tipid Tips

**Goal:** Use last year's monthly receipts and this year's receipts to estimate next year's higher/lower usage months and generate relevant Gemini advice.

**Design:** One compact 12-month usage chart with actual-history and dashed forecast lines, tappable months, peak/low labels, and a short tip. Method and limitations expand on demand. Preserve existing simple tips, refresh/cancellation behavior, offline snapshots, and dark mode.

**Approach:** Compute the numbers locally and on the server with the same deterministic function. Gemini explains those numbers and prepares household-specific actions. A free-form model-generated numeric forecast would be difficult to validate; a seasonally repeated usage baseline is transparent. Method reference: https://otexts.com/fpp3/toolbox.html#seasonal-na%C3%AFve-method.

**Rules:** Target the next calendar year in Asia/Manila. Require a complete, recent calendar year of real bills. Repeat that year's monthly shape. If a later incomplete year has at least three positive matching months, adjust that shape once by their median usage ratio. Never compound an inferred growth rate into the future. Where all usable bills have valid 20–40-day periods, compare 30-day usage; otherwise use monthly totals and explain unverified period lengths. Exclude sample, future, invalid, duplicate-month, and overlapping-period bills. Missing data are never zeros. A historical pattern is a planning estimate, not a guarantee or proof of weather/appliance causation. Do not invent statistical confidence intervals or price forecasts.

**Compatibility:** Optional forecast data on the existing snapshot; older saved tips remain readable. Forecast tips use known IDs and application-owned facts. New receipts mark the existing snapshot stale. Old snapshots can derive a local outlook from current records without labeling it Gemini advice.

## Tasks

- [x] Test seasonal patterns, year-over-year adjustment, missing/sampled/future/duplicate records, dates, zero baselines, flat history, and serialization.
- [x] Implement deterministic forecasts and integrate context into the existing Gemini prompt/tip flow.
- [x] Add the chart and month selection, plus insufficient-history state and method disclosure.
- [x] Verify tests, TypeScript, build, browser layouts/interaction/offline persistence, and live Gemini on a synthetic seasonal household.

**Peso estimates:** User selected both kWh and pesos. Apply the blended recorded cost/kWh from the latest three valid positive-consumption, positive-amount receipts. Label the assumption and present estimates before subsidies. No assumed tariff increases or invented future subsidy. Show no peso estimate when the rate basis is missing.

No database schema change. Use existing receipts and account-scoped storage. Implement in this workspace; publication follows the user's established push/deploy preference after verification.

**Verification:** 12 focused forecast tests pass, including shared meter-reading boundaries and saved forecast freshness across Manila midnight. The full workspace suite passed 444 tests. TypeScript and the production build passed. Browser checks passed at 1440px, 390px, 320px, and in dark mode, covering kWh/pesos, month selection, Gemini response integration, reload, and offline snapshots. A live Gemini call using synthetic seasonal receipts returned valid preparation advice for the computed May peak (240 kWh, ₱2,880). Code review findings about reading-date boundaries, calendar freshness, and hidden-history chart scaling were addressed.
