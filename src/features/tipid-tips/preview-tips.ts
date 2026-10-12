import { amountPaid, billMonth, budgetStatus, dailyApplianceKwh, effectiveRate, guessApplianceKind, latestBill, pesos, refrigerationName, shiftMonth, sortBillsByMonth, type PreviewAppliance, type PreviewBill, type PreviewHousehold } from "../dashboard/preview-data";
import { applianceSignature } from "../watt-if-simulator/calculations";
import type { PreviewTip, PreviewTipsSnapshot, TipBenefit } from "./types";
import { buildBillForecast, forecastMonthName, forecastTargetYear, normalizeBillForecast } from "./bill-forecast";

export const tipsStorageKey = "wattsnap-tips-ui-preview-v1";
export const notableChangeThreshold = 20;
const quickWins = { label: "Australian Government energy guidance", href: "https://www.energy.gov.au/households/quick-wins" };
const fridgeGuidance = { label: "ENERGY STAR refrigerator guidance", href: "https://www.energystar.gov/products/refrigerators" };
const lightingGuidance = { label: "U.S. DOE lighting guide", href: "https://www.energy.gov/sites/default/files/2021-08/ES-EE%20Lighting_080921.pdf" };
export function tipsInputSignature(household: PreviewHousehold) {
  return JSON.stringify([applianceSignature(household.appliances), sortBillsByMonth(household.bills).map(bill => [bill.id, bill.month, bill.kwh, bill.amount, bill.periodStart ?? "", bill.periodEnd ?? "", bill.source ?? "", bill.provider ?? "", bill.subsidy ?? 0]), household.budget]);
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
  const benefit: TipBenefit | undefined = change === 0 ? undefined : { tone: change > 0 ? "warn" : "save", label: change > 0 ? "Use went up" : "Use went down", value: `${Math.abs(percent).toFixed(0)}%`, detail: `${latest.kwh} kWh, was ${previous.kwh} kWh` };
  return { facts, reason: change === 0 ? "Recorded consumption is unchanged across these comparable periods." : `Recorded consumption is ${Math.abs(change).toFixed(2)} kWh (${Math.abs(percent).toFixed(1)}%) ${change > 0 ? "higher" : "lower"} across these comparable periods.${Math.abs(percent) >= threshold ? ` It crosses the ${threshold}% review threshold.` : ""}`, limitations, benefit };
}

