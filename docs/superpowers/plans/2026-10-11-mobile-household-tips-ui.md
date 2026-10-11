# Mobile household setup and tips

Goal: shorten the screens shown in the user's screenshots and bring useful controls into view on phones.

Visual thesis: calm pale-blue surfaces, a single clear form, compact progress and existing WattSnap mascots. Keep readable text, 16px inputs and touch targets of at least 44px.

Content plan: household setup starts with progress and fields; remove the duplicate introductory notices and mobile story panel. Use short headings, one optional location action, concise provider choices and a compact review. Tips start with saved-record counts and the create action; remove the repeated marketing hero, shorten empty and freshness messages, and make setup review a small contextual row.

Interaction thesis: preserve current keyboard focus and form validation, keep selected providers clearly visible, and retain restrained focus/press transitions with reduced-motion support.

- [x] Update `HouseholdSetupScreen.tsx` and scoped rules in `onboarding/accessibility.css`: shorter utility copy and mobile form, provider and review layouts; preserve address suggestions, validation and save behavior.
- [x] Update `TipsScreen.tsx`, `TipsSetupReview.tsx`, `SetupResumeLink.tsx` and their styles: remove redundant copy and compact the hierarchy without changing tip generation or setup completion rules.
- [x] Verify 320px, 390px, 768px and 1440px layouts, all household steps, custom provider/edit/save/reload, optional location dialog, tips creation and saved setup review. Check TypeScript, unit regressions and production build; inspect screenshots.

No database, authentication or deployment changes are required. Work stays local until the user requests release.

Validation completed: production build, TypeScript and all 302 unit tests passed. Browser checks passed at all four widths for required-field validation, optional location dialog, custom provider names in review, editing, saving/reloading, tip creation/review and stale-input state. Existing production offline checks passed, including all fourteen screens, all thirty cached images, local chat and logout. Screenshots were inspected on mobile and desktop. Independent mobile review passed for dialog focus, 44px edit controls and failed review saves/retry; no overflow, browser errors or remaining findings.
