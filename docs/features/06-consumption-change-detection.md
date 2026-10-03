# F06 — Consumption change detection

Owner: Dev 2. Reviewer: Dev 3. Goals: G07, G16.

## Behavior

Compare consecutive comparable confirmed bill periods. Show absolute kWh change and percentage change. Recommended initial notable-change threshold is 10% in either direction, subject to product review. Show the threshold and do not imply a statistical anomaly.

Different period lengths require a qualified comparison or a separately labeled daily-normalized view. Missing/overlapping periods must not be described as consecutive monthly changes. No bill change proves appliance causation.

## Interfaces and dependencies

Consumes F03 confirmed history; produces ConsumptionChange for dashboard and Tipid Tips. Previous zero kWh yields an undefined percentage, not infinity. Recompute after bill correction/deletion.

## Future files

- `src/features/consumption-change/calculations.ts`: comparison and qualification.
- `src/features/consumption-change/components/change-summary.tsx`: human-readable result.
- `src/features/consumption-change/calculations.test.ts`: zero baseline and unequal periods.

## Offline and errors

Calculate locally from saved bills. One bill shows insufficient history. Missing period dates show an explicit comparability limitation.

## Acceptance

- [ ] 100 to 120 kWh reports +20 kWh and +20%; 120 to 100 reports −20 kWh and approximately −16.67%.
- [ ] Zero previous consumption never causes divide-by-zero output.
- [ ] Unequal periods and missing months are qualified.
- [ ] Threshold is configurable/documented and does not assert causes.
- [ ] Corrected history refreshes the result offline and online.
