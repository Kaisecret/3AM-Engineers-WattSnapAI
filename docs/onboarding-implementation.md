# WattSnap onboarding implementation

## Reviewed baseline (phase 1)

The supplied [onboarding proposal](./onboarding-proposal.md) is the acceptance reference. Implementation follows its seven phases; each finished phase gets its own commit and push. The existing four-screen concept remains in `output/design/`.

The application is Next.js 15 / React 19 with existing CSS and Lucide icons. Public `/` is a working landing page; `/signup` and `/login` are interactive UI previews. Auth service/repository files and AI API routes are placeholders, with no backend credentials or password verification. This change preserves that boundary and does not claim browser-selected identities are secure authentication.

### Reuse and integration

| Requirement | Existing source | Integration |
| --- | --- | --- |
| Branding and guidance | `public/assets/branding/` | Reuse original logo and mascot PNGs; add bill, pointing and peace-sign poses from the original character reference. |
| Introduction | New `/intro` and `/welcome` entry | Four responsive screens; persisted slide and completed/skipped state; first visit enters intro, returning identities enter dashboard, returning signed-out users enter login. Preserve the public landing page. |
| Account forms | `features/auth/components/` | Reuse validation, verification/profile UI and Google preview. Record a local preview identity after the existing successful flow; never store passwords or OTPs. |
| Household/location/provider | `/onboarding`, `HouseholdSetupScreen` | Keep this editor and explicit provider review. Checklist links into it; profile and provider count only after successful saves. |
| Bill review | `/bills/new`, `ScanScreen`, `bill-review` | Keep existing review/correction, validation and duplicate handling. Sample records never count as first-bill completion. |
| Appliance review | `/appliances/new`, `ApplianceRegistrationScreen` | Reuse manual/nameplate review and saved quantity/hours. Sample appliances never count as completion; values remain estimates. |
| Tips | `/tips`, `usePreviewTips`, `preview-tips` | Complete only after explicitly reviewing current household-based saved tips with adequate non-sample records. Opening the screen is insufficient. |
| Setup checklist | New `/setup` | Five derived statuses, continue at first incomplete step, all steps accessible in any order, postpone to dashboard. |
| Dashboard | `HomeScreen` greeting | Add Home Setup Progress immediately below greeting. Keep the separate provider-advisory preparation reminder. |
| Persistence | `usePreviewHousehold` and local preview hooks | Scope saved preview records by local identity; preserve anonymous legacy records rather than overwriting or deleting them. Keep progress across logout/login and refresh; guard failed storage. |
| Offline | Existing local records | Keep saved records readable in an open app; explain connectivity for new AI work. Verify offline resume. |
| Accessibility/theme | Existing design tokens and Settings | Light default, optional persisted dark theme for new onboarding/setup surfaces; large controls, keyboard focus, reduced motion, small-screen and zoom checks. |

No existing splash animation asset or sequence was found in source/public assets. The user has been asked for its location; absent a supplied asset, the fallback is a short fade of the unchanged logo with no loading spinner or enforced access delay. Do not fabricate an approved animation.

### Completion rules

1. Household: saved non-empty name and structured municipality/province.
2. Provider: an explicitly selected supported provider saved from household review.
3. First bill: a valid user-confirmed non-sample bill; no fixture/sample completion.
4. First appliance: a valid user-confirmed non-sample appliance including quantity and operating hours.
5. Tips: explicitly acknowledged current saved household recommendations based on valid non-sample records; changing those inputs requires re-review.

Progress derives from records rather than mutable checkboxes. Completion acknowledgment is scoped to the same household/bill/appliance basis, so future invalidation reopens the checklist. Saved data is never removed by ordinary logout.

### Delivery phases

1. Review current architecture, routes and reuse (this document).
2. Build four-screen introduction and resumable navigation.
3. Connect entry, signup, login and returning-user navigation.
4. Build five-step checklist, scoped persistence and completion rules.
5. Add dashboard setup progress and resume action.
6. Refine mascot guidance, responsive styling, motion and theme compatibility.
7. Verify complete flows, data preservation, accessibility and production build; record evidence.

### Baseline evidence

`node --test` over existing `src/features/**/*.test.mjs`: 70 passed, 0 failed. `npx tsc --noEmit`: passed. Existing auth and feature browser scripts are regression checks; new tests must exercise real save/confirm actions, refresh, identity changes and failed storage rather than simply opening routes.

## Implemented refinements (phase 6)

Added consistent bill-holding, pointing and cheerful peace-sign poses using the original mascot as the image reference. Original assets remain unchanged; generation instructions are in `output/design/wattsnap-mascot-pose-prompts.txt`. Intro motion respects reduced-motion preferences. Setup rows keep readable copy and separate large actions on narrow screens. Participating feature editors now offer a Back to home setup link.

Light remains the default. Settings offers a persisted, device-wide dark appearance for intro, account forms and household setup surfaces. Controls remain disabled until their handlers are ready, preventing early clicks during hydration from being lost.

Optional location lookup is explicitly user-triggered after an explanation and browser permission. It sends coordinates rounded to three decimal places to OpenStreetMap Nominatim, fills a suggestion without saving, and requires the existing provider confirmation. Denial, offline access, timeouts and unsupported browsers retain manual entry. The existing example-location path remains. No precise coordinates are persisted. Reference: [reverse geocoding API](https://nominatim.org/release-docs/latest/api/Reverse/) and [service usage policy](https://operations.osmfoundation.org/policies/nominatim/). The public service is suitable for this low-volume preview; production-scale usage needs a geocoding service with an appropriate application-wide quota. Provider boundaries remain labeled unverified preview choices.

The production-only service worker caches public static app shells and their own build assets. Household records remain in local storage. API requests, non-GET requests, third-party geocoding and Next.js RSC responses are not cached. Offline reload/navigation use cached HTML; uncached routes show an offline explanation. Cache installation needs one successful online visit and a supported secure origin. Reference: [Next.js PWA guidance](https://nextjs.org/docs/app/guides/progressive-web-apps) and [MDN service-worker guidance](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers).

Validation: production build and TypeScript pass. Browser checks cover keyboard heading focus, reduced motion, 320–1440px setup widths, doubled text, large controls, persisted light/dark choice, synthetic location lookup without saving, and production offline reload/navigation/reconnect. Full setup flow passes real saves in a different order, failed storage, explicit tips review, refresh, account isolation, legacy-record preservation, dashboard progress and ordinary logout/login.
