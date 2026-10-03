# F11 — Smart energy budget

Owner: Dev 3. Reviewer: Dev 2. Goals: G13, G16.

## Behavior

Set a household target for an explicit monthly period in kWh or PHP. Show estimated use to date, remaining allowance, days remaining, projected total, and status. Estimated use is based on user-confirmed appliance usage assumptions and supported historical context, not a live meter reading. Do not combine a completed bill total with overlapping modeled consumption.

Recommended forecast: total estimated daily appliance use × elapsed days for modeled use to date, and × period days for projected total. State that the estimate covers registered appliances only. Distinguish completed actual-bill history from the current modeled period. Refine this policy with sample household records before implementation acceptance.

Status: Over Target if estimated use already exceeds target; At Risk if projected total exceeds target; Within Target otherwise. With insufficient inputs, show Insufficient Data. PHP targets require a user-confirmed rate or labeled historical effective rate; utility fixed charges and tariff variations are not fully modeled.

## Interfaces and dependencies

Consumes period/target, F05 estimates, optional F03 historical rate context. Produces BudgetStatus with basis and assumptions. New inputs update forecast and stale state.

## Future files

- `src/features/smart-energy-budget/components/budget-form.tsx`: period/unit/target/rate.
- `src/features/smart-energy-budget/components/budget-status.tsx`: remaining/forecast labels.
- `src/features/smart-energy-budget/calculations.ts`: status and same-unit comparisons.
- `src/features/smart-energy-budget/calculations.test.ts`: forecast and unknown-rate cases.

## Offline and errors

Saved targets and local calculations work offline. Reject nonpositive targets, invalid periods, negative rates, and mixed units. Never infer current measured consumption from elapsed days.

## Acceptance

- [ ] 180 kWh target − 142 kWh estimated use = 38 kWh remaining.
- [ ] Nine days remaining alone does not determine risk; projected total must be calculated.
- [ ] Over-target remaining allowance can be negative and is shown honestly.
- [ ] PHP projections show their approximate rate basis; absent rate means insufficient data.
- [ ] Official history and modeled current usage are separate and not double-counted.
