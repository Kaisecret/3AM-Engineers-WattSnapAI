# Frontend completion review

Acceptance reference: [the supplied enhancement prompt](./frontend-enhancement-request.md).

Review branch: `frontend/final-enhancements-2026-10-10`. Starting commit: `9c34526`.
Each top-level number in the prompt receives one reviewed commit and push. No merge or deployment is authorized.

## 1. Main objective — repository audit

The application uses Next.js 15, React 19, TypeScript, existing CSS and Lucide icons. Preserve the routes, sidebar, mobile navigation, card arrangements, original artwork and theme. The household hook and feature hooks already save browser-local records. Reviewed bills and appliances have validation and explicit confirmation; advisory review retains originals and qualified location matching; tips and simulation calculations already run locally.

The existing account screens simulate passwords, verification and Google selection. Auth services/repositories and Gemini endpoints remain placeholders. They must stay untouched. Replace the public simulated account path with local household access, without implying security or deleting earlier scoped records.

Identified gaps: guest sample seeding, invented missing-month chart bars, fabricated default name/budget/provider, sample bill scan animation after real uploads, public sample appliance/advisory/tips controls, development-oriented copy, offline-disabled deterministic tips, no interrupted bill draft recovery, and incomplete shell coverage. Provider suggestions currently use unverified province labels; prefer explicit manual selection.

Baseline evidence: 76 feature tests pass; `npx.cmd tsc --noEmit` passes. Existing browser tests and the previous production build are retained as regression references. Browser-plugin bootstrap fails before creating a session; isolated local Chrome contexts provide the fallback for synthetic test data.

## Delivery record

| Number | Scope | Status |
| --- | --- | --- |
| 1 | Objective and architecture audit | Reviewed; baseline verified |
| 2 | Safety and protected boundaries | Separate branch; boundary guard passes |
| 3 | Preserve design; targeted refinement | Existing layout retained; focus and controls checked at 320–1440px |
| 4 | Remove prototype/sample presentation | Empty states, actual-only charts, sample controls removed; legacy fixtures preserved |
| 5 | Local household access and provider | Password-free local installation; explicit manual provider and preserved scopes |
| 6 | Bill upload/manual review/draft | Real photo/manual entry, optional fields, confirmed saves and tab draft recovery |
| 7 | Actual bill history/dashboard/change | Actual periods, transparent change threshold and confirmed removal |
| 8 | Appliance capture/management | Manual/photo review, familiar labels, editing and confirmed removal |
| 9 | Appliance estimator | Validated local formula; no invented tariff or meter matching |
| 10 | Deterministic local tips | Actual input basis; immediate offline creation and refresh |
| 11 | Manual advisory review/history | Upload/paste, custom providers, deliberate original retention and qualified matching |
| 12 | Offline persistence/shell | Pending |
| 13 | Senior accessibility | Pending |
| 14 | Responsive verification | Pending |
| 15 | Content accuracy | Pending |
| 16 | Frontend contracts/code quality | Pending |
| 17 | Full local verification | Pending |
| 18 | Priority review/polish | Pending |
| 19 | Definition-of-done audit | Pending |
| 20 | Final implementation report | Pending |

## 2. Safety review

The starting working tree was clean. All work is isolated on the review branch; `main` is unchanged. `scripts/check-frontend-boundaries.cjs` checks tracked and new files against the starting commit and rejects changes to API routes, service/repository implementations, Gemini/Supabase/offline infrastructure, auth contracts, environment files and deployment configuration. No user-browser records or secrets are read by tests; browser verification uses synthetic isolated contexts. No destructive migration, automatic merge or deployment is included.

## 3. Design preservation

Original colors, fonts, art, sidebar and mobile navigation remain in use. A scoped refinement sheet adds visible input focus and comfortable existing primary/secondary controls. No new dashboard arrangement or design system is introduced. Local Chrome checks cover the unchanged logo/navigation, form focus and horizontal fit at 320, 390, 768 and 1440 pixels.

## 4. Honest records and sample removal

New households start with no bills, appliances or budget and a neutral home label. Charts use only stored periods. Original fixtures remain available to rule tests. Old fixture records are filtered from real statistics without destructive writes; ordinary edits preserve those hidden fixtures. Public sample buttons/galleries and simulated refresh-state controls are removed. A bill upload now opens blank manual review instead of invented extraction. Prototype labels on shared page footers are replaced with the actual device-storage limitation. Module-specific wording and account behavior are completed in their numbered sections.

