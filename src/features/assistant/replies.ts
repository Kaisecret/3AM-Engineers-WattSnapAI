/**
 * Rule-based replies for the WattSnap AI preview. No model is connected yet, so
 * answers come from the household's saved records and the product description.
 */
export interface ChatLink { label: string; href: string; }
export interface Reply { text: string; links?: ChatLink[]; suggestions?: string[]; }
export interface ChatBill { month: string; kwh: number; amount: number; dueDate?: string; }
export interface ChatContext {
  name?: string;
  latest?: ChatBill;
  previous?: ChatBill;
  budget?: number;
  rate?: number;
  topAppliance?: { name: string; monthlyKwh: number };
  applianceCount?: number;
  location?: string;
  advisory?: { title: string; when: string; area: string; reason: string };
}

export const householdSuggestions = ["Why did my bill change?", "How can I save on aircon?", "Any brownout today?", "Which appliance uses the most?"];
export const landingSuggestions = ["What is WattSnap?", "How does bill scanning work?", "Does it work offline?", "Which areas are covered?"];

const peso = (value: number) => `₱${value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const monthLabel = (month: string) => new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`));
const has = (text: string, pattern: RegExp) => pattern.test(text);

const patterns = {
  greeting: /^(hi|hello|hey|yo|good (morning|afternoon|evening)|kumusta|musta)\b/,
  thanks: /\b(thank|thanks|salamat|ty)\b/,
  scan: /\b(scan(?:ning)?|snap|upload|photo|picture|camera)\b/,
  brownout: /brownout|outage|interruption|advisor|power (cut|out|off)|blackout|walang kuryente/,
  aircon: /air ?con|aircon|\bac\b|cooling|split.?type/,
  budget: /budget|target|limit/,
  appliances: /appliance|uses? the most|biggest|which (device|gadget)|fridge|refrigerator|\bfan\b|\btv\b/,
  bill: /\bbill|higher|increase|tumaas|mahal|went up|change|charged|expensive/,
  save: /\bsave|saving|tipid|tip|reduce|lower|bawas|cut down/,
  kwh: /kwh|kilowatt/,
  offline: /offline|internet|no signal|without (data|wifi)/,
  coverage: /provider|anteco|antique|panay|coverage|covered|area|where|location/,
  about: /what is|what's|about|wattsnap|how does it work|features?/,
  price: /free|price|cost|pay|subscription|bayad/,
  privacy: /privacy|private|data|secure|safe/,
  signup: /sign ?up|register|account|get started|join|log ?in/,
  simulator: /watt.?if|simulat|what if/,
};

