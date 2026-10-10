# Feature status and user guide

Status as of October 2026, checked against the code on `main`. It compares the 12 core features in the proposal (`WattSnap_AI_Proposal.docx`) with what the app shows today, explains how to enter an ANTECO receipt, and describes what to type when adding a device.

## The problem WattSnap solves

An ANTECO receipt shows the total kWh and the amount, for example **192 kWh and ₱3,072.60**. It does not say which appliance used that electricity, whether an increase is normal, or what to change. Working out appliance use by hand means finding each wattage and multiplying watts × hours × units × days. Provider interruption advisories are long, and it is hard to tell whether your own barangay is affected. The January 2024 Panay blackout, the August 2026 load dropping and the 2025 typhoon restorations showed how much households need clear, local information.

## Feature status

✅ works as the proposal describes. 🟡 the screen exists, but part of the proposal is missing.

| # | Feature | Problem it solves | In the app | Status | What is missing |
|---|---|---|---|---|---|
| 1 | Household profile and provider | Not sure which cooperative serves you | Home setup → Household profile | ✅ | – Location button suggests province and town, then matching providers. Manual and custom providers work. |
| 2 | Bill scanner | Typing and keeping fading paper receipts | Snap AI | 🟡 | Gemini is not connected. The photo is kept as a reference and the user types the values. |
| 3 | Bill history and dashboard | Old receipts get lost, months are hard to compare | Home, Energy | ✅ | – |
| 4 | Appliance registration | The bill does not say which device costs the most | Appliances → Add device | 🟡 | Icon types and manual entry work, with typical-watts guidance. AI does not read the nameplate photo. |
| 5 | Appliance estimate | Manual calculation is hard | Appliances | ✅ | – Shows kWh and pesos per device, and how much of the latest bill the devices explain. |
| 6 | Change detection | Increases go unnoticed until the bill is high | Home, Energy | ✅ | – Changes of 20% or more are flagged. |
| 7 | Tipid Tips | Saving advice is generic | Tips | 🟡 | Tips come from fixed local rules, not Gemini. They do target your top devices. |
| 8 | Advisories and location match | Long provider posts, unclear if your barangay is affected | Advisories | 🟡 | Screenshot or pasted text and the Affected / Possibly affected / Not listed match work. The user types the details. No sharing from other apps. |
| 9 | Offline access | Brownouts often cut mobile data too | Whole app | 🟡 | Records stay on the device, but pages need a connection to open. Offline shows a notice. This was a security choice (no signed-in page shown after logout). |
| 10 | Watt-If simulator | Savings are unknown until habits change | Simulator | ✅ | – |
| 11 | Smart budget | Overspending is noticed only when the bill arrives | Budget | 🟡 | Peso budget with On track / near limit / Over budget works. No kWh target, no "days left / at risk" forecast, and device estimates are not used. |
| 12 | Brownout Ready | Families are unprepared when an interruption starts | Brownout Ready | ✅ | – Summary from a saved advisory, countdown and preparation checklist. |

The four AI routes in `src/app/api/ai/` (`bills`, `appliances`, `advisories`, `tips`) are placeholders that only return `{ status: "ok" }`, and no screen calls them. No code calls Gemini yet.

Also in the app but not in the proposal: accounts (email, username or Google, with a 6-digit email code), intro slides after sign-up, the Home setup checklist and completion celebration, the WattSnap AI assistant page (local rules, not Gemini), settings and dark mode.

## Entering an ANTECO receipt

Snap AI → Type it (or Enter bill manually on desktop).

| On the receipt | App field | Example (August 2026) |
|---|---|---|
| Antique Electric Cooperative | Electricity provider | ANTECO |
| Billing Month | Billing month | August 2026 |
| Due Date | Due date (optional) | as printed |
| KWH USED | Energy used | 192 |
| **CURRENT MONTH BILL** | **Current month bill** | 3,072.60 |
| Provincial Electric Power Subsidy | Subsidy (filled in automatically) | 500 |
| Reading dates | Exact billing period (optional) | 07/23/2026 to 08/23/2026 |

- **Use "Current month bill", not "Amount Due".** The app needs the charge before any subsidy or past balance.

### Antique's ₱500 monthly subsidy (PEPS)

Antique's Provincial Electric Power Subsidy covers up to ₱500 of a household's monthly ANTECO bill. The September receipt shows Current Month Bill ₱418.85, subsidy −₱418.85 and Amount Due ₱0.00.

| Where | What the app does |
|---|---|
| Household settings | **Monthly subsidy** is ₱500 for ANTECO households until changed. Enter 0 to turn it off, or another amount if yours differs. |
| Bill form | **Subsidy** fills itself in with the smaller of the monthly subsidy and the bill (₱500 on ₱3,072.60; ₱418.85 on ₱418.85). It can be edited to match the receipt. **You pay** updates as you type. |
| Home, Energy, saved bill | Show the bill and **You pay** (₱3,072.60 → ₱2,572.60). |
| Smart budget | Compares the budget with **what you pay**. The average and history bars use it too. |
| Price per kWh | Uses the **full bill** (₱3,072.60 ÷ 192 = **₱16.00/kWh**). The subsidy is a fixed monthly amount, not a per-kWh discount, so each extra kWh still costs the full price. Subtracting it would make every device and Watt-If estimate too low (₱13.40/kWh). |

