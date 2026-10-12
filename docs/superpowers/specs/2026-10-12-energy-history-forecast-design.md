# Energy history and next-month estimate

Add a next-calendar-month household estimate and a shared history filter to the Energy (`/bills`) screen. Dates use Asia/Manila. Existing appliance estimates retain their input-based formula. Existing Tipid Tips annual forecast work is preserved.

## Calculation

Compute locally from all real saved bills, independent of the viewing filter, so it also works offline. Exclude sample, future, invalid-consumption, duplicate-month and overlapping-period records. Prefer the matching month in the latest complete calendar year (this year or last year). If there are at least three later matching months, adjust once by the median ratio of the latest three matching months. Do not compound changes. One complete year supplies a seasonal baseline, not proof of a recurring pattern.

Without a complete year, average up to three saved bills in the latest three calendar months, requiring three for the average method. With only one or two, repeat the latest bill as an explicitly limited starting estimate. Old incomplete history produces an insufficient-history state. Reliable 20–40 day billing periods are normalized to 30-day use; otherwise monthly totals remain approximate. Multiply by the latest usable bill's recorded amount before subsidy divided by its kWh. Identify that bill and explain that future rates, usage and subsidy can change the actual cost. Do not claim a statistical confidence interval.

Reference for mean and seasonal baseline methods: https://otexts.com/fpp3/toolbox.html#seasonal-na%C3%AFve-method. The median adjustment is an application planning heuristic.

## Screen

Use one compact panel with target month, estimated kWh and pesos, method label and an expandable explanation. Show the estimate after the latest-bill comparison and before the historical chart. With no bills, explain how saving bills enables an estimate.

One accessible select controls the chart, summary statistics and history list: recent six bills (default), all years, this year, last year, and each recorded year. Always offer last year even when empty. Empty periods show a message and a reset action; they never display invented zero months. Preserve newest-bill summary and the forecast's all-history basis. Comparisons use only the selected period. Long charts scroll within the panel and remain keyboard-accessible.

## Verification

Test seasonal matching and adjustment, limited/recent/stale/invalid history, sample/duplicate/future exclusions, periods, rates, year boundaries, filter behavior and immutable inputs. Exercise mobile and desktop browser filtering, empty periods, selected months, changed records, offline reload and dark mode. Run the repository test suite and TypeScript/build checks. No database schema changes or new dependencies.