export function householdReply(message: string, context: ChatContext = {}): Reply {
  const text = message.toLowerCase().trim();
  const first = context.name?.split(/\s+/)[0];
  const { latest, previous } = context;

  if (has(text, patterns.thanks)) return { text: `You're welcome${first ? `, ${first}` : ""}! Anything else about your energy use?`, suggestions: householdSuggestions.slice(0, 2) };
  if (has(text, patterns.greeting) && text.split(/\s+/).length <= 4) return { text: `Hi${first ? ` ${first}` : ""}! I'm WattSnap AI. I can explain your bill, compare months, spot your biggest appliances, and help you get ready for brownouts.`, suggestions: householdSuggestions };

  if (has(text, patterns.scan)) return {
    text: "Open Snap AI to upload a bill photo as a reference. This UI preview shows labeled sample fields or lets you enter the bill manually. Review and confirm the month, kWh, amount and available dates before saving locally; AI extraction is not connected.",
    links: [{ label: "Open Snap AI", href: "/bills/new" }],
  };

  if (has(text, patterns.brownout)) {
    if (!context.advisory) return { text: `Review saved provider announcements for ${context.location ?? "your area"} in Advisories. Each local preview keeps its original and explains Affected, Possibly Affected, or Not Listed. Saved reviews do not confirm live power status; automatic collection is not connected.`, links: [{ label: "View advisories", href: "/advisories" }] };
    const { title, when, area, reason } = context.advisory;
    return {
      text: `A saved advisory preview lists ${area}. Review its original and location basis before preparing.\n\n• Notice: ${title}\n• Published schedule: ${when}\n• Reason: ${reason}\n\nThis saved preview does not confirm a live outage or restoration.`,
      links: [{ label: "Open brownout checklist", href: "/advisories" }],
    };
  }

  if (has(text, patterns.aircon)) {
    const rate = context.rate ?? 11.45;
    const monthly = 0.9 * 6 * 30;
    return {
      text: `Aircons are usually the biggest energy users at home. A 900 W unit running 6 hours a day uses about ${monthly.toFixed(0)} kWh a month, roughly ${peso(monthly * rate)} at your rate.\n\n• Set it to 24–25°C instead of 18–20°C\n• Clean the filter every 2–4 weeks\n• Use the timer or sleep mode at night\n• Close doors and windows, and pair it with a fan`,
      links: [{ label: "Add your aircon", href: "/appliances" }],
      suggestions: ["Which appliance uses the most?"],
    };
  }

  if (has(text, patterns.budget)) {
    if (!latest || !context.budget) return { text: "Set a monthly budget and add a bill, and I'll tell you how much of it you've used.", links: [{ label: "Set budget", href: "/budget" }] };
    const percent = Math.round(latest.amount / context.budget * 100);
    const left = context.budget - latest.amount;
    return {
      text: `Your ${monthLabel(latest.month)} bill of ${peso(latest.amount)} used ${percent}% of your ${peso(context.budget)} budget. ${left >= 0 ? `That leaves ${peso(left)} of room.` : `That's ${peso(-left)} over your target.`}`,
      links: [{ label: "Adjust budget", href: "/budget" }],
    };
  }

  if (has(text, patterns.appliances)) {
    if (!context.topAppliance) return { text: "Add the appliances you use at home and I'll rank which ones use the most energy.", links: [{ label: "Add appliances", href: "/appliances" }] };
    const { name, monthlyKwh } = context.topAppliance;
    return {
      text: `From the ${context.applianceCount ?? "saved"} appliances you've added, your ${name.toLowerCase()} uses the most: about ${monthlyKwh.toFixed(1)} kWh a month (${peso(monthlyKwh * (context.rate ?? 11.45))}). Cutting its daily hours is the quickest way to save.`,
      links: [{ label: "See all appliances", href: "/appliances" }],
      suggestions: ["How can I save on aircon?"],
    };
  }

  if (has(text, patterns.bill)) {
    if (!latest) return { text: "I don't see a bill yet. Scan your latest electricity bill and I'll explain it.", links: [{ label: "Scan a bill", href: "/bills/new" }] };
    if (!previous) return { text: `Your ${monthLabel(latest.month)} bill used ${latest.kwh} kWh (${peso(latest.amount)}). Add the month before it and I can compare the two.`, links: [{ label: "Scan another bill", href: "/bills/new" }] };
    const change = (latest.kwh - previous.kwh) / previous.kwh * 100;
    const lower = change <= 0;
    return {
      text: `Your ${monthLabel(latest.month)} bill used ${latest.kwh} kWh, ${Math.abs(change).toFixed(0)}% ${lower ? "less" : "more"} than ${monthLabel(previous.month)} (${previous.kwh} kWh). That's ${peso(Math.abs(latest.amount - previous.amount))} ${lower ? "lower" : "higher"}.\n\n${lower ? "Nice work! Keep the habits that helped." : "Common reasons: hotter weather, more aircon or fan hours, guests at home, or an appliance left on standby."}`,
      links: [{ label: "Compare all months", href: "/bills" }],
      suggestions: lower ? ["How can I save on aircon?"] : ["Which appliance uses the most?", "How can I save on aircon?"],
    };
  }

  if (has(text, patterns.save)) return {
    text: `Open your Tipid Tips${first ? `, ${first}` : ""}, to review practical advice with its saved bill and appliance basis. Each preview tip shows its inputs, assumptions, and freshness. Missing information is explained before drawing conclusions.`,
    links: [{ label: "View Tipid Tips", href: "/tips" }],
  };

  if (has(text, patterns.kwh)) return { text: "A kilowatt-hour (kWh) is how electricity use is measured. A 1,000 W appliance running for 1 hour uses 1 kWh. Your bill multiplies your kWh by your provider's rate." };

  return { text: "I'm still learning! In this preview I can help with your bill changes, saving tips, appliances, your budget, and brownouts. Try one of these:", suggestions: householdSuggestions };
}

