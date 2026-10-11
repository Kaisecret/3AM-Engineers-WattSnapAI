# Installed offline app and household parsing

Goal: after one successful online visit, reopen the installed app offline and use saved household records and local calculations across its screens. Answer complete saved-data requests immediately, including several questions in one message.

Design: reuse existing screens inside a public, data-free `/offline-app` document. Precache that document and its build-specific scripts/styles before reporting offline readiness. Network-first navigation retains server authentication online; failed navigations use the generic shell. Never cache private HTML, RSC responses, APIs, tokens, or authenticated redirects. Restore only the last persisted display identity for device-local data access offline. Account changes/sign-out remove that scope; reconnecting loads the normal protected page.

Visual thesis: retain the current app layout, with a quiet readiness/status line and a clear saved-data badge in chat. No new branding or decorative panels. Existing motion respects reduced motion.

Parsing: expand a shared deterministic household query module for budget, bill history and specific periods, totals/comparisons, due dates, subsidies/rates, appliance lists/estimates, profile/provider, saved tips, scenarios, advisories and readiness. English and Filipino aliases; multiple questions combine into one response. Explicit writes retain validated confirmation cards. Unknown/ambiguous requests never invent values; online Gemini remains available for unsupported requests.

- [x] Add failing service-worker/offline-identity tests, implement generic shell caching and scoped restoration, reconnect/sign-out behavior and offline navigation.
- [x] Add failing broad query tests, implement shared parsing and full saved-record context without truncating local history.
- [x] Route recognized requests immediately through local parsing online/offline; improve suggestions, status and stale/storage-error disclosure.
- [x] Verify production offline close/reopen/navigation, local chat with zero AI requests, saved edits/reload, scope/sign-out, regressions, TypeScript and build. Independent review.

Scope: reuse existing device-local storage. No database changes, invented cloud sync or offline Gemini/image recognition. New external information and photo extraction require connectivity. Browser storage eviction or blocked caching must show an honest preparation/storage message.

Verification completed on 2026-10-11:

- Full Node suite: 292 passed, zero failures or skips.
- Production build and TypeScript: passed.
- Appliance/chat browser regression: 15 scenarios passed, including online saved-data replies with zero AI calls and confirmed offline edits.
- Scanner browser regression: 23 scenarios passed.
- Production offline browser: four scenarios passed at 320px, 390px and 1440px, plus an unreachable server with the browser still reporting online. Covered close/reopen, 14 app routes, image assets, local chat, saved edits/reload, household switching, reconnect authentication and expired-session offline logout.
- Independent review found no remaining issues. Additional production checks verified navigation and browser Back after logout; five reconnect/account-scope tests passed, including restored browser-history documents.
- `git diff --check`: passed. No environment files or credentials are included in the change.

Implementation was verified on `feat/offline-app-wide-parser` before production release. The user authorized integration into `main` and production deployment after the offline artwork follow-up was completed.

## Follow-up: complete offline artwork

The user also requested cached logos, mascots and pictures throughout the app. Keep the existing artwork and layout. Use a public artwork manifest covering each referenced branding image, with optimized raster copies at widths suited to their display, plus original SVG backgrounds, WebP backgrounds and installation icons. Complete artwork caching before publishing the ready shell; failed image downloads leave preparation incomplete and retry on reconnect. Resolve uncached responsive image sizes from the saved copy of the same illustration.

- [x] Add failing worker tests for unopened artwork, image-size fallback and incomplete preparation; check the manifest covers referenced images.
- [x] Add `public/offline-artwork.json`, update `public/sw.js` preparation and image fallback, and update readiness/controller-change handling.
- [x] Verify fresh-install caching and pictures on unopened screens offline at mobile and desktop sizes, image download failure/retry, unit regressions, TypeScript and the production build.

Follow-up validation: 302 unit tests passed with zero failures or skips; production build, TypeScript and real production offline browser checks passed. All thirty images decoded offline at alternate responsive sizes and original paths, with 2087 KB saved in the artwork cache. Every rendered image loaded across the fourteen saved screens. Mobile home and advisory screenshots were inspected for logo clarity, background rendering and transparent mascots. The browser regression also simulated an image-server outage with real `Vary: Accept` matching: all optimized images and alternate sizes decoded with zero requests to the failing image server. Independent source and production reviews passed after fixing the initial header mismatch: canonical, alternate-size and original-path mascot images decoded during the simulated outage with zero network fetches. No remaining review findings.
