import type { ChatBill, ChatContext, ChatLink, Reply } from "./replies";

const peso = (n: number) => `₱${n.toLocaleString("en-PH", {minimumFractionDigits:2,maximumFractionDigits:2})}`;
const number = (n: number) => Number(n.toFixed(2)).toLocaleString("en-PH");
const monthLabel = (month: string) => new Intl.DateTimeFormat("en", {month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(`${month}-01T00:00:00Z`));
const positive = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n > 0;
const payable = (bill: ChatBill) => Math.max(0,bill.amount - (positive(bill.subsidy) ? bill.subsidy : 0));
const line = (bill: ChatBill) => `${monthLabel(bill.month)}: ${number(bill.kwh)} kWh · ${peso(bill.amount)}${positive(bill.subsidy) ? ` bill; ${peso(payable(bill))} after the printed subsidy` : ""}${bill.dueDate ? ` · due ${bill.dueDate}` : ""}`;
const link = (label:string,href:string): ChatLink => ({label,href});
const months = ["january|jan|enero","february|feb|pebrero","march|mar|marso","april|apr|abril","may|mayo","june|jun|hunyo","july|jul|hulyo","august|aug|agosto","september|sep|sept|setyembre","october|oct|oktubre","november|nov|nobyembre","december|dec|disyembre"];
const monthNames = new RegExp(`\\b(${months.join("|")})(?:\\s+(20\\d{2}))?\\b`,"g");

function periods(text: string, bills: ChatBill[], today: string): {months: string[]; ambiguous?: string} {
  const requested = [...text.matchAll(/\b(20\d{2}-(?:0[1-9]|1[012]))\b/g)].map(match=>match[1]);
  for (const match of text.matchAll(monthNames)) {
    if (match[1]==="may" && /^may\s+(i|we|you)\b/.test(text.slice(match.index))) continue;
    const index = months.findIndex(names=>names.split("|").includes(match[1]))+1;
    const suffix = `-${String(index).padStart(2,"0")}`;
    const candidates = bills.filter(bill=>bill.month.endsWith(suffix));
    if (!match[2] && new Set(candidates.map(bill=>bill.month)).size > 1) return {months:[],ambiguous:match[1]};
    requested.push(match[2] ? match[2]+suffix : candidates[0]?.month ?? today.slice(0,4)+suffix);
  }
  if (/\b(this|current) month\b|ngayong buwan|buwan na ito/.test(text)) requested.push(today.slice(0,7));
  if (/\blast month\b|nakaraang buwan|noong isang buwan/.test(text)) {
    const date = new Date(`${today.slice(0,7)}-01T00:00:00Z`); date.setUTCMonth(date.getUTCMonth()-1); requested.push(date.toISOString().slice(0,7));
  }
  return {months:[...new Set(requested)]};
}

/** Deterministic, read-only answers. Undefined means the request needs another resolver. */
export function savedHouseholdReply(raw: string, context: ChatContext = {}): Reply | undefined {
  const text = raw.toLowerCase().trim().slice(0,1000);
  const today = context.today && /^20\d{2}-\d{2}-\d{2}$/.test(context.today) ? context.today : new Intl.DateTimeFormat("en-CA", {timeZone:"Asia/Manila",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  const source = context.bills ?? [context.previous,context.latest].filter((bill):bill is ChatBill=>!!bill);
  const bills = source.filter(bill=>/^20\d{2}-(0[1-9]|1[012])$/.test(bill.month) && positive(bill.kwh) && positive(bill.amount)).sort((a,b)=>a.month.localeCompare(b.month));
  const latest = bills.at(-1);
  const sections: string[] = [], links: ChatLink[] = [];
  const add = (topic:string,answer:string,destination:ChatLink) => {
    sections.push(context.unavailable?.includes(topic) ? `${topic}: These saved records could not be opened. Reopen the page or check browser storage.` : answer);
    if (!links.some(item=>item.href===destination.href)) links.push(destination);
  };
  const selected = periods(text,bills,today);
  const budget = /\bbudget\b|badyet|monthly target|spending limit|natitira|remaining budget/.test(text);
  const history = /history|kasaysayan|nakaraang mga bill|previous bills|all.*bills|list.*bills|\bbills\b/.test(text) && !/compar|difference|pagkakaiba/.test(text);
  const due = /due|deadline|kailan.*(?:bayad|bill)|when.*pay/.test(text);
  const compare = /compar|difference|pagkakaiba/.test(text) && /bill|month|buwan/.test(text);
  const periodQuestion = selected.months.length>0 && /bill|kwh|usage|consumption|konsumo|gastos/.test(text);
  const simpleBill = /latest bill|current bill|last bill|bill amount|magkano.*bill|bill ko|electricity usage|konsumo ko|my usage/.test(text);
  if (budget) {
    const heading = positive(context.budget) ? `Your saved monthly budget is ${peso(context.budget)}.` : "No monthly budget is saved yet. You can set one in Budget.";
    const balance = positive(context.budget) && latest ? context.budget-payable(latest) : null;
    add("household",heading+(latest ? `\nLatest saved bill (${monthLabel(latest.month)}): ${peso(latest.amount)}${positive(latest.subsidy) ? `; ${peso(payable(latest))} after the printed subsidy` : ""}.` : " No saved bills are available to check it against.")+(balance!==null ? ` ${balance>=0 ? `${peso(balance)} of room remains.` : `${peso(-balance)} over your budget.`}${context.budget && payable(latest!)/context.budget ? ` (${Math.round(payable(latest!)/context.budget*100)}% of your ${peso(context.budget)} budget.)` : ""}` : ""),link("Open Budget","/budget"));
  }
  if (history && selected.ambiguous) add("household",`Which year for ${selected.ambiguous}? More than one is saved.`,link("View bills","/bills"));
  else if (history) {
    const year = text.match(/\b(20\d{2})\b/)?.[1];
    const count = text.match(/\blast\s+(\d{1,2})\s+(?:months?|bills?)\b/)?.[1];
    const filtered = (selected.months.length ? bills.filter(bill=>selected.months.includes(bill.month)) : year ? bills.filter(bill=>bill.month.startsWith(year)) : bills).slice(count ? -Math.max(1,Number(count)) : 0);
    add("household",filtered.length ? `Saved bill history (${filtered.length} records${year ? ` in ${year}` : ""}):\n${filtered.slice(-12).reverse().map(bill=>`• ${line(bill)}`).join("\n")}\nTotal recorded: ${number(filtered.reduce((sum,bill)=>sum+bill.kwh,0))} kWh · ${peso(filtered.reduce((sum,bill)=>sum+bill.amount,0))} before subsidies.${filtered.length>12 ? " Showing the latest 12; the total includes every matching saved record." : ""} Missing months are not counted as zero.` : "No saved bills match this history request. Add a reviewed bill first.",link("View bill history","/bills"));
  }
  if (compare && selected.months.length>0) {
    if (selected.ambiguous) add("household",`Which year for ${selected.ambiguous}? More than one is saved.`,link("View bills","/bills"));
    else {
      const wanted = selected.months.length===1 ? [bills.filter(bill=>bill.month<selected.months[0]).at(-1)?.month,selected.months[0]] : selected.months.slice(0,2);
      const pair = wanted.map(month=>bills.find(bill=>bill.month===month));
      if (!pair[0] || !pair[1]) add("household",`Both billing periods need saved records. ${wanted.filter(month=>month&&!bills.some(bill=>bill.month===month)).map(month=>`No saved bill for ${monthLabel(month!)}.`).join(" ")}`,link("View bills","/bills"));
      else { const [a,b]=pair; add("household",`${line(a!)}\n${line(b!)}\nDifference (${monthLabel(b!.month)} minus ${monthLabel(a!.month)}): ${number(b!.kwh-a!.kwh)} kWh · ${peso(b!.amount-a!.amount)} before subsidies. Recorded totals do not establish a cause; check the billing-period lengths.`,link("Compare bills","/bills")); }
    }
  } else if ((periodQuestion || simpleBill || due || selected.ambiguous) && !history) {
    if (selected.ambiguous) add("household",`Which year for ${selected.ambiguous}? More than one is saved.`,link("View bills","/bills"));
    else {
      const wanted = selected.months.length ? selected.months : latest ? [latest.month] : [];
      add("household",wanted.length ? wanted.map(month=>{const bill=bills.find(item=>item.month===month);return bill ? `${line(bill)}.${due&&!bill.dueDate ? " The due date was not saved." : ""}` : `No saved bill for ${monthLabel(month)}.`;}).join("\n")+(due ? " Printed due dates do not confirm payment status." : "") : "No saved bills yet. Enter or scan a reviewed bill first.",link("View bills","/bills"));
    }
  }
  if (/\bpaid\b|payment status|nabayaran|bayad na/.test(text)) add("household","Payment status is not recorded in this app. A saved bill and its due date do not confirm that it was paid.",link("View bills","/bills"));
  if (/subsidy|peps|subsidiya|payable|after.*subsidy|babaya(?:d|ran)/.test(text)) add("household",`Monthly subsidy setting: ${Number.isFinite(context.monthlySubsidy) ? peso(context.monthlySubsidy!) : "not saved"}.${latest ? ` Latest bill: ${peso(latest.amount)}; printed subsidy: ${latest.subsidy===undefined ? "not recorded" : peso(latest.subsidy)}; ${latest.subsidy===undefined ? "check the receipt for the payable amount" : `amount after subsidy: ${peso(payable(latest))}`}.` : " No bill is saved yet."} The monthly setting is an estimate; the receipt's printed subsidy controls a saved bill.`,link("Review subsidy","/budget"));
  if (/\brate\b|per kwh|presyo.*kwh/.test(text)) add("household",positive(context.rate) ? `The effective rate from your latest saved bill is ${peso(context.rate)} per kWh, before subsidy. It is an estimate for calculations, not a live provider tariff.` : "No saved bill rate is available. Add a bill with its amount and kWh first.",link("View rate basis","/bills"));

  const estimate = /what if|estimate|calculate|compute|magkano.*(?:fan|aircon|ref|device)|konsumo.*(?:fan|aircon|ref)/.test(text);
  const watts = text.match(/(?<![\w.,-])(\d+(?:\.\d+)?|\.\d+)\s*(kw|w|watts?)\b/);
  const hours = text.match(/(?<![\w.,-])(\d+(?:\.\d+)?|\.\d+)\s*(hours?|hrs?|oras)\b/);
  if (estimate && watts && hours) {
    const power=Number(watts[1])*(watts[2]==="kw"?1000:1), time=Number(hours[1]);
    const daysMatch=text.match(/(?<![\w.,+-])(-?(?:\d+(?:\.\d+)?|\.\d+))\s*(days?|araw|adlaw)\b/);
    const quantityMatch=text.match(/(?<![\w.,+-])(-?(?:\d+(?:\.\d+)?|\.\d+))\s*(units?|pieces?|pcs)\b/);
    const days=Number(daysMatch?.[1] ?? (/\b(days?|araw|adlaw)\b/.test(text) ? NaN : 30)), quantity=Number(quantityMatch?.[1] ?? (/\b(units?|pieces?|pcs)\b/.test(text) ? NaN : 1));
    const kwh=Number.isInteger(days)&&Number.isInteger(quantity) ? power*time*days*quantity/1000 : NaN;
    add("household",power>0&&time>=0&&time<=24&&days>0&&days<=366&&quantity>0&&quantity<=50&&Number.isFinite(kwh) ? `Estimate: ${number(kwh)} kWh over ${days} days (${number(power)} W × ${number(time)} hours/day × ${quantity} unit${quantity===1?"":"s"}).${positive(context.rate) ? ` About ${peso(kwh*context.rate)} using your saved ${peso(context.rate)}/kWh rate.` : " No saved rate is available for a peso estimate."} This calculation changes no saved appliances and does not measure actual cycling.` : "Check the estimate inputs: positive watts, 0–24 hours a day, 1–366 days and 1–50 units.",link("Open Watt-If","/simulator"));
  } else if (/appliances?|devices?|gamit.*kuryente|list.*(?:fan|aircon)|uses? the most|most energy|pinakamalakas|pinakamalaki.*konsumo/.test(text) || (estimate && context.appliances?.some(item=>text.includes(item.name.toLowerCase())))) {
    const appliances=(context.appliances??[]).filter(item=>positive(item.watts)&&Number.isFinite(item.hours)&&item.hours>=0&&item.hours<=24&&positive(item.quantity));
    const ranked=appliances.map(item=>({...item,kwh:item.watts*item.hours*item.quantity*(item.days??30)/1000})).sort((a,b)=>b.kwh-a.kwh);
    const specific=ranked.filter(item=>text.includes(item.name.toLowerCase()));
    const selectedItems=specific.length ? specific : ranked;
    if (ranked.length) add("household",`Saved appliances (${ranked.length}):\n${selectedItems.slice(0,12).map(item=>`• ${item.name}: ${number(item.kwh)} kWh over ${item.days??30} days${positive(context.rate) ? ` · about ${peso(item.kwh*context.rate)}` : ""} (${item.watts} W, ${item.hours} h/day, ${item.quantity} unit${item.quantity===1?"":"s"})`).join("\n")}\nYour ${ranked[0].name.toLowerCase()} uses the most by these entered estimates. Actual use depends on operating cycles.`,link("Open Appliances","/appliances"));
    else if (context.topAppliance) add("household",`Your ${context.topAppliance.name.toLowerCase()} uses the most: about ${number(context.topAppliance.monthlyKwh)} kWh a month from entered values.`,link("Open Appliances","/appliances"));
    else add("household","Add the appliances you use to get estimates. No saved appliance inputs are available yet.",link("Add appliances","/appliances"));
  }
  if (/provider|location|household|profile|barangay|municipality|pangalan|address|saan.*(?:bahay|home)/.test(text)) add("household",`Saved household: ${context.name??"not set"}.\nProvider: ${context.provider??"not set"}.\nHome location: ${context.location??"not set"}.`,link("Household settings","/settings"));
  if (/\btips?\b|tipid|save energy|saving advice/.test(text) && context.savedTips !== undefined) add("tips",context.savedTips.tips.length ? `Saved tips (${context.savedTips.generatedAt.slice(0,10)}):\n${context.savedTips.tips.slice(0,5).map(tip=>`• ${tip.title}: ${tip.action}`).join("\n")}${context.savedTips.stale ? "\nYour records changed since these tips were saved. Review their older basis in Tipid Tips." : ""}` : "No tips have been saved yet. Open Tipid Tips to create advice from reviewed household inputs.",link("Open Tipid Tips","/tips"));
  if (/scenarios?|watt.?if|simulator/.test(text)) add("scenarios",context.savedScenarios?.length ? `Saved Watt-If scenarios:\n${context.savedScenarios.map(item=>`• ${item.title}: ${number(item.kwh)} kWh over ${item.days} days${positive(item.cost) ? ` · ${peso(item.cost)}` : ""}${item.stale ? " · older appliance basis" : ""}`).join("\n")}\nThese are estimates and do not change your household inputs.` : "No saved scenarios yet. Open Watt-If for an offline calculation using your entered values.",link("Open Watt-If","/simulator"));
  if (/checklist|readiness|brownout.ready|handa|preparation|prepared/.test(text)) add("readiness",context.readinessPlans?.length ? `Saved preparation checklists:\n${context.readinessPlans.map(plan=>`• ${plan.title}: ${plan.checked} of ${plan.total} checked · saved ${plan.updatedAt.slice(0,10)}${plan.stale ? " · source or household changed; review first" : ""}`).join("\n")}\nChecklist progress does not confirm live power status.` : "No preparation checklist is saved yet. Review a saved advisory and create a plan in Brownout Ready.",link("Open Brownout Ready","/brownout-ready"));
  if (/advisories|saved advisory|brownout|outage|interruption|walang kuryente/.test(text) && context.savedAdvisories !== undefined) add("advisories",context.savedAdvisories.length ? `Saved provider notices:\n${context.savedAdvisories.slice(-5).reverse().map(item=>`• ${item.title}: ${item.when} · ${item.area} · ${item.status}${item.stale ? " · review changed household match" : ""}`).join("\n")}\nSaved reviews do not confirm a live outage or restoration.` : `No provider notices are saved for ${context.location??"your area"}. Reconnect for new information; an empty cache does not mean there is no outage.`,link("Open Advisories","/advisories"));
  return sections.length ? {text:sections.join("\n\n"),links} : undefined;
}
