# Delivery roadmap

This roadmap orders work by dependencies rather than promising a delivery date. All 12 proposal features remain in the complete scope. Names and calendar estimates should follow team assignment and availability.

## Batch 0 — shared foundation

- [ ] All developers review goals, proposed architecture, contracts, and feature ownership.
- [ ] Dev 1 and Dev 4 configure Next.js/Supabase foundations, authentication, CI gates, and staging.
- [ ] Dev 1 defines household/provider and offline interfaces; Dev 2–4 create synthetic feature fixtures.
- [ ] All developers agree navigation, form controls, loading/error states, and estimate labels.

Exit: accounts are isolated, contracts are agreed, staging works, and each developer can integrate a small PR.

## Batch 1 — parallel core records

| Owner | Work | Dependency |
| --- | --- | --- |
| Dev 1 | F01 profile/provider; F09 local storage foundation | Auth |
| Dev 2 | F02 confirmed bill flow and F03 history | Household contract; Gemini adapter |
| Dev 3 | F04 appliances and F05 deterministic estimator | Household contract; Gemini adapter |
| Dev 4 | F08 advisory intake, interpretation, and matching | Household/location contract; Gemini adapter |

Exit: manual entry works despite AI failure, confirmed records integrate, original advisories are retained, and saved records have local representations.

## Batch 2 — decision support

| Owner | Work | Dependency |
| --- | --- | --- |
| Dev 1 | F09 replay/conflicts, sign-out clearing, integration support | Confirmed record modules |
| Dev 2 | F06 change detection and dashboard integration | F02/F03 |
| Dev 3 | F10 Watt-If and F11 budgets | F05; bill/rate inputs |
| Dev 4 | F07 Tipid Tips and F12 Brownout Ready | F05/F06; F08 |

Exit: dependent features consume shared contracts and clearly show data basis, stale state, and uncertainty.

## Batch 3 — complete proposal acceptance

- [ ] Each owner verifies all feature acceptance checklists and offline saved views.
- [ ] Dev 2 and Dev 3 validate calculation examples and cross-feature changes.
- [ ] Dev 1 and Dev 4 verify direct-request isolation, cache clearing, and deployment gates.
- [ ] All developers rehearse the end-to-end household demo and recovery behavior.
- [ ] Release reviewer records staging acceptance before production promotion.

## Demo sequence

Manual provider selection → reviewed bill scan → monthly comparison → confirmed appliance scan → deterministic estimate → Tipid Tips → 240-to-150 kWh simulation → monthly budget → advisory location match → Brownout Ready → offline reload.

## If hackathon time is limited

Deliver the smallest working slice of each core workflow using synthetic fixtures, manual fallbacks, and ANTECO validation. Do not silently claim incomplete features are finished. Wider provider coverage, unsupported-browser sharing, and automated notifications may follow later; direct upload/paste intake remains available.
