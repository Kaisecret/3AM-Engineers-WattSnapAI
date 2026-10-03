# Four-developer workflow

Use Dev 1–4 until actual names are assigned. Feature ownership gives a primary implementer, not exclusive permission to contribute.

| Developer | Primary ownership | Review partner |
| --- | --- | --- |
| Dev 1 — foundation and integration | Auth, F01 household/provider, shared contracts, Supabase integration, CI/CD, F09 offline adapter | Dev 4 |
| Dev 2 — billing and insight | F02 bill scan, F03 history/dashboard, F06 change detection | Dev 3 |
| Dev 3 — appliance and planning | F04 registration, F05 estimator, F10 simulator, F11 budget | Dev 2 |
| Dev 4 — advice and outage readiness | F07 Tipid Tips, F08 advisory intelligence, F12 Brownout Ready | Dev 1 |

Dev 1 owns offline infrastructure; every developer implements local reads, persistence, and offline states for their own features. Dev 4 helps integration and CI/CD review so Dev 1 does not become the only release operator.

## Parallel work without blocking

1. Agree shared contracts, navigation, account model, and deterministic formulas together.
2. Dev 1 establishes auth, shared adapters, and deployment foundations. Other developers build against synthetic fixtures and public contracts.
3. Dev 2 handles bill review/history while Dev 3 handles appliances and Dev 4 handles advisory intake/matching.
4. Integrate confirmed records, then add tips, simulator, budgets, Brownout Ready, and offline verification.

## Branch and pull request rules

- `main`: production releases; `develop`: integrated staging.
- Feature branches begin from `develop`, for example `feat/f02-bill-scanner` and `feat/f08-advisory-intelligence`.
- Open small PRs to `develop`. Each PR describes behavior, dependencies, verification, and screenshots for visible changes.
- Require one non-author reviewer, all required checks, and resolution of review discussions. Require Dev 1 or Dev 4 for shared integration changes.
- Do not push directly to `main` or `develop`. Configure actual repository protection during implementation.
- Release through a reviewed `develop` → `main` PR after staging acceptance.
- Urgent production fixes branch from `main`, receive review/checks, and are merged back into `develop`.

## Files requiring coordination

App shell, shared contracts, package/lockfiles, integration adapters, and migration order require an issue comment before simultaneous edits. Agree the interface before changing a consumer. Dev 1 serializes migration review, while feature owners propose their changes.

## Daily coordination

A short daily check-in covers completed PRs, next work, blockers, shared-file changes, and integration failures. Use one issue per deliverable with feature ID, owner, reviewer, acceptance checklist, dependencies, and target batch. Keep work in progress to one main feature per developer.

## Definition of done

- Feature acceptance checks pass, including error/empty/offline states relevant to the feature.
- Household authorization works through direct data and upload requests.
- User-confirmed versus AI-draft versus estimated data is clearly separated.
- Contracts and feature documentation match the implementation.
- PR is reviewed, required CI checks pass, and staging smoke checks pass.
- No real household information or secrets enter source control.
