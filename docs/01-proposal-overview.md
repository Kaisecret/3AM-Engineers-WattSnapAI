# Proposal overview

Source: [WattSnap_AI_Proposal.docx](../WattSnap_AI_Proposal.docx), team 3AM Engineers. This is a structured summary rather than a verbatim conversion. Engineering additions are identified in the decision register.

## Purpose and problem

Households can see their final bill and total kWh but may struggle to explain consumption changes, estimate appliance contributions, or choose useful energy-saving actions. Provider advisories also require households to interpret affected places, schedules, and restoration information. WattSnap AI brings these tasks into one household assistant that retains previously saved information offline.

The proposal uses Panay blackouts, school disruption, business losses, typhoon restoration, and population figures as local motivation. Those historical figures are source-document claims; this documentation does not independently validate them.

## Audience and account model

Household electricity consumers, initially validated in Antique using ANTECO records. The hackathon follows one account, one household. Location permission is optional. Users must confirm a suggested provider or choose one manually. Expansion may cover AKELCO, CAPELCO, ILECO I–III, and MORE Power after verifying coverage.

## Main user journey

1. Create an account and household profile; enter a saved location and confirm a provider.
2. Upload or photograph a bill; review and correct extracted fields before saving.
3. View confirmed bills, monthly consumption, and consumption changes.
4. Register appliances manually or scan their nameplate; confirm wattage and usage assumptions.
5. Review calculated appliance estimates, generate Tipid Tips, simulate alternatives, and set a budget.
6. Upload, share where supported, or paste an official provider advisory; review its interpretation and location match.
7. Use Brownout Ready Mode for relevant advisories and revisit saved information without a connection.

## Required capabilities

All 12 proposal features have a [dedicated specification](features/README.md). Authentication is a supporting foundation for the requested Supabase implementation, not an additional numbered proposal feature.

Gemini reads bill images, appliance labels, and advisory screenshots/text, extracts structured information, and generates explanations or recommendations. Application logic handles arithmetic, comparisons, provider lookup, location matching, graphs, and local records.

## Boundaries

- Appliance values, simulation savings, and budget forecasts are estimates, not measured appliance usage or official utility charges.
- Original provider advisories remain the official reference; a location match does not confirm live electricity availability.
- New Gemini processing requires internet access. Offline access covers information already saved, plus local calculations.
- No automatic utility scraping, smart-meter integration, guaranteed push notification delivery, payments, multi-household administration, or provider control is promised by the proposal.

## References listed in the proposal

- Philippine Statistics Authority (2025), Region VI population highlights from 2024 POPCEN.
- GMA Integrated News (3 January 2024), business losses during the Panay outage.
- Philippine News Agency (3 January 2024), 284 public schools suspending classes.
- Philippine Daily Inquirer (13 January 2024), Iloilo losses during the three-day outage.
- Philippine News Agency (12 November 2025), restoration across 537 Antique barangays.
- GMA News Online (26 August 2026), rotating brownouts in Visayas.
- Department of Energy (15 September 2026), long-term Panay power security plan.

The original document jumps from section V to IX. No missing sections have been invented.