Code: `antiquePepsSubsidy`, `monthlySubsidyFor`, `subsidyFor` and `amountPaid` in `src/features/dashboard/preview-data.ts`, tested in `subsidy.test.mjs`. A bill stores `amount` (before subsidy) and an optional `subsidy`; the household stores an optional `monthlySubsidy`.

Not yet: Watt-If and Tipid Tips do not mention that savings stop lowering what you pay once the bill is under ₱500.
- **Check the kWh.** Present reading − previous reading should equal KWH USED (10994 − 10802 = 192).
- **Photo tips for long thermal receipts.** Hold the phone close, lay the receipt flat in good light, and take two photos if it does not fit.

## Adding devices

Appliances → Add device → Enter manually. These are the fields exactly as the app shows them:

| Field | What to type | Example |
|---|---|---|
| Appliance type | Electric fan, Air conditioner, Refrigerator, Television, Rice cooker, Washing machine, Lighting, Computer, Phone charger, Microwave, Iron, or Other appliance | Electric fan |
| Appliance name | A name you will recognise | Bedroom fan |
| Model (optional) | From the label, if you want | – |
| Rated power + Power unit | The watts on the label. Units: W, kW, VA, V | 60 W |
| Where did the wattage come from? | Rated power on the nameplate, or My approximate wattage | Rated power on the nameplate |
| Hours per day | How long it is actually on each day | 8 |
| Quantity | How many of the same device | 1 |
| Days in this period | Starts at 30 | 30 |
| Checkbox | I checked the power, unit, quantity, hours, and days | ✓ |

The app calculates watts × hours × quantity × days ÷ 1,000 = kWh, then multiplies by your bill's price per kWh. The fan above is 14.4 kWh ≈ ₱230 a month at ₱16.00/kWh.

**Finding the watts**

- Look on the sticker or label, the manual or the box for "W".
- If it shows kW, choose kW (1.2 kW = 1,200 W).
- If it shows only volts and amps, multiply them yourself (220 V × 0.5 A = 110 W). Enter the result in W and choose My approximate wattage. The app does not convert V or VA.
- If there is no label, use a typical value and choose My approximate wattage. After you pick a type, the app shows these ranges under Rated power (from `src/features/appliance-registration/typical-use.ts`). It never fills them in for you.

| Type | Typical watts | Hours tip shown in the app |
|---|---|---|
| Electric fan | 45–75 W | – |
| Air conditioner (1–1.5 HP) | 750–1,500 W | Inverter models often use less than the label. |
| Refrigerator | 100–200 W | It switches on and off: count about 8–12 hours, not 24. |
| LED television | 40–100 W | – |
| Rice cooker | 500–700 W | Count the cooking time, about 1 hour a day. |
| Washing machine | 300–500 W | Count washing time on laundry days only. |
| LED bulb (Lighting) | 7–12 W | Same bulbs? Add them once and set Quantity. |
| Laptop (Computer) | 45–65 W | A desktop computer usually uses 150–300 W. |
| Phone charger | 5–20 W | – |
| Microwave | 800–1,200 W | Usually under 30 minutes a day (0.5 hours). |
| Flat iron (Iron) | 1,000–1,200 W | Count only the time you iron. |

**What the app does with your devices**

1. Appliances page: ranks your biggest users with kWh, pesos and a % share.
2. It shows how much of your latest bill the devices explain, for example "Your devices explain 41% of your August bill (79 of 192 kWh)". If the devices add up to more than the bill, it asks you to check the hours.
3. Watt-If tries changes on your own devices before you make them.
4. Tipid Tips focus on your top devices.
5. "Register your first appliance" is one of the five Home setup steps.

These are estimates, not meter readings. Fridges and air conditioners switch on and off, so label wattage overstates real use.

**Suggested order:** add your bill first so devices show pesos straight away, then add the big devices (air conditioner, refrigerator, rice cooker, iron), then try Watt-If and read your tips. Add next month's bill to see whether use went down.

## Remaining work

1. **Connect Gemini** to the four existing `src/app/api/ai/` routes. This covers features 2, 4, 7 and 8 together: read bills and nameplates, simplify advisories and write tips.
2. **Budget (feature 11):** add a kWh target, a "days left / at risk" forecast, and use device estimates as the proposal describes.
3. **Offline pages (feature 9):** decide whether signed-in pages should open offline again. The current service worker never caches them, for security after logout.
4. **Share to WattSnap (feature 8):** accept advisory screenshots shared from Facebook or Messenger (needs a web app share target).
5. **Receipt charge breakdown (new idea):** ANTECO receipts itemise every charge; generation alone was ₱1,624.93, 53% of the August bill. A "where your money goes" view needs AI reading first.
