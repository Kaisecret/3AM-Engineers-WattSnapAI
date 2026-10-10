# Frontend acceptance checks

`frontend-completion.cjs` verifies the completed local-data workflows using isolated Chromium contexts and synthetic records. It does not access your personal browser storage or call the AI API. Playwright is supplied externally through `PLAYWRIGHT_MODULE`, so application dependencies remain unchanged.

```powershell
$env:PLAYWRIGHT_MODULE = 'C:/path/to/node_modules/playwright'
$env:UI_PREVIEW_URL = 'http://127.0.0.1:3001'
node tests/e2e/frontend-completion.cjs
node tests/e2e/frontend-completion.cjs content chart responsive offline polish
```

Run a fresh production build and `npm.cmd run start -- --hostname 127.0.0.1 --port 3001` before offline checks. The service worker prepares the public shells after successful online setup. Hardware camera denial is mocked; a physical phone camera and GPS require device review.

The default checks cover branding, empty states, local household access, custom providers, bill input/drafts/duplicates, history, appliances, energy estimates, offline tips, advisory originals and matching, storage failures, accessibility, camera fallback, the simulator, local assistant and preparation plans. Additional checks cover marketing accuracy, chart labels, fourteen pages at five widths, and ten cold offline routes. The shell integrity tests check stalled networks, incomplete new builds and requests that must bypass the cache.

The older `*-preview.cjs` scripts and `.spec.ts` placeholders preserve the previous prototype's reference coverage. Several expect sample buttons, simulated public sign-in or fictional advisory galleries that were deliberately removed. They are not the acceptance suite for the completed workflows. Their substantive local scenarios are covered by the completion suite and feature rule tests; do not report those historical scripts as passing without updating their obsolete assumptions.

Feature rule tests run with:

```powershell
$featureTests = @(rg --files src/features -g '*.test.mjs')
node --test @featureTests tests/offline-shell.test.cjs
npx.cmd tsc --noEmit
node scripts/check-frontend-boundaries.cjs
```

The existing `npm.cmd run lint` command opens ESLint setup and exits with status 1 when run noninteractively because this repository has no ESLint configuration/dependency. This is an existing verification blocker, not a passing lint result. No dependency or deployment configuration is added to bypass it.
