# Appliance Popup and Offline Chat Plan

**Goal:** Keep the appliance entry popup inside phone screens, show a saved-appliance popup after the form, and let chat prepare validated changes while offline.

**Design:** Use the existing blue/white app palette, readable labels and consistent touch targets. Keep the appliance selector contained, allow the form to scroll vertically, and keep the save actions reachable. After a successful save, show the appliance name and monthly estimate with Done and Add another. Do not show success when storage fails.

**Architecture:** Retain native dialogs and the existing household store. Add a deterministic local command parser that produces the same validated action cards as Gemini. Ask for missing numbers and accept short follow-ups; never invent bill amounts or appliance watts. Confirm is required for every saved change. Give chat a visible offline status, concise fallback notices and readable action cards. Use the parser on both the client and server fallback paths; the public visitor chat stays informational.

**Tech stack:** React, TypeScript, browser storage, Gemini REST, Node tests, Playwright and esbuild already installed in the temporary scanner-tools directory.

- [x] Reproduce the appliance overflow and missing save popup in browser regressions at 320/390/768/1440px.
- [x] Contain the selector's fieldset sizing, refine form spacing/actions, and add the saved-appliance dialog.
- [x] Add failing tests for offline budget/subsidy/appliance/bill commands, incomplete requests and follow-ups. Implement bounded parsing with the existing validators.
- [x] Wire local action replies into offline/network/provider fallback, add cancellation/timeouts and reset pending requests with a new chat. Improve chat state and confirmation UI.
- [x] Run unit and browser regressions, check keyboard/focus/mobile screenshots, TypeScript and production build. Request focused independent review.

No production dependencies, auth/database changes or automatic saves. Publish to production after verification, as requested by the user.

Validation: 244 unit tests pass with serial file execution. The existing 100 ms SMTP socket test failed once during concurrent build/test load and passed separately and in the complete serial run. Fourteen light-mode browser scenarios cover widths, success focus, storage failure, household switching including delayed photo decoding, missing/invalid follow-ups, provider fallback, expired auth, reset cancellation and duplicate confirmation. Two dark-mode scenarios cover the phone popup and multi-action chat. Live Gemini checks passed for a budget change and combined appliance/budget request; an incomplete appliance request now asks for watts before making a model call.

Independent review findings were corrected and rechecked: decimal token boundaries, mixed budget/subsidy targets, retained invalid follow-ups, due dates excluded as billing months, and household isolation for both confirmation state and pending photo decoding.

TypeScript verification and the final production build passed. The build reports the repository's existing missing ESLint configuration warning.
