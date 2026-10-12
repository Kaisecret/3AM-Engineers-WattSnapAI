# F07 — Personalized Tipid Tips

Owner: Dev 4. Reviewer: Dev 1. Goals: G08, G11, G16.

## Behavior

Generate simple household-relevant energy-saving recommendations using verified bill history, qualified consumption changes, and appliance estimates. Include input assumptions and generation time. Suggestions should explain practical actions without inventing appliance ownership or promising exact bill savings.

Support incomplete household data by requesting useful missing information or generating clearly limited advice. Existing tips remain readable if refresh fails. Prefer safe practical use changes rather than unsafe electrical modifications.

A switch-off plan ranks up to three devices by what one hour less each day would save (watts × quantity × 30 days). It never lists refrigerators or unclassified devices, which may be health or safety equipment, and it skips devices used under two hours a day. Appliance and switch-off estimates show pesos only when a saved bill supplies a rate: the latest bill's amount ÷ kWh before subsidy, the same rate the Appliances page uses, named with its month. A budget tip appears when the amount paid for the latest bill is near (85% or more) or over the monthly budget, with the gap in pesos and approximate kWh. When the latest bill records a subsidy, peso tips note that savings lower what is paid only while the bill is above the subsidy, and a tip says so when the subsidy covers the whole bill. Changing the budget or a recorded subsidy marks saved advice stale.

The next-year outlook shows a compact monthly chart, a month picker, estimated kWh and pesos, and possible high/low months. It repeats the most recent complete January–December history from this year or last year. At least three matching months from a later incomplete year can adjust that pattern once using the median usage ratio. This is a planning baseline, not proof of recurring seasonality. Gemini explains the computed pattern and offers preparation tips; it cannot alter chart values.

Valid meter-reading periods of 20–40 elapsed days normalize consumption to 30 days. Adjacent receipts may share a reading date. Otherwise, monthly totals are compared with a billing-length limitation. Samples, future receipts, duplicate months, and overlapping periods are excluded; missing months are never filled with zero. Without a complete recent year, the screen requests more history.

Peso scenarios apply the blended recorded cost per kWh from the latest three valid positive-consumption, positive-amount receipts. They are estimates before subsidies, with the rate and source months disclosed. Future prices and subsidies are not predicted. The displayed outlook recalculates from current locally saved bills, including synced records, and the Manila calendar year. It works offline and updates after bill additions, edits, or removals without refreshing AI tips. Stored tip snapshots retain the forecast used to generate their advice; changed records or years mark that advice stale until explicitly refreshed.

## Interfaces and dependencies

Uses saved bills, billing periods, and appliance estimates. Produces a device-local snapshot with an input signature, generation time, and Gemini/local source label. Changed inputs visibly mark saved advice stale; AI regeneration is explicit and online. Facts, estimates, navigation, and limitations remain application-owned while Gemini writes concise titles, actions, and explanations for known tip IDs. The switch-off, budget, and subsidy tips (`switch-off-plan`, `budget-gap`, `subsidy-covered`) are never sent to Gemini or rewritten. For the other tips, AI wording that quotes a peso, kWh, or percent figure the app did not supply for that tip in the same unit is discarded and the app's wording is kept.

## Implementation

- `src/features/tipid-tips/preview-tips.ts`: evidence-backed base tips and snapshot validation.
- `src/features/tipid-tips/bill-forecast.ts`: shared seasonal calculation, rate assumptions, and persisted forecast validation.
- `src/features/tipid-tips/components/BillForecastPanel.tsx`: history/forecast chart, month selection, and method disclosure.
- `src/features/tipid-tips/ai-tips.ts`: minimal request preparation and validated copy merging.
- `src/features/tipid-tips/components/TipsScreen.tsx`: generation, cancellation, status, filters, offline access, and stale-input protection.
- `src/features/tipid-tips/components/tips-list.tsx`: short advice with evidence behind “Why this tip?”.
- `src/app/api/ai/tips/route.ts`: protected Gemini call.
- `src/lib/ai/tips-request.ts`: allowlisted, bounded request validation.
- `src/lib/gemini/tips-reading.ts`: structured response schema, prompt, and copy validation.
- `src/features/tipid-tips/ai-tips.test.mjs`, `src/lib/gemini/tips-generation.test.mjs`, and `tests/e2e/tipid-tips.cjs`: generation and browser regressions.

## Offline and errors

Previously saved recommendations are available offline. New AI tips require connectivity. A first-time failure or offline visit can create clearly labeled basic suggestions; a failed refresh preserves saved advice. Cancellation, changes to input records, account switches, and newer tips saved in another tab prevent an older response from being saved. Generation time and limitations are in “About these tips”.

## Acceptance

- [ ] Advice references only supplied household facts and labels estimates.
- [ ] Empty/limited history is explained rather than fabricated.
- [ ] No guaranteed peso savings are claimed without an explicit estimated rate basis.
- [ ] Saved tips show generation time and stale input state.
- [ ] Offline reads work and failed regeneration preserves existing tips.
