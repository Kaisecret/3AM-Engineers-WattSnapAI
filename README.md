# WattSnap AI

**Understand your electricity use, plan ways to save, and prepare for brownouts.**

WattSnap AI is a planned AI-assisted electricity assistant for households. It brings electricity bills, appliance consumption estimates, energy-saving advice, and provider advisories into one place, with offline access to previously saved information.

## The problem it solves

An electricity bill tells a household how much energy it used and how much it owes, but it does not always explain why consumption changed or what the household can do about it. Families may struggle to identify which appliances contribute most to their usage, estimate the effect of changing daily habits, or plan around a monthly electricity budget.

Brownout advisories create another challenge. Households need to interpret affected locations, interruption schedules, and restoration updates to understand whether an advisory applies to them and how to prepare. When internet connectivity is unavailable, that information can be harder to access.

WattSnap AI aims to turn these records into practical decisions: understand consumption, compare possible savings, manage a budget, and prepare for announced power interruptions.

## How WattSnap AI helps

| Household need | Planned solution |
| --- | --- |
| Record electricity bills more easily | Scan a bill with AI, then review and correct extracted details before saving. |
| Understand consumption changes | View bill history, monthly graphs, and comparisons between suitable billing periods. |
| Estimate appliance energy use | Register appliances manually or scan their labels, then calculate estimated usage from wattage and usage habits. |
| Find practical ways to save | Get personalized **Tipid Tips** based on confirmed household information. |
| Compare changes in daily habits | Use the **Watt-If simulator** to estimate changes in consumption and potential savings. |
| Plan around a monthly target | Set a **Smart Energy Budget** in kWh or pesos and compare estimated usage with that target. |
| Understand provider advisories | Upload a screenshot or paste advisory text to extract schedules and affected areas and compare them with the household's saved location. |
| Prepare for scheduled interruptions | Use **Brownout Ready Mode** for a schedule, estimated duration, countdown, and preparation checklist. |
| Revisit information without internet | Access saved bills, appliance estimates, tips, advisory summaries, and reminders offline. |

## Who it is for

WattSnap AI is designed for household electricity consumers, with one account per household. Initial validation focuses on Antique using ANTECO bills and advisories. Expansion to other Panay providers is planned after their coverage information has been verified.

## How it works

1. Create a household profile, save a location, and confirm an electricity provider.
2. Scan an electricity bill and check the extracted information before saving.
3. Review bill history and consumption changes.
4. Add appliances and their typical usage to estimate their contribution.
5. Explore Tipid Tips, compare Watt-If scenarios, and set an energy budget.
6. Import a provider advisory, review its relevance, and prepare for a scheduled interruption.
7. Revisit saved information when offline.

## The role of AI

Google Gemini is planned for reading bill images, appliance labels, and advisory screenshots or text, and for generating explanations and savings suggestions. The application handles calculations, comparisons, graphs, and saved records.

Users review AI-extracted information before saving it. Appliance consumption, simulated savings, and budget forecasts are estimates; original bills and provider advisories remain the official references. New AI processing requires internet access, while offline access covers saved information and local calculations.

## Project status

WattSnap AI is currently in the planning and scaffolding stage. This repository contains documentation, asset folders, and empty application placeholder files. The planned features have not yet been implemented, and the application is not runnable yet.

The planned stack includes **Next.js**, **Supabase**, and **Google Gemini**, delivered as an offline-first **Progressive Web Application (PWA)**.

## Project documentation

- [Original proposal](WattSnap_AI_Proposal.docx)
- [Proposal overview](docs/01-proposal-overview.md)
- [System goals](docs/02-system-goals.md)
- [Feature specifications](docs/features/README.md)
- [Architecture](docs/03-architecture.md)
- [Project structure](docs/04-project-structure.md)
- [Shared contracts](docs/05-shared-contracts.md)
- [Four-developer workflow](docs/06-four-developer-workflow.md)
- [CI/CD plan](docs/07-ci-cd-pipeline.md)
- [Delivery roadmap](docs/08-delivery-roadmap.md)
- [Quality and security](docs/09-quality-security.md)
- [Project decisions](docs/10-decisions.md)
- [Assets guide](assets/README.md)
