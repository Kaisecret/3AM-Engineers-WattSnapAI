# F07 — Personalized Tipid Tips

Owner: Dev 4. Reviewer: Dev 1. Goals: G08, G11, G16.

## Behavior

Generate simple household-relevant energy-saving recommendations using verified bill history, qualified consumption changes, and appliance estimates. Include input assumptions and generation time. Suggestions should explain practical actions without inventing appliance ownership or promising exact bill savings.

Support incomplete household data by requesting useful missing information or generating clearly limited advice. Existing tips remain readable if refresh fails. Prefer safe practical use changes rather than unsafe electrical modifications.

## Interfaces and dependencies

Consumes HouseholdContext, ConfirmedBill, ConsumptionChange, and ApplianceEstimate. Produces SavedTips with input revisions and model/prompt version. Changed inputs visibly mark saved advice stale; regeneration is explicit and online.

## Future files

- `src/features/tipid-tips/service.ts`: context selection and generation.
- `src/features/tipid-tips/components/tips-list.tsx`: advice, basis, freshness.
- `src/app/api/ai/tips/route.ts`: protected Gemini call.
- `src/features/tipid-tips/service.test.ts`: limited input and stale context behavior.

## Offline and errors

Previously saved recommendations are available offline. New tips require connectivity; indicate timeout/quota failure without deleting saved tips. Cache freshness is visible.

## Acceptance

- [ ] Advice references only supplied household facts and labels estimates.
- [ ] Empty/limited history is explained rather than fabricated.
- [ ] No guaranteed peso savings are claimed without an explicit estimated rate basis.
- [ ] Saved tips show generation time and stale input state.
- [ ] Offline reads work and failed regeneration preserves existing tips.
