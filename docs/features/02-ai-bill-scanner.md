# F02 — AI electricity bill scanner

Owner: Dev 2. Reviewer: Dev 3. Goals: G03, G16, G17.

## Behavior

Accept camera capture or image upload, call Gemini server-side, and return available billing period, amount due, due date, and kWh. Show the original beside editable extracted fields. Require explicit user review and confirmation before saving. Support manual entry when scanning is unavailable.

Never replace missing values with zero or infer unsupported charges. Preserve warnings about unreadable fields. Flag a duplicate household/provider/billing period for review rather than silently adding or replacing it.

## Interfaces and dependencies

Consumes HouseholdContext, validated image, and Gemini adapter. Produces BillDraft, then ConfirmedBill for history/change/tips/budget. Store a provider snapshot and source reference with the confirmed record. Save is idempotent by operation ID.

## Future files

- `src/features/bill-scanner/components/bill-upload.tsx`: capture/upload.
- `src/features/bill-scanner/components/bill-review.tsx`: correction and confirmation.
- `src/features/bill-scanner/schemas.ts`: draft and confirmed input validation.
- `src/features/bill-scanner/service.ts`: extraction/review/save orchestration.
- `src/app/api/ai/bills/route.ts`: authenticated server entry.
- `tests/e2e/bill-confirmation.spec.ts`: no persisted bill before confirmation.

## Offline and errors

New extraction requires connectivity. Preserve an unsaved local draft when possible and offer manual entry. Previously confirmed bills remain available offline. Handle oversized/invalid files, timeouts, malformed AI output, missing fields, duplicate save retries, and unauthorized originals.

## Acceptance

- [ ] Draft fields can be corrected; scan completion alone creates no confirmed bill.
- [ ] Required confirmed inputs reject impossible dates and negative amounts/kWh.
- [ ] Missing optional fields remain unknown; original stays accessible privately.
- [ ] Manual entry succeeds when AI fails.
- [ ] Duplicate/retry saves do not silently create duplicate monthly records.
