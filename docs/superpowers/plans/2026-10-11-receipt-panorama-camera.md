# Receipt Panorama Camera Plan

**Goal:** Capture long electricity receipts close up in overlapping sections, with a calm camera UI and one reviewed Gemini reading.

**Visual thesis:** A dark camera workspace with cyan frame corners, a top-to-bottom alignment band and readable controls.
**Content:** One-photo and Panorama modes, short capture guidance, numbered section thumbnails, undo and Read receipt; original sections remain available in review.
**Interaction:** Capture feedback, an overlap reference from the previous section and clear progression through up to four sections. Respect reduced motion; do not suggest autofocus or text recognition has occurred when it has not.

**Architecture:** Retain single-photo/PDF behavior. Panorama maps the visible guide to native video pixels and captures a cropped section at camera resolution. Send the ordered originals as separate image parts to Gemini, identify overlap as repeated text, retain the existing null/consistency checks and require review before save. Do not stitch, stretch, auto-save, or invent illegible values. Bound the total prepared upload to 3.2 MB and four images.

- [x] Add failing tests for guide-to-camera pixel mapping, ordered multi-image validation and Gemini requests; implement small helpers.
- [x] Add Panorama camera mode with section preview, overlap alignment, undo, read and cancellation/scope cleanup. Keep Bill and Receipt single-photo modes and manual/upload paths.
- [x] Expose all captured originals in the bill review dialog. Refine the camera layout at phone and desktop sizes.
- [x] Verify single-photo regressions, panorama capture/payload/undo/cancel/household isolation, screenshots, unit suite, TypeScript and production build. Request independent review.

Accuracy depends on legible captures. Keep missing values empty, preserve printed values and surface arithmetic discrepancies. Use the existing Gemini key only on the server. No database changes or added dependencies.

**Verification (2026-10-11):** Full Node test discovery: 269 passed, zero failures; nine live Supabase tests skipped because that command does not load the integration environment. Scanner browser harness: 23 passed, including 320/390/1440 px layouts, ordered image payloads, section limits, preview/undo, cancellation, household isolation and the visible unverified-kWh warning. TypeScript, production build and whitespace checks passed. Independent reviews found no actionable issues, including a compact 320 x 568 px check.

**Real-photo accuracy:** Tested the supplied August and September photos as three overlapping sections with receipt-focused crops. August read correctly: August 2026, 192 kWh, PHP 3,072.60. September read the PHP 418.85 bill, matching subsidy and zero payable correctly, but its blurry kWh remained incorrect (34 versus 33), with unreadable meter readings. Added a visible warning when unreadable meter values prevent checking the extracted kWh; values remain editable and always require review. Do not claim that panorama repairs existing blur or guarantees accurate OCR. Gemini demand errors now use the existing configured fallback, preserving the ordered sections.
