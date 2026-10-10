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
    text: "Open Snap AI to upload or photograph a bill as a reference. Enter its printed values, check the billing period, kWh, amount and available dates, then confirm the record before saving. Values are entered manually.",
    links: [{ label: "Open Snap AI", href: "/bills/new" }],
  };

  if (has(text, patterns.brownout)) {
    if (!context.advisory) return { text: `Review saved provider announcements for ${context.location ?? "your area"} in Advisories. Each saved review keeps its original and explains Affected, Possibly Affected, or Not Listed. Saved reviews do not confirm live power status; automatic collection is not connected.`, links: [{ label: "View advisories", href: "/advisories" }] };
    const { title, when, area, reason } = context.advisory;
    return {
      text: `A saved advisory lists ${area}. Review its original and location basis before preparing.\n\n• Notice: ${title}\n• Published schedule: ${when}\n• Reason: ${reason}\n\nThis saved review does not confirm a live outage or restoration.`,
      links: [{ label: "Open brownout checklist", href: "/advisories" }],
    };
  }

  if (has(text, patterns.aircon)) {
    return {
      text: "Review your air conditioner’s rated watts and operating hours in Appliances. Use timers when appropriate, clean filters according to the manufacturer’s instructions, and keep doors and windows closed while cooling. Estimated consumption uses your entered values; it does not measure compressor cycling.",
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
      text: `From the ${context.applianceCount ?? "saved"} ${context.applianceCount === 1 ? "appliance" : "appliances"} you've added, your ${name.toLowerCase()} uses the most: about ${monthlyKwh.toFixed(1)} kWh a month ${context.rate && context.rate > 0 ? ` (approximately ${peso(monthlyKwh * context.rate)} using your latest bill)` : ""}. Review the inputs and follow the appliance instructions. Keep essential appliances operating as needed.`,
      links: [{ label: "See all appliances", href: "/appliances" }],
      suggestions: ["How can I save on aircon?"],
    };
  }

  if (has(text, patterns.bill)) {
    if (!latest) return { text: "I don't see a bill yet. Scan your latest electricity bill and I'll explain it.", links: [{ label: "Scan a bill", href: "/bills/new" }] };
    if (!previous) return { text: `Your ${monthLabel(latest.month)} bill used ${latest.kwh} kWh (${peso(latest.amount)}). Add the month before it and I can compare the two.`, links: [{ label: "Scan another bill", href: "/bills/new" }] };
    const change = (latest.kwh - previous.kwh) / previous.kwh * 100, cost = latest.amount - previous.amount;
    return { text: `Your ${monthLabel(latest.month)} bill used ${latest.kwh} kWh, ${Math.abs(change).toFixed(0)}% ${change === 0 ? "unchanged from" : change < 0 ? "less than" : "more than"} ${monthLabel(previous.month)} (${previous.kwh} kWh). The amount is ${peso(Math.abs(cost))} ${cost === 0 ? "unchanged" : cost < 0 ? "lower" : "higher"}. Bill totals alone do not explain why use changed. Review the billing-period lengths and the original bills before drawing conclusions.`, links: [{ label: "Compare all months", href: "/bills" }], suggestions: ["Which appliance uses the most?"] };
  }

  if (has(text, patterns.save)) return {
    text: `Open your Tipid Tips${first ? `, ${first}` : ""}, to review practical advice with its saved bill and appliance basis. Each tip shows its inputs, assumptions, and freshness. Missing information is explained before drawing conclusions.`,
    links: [{ label: "View Tipid Tips", href: "/tips" }],
  };

  if (has(text, patterns.kwh)) return { text: "A kilowatt-hour (kWh) is how electricity use is measured. A 1,000 W appliance running for 1 hour uses 1 kWh. Your bill multiplies your kWh by your provider's rate." };

  return { text: "I'm still learning! Using local rules, I can help with your bill changes, saving tips, appliances, your budget, and brownouts. Try one of these:", suggestions: householdSuggestions };
}

export function landingReply(message: string): Reply {
  const text = message.toLowerCase().trim();
  const join = { label: "Set up household", href: "/signup" };

  if (has(text, patterns.thanks)) return { text: "You're welcome! Anything else you'd like to know about WattSnap?", suggestions: landingSuggestions.slice(1, 3) };
  if (has(text, patterns.greeting) && text.split(/\s+/).length <= 4) return { text: "Hi there! I'm WattSnap AI. Ask me anything about the app, like how bill scanning works or which areas are covered.", suggestions: landingSuggestions };
  if (has(text, patterns.scan)) return { text: "Upload a bill photo as a reference, copy the printed fields, and review them before saving. Automatic AI extraction is not available. Your values remain editable.", links: [join] };
  if (has(text, patterns.offline)) return { text: "Saved records and local calculations work offline after a successful online visit prepares the app shell. Tips can refresh locally. Provider updates and optional location lookup need connectivity.", links: [join] };
  if (has(text, patterns.coverage)) return { text: "Initial validation focuses on Antique with ANTECO. Select your provider manually, including another utility. GPS may help fill locality fields; it does not establish utility coverage.", links: [join] };
  if (has(text, patterns.brownout)) return { text: "Paste or upload an advisory, keep the original, and review its fields. The UI compares entered provider and locality labels to show Affected, Possibly Affected, or Not Listed. Save a Brownout Ready plan for its published schedule and checklist; uncertain relevance needs confirmation. This does not confirm live power status.", links: [join] };
  if (has(text, patterns.simulator)) return { text: "The Watt-If simulator lets you compare habits, like running the aircon 5 hours instead of 8, and estimates the kWh and pesos you'd save." };
  if (has(text, patterns.budget)) return { text: "Set a monthly budget in pesos and compare it with your latest saved electricity bill.", links: [join] };
  if (has(text, patterns.appliances)) return { text: "Pick a labeled appliance type, enter reviewed watts and usage, and optionally upload its nameplate as a reference. Estimates use watts, hours, quantity and days in the period. Unknown wattage stays blank until you enter it; nameplate AI is not connected." };
  if (has(text, patterns.privacy)) return { text: "Household values stay in browser storage. Anyone using the same browser profile can access them. This local household does not use account authentication. Clearing browser data can remove records; screenshot originals are retained only when you choose to save them.", links: [join] };
  if (has(text, patterns.price)) return { text: "You can set up a local household without a payment step.", links: [join] };
  if (has(text, patterns.signup)) return { text: "Set up one household on this device, choose a provider, and save reviewed records locally. Returning access opens the same household without a password.", links: [join] };
  if (has(text, patterns.save)) return { text: "Create local Tipid Tips from your saved bills and appliances. Each suggestion explains its inputs, assumptions and freshness; savings are not guaranteed.", links: [join] };
  if (has(text, patterns.about)) return {
    text: "WattSnap AI is your home electricity assistant. It helps you:\n\n• Scan bills and compare usage month by month\n• Estimate which appliances use the most\n• Get Tipid Tips and set an energy budget\n• Understand brownout advisories and get ready",
    links: [join],
    suggestions: ["How does bill scanning work?", "Which areas are covered?"],
  };
  return { text: "Good question! I can tell you about bill scanning, monthly comparisons, appliances, budgets, brownout advisories, offline use, and coverage. Try one of these:", suggestions: landingSuggestions };
}
