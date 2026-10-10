# Scanner First Implementation Plan

**Goal:** Open the scanner before review and improve receipt capture and Gemini reading.

**Architecture:** Keep ScanScreen as the flow owner; separate camera sizing into a small pure module. Keep the existing server Gemini adapter and bill normalization, with stronger image input and unreadable-field handling.

**Tech Stack:** Next.js, React, TypeScript, browser MediaDevices/canvas, Gemini REST, Node tests and Playwright.

## Constraints

- Work in the current IDE checkout on `fix/scanner-first-receipt-reading`.
- Retain household isolation and authenticated server endpoints.
- Never persist a bill before review and confirmation; never persist photos in session draft storage.
- No new production dependencies.

## Tasks

- [x] Add failing browser regression for a stored draft opening the form. Keep scanner visible, add explicit Resume draft, and verify recovered fields remain editable.
- [x] Add failing camera geometry/readiness tests. Implement `cameraImageSize(width, height, maxWidth, maxHeight)` for contain sizing; align guide/video and capture originals. Verify bill and receipt guides at phone and desktop sizes.
- [x] Add failing browser tests for failed/empty Gemini reads and cancellation. Add retry state and prevent stale requests opening review; verify successful capture/upload does open review.
- [x] Add failing normalization tests for explicitly unreadable values and incomplete dates. Preserve nulls rather than derive unreadable totals/kWh; avoid silently changing subsidy. Request high image resolution and preserve uploaded text detail within payload size limits.
- [x] Run scanner and Gemini unit tests, the scanner browser regression, `npm test`, `npx tsc --noEmit`, and `npm run build`. Inspect mobile/desktop screenshots. Report live Gemini verification separately from controlled browser tests.

## Verification results

- `npm test`: 226 passed, zero failures.
- `node tests/e2e/scanner-first.cjs`: 15 browser scenarios, including successful capture/upload, recovered drafts, failed/empty readings, cancelled PDF validation, missing subsidy and discard-dialog behavior at 320/390/1440px. The dialog verifies equal action widths, spacing, safe initial focus, Escape/Keep preservation and explicit removal.
- `npx tsc --noEmit`: passed.
- `npm run build`: passed on the final production source.
- `git diff --check`: passed.
- Independent review additionally reproduced and verified household-switch cancellation of delayed PDFs and manual cancellation of delayed image decoding.
- Camera, failed-scan, review and discard-dialog screenshots inspected.
- Follow-up discard UI: separate description and action spacing, equal-width buttons, stacked mobile actions, destructive-action color, accessible dialog description and dark theme styles. Independent review verified modal focus containment and Escape focus restoration; the two light-theme text contrast findings were corrected to 4.99:1 and 5.54:1. The three dialog browser checks passed again after the color correction.
- Follow-up: the configured Gemini key was validated, and the user's original September ANTECO JPEG was sent through the actual `extractBillWithGemini` adapter. Gemini 3.5 Flash matched September 2026, current bill 418.85, subsidy 418.85, payable 0 and due date 2026-09-29. It incorrectly returned 35 kWh (expected 33), and the reading-period/meter digits were unreliable. The first request received a temporary 503; a retry succeeded.
- Experimental comparisons on the same original photo: Gemini 3.8 Flash also returned 35 kWh; per-part ultra-high resolution on 3.5 Flash returned 34. Neither experiment was applied to production. These results do not establish accurate OCR for small, blurred receipt text. The UI continues to require review before saving.
- The user's original August ANTECO JPEG was then live-tested with the production Gemini 3.5 Flash adapter (9.9 seconds). It correctly returned 192 kWh, current month bill 3072.60, billing month 2026-08, statement date 2026-08-23, reading period 2026-07-23 to 2026-08-23, previous meter reading 10802 and present reading 10994. All six charge totals matched the visible print. Due date, subsidy and payable were correctly left null because the bottom of the receipt is cropped out.

## Browser regression tools

The browser regression uses esbuild and Playwright from a temporary directory, with no production dependency changes. On PowerShell:

```powershell
npm install --prefix "$env:TEMP\wattsnap-scanner-tools" --no-audit --no-fund --no-package-lock esbuild playwright
node tests/e2e/scanner-first.cjs
```

It uses installed Chrome, mounts the real scanner and storage hooks, and controls only Next routing and external AI responses. Screenshots are written to `$env:TEMP\wattsnap-scanner-regression`.

Image/PDF resolution settings follow [Google's Gemini media resolution documentation](https://ai.google.dev/gemini-api/docs/generate-content/media-resolution). Live OCR results are reported separately from controlled browser tests above; a configured key and a successful response do not establish receipt accuracy.