export function landingReply(message: string): Reply {
  const text = message.toLowerCase().trim();
  const join = { label: "Create free account", href: "/signup" };

  if (has(text, patterns.thanks)) return { text: "You're welcome! Anything else you'd like to know about WattSnap?", suggestions: landingSuggestions.slice(1, 3) };
  if (has(text, patterns.greeting) && text.split(/\s+/).length <= 4) return { text: "Hi there! I'm WattSnap AI. Ask me anything about the app, like how bill scanning works or which areas are covered.", suggestions: landingSuggestions };
  if (has(text, patterns.scan)) return { text: "In this UI preview, upload a bill photo and review labeled sample fields, or enter the bill manually. Correct and confirm the billing period, kWh, amount and available dates before saving to this browser. AI extraction is not connected.", links: [join] };
  if (has(text, patterns.offline)) return { text: "Saved inputs and local calculations can work offline in an already open preview. Originals, tips and preparation checklists are stored in this browser. Opening or reloading the app without a connection is not supported yet; AI scanning and automatic updates are not connected." };
  if (has(text, patterns.coverage)) return { text: "The proposal starts in Antique with ANTECO. This UI preview includes provider choices for manual setup; provider coverage and locality aliases have not been verified. Your selection is used to compare entered advisory fields." };
  if (has(text, patterns.brownout)) return { text: "Paste or upload an advisory, keep the original, and review its fields. The UI compares entered provider and locality labels to show Affected, Possibly Affected, or Not Listed. Save a Brownout Ready plan for its published schedule and checklist; uncertain relevance needs confirmation. This does not confirm live power status.", links: [join] };
  if (has(text, patterns.simulator)) return { text: "The Watt-If simulator lets you compare habits, like running the aircon 5 hours instead of 8, and estimates the kWh and pesos you'd save." };
  if (has(text, patterns.budget)) return { text: "Set a Smart Energy Budget in pesos or kWh and WattSnap compares it with your estimated use, so you know early if you're on track." };
  if (has(text, patterns.appliances)) return { text: "Pick a labeled appliance type, enter reviewed watts and usage, and optionally upload its nameplate as a reference. Estimates use watts, hours, quantity and days in the period. Unknown wattage stays blank until you enter it; nameplate AI is not connected." };
  if (has(text, patterns.privacy)) return { text: "This UI preview saves household inputs and uploaded references in this browser. Account screens demonstrate the design; backend authentication and household access controls are not connected. Anyone using the same browser profile can access its saved preview data." };
  if (has(text, patterns.price)) return { text: "WattSnap is a UI preview. You can explore the account screens and household dashboard; there's no payment step.", links: [join] };
  if (has(text, patterns.signup)) return { text: "Explore the account-screen preview, set up your household and provider, then review a bill. These screens save preview data locally; backend authentication is not connected.", links: [join, { label: "Log in", href: "/login" }] };
  if (has(text, patterns.save)) return { text: "Create a local Tipid Tips preview from your saved bills and appliance inputs. Each suggestion explains its basis and assumptions. This uses local rules; Gemini recommendations are not connected." };
  if (has(text, patterns.about)) return {
    text: "WattSnap AI is your home electricity assistant. It helps you:\n\n• Scan bills and compare usage month by month\n• Estimate which appliances use the most\n• Get Tipid Tips and set an energy budget\n• Understand brownout advisories and get ready",
    links: [join],
    suggestions: ["How does bill scanning work?", "Which areas are covered?"],
  };
  return { text: "Good question! I can tell you about bill scanning, monthly comparisons, appliances, budgets, brownout advisories, offline use, and coverage. Try one of these:", suggestions: landingSuggestions };
}
