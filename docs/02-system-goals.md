# System goals and acceptance outcomes

These goals cover every capability described in the proposal. IDs are used in feature files so reviewers can trace requirements.

| Goal | Outcome to demonstrate | Feature |
| --- | --- | --- |
| G01 Household context | One account maintains one private household profile, location, and selected provider. | F01, foundation |
| G02 Provider selection | Optional location permission suggests likely providers; denial and unknown coverage retain manual selection. | F01 |
| G03 Bill extraction | Bill scan returns supported period, amount, due date, and kWh fields for correction before confirmed save. | F02 |
| G04 History and visibility | Confirmed bill records support monthly kWh and amount graphs and comparisons without mixing estimates. | F03 |
| G05 Appliance registration | Icon-assisted/manual entry and nameplate scanning support user-confirmed appliance details. | F04 |
| G06 Explain appliance use | Deterministic calculations use wattage, quantity, hours, and days and clearly label estimated kWh. | F05 |
| G07 Detect changes | Comparable bill periods show increases/decreases and explain insufficient or unsuitable comparison data. | F06 |
| G08 Practical savings advice | Gemini recommendations reference verified household inputs and remain readable after saving offline. | F07 |
| G09 Interpret advisories | Screenshot/text intake extracts available schedules, areas, type, reason, and restoration information while retaining the original. | F08 |
| G10 Match household location | Results distinguish Affected, Possibly Affected, and Not Listed, with uncertainty explained. | F08 |
| G11 Offline continuity | Saved bills, appliances, calculations, graphs, tips, advisory summaries, and reminders work after initial caching. | F09 |
| G12 Compare decisions | Watt-If compares baseline and changed appliance usage, estimated kWh, and potential savings. | F10 |
| G13 Plan a budget | Monthly kWh or PHP targets show remaining allowance and forecast status with their assumptions. | F11 |
| G14 Prepare for outages | Relevant processed advisories produce a schedule, duration, countdown, and preparation checklist offline. | F12 |
| G15 Expand responsibly | Initial ANTECO validation can extend to other providers using verified, versioned coverage records. | F01, F08 |
| G16 Keep AI accountable | Missing values remain unknown, drafts require review, calculations are deterministic, and official sources remain accessible. | F02, F04–F08, F10–F12 |
| G17 Protect household information | Accounts cannot read another household's records or private uploads; sign-out clears private local caches. | All |
| G18 Deliver efficiently with four developers | Feature owners work through agreed contracts, small reviewed PRs, automated checks, and separated environments. | Team and CI/CD plans |

## Success measures for the first complete demo

- Each feature's acceptance checklist passes with synthetic or consented, redacted fixtures.
- The calculation 1,000 W × 8 hours × 30 days ÷ 1,000 produces 240 kWh; changing to 5 hours produces 150 kWh and 90 kWh saved.
- A budget of 180 kWh with estimated use of 142 kWh shows 38 kWh remaining. Risk depends on the period and forecast, not merely this subtraction.
- A 13:00–17:00 Asia/Manila advisory produces four hours estimated duration and a correct countdown using a fixed test clock.
- Offline reload displays all saved feature outputs after the first successful online visit.
- A second account is denied access to the first account's records and uploads, including direct requests.
- A failed required CI check prevents merge; a failed migration prevents application promotion.

## Longer-term outcomes

The intended household benefits are clearer consumption decisions, useful savings guidance, and better preparation for interruptions. Actual reductions in household bills or outage impacts require user research and measured evidence; they are not guaranteed by delivering the software.
