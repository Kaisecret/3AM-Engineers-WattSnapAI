# F12 — Brownout Ready Mode

Owner: Dev 4. Reviewer: Dev 1. Goals: G14, G16.

## Behavior

For a reviewed relevant official-provider advisory, present household location, scheduled interruption, countdown, estimated scheduled duration, source link/original, and preparation checklist. Recommended automatic activation applies to Affected matches with a valid future schedule. Possibly Affected asks the user to confirm relevance before activation; Not Listed does not autoactivate.

Checklist: charge phones/power banks, save online work, prepare rechargeable lights, unplug sensitive appliances where practical, and minimize refrigerator opening. Completion is user-controlled and saved locally. Countdown describes the published schedule, not confirmation of a real outage.

## Interfaces and dependencies

Consumes AdvisoryInterpretation and LocationMatch from F08 plus a clock. Produces BrownoutPlan tied to advisory and location revisions. Handle provider restoration updates by showing a changed source and revised schedule; never invent restoration time.

## Future files

- `src/features/brownout-ready/components/readiness-panel.tsx`: schedule/source/checklist.
- `src/features/brownout-ready/calculations.ts`: timezone-aware countdown/duration.
- `src/features/brownout-ready/service.ts`: activation and advisory updates.
- `src/features/brownout-ready/calculations.test.ts`: fixed-clock and unknown-time cases.

## Offline and errors

Saved schedule/reminders remain available offline and countdown updates using device time. Show cached advisory age and warn that restoration updates need connectivity. A missing start time means no countdown; missing end time means duration unknown. After scheduled end, label the schedule elapsed rather than claiming power is restored.

## Acceptance

- [ ] San Jose de Buenavista 13:00–17:00 Asia/Manila shows four hours scheduled duration.
- [ ] Fixed clock produces correct remaining time; past start never shows a misleading future countdown.
- [ ] Ambiguous relevance requires confirmation; Not Listed does not autoactivate.
- [ ] Unknown restoration stays unknown and elapsed schedules do not assert live power status.
- [ ] Checklist completion, schedule, and original saved locally survive offline reload.