/** A refrigeration name wins over a saved kind, so food storage is never treated as a device to switch off. */
const tipKind = (item: PreviewAppliance) => refrigerationName.test(item.name) ? "fridge" : item.kind ?? guessApplianceKind(item.name);
/** `rateNote` names the peso basis; pesos are shown only when a saved bill supplies a rate. */
function applianceTip(item: PreviewAppliance, rank: number, rate: number, rateNote: string, subsidyNote: string[]): PreviewTip {
  const kind = tipKind(item), monthly = dailyApplianceKwh(item) * 30;
  let title: string, action: string, guidance: PreviewTip["guidance"];
  switch (kind) {
    case "fridge": title = `Check ${item.name} door seals`; action = "Keep door openings brief and check the seals. Keep the refrigerator powered for food storage."; guidance = fridgeGuidance; break;
    case "aircon": title = `Use ${item.name} in occupied rooms`; action = "Close doors while cooling. Try a shorter schedule in Watt-If if it stays comfortable."; guidance = quickWins; break;
    case "fan": title = `Switch off ${item.name} when unused`; action = "Turn the fan off when the room is empty. Compare fewer unused hours in Watt-If."; guidance = quickWins; break;
    case "lights": title = `Switch off unused ${item.name}`; action = "Turn off lights in empty rooms. When replacing bulbs, compare the wattage of suitable LEDs."; guidance = lightingGuidance; break;
    case "washer": title = `Try a cold wash with ${item.name}`; action = "Use a cold wash when clothing labels and your washer instructions allow it."; guidance = quickWins; break;
    case "rice-cooker": title = `Switch off keep-warm on ${item.name}`; action = "Serve the rice, then unplug the cooker. Keep-warm keeps drawing power. Store leftovers in the refrigerator."; break;
    case "iron": title = `Iron in one batch with ${item.name}`; action = "Iron the week’s clothes in one session so it heats once. Unplug it when you finish."; break;
    case "microwave": title = `Heat only what you need in ${item.name}`; action = "Heat single portions and avoid reheating twice. Follow the device’s instructions."; break;
    case "tv": case "laptop": case "phone": title = `Reduce ${item.name} idle time`; action = "Use power-saving mode and switch off when unused. Follow the device’s standby instructions."; guidance = quickWins; break;
    default: title = `Check ${item.name} running time`; action = "Check rated watts and daily use, including short sessions. Follow the device’s instructions.";
  }
  return {
    id: `appliance-${item.id}`, category: "appliance", title, action,
    benefit: rate > 0 ? { tone: "cost", label: "Costs about", value: `${pesos(monthly * rate)} a month`, detail: `${monthly.toFixed(1)} kWh over 30 days` } : { tone: "cost", label: "Uses about", value: `${monthly.toFixed(1)} kWh a month` },
    reason: rank === 0 ? `${item.name} has the highest estimated use among your registered appliances.` : `${item.name} is among the ${Math.min(rank + 1, 3)} highest estimated entries in your registered list.`,
    facts: [`${item.watts} W × ${item.quantity} × ${item.hours} hours/day × 30 days.`, `≈ ${monthly.toFixed(2)} kWh over 30 days · appliance estimate.`, ...(rate > 0 ? [`≈ ${pesos(monthly * rate)} over 30 days at ${rateNote} · estimate.`] : [])],
    assumptions: [item.wattageBasis === "nameplate" ? "Rated power was entered from the nameplate." : "Wattage is approximate or has not been marked as a nameplate reading.", "Hours and quantity come from your saved inputs. Cycling, standby draw, and actual meter use can differ.", ...(rate > 0 ? subsidyNote : [])],
    sample: isSampleAppliance(item), link: { label: kind === "fridge" || kind === "washer" ? "Review appliance inputs" : "Explore in Watt-If", href: kind === "fridge" || kind === "washer" ? "/appliances" : "/simulator" }, guidance,
  };
}
export function generatePreviewTips(household: PreviewHousehold, now = new Date(), origin: PreviewTipsSnapshot["origin"] = "household"): PreviewTipsSnapshot {
  const billContext = billTipContext(household.bills);
  const limits = [...billContext.limitations]; const tips: PreviewTip[] = [];
  const sampleBills = household.bills.some(isSampleBill), sampleAppliances = household.appliances.some(isSampleAppliance);
  const forecast = buildBillForecast(household.bills, now);
  if (household.bills.length) tips.push({ id: "bill-review", category: "bill", title: household.bills.length > 1 ? "Review your bill comparison" : "Build a comparable bill history", ...(billContext.benefit ? { benefit: billContext.benefit } : {}), action: "Check the recorded dates and readings. Bill differences alone cannot identify an appliance or prove why consumption changed.", reason: billContext.reason, facts: billContext.facts, assumptions: [`Notable-change review threshold: ${notableChangeThreshold}%; it is not a statistical anomaly test.`, "Appliance estimates are separate from the provider’s metered bill."], sample: sampleBills, link: { label: "Review bill history", href: "/bills" } });
  else tips.push({ id: "first-bill", category: "getting-started", title: "Start with a reviewed bill", action: "Enter a bill and check its consumption, amount, and period. A second comparable bill can then give your tips a change-detection basis.", reason: "No saved bill history is available for this household.", facts: ["0 saved bills."], assumptions: ["No bill trend or peso savings can be inferred yet."], sample: false, link: { label: "Add a bill", href: "/bills/new" } });
  if (forecast.status === "ready") {
    const peak = forecast.peakMonth ? forecast.months[forecast.peakMonth-1] : null;
    const low = forecast.lowMonth ? forecast.months[forecast.lowMonth-1] : null;
    const unit = forecast.unit === "kwh-30-days" ? "kWh per 30 days" : "kWh per billing month";
    tips.push({ id: "bill-forecast", category: "bill", title: peak ? `Plan ahead for ${forecastMonthName(peak.month)}` : "Keep your monthly usage steady", ...(peak ? { benefit: { tone: "info" as const, label: "Highest month ahead", value: `${forecastMonthName(peak.month)} ${forecast.targetYear}`, detail: `about ${peak.kwh} kWh${peak.amount !== null ? ` · ${pesos(peak.amount)}` : ""}` } } : {}), action: peak ? `Before ${forecastMonthName(peak.month)}, check unused appliance hours. Set a budget using the estimate, then update it when new bills arrive.` : "Compare each new bill with the monthly outlook. Update your usage habits and budget when the pattern changes.", reason: `The ${forecast.targetYear} outlook repeats your ${forecast.baseYear} monthly pattern${forecast.scale !== 1 ? `, adjusted using ${forecast.matchedMonths} matching months` : ""}. It is a planning estimate.`, facts: [peak ? `Projected high: ${forecastMonthName(peak.month)} ${forecast.targetYear} ≈ ${peak.kwh} ${unit}${peak.amount !== null ? ` · ${pesos(peak.amount)} before subsidies` : ""}.` : "Your projected monthly use is roughly steady.", ...(low ? [`Projected low: ${forecastMonthName(low.month)} ${forecast.targetYear} ≈ ${low.kwh} ${unit}.`] : []), ...(forecast.effectiveRate !== null ? [`Peso scenario uses ${pesos(forecast.effectiveRate)} per kWh from ${forecast.rateMonths.join(", ")}; this is not a future tariff.`] : [])], assumptions: forecast.limitations, sample: false, link: { label: "Review bill history", href: "/bills" } });
  }
  const positive = [...household.appliances].filter(item => dailyApplianceKwh(item) > 0 && Number.isFinite(dailyApplianceKwh(item) * 30)).sort((a, b) => dailyApplianceKwh(b) - dailyApplianceKwh(a) || a.id.localeCompare(b.id));
  const latest = latestBill(household.bills), rate = effectiveRate(household.bills);
  const month = latest ? billMonth(latest.month) : "", rateNote = `${pesos(rate)} per kWh from your ${month} bill, before subsidy`;
  const subsidyNote = latest && (latest.subsidy ?? 0) > 0 ? [`Your ${month} bill had a ${pesos(latest.subsidy!)} subsidy. Savings lower what you pay only while the bill is above the subsidy.`] : [];
  // Never a refrigerator (food safety) or an unclassified device (it may be health or safety equipment).
  const cuts = positive.filter(item => { const kind = tipKind(item); return kind !== "fridge" && kind !== "other" && item.hours >= 2; }).sort((a, b) => b.watts * b.quantity - a.watts * a.quantity || a.id.localeCompare(b.id)).slice(0, 3);
  const hourKwh = (item: PreviewAppliance) => item.watts * item.quantity * 30 / 1000;
  const hourLess = (item: PreviewAppliance) => { const kwh = hourKwh(item); return `${kwh.toFixed(2)} kWh${rate > 0 ? ` ≈ ${pesos(kwh * rate)}` : ""} over 30 days`; };
  const paid = latest ? amountPaid(latest) : 0;
  const budget = latest && household.budget > 0 && rate > 0 ? budgetStatus(paid, household.budget) : "on-track";
  if (latest && budget !== "on-track") {
    const over = budget === "over", gap = Math.abs(paid - household.budget), kwh = (gap / rate).toFixed(1);
    tips.push({ id: "budget-gap", category: "bill", title: over ? `Trim about ${kwh} kWh to meet your budget` : "You are close to your budget", benefit: { tone: over ? "warn" : "save", label: over ? "Over your budget by" : "Left in your budget", value: pesos(gap), detail: `about ${kwh} kWh` }, action: over ? `You paid ${pesos(paid)} for ${month}, ${pesos(gap)} over your ${pesos(household.budget)} budget. ${cuts.length ? "Your switch-off list shows where to start; those changes may not cover the whole gap." : "Review your appliance hours to see where use can come down."}` : `You paid ${pesos(paid)} for ${month}. ${pesos(gap)} is left in your ${pesos(household.budget)} budget, about ${kwh} kWh.`, reason: "Compares what you paid after subsidy with the monthly budget you set.", facts: [`${month}: you paid ${pesos(paid)} against a ${pesos(household.budget)} budget.`, `${over ? "Over by" : "Room left:"} ${pesos(gap)} ≈ ${kwh} kWh.`, `Peso-to-kWh uses ${rateNote}.`], assumptions: ["Fixed charges do not shrink with use, so the kWh figure is approximate.", ...subsidyNote], sample: isSampleBill(latest), link: { label: "Open budget", href: "/budget" } });
  }
  if (latest && subsidyNote.length && paid === 0) tips.push({ id: "subsidy-covered", category: "bill", title: "Your subsidy covers this bill", benefit: { tone: "save", label: "You pay", value: pesos(0), detail: "the subsidy covers this bill" }, action: "Keep use near this level. Saving more will not lower what you pay while the bill stays within the subsidy.", reason: `Your ${month} bill was fully covered by the subsidy recorded on it.`, facts: [`${month}: bill ${pesos(latest.amount)}, subsidy ${pesos(latest.subsidy!)}, you pay ${pesos(0)}.`], assumptions: ["Future bills and subsidies may differ."], sample: isSampleBill(latest), link: { label: "Review bill history", href: "/bills" } });
  if (cuts.length) tips.push({ id: "switch-off-plan", category: "appliance", title: `Switch off ${cuts[0].name} one hour earlier`, benefit: { tone: "save", label: "Could save about", value: rate > 0 ? `${pesos(hourKwh(cuts[0]) * rate)} a month` : `${hourKwh(cuts[0]).toFixed(1)} kWh a month`, detail: rate > 0 ? `${hourKwh(cuts[0]).toFixed(1)} kWh · estimate` : "estimate" }, action: `Turn off ${cuts[0].name} one hour earlier each day.${cuts.length > 1 ? ` Then try ${cuts.slice(1).map(item => item.name).join(", ")}.` : ""} Keep refrigerators and health or safety devices running.`, reason: "Ranked by how much one hour less each day would save, using your saved watts and quantity.", facts: [...cuts.map(item => `${item.name}: 1 hour less per day ≈ ${hourLess(item)}.`), ...(rate > 0 ? [`Peso estimates use ${rateNote}; this is not a future tariff.`] : [])], assumptions: ["Assumes the device draws its rated watts for the whole hour. Aircons and other cycling devices may save less.", ...subsidyNote], sample: cuts.some(isSampleAppliance), link: { label: "Try it in Watt-If", href: "/simulator" } });
  for (const [rank, item] of positive.slice(0, 3).entries()) tips.push(applianceTip(item, rank, rate, rateNote, subsidyNote));
  if (!positive.length) {
    limits.push(household.appliances.length ? "No positive, finite appliance estimate is available; check the saved power and usage inputs." : "No appliances are saved; recommendations cannot name devices you own.");
    tips.push({ id: "appliance-inputs", category: "getting-started", title: household.appliances.length ? "Check your appliance usage inputs" : "Add the appliances you actually use", action: "Review rated watts, quantity, and hours per day. Keep unknown wattage blank until you can check it.", reason: "Appliance-specific recommendations need your own reviewed inputs.", facts: [`${household.appliances.length} saved appliance ${household.appliances.length === 1 ? "entry" : "entries"}.`], assumptions: ["An appliance category does not establish its actual wattage or running time."], sample: sampleAppliances, link: { label: "Review appliances", href: household.appliances.length ? "/appliances" : "/appliances/new" } });
  }
  return { version: "tips-ui-v1", generatedAt: now.toISOString(), inputSignature: tipsInputSignature(household), origin, forecast, context: { billCount: household.bills.length, applianceCount: household.appliances.length, sample: sampleBills || sampleAppliances || origin === "sample", limitations: limits }, tips };
}
export function tipsAreStale(snapshot: PreviewTipsSnapshot, household: PreviewHousehold, now = new Date()) { return (snapshot.origin === "household" && snapshot.inputSignature !== tipsInputSignature(household)) || (!!snapshot.forecast && snapshot.forecast.targetYear !== forecastTargetYear(now)); }
const routes = new Set(["/bills", "/bills/new", "/appliances", "/appliances/new", "/simulator", "/budget"]);
const guides = new Set([quickWins.href, fridgeGuidance.href, lightingGuidance.href]);
const stringList = (value: unknown): value is string[] => Array.isArray(value) && value.every(item => typeof item === "string");
export function normalizeTipsSnapshot(value: unknown): PreviewTipsSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const snapshot = value as PreviewTipsSnapshot;
  if (snapshot.source !== undefined && snapshot.source !== "gemini" && snapshot.source !== "local-rule") return null;
  if (snapshot.forecast !== undefined && !normalizeBillForecast(snapshot.forecast)) return null;
  if (snapshot.version !== "tips-ui-v1" || !["household", "sample"].includes(snapshot.origin) || typeof snapshot.generatedAt !== "string" || !Number.isFinite(Date.parse(snapshot.generatedAt)) || typeof snapshot.inputSignature !== "string" || !snapshot.context || !Number.isInteger(snapshot.context.billCount) || snapshot.context.billCount < 0 || !Number.isInteger(snapshot.context.applianceCount) || snapshot.context.applianceCount < 0 || typeof snapshot.context.sample !== "boolean" || !stringList(snapshot.context.limitations) || !Array.isArray(snapshot.tips) || !snapshot.tips.length) return null;
  if (snapshot.tips.some(tip => !tip || typeof tip.id !== "string" || !["appliance", "bill", "getting-started"].includes(tip.category) || typeof tip.title !== "string" || typeof tip.action !== "string" || typeof tip.reason !== "string" || typeof tip.sample !== "boolean" || !stringList(tip.facts) || !stringList(tip.assumptions) || !tip.link || typeof tip.link.label !== "string" || !routes.has(tip.link.href) || (tip.guidance && (typeof tip.guidance.label !== "string" || !guides.has(tip.guidance.href))))) return null;
  if (new Set(snapshot.tips.map(tip => tip.id)).size !== snapshot.tips.length) return null;
  return snapshot;
}
