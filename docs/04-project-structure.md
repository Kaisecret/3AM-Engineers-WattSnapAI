# Future project structure

The folders and empty file placeholders have now been created from this responsibility map. They contain no implementation. Configuration, route exports, and workflows must be filled before the app or pipeline can run. The generated-types folder remains empty until types are generated; no database migrations were created.

## Recommended implementation layout

```text
WATTSNAP/
  README.md
  WattSnap_AI_Proposal.docx
  docs/
    01-proposal-overview.md ... 10-decisions.md
    features/                       # One specification per feature
  assets/                           # Source/design assets, not public uploads
    branding/ icons/ illustrations/ screenshots/ references/ sample-data/
  public/
    assets/                         # Approved web-ready public assets only
    icons/                          # PWA installation icons
  src/
    app/
      (auth)/login/page.tsx
      (auth)/signup/page.tsx
      (household)/onboarding/page.tsx
      (household)/dashboard/page.tsx
      (household)/bills/page.tsx
      (household)/bills/new/page.tsx
      (household)/appliances/page.tsx
      (household)/tips/page.tsx
      (household)/advisories/page.tsx
      (household)/simulator/page.tsx
      (household)/budget/page.tsx
      (household)/brownout-ready/page.tsx
      (household)/settings/page.tsx
      api/ai/bills/route.ts
      api/ai/appliances/route.ts
      api/ai/advisories/route.ts
      api/ai/tips/route.ts
      layout.tsx
      manifest.ts
    features/
      auth/
      household-profile/
      bill-scanner/
      bill-history/
      appliance-registration/
      appliance-estimator/
      consumption-change/
      tipid-tips/
      advisory-intelligence/
      offline-access/
      watt-if-simulator/
      smart-energy-budget/
      brownout-ready/
    components/ui/                  # Reusable buttons, inputs, dialogs
    contracts/                      # Shared feature types and validation
    lib/
      supabase/                     # Browser/server clients and authorization helpers
      gemini/                       # Server-only AI adapter
      offline/                      # Account-scoped local database and sync adapter
      config/                       # Environment validation
    generated/                      # Generated database types, never hand-edited
  supabase/
    migrations/                     # Reviewed database changes, created later with CLI
    tests/                          # Isolation and policy tests
  tests/e2e/                        # Cross-feature journeys
  .github/
    workflows/                      # Future CI/CD workflow YAML
    CODEOWNERS                      # Future review routing
    pull_request_template.md        # Future PR checklist
```

## Internal feature file pattern

Each feature contains empty organizational placeholders at the user's request. During implementation, keep files focused and remove unnecessary placeholders.

| Future file or directory | Responsibility |
| --- | --- |
| `index.ts` | Public exports used by routes and other modules |
| `components/` | UI specific to that feature |
| `schemas.ts` | Input/output validation for feature boundaries |
| `types.ts` | Feature-local types; shared meanings live in `src/contracts/` |
| `service.ts` | Application use cases and orchestration |
| `repository.ts` | Authorized remote record access |
| `calculations.ts` | Pure deterministic calculations, where applicable |
| `*.test.ts` | Meaningful unit/component checks alongside their subject |

## Organization rules

- One feature owns its module. Small focused files are preferred over a single file for the entire feature.
- Route and endpoint files delegate to features; keep domain calculations out of pages.
- Cross-feature imports use public exports and shared contracts, avoiding circular dependencies.
- Dev 1 reviews edits to shared contracts, app shell, dependencies, environment configuration, and migrations.
- Keep original design files in `assets/`; publish only reviewed assets through `public/`.
- Private user uploads never belong in `assets/`, `public/`, or Git.
- Current documentation folders map directly to the future module names in each feature specification.
