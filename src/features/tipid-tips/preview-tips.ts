import { billMonth, dailyApplianceKwh, guessApplianceKind, pesos, shiftMonth, sortBillsByMonth, type PreviewAppliance, type PreviewBill, type PreviewHousehold } from "../dashboard/preview-data";
import { applianceSignature } from "../watt-if-simulator/calculations";
import type { PreviewTip, PreviewTipsSnapshot } from "./types";

export const tipsStorageKey = "wattsnap-tips-ui-preview-v1";
export const notableChangeThreshold = 10;
const quickWins = { label: "Australian Government energy guidance", href: "https://www.energy.gov.au/households/quick-wins" };
const fridgeGuidance = { label: "ENERGY STAR refrigerator guidance", href: "https://www.energystar.gov/products/refrigerators" };
const lightingGuidance = { label: "U.S. DOE lighting guide", href: "https://www.energy.gov/sites/default/files/2021-08/ES-EE%20Lighting_080921.pdf" };
export function tipsInputSignature(household: PreviewHousehold) {
  return JSON.stringify([applianceSignature(household.appliances), sortBillsByMonth(household.bills).map(bill => [bill.id, bill.month, bill.kwh, bill.amount, bill.periodStart ?? "", bill.periodEnd ?? "", bill.source ?? "", bill.provider ?? ""])]);
}
const isSampleBill = (bill: PreviewBill) => bill.source === "sample" || bill.id.startsWith("sample-");
const isSampleAppliance = (item: PreviewAppliance) => item.source === "sample" || item.id.startsWith("sample-");
function daysInPeriod(bill: PreviewBill) {
  if (!bill.periodStart || !bill.periodEnd) return null;
  return (Date.parse(`${bill.periodEnd}T00:00:00Z`) - Date.parse(`${bill.periodStart}T00:00:00Z`)) / 86_400_000 + 1;
}
export function billTipContext(bills: PreviewBill[], threshold = notableChangeThreshold) {
  const ordered = sortBillsByMonth(bills); const latest = ordered.at(-1); const previous = ordered.at(-2);
  const limitations: string[] = [];
  if (!latest) return { facts: ["No saved bills."], reason: "There is no bill history to compare yet.", limitations: ["Add a reviewed bill to give tips a household bill basis."] };
  const facts = [`${billMonth(latest.month)}: ${latest.kwh} kWh · ${pesos(latest.amount)}${isSampleBill(latest) ? " · Sample" : ""}.`];
  if (!previous) return { facts, reason: "One bill gives a starting point, but cannot show a consumption trend.", limitations: ["Only one bill is saved; another comparable period is needed."] };
  facts.push(`${billMonth(previous.month)}: ${previous.kwh} kWh${isSampleBill(previous) ? " · Sample" : ""}.`);
  if (shiftMonth(previous.month, 1) !== latest.month) limitations.push("The saved billing months are not consecutive; missing months are not treated as zero use.");
  const previousDays = daysInPeriod(previous), latestDays = daysInPeriod(latest);
  if (previousDays === null || latestDays === null) limitations.push("Exact billing dates are missing, so period lengths and comparability are unverified.");
  else {
    if (latest.periodStart! <= previous.periodEnd!) limitations.push("The recorded billing periods overlap; review their dates before comparing trends.");
    else if (Date.parse(`${latest.periodStart}T00:00:00Z`) - Date.parse(`${previous.periodEnd}T00:00:00Z`) !== 86_400_000) limitations.push("The recorded date ranges are not consecutive; review the gap between periods.");
    if (previousDays !== latestDays) limitations.push(`Period lengths differ (${previousDays} and ${latestDays} days). Monthly totals are not a direct like-for-like comparison.`);
  }
  if (previous.kwh <= 0) limitations.push("The previous consumption is zero; a percentage change cannot be calculated.");
  if (limitations.length) return { facts, reason: "These recorded totals need qualification before calling them a monthly trend. Review the billing periods first.", limitations };
  const change = latest.kwh - previous.kwh, percent = change / previous.kwh * 100;
  return { facts, reason: change === 0 ? "Recorded consumption is unchanged across these comparable periods." : `Recorded consumption is ${Math.abs(change).toFixed(2)} kWh (${Math.abs(percent).toFixed(1)}%) ${change > 0 ? "higher" : "lower"} across these comparable periods.${Math.abs(percent) >= threshold ? ` It crosses the ${threshold}% preview review threshold.` : ""}`, limitations };
}

