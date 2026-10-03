# F05 — Appliance consumption estimator

Owner: Dev 3. Reviewer: Dev 2. Goals: G06, G16.

## Behavior

Calculate estimated kWh for each confirmed appliance and the registered-appliance total using watts × quantity × hours/day × days/period ÷ 1,000. Display the inputs, period, and estimate label. Explain that nameplate wattage and user usage assumptions do not measure cycling, standby draw, or actual metered consumption.

The total covers registered appliances only. Do not force it to equal the official bill or claim the difference identifies a specific appliance.

## Interfaces and dependencies

Consumes ConfirmedAppliance and a valid period. Produces ApplianceEstimate for tips, simulations, and budgets. Calculation is pure application logic and never requires Gemini.

## Future files

- `src/features/appliance-estimator/calculations.ts`: per-appliance and total kWh.
- `src/features/appliance-estimator/components/estimate-summary.tsx`: assumptions and labels.
- `src/features/appliance-estimator/calculations.test.ts`: quantities, zero usage, formula precision.

## Offline and errors

Calculate entirely offline from saved inputs. Reject unknown wattage for numeric estimates and explain what is missing. Display rounded values without accumulating repeated rounding errors.

## Acceptance

- [ ] 1,000 W, one unit, 8 hours/day, 30 days equals 240 kWh.
- [ ] Two identical units double the estimate; zero hours yields zero.
- [ ] Invalid units, negative inputs, and hours above 24 are rejected.
- [ ] Official bill consumption is displayed separately.
- [ ] Saved appliances can be recalculated offline.