Checks: empty-state/manual-entry browser flow, actual-only chart tests, fixture-preservation tests and TypeScript. The existing prototype-only browser scripts are reference tests for the earlier simulated flows; the completion suite exercises the replacement actual-data workflows.

## 5. Local household and provider

Public account routes now reuse the existing illustrated shell for honest local household access. They request no password, OTP or simulated Google verification. Original auth implementation files and service/repository infrastructure remain retained and unchanged. A versioned installation pointer resumes the active legacy scope (or the latest legacy identity when no unscoped home exists), without copying or deleting any previous records. One household is presented; no account chooser or multi-household management is added. Closing the household returns to the homepage without deleting storage.

Location lookup remains optional, explicitly explained and user-triggered. The fabricated example location and province-based utility suggestions are removed. Provider selection is manual and reviewed before save; ANTECO and the existing list remain, with an Other provider name for wider use. GPS never confirms a provider. Browser checks cover real household saves, a custom provider, refresh and returning access. Rule tests verify legacy scope preservation and unreadable-pointer protection.

## 6. Bill entry and interrupted sessions

Uploads and supported camera captures are reference documents for manual review. Fields include provider, month, exact period, billing date, amount, due date, kWh and optional notes. The printed provider is saved with the bill rather than overwritten by the household default. Replacement/removal retains entered values; no image generates invented values. Validation covers MIME/size/decode, PDF signatures, calendar dates, period ordering, positive numeric inputs, explicit review and confirmed duplicate replacement. Camera permission is user-triggered; unsupported hardware falls back to upload/manual entry, and flashlight state changes only after a successful supported operation.

Versioned session drafts retain typed fields across refresh, without retaining photos or review confirmation. Successful saves remove the unfinished draft. Explicit discard uses a confirmation dialog; changing the input preserves values. Browser checks cover photo/manual input, refresh, optional fields, no implicit save and duplicate protection. Rule tests reject unreadable/oversized drafts and invalid billing dates. No AI requests are made.

## 7. Bill history and consumption changes

History and chart comparisons use actual saved periods, including gaps and year labels. A 20% change threshold highlights notable changes without inferring their causes; different or unknown period lengths are qualified. Charts expose full-height touch targets without distorting bar values. Bill removal now requires confirmation and preserves other records. The remaining sample-history control is removed. Checks cover actual history, gaps, refresh, deletion confirmation and threshold calculations.

## 8. Appliance registration and management

Appliance choices use full familiar names with existing icons. Photo replacement and removal preserve typed values and require a fresh review; uploaded labels never populate invented wattage. Camera input uses supported device capture with a file-picker fallback. Editing preserves metadata and validates inputs; deletion now asks for confirmation. Photos remain temporary and only reviewed values are persisted. Browser checks exercise real photo input, blank wattage, confirmed registration, editing, retained values, deletion and refresh.

## 9. Consumption estimates

Existing local calculations use watts × hours/day × quantity × days ÷ 1,000. Daily and 30-day comparisons retain consistent scales; each appliance also shows its selected period. Registered estimates are never forced to equal the meter bill. The fixed fallback rate is removed from public estimates. Approximate costs require an actual saved bill and are explicitly based on amount divided by kWh, including fees rather than an official tariff. Without a bill, energy estimates remain available. Assistant replies no longer assign a sample air-conditioner load or cost to the household.

## 10. Personalized local guidance

Tips now create and refresh immediately from reviewed local records, including while offline. Removed simulated delay, timeout and rate-limit outcomes. Advice names only registered devices, explains the input basis and limitations, and preserves a saved snapshot until an explicit refresh. Changed inputs show a freshness warning. The bill-review threshold matches the dashboard’s 20% threshold. Guidance avoids guaranteed savings and reducing essential refrigeration. Rule and browser checks cover relevance, stale records, offline refresh and persistence.

## 11. Provider advisories

Screenshot and pasted-text reviews preserve the original and provide editable provider, areas, schedule, restoration wording and reason. Custom providers now validate and persist consistently with household and bill entry. Screenshot saves require a deliberate choice to retain the original on this device; temporary uploads are not automatically persisted. Household matching remains qualified as Affected, Possibly Affected or Not Listed, with no live-status claim. Existing correction, history, source access and confirmed removal are retained. Direct incoming app sharing is unavailable; the UI supplies the screenshot-save/upload fallback without adding a backend endpoint. Browser checks cover actual uploads, consent, text saves, clear/ambiguous matching, correction and refresh.
