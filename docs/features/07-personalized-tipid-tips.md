# F07 — Personalized Tipid Tips

Owner: Dev 4. Reviewer: Dev 1. Goals: G08, G11, G16.

## Behavior

Generate simple household-relevant energy-saving recommendations using verified bill history, qualified consumption changes, and appliance estimates. Include input assumptions and generation time. Suggestions should explain practical actions without inventing appliance ownership or promising exact bill savings.

Support incomplete household data by requesting useful missing information or generating clearly limited advice. Existing tips remain readable if refresh fails. Prefer safe practical use changes rather than unsafe electrical modifications.

The next-year outlook shows a compact monthly chart, a month picker, estimated kWh and pesos, and possible high/low months. It repeats the most recent complete January–December history from this year or last year. At least three matching months from a later incomplete year can adjust that pattern once using the median usage ratio. This is a planning baseline, not proof of recurring seasonality. Gemini explains the computed pattern and offers preparation tips; it cannot alter chart values.

Valid meter-reading periods of 20–40 elapsed days normalize consumption to 30 days. Adjacent receipts may share a reading date. Otherwise, monthly totals are compared with a billing-length limitation. Samples, future receipts, duplicate months, and overlapping periods are excluded; missing months are never filled with zero. Without a complete recent year, the screen requests more history.

Peso scenarios apply the blended recorded cost per kWh from the latest three valid positive-consumption, positive-amount receipts. They are estimates before subsidies, with the rate and source months disclosed. Future prices and subsidies are not predicted. Saved forecasts remain available offline and become stale when records or the Manila calendar year change.

## Interfaces and dependencies

Uses saved bills, billing periods, and appliance estimates. Produces a device-local snapshot with an input signature, generation time, and Gemini/local source label. Changed inputs visibly mark saved advice stale; AI regeneration is explicit and online. Facts, estimates, navigation, and limitations remain application-owned while Gemini writes concise titles, actions, and explanations for known tip IDs.

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
