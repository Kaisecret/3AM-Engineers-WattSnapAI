# F10 — Watt-If energy simulator

Owner: Dev 3. Reviewer: Dev 2. Goals: G12, G16.

## Behavior

Create a scenario from saved appliance inputs. Adjust watts, quantity, hours/day, days/period, or substitute appliances, then compare baseline and scenario kWh using F05's exact formula. Support reduced air-conditioner hours, LED replacement, and partial fan substitution. Display negative savings as increased consumption.

Scenarios do not change registered appliances unless the user explicitly applies changes through a separate confirmed edit. Optional PHP estimates require an explicit rate and remain approximate.

## Interfaces and dependencies

Consumes ConfirmedAppliance and F05 calculation interface. Produces SimulationResult including period and assumptions. Both sides use equal comparison periods; scenario originals retain a baseline revision.

## Future files

- `src/features/watt-if-simulator/components/scenario-editor.tsx`: adjustments/substitutions.
- `src/features/watt-if-simulator/calculations.ts`: baseline/scenario differences.
- `src/features/watt-if-simulator/calculations.test.ts`: proposal example and replacements.

## Offline and errors

Run entirely locally with saved/manual inputs. Validate unit and duration limits. If source appliances changed, show that the stored baseline is stale before presenting comparison.

## Acceptance

- [ ] 1,000 W at 8 versus 5 hours/day for 30 days shows 240 versus 150 kWh and 90 kWh saved.
- [ ] 100 W versus 12 W bulbs use the same quantity/hours/period for comparison.
- [ ] Scenario edits leave original appliance records unchanged.
- [ ] Higher consumption produces a negative savings value with a clear explanation.
- [ ] Offline simulation works; PHP output is absent when no rate basis exists.
