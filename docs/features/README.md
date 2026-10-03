# Feature specifications

Every numbered core feature from the proposal has its own file. Each file defines scope, inputs/outputs, dependencies, future module files, and acceptance criteria. Module paths describe future code and have not been created.

| ID | Feature | Owner | Depends on |
| --- | --- | --- | --- |
| Foundation | [Authentication and household isolation](00-authentication-foundation.md) | Dev 1 | Shared contracts |
| F01 | [Household profile and provider selection](01-household-profile-provider.md) | Dev 1 | Foundation |
| F02 | [AI electricity bill scanner](02-ai-bill-scanner.md) | Dev 2 | F01, Gemini adapter |
| F03 | [Bill history and dashboard](03-bill-history-dashboard.md) | Dev 2 | F02 |
| F04 | [Appliance registration and scanner](04-appliance-registration-scanner.md) | Dev 3 | F01, Gemini adapter |
| F05 | [Appliance consumption estimator](05-appliance-consumption-estimator.md) | Dev 3 | F04 |
| F06 | [Consumption change detection](06-consumption-change-detection.md) | Dev 2 | F03 |
| F07 | [Personalized Tipid Tips](07-personalized-tipid-tips.md) | Dev 4 | F03, F05, F06 |
| F08 | [Advisory intelligence and matching](08-advisory-intelligence-location-matching.md) | Dev 4 | F01, Gemini adapter |
| F09 | [Offline access and synchronization](09-offline-access.md) | Dev 1, all owners | Shared contracts; integrated incrementally |
| F10 | [Watt-If simulator](10-watt-if-simulator.md) | Dev 3 | F05 |
| F11 | [Smart energy budget](11-smart-energy-budget.md) | Dev 3 | F03, F05 |
| F12 | [Brownout Ready Mode](12-brownout-ready-mode.md) | Dev 4 | F08 |

F09 is a cross-cutting foundation, not a final feature bolted onto completed modules. All owners implement saved local views for their own records.
