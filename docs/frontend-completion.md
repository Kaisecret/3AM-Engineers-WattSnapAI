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
| 5 | Local household access and provider | Pending |
| 6 | Bill upload/manual review/draft | Pending |
| 7 | Actual bill history/dashboard/change | Pending |
| 8 | Appliance capture/management | Pending |
| 9 | Appliance estimator | Pending |
| 10 | Deterministic local tips | Pending |
| 11 | Manual advisory review/history | Pending |
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
