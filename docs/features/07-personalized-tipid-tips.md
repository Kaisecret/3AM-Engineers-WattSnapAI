# F07 — Personalized Tipid Tips

Owner: Dev 4. Reviewer: Dev 1. Goals: G08, G11, G16.

## Behavior

Generate simple household-relevant energy-saving recommendations using verified bill history, qualified consumption changes, and appliance estimates. Include input assumptions and generation time. Suggestions should explain practical actions without inventing appliance ownership or promising exact bill savings.

Support incomplete household data by requesting useful missing information or generating clearly limited advice. Existing tips remain readable if refresh fails. Prefer safe practical use changes rather than unsafe electrical modifications.

## Interfaces and dependencies

Uses saved bills, billing periods, and appliance estimates. Produces a device-local snapshot with an input signature, generation time, and Gemini/local source label. Changed inputs visibly mark saved advice stale; AI regeneration is explicit and online. Facts, estimates, navigation, and limitations remain application-owned while Gemini writes concise titles, actions, and explanations for known tip IDs.

## Implementation

- `src/features/tipid-tips/preview-tips.ts`: evidence-backed base tips and snapshot validation.
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