function applianceTip(item: PreviewAppliance, rank: number): PreviewTip {
  const kind = item.kind ?? guessApplianceKind(item.name), monthly = dailyApplianceKwh(item) * 30;
  let title: string, action: string, guidance: PreviewTip["guidance"];
  switch (kind) {
    case "fridge": title = `Care for ${item.name}`; action = "Keep door openings brief and check that the door seals close properly. Keep the refrigerator powered for food storage."; guidance = fridgeGuidance; break;
    case "aircon": title = `Review cooling time for ${item.name}`; action = "Cool only the rooms you use and close their doors while cooling. If comfortable, explore a different schedule in Watt-If."; guidance = quickWins; break;
    case "fan": title = `Match ${item.name} to occupied hours`; action = "Run the fan when someone benefits from its airflow. Compare fewer unused hours in Watt-If."; guidance = quickWins; break;
    case "lights": title = `Review how you use ${item.name}`; action = "Switch off lights in empty rooms. If you replace older bulbs, compare the actual wattage of suitable LEDs before deciding."; guidance = lightingGuidance; break;
    case "washer": title = `Check settings for ${item.name}`; action = "When the care labels and washer instructions allow it, consider a cold-water wash. Review your actual running hours in the appliance list."; guidance = quickWins; break;
    case "tv": case "laptop": case "phone": title = `Check idle time for ${item.name}`; action = "Use the device’s power-saving options and switch it off when it is not needed. Check its instructions before changing standby settings."; guidance = quickWins; break;
    default: title = `Review the inputs for ${item.name}`; action = "Check rated power and actual running time, including short sessions. Follow the device’s instructions and compare your own assumptions in Watt-If.";
  }
  return {
    id: `appliance-${item.id}`, category: "appliance", title, action,
    reason: rank === 0 ? `${item.name} has the highest estimated use among your registered appliances.` : `${item.name} is among the ${Math.min(rank + 1, 3)} highest estimated entries in your registered list.`,
    facts: [`${item.watts} W × ${item.quantity} × ${item.hours} hours/day × 30 days.`, `≈ ${monthly.toFixed(2)} kWh over 30 days · appliance estimate.`],
    assumptions: [item.wattageBasis === "nameplate" ? "Rated power was entered from the nameplate." : "Wattage is approximate or has not been marked as a nameplate reading.", "Hours and quantity come from your saved inputs. Cycling, standby draw, and actual meter use can differ."],
    sample: isSampleAppliance(item), link: { label: kind === "fridge" || kind === "washer" ? "Review appliance inputs" : "Explore in Watt-If", href: kind === "fridge" || kind === "washer" ? "/appliances" : "/simulator" }, guidance,
  };
}
export function generatePreviewTips(household: PreviewHousehold, now = new Date(), origin: PreviewTipsSnapshot["origin"] = "household"): PreviewTipsSnapshot {
  const billContext = billTipContext(household.bills);
  const limits = [...billContext.limitations]; const tips: PreviewTip[] = [];
  const sampleBills = household.bills.some(isSampleBill), sampleAppliances = household.appliances.some(isSampleAppliance);
  if (household.bills.length) tips.push({ id: "bill-review", category: "bill", title: household.bills.length > 1 ? "Review your bill comparison" : "Build a comparable bill history", action: "Check the recorded dates and readings. Bill differences alone cannot identify an appliance or prove why consumption changed.", reason: billContext.reason, facts: billContext.facts, assumptions: [`Notable-change review threshold: ${notableChangeThreshold}% in this preview; it is not a statistical anomaly test.`, "Appliance estimates are separate from the provider’s metered bill."], sample: sampleBills, link: { label: "Review bill history", href: "/bills" } });
  else tips.push({ id: "first-bill", category: "getting-started", title: "Start with a reviewed bill", action: "Enter a bill and check its consumption, amount, and period. A second comparable bill can then give your tips a change-detection basis.", reason: "No saved bill history is available for this household.", facts: ["0 saved bills."], assumptions: ["No bill trend or peso savings can be inferred yet."], sample: false, link: { label: "Add a bill", href: "/bills/new" } });
  const positive = [...household.appliances].filter(item => dailyApplianceKwh(item) > 0 && Number.isFinite(dailyApplianceKwh(item) * 30)).sort((a, b) => dailyApplianceKwh(b) - dailyApplianceKwh(a) || a.id.localeCompare(b.id));
  for (const [rank, item] of positive.slice(0, 3).entries()) tips.push(applianceTip(item, rank));
  if (!positive.length) {
    limits.push(household.appliances.length ? "No positive, finite appliance estimate is available; check the saved power and usage inputs." : "No appliances are saved; recommendations cannot name devices you own.");
    tips.push({ id: "appliance-inputs", category: "getting-started", title: household.appliances.length ? "Check your appliance usage inputs" : "Add the appliances you actually use", action: "Review rated watts, quantity, and hours per day. Keep unknown wattage blank until you can check it.", reason: "Appliance-specific recommendations need your own reviewed inputs.", facts: [`${household.appliances.length} saved appliance ${household.appliances.length === 1 ? "entry" : "entries"}.`], assumptions: ["An appliance category does not establish its actual wattage or running time."], sample: sampleAppliances, link: { label: "Review appliances", href: household.appliances.length ? "/appliances" : "/appliances/new" } });
  }
  return { version: "tips-ui-v1", generatedAt: now.toISOString(), inputSignature: tipsInputSignature(household), origin, context: { billCount: household.bills.length, applianceCount: household.appliances.length, sample: sampleBills || sampleAppliances || origin === "sample", limitations: limits }, tips };
}
export function tipsAreStale(snapshot: PreviewTipsSnapshot, household: PreviewHousehold) { return snapshot.origin === "household" && snapshot.inputSignature !== tipsInputSignature(household); }
const routes = new Set(["/bills", "/bills/new", "/appliances", "/appliances/new", "/simulator"]);
const guides = new Set([quickWins.href, fridgeGuidance.href, lightingGuidance.href]);
const stringList = (value: unknown): value is string[] => Array.isArray(value) && value.every(item => typeof item === "string");
export function normalizeTipsSnapshot(value: unknown): PreviewTipsSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const snapshot = value as PreviewTipsSnapshot;
  if (snapshot.version !== "tips-ui-v1" || !["household", "sample"].includes(snapshot.origin) || typeof snapshot.generatedAt !== "string" || !Number.isFinite(Date.parse(snapshot.generatedAt)) || typeof snapshot.inputSignature !== "string" || !snapshot.context || !Number.isInteger(snapshot.context.billCount) || snapshot.context.billCount < 0 || !Number.isInteger(snapshot.context.applianceCount) || snapshot.context.applianceCount < 0 || typeof snapshot.context.sample !== "boolean" || !stringList(snapshot.context.limitations) || !Array.isArray(snapshot.tips) || !snapshot.tips.length) return null;
  if (snapshot.tips.some(tip => !tip || typeof tip.id !== "string" || !["appliance", "bill", "getting-started"].includes(tip.category) || typeof tip.title !== "string" || typeof tip.action !== "string" || typeof tip.reason !== "string" || typeof tip.sample !== "boolean" || !stringList(tip.facts) || !stringList(tip.assumptions) || !tip.link || typeof tip.link.label !== "string" || !routes.has(tip.link.href) || (tip.guidance && (typeof tip.guidance.label !== "string" || !guides.has(tip.guidance.href))))) return null;
  if (new Set(snapshot.tips.map(tip => tip.id)).size !== snapshot.tips.length) return null;
  return snapshot;
}
