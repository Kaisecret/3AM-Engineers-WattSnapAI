import { billMonth, guessApplianceKind, maxMonthlySubsidy, pesos, validateAppliance, validateBill, validateBudget, type ApplianceKind, type PreviewAppliance, type PreviewBill, type PreviewHousehold } from "../dashboard/preview-data";
import type { ChatLink } from "./replies";

/** A change WattSnap AI proposes. Nothing is applied until the person confirms it. */
export type AgentAction =
  | { type: "set_budget"; amount: number }
  | { type: "set_monthly_subsidy"; amount: number }
  | { type: "add_appliance"; appliance: Omit<PreviewAppliance, "id"> }
  | { type: "update_appliance"; name: string; changes: Partial<Pick<PreviewAppliance, "watts" | "hours" | "quantity" | "days">> }
  | { type: "remove_appliance"; name: string }
  | { type: "add_bill"; bill: Omit<PreviewBill, "id"> };

export type ParsedAgentCall = { kind: "action"; action: AgentAction } | { kind: "link"; link: ChatLink } | { kind: "invalid"; reason: string };

const kinds: ApplianceKind[] = ["fan", "aircon", "fridge", "tv", "rice-cooker", "washer", "lights", "laptop", "phone", "microwave", "iron", "other"];
const pages: Record<string, ChatLink> = {
  dashboard: { label: "Open Home", href: "/dashboard" },
  bills: { label: "Open Energy", href: "/bills" },
  "add-bill": { label: "Add a bill", href: "/bills/new" },
  appliances: { label: "Open Appliances", href: "/appliances" },
  "add-appliance": { label: "Add a device", href: "/appliances/new" },
  budget: { label: "Open Budget", href: "/budget" },
  tips: { label: "Open Tipid Tips", href: "/tips" },
  simulator: { label: "Open Watt-If", href: "/simulator" },
  advisories: { label: "Open Advisories", href: "/advisories" },
  settings: { label: "Open Settings", href: "/settings" },
  setup: { label: "Open Home setup", href: "/setup" },
};

const number = (description: string) => ({ type: "number", description });
const integer = (description: string) => ({ type: "integer", description });
const text = (description: string) => ({ type: "string", description });

/** Tools declared to Gemini (REST JSON schema). The model proposes; the app validates and asks the person. */
export const agentTools = [{ functionDeclarations: [
  { name: "set_budget", description: "Set the household's monthly electricity budget in Philippine pesos.", parameters: { type: "object", properties: { amount: number("Monthly budget in pesos, e.g. 2500") }, required: ["amount"] } },
  { name: "set_monthly_subsidy", description: "Set the monthly bill subsidy in pesos, e.g. Antique's PEPS of 500. Use 0 to turn it off.", parameters: { type: "object", properties: { amount: number("Monthly subsidy in pesos") }, required: ["amount"] } },
  { name: "add_appliance", description: "Add an appliance the household uses, to estimate its electricity use.", parameters: { type: "object", properties: {
    name: text("Name, e.g. Bedroom fan"), kind: { type: "string", enum: kinds, description: "Appliance type" },
    watts: number("Rated power in watts. If the person did not say, use a typical Philippine value and say it is an estimate."),
    hours: number("Hours it is on per day, 0 to 24"), quantity: integer("How many of the same appliance, default 1"), days: integer("Days used in a month, default 30"),
  }, required: ["name", "watts", "hours"] } },
  { name: "update_appliance", description: "Change the watts, hours per day, quantity or days of an appliance already in the list.", parameters: { type: "object", properties: {
    name: text("Name of the existing appliance"), watts: number("New watts"), hours: number("New hours per day"), quantity: integer("New quantity"), days: integer("New days per month"),
  }, required: ["name"] } },
  { name: "remove_appliance", description: "Remove an appliance from the list.", parameters: { type: "object", properties: { name: text("Name of the existing appliance") }, required: ["name"] } },
  { name: "add_bill", description: "Save a monthly electricity bill. Replaces the bill for the same month if one exists.", parameters: { type: "object", properties: {
    month: text("Billing month as YYYY-MM"), kwh: number("kWh used"), amount: number("Current month bill in pesos, before any subsidy"),
    subsidy: number("Subsidy deducted on the bill in pesos, if any"), dueDate: text("Due date as YYYY-MM-DD, if known"),
  }, required: ["month", "kwh", "amount"] } },
  { name: "open_page", description: "Show a link to a page in the app.", parameters: { type: "object", properties: { page: { type: "string", enum: Object.keys(pages), description: "Page to open" } }, required: ["page"] } },
] }] as const;

function toNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value.replace(/[₱,\s]/g, "")) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : undefined;
}
const money = (value: number) => Math.round(value * 100) / 100;
const cleanName = (value: unknown) => typeof value === "string" ? value.trim().slice(0, 80) : "";
const invalid = (reason: string): ParsedAgentCall => ({ kind: "invalid", reason });

/** Turns a Gemini function call into a checked action, a page link, or a reason it was rejected. */
export function parseAgentCall(name: string, rawArgs: unknown): ParsedAgentCall {
  const args = (rawArgs && typeof rawArgs === "object" ? rawArgs : {}) as Record<string, unknown>;
  switch (name) {
    case "set_budget": {
      const amount = toNumber(args.amount);
      if (amount === undefined || validateBudget(money(amount))) return invalid("That budget amount is not valid.");
      return { kind: "action", action: { type: "set_budget", amount: money(amount) } };
    }
    case "set_monthly_subsidy": {
      const amount = toNumber(args.amount);
      if (amount === undefined || amount < 0 || amount > maxMonthlySubsidy) return invalid("That subsidy amount is not valid.");
      return { kind: "action", action: { type: "set_monthly_subsidy", amount: money(amount) } };
    }
    case "add_appliance": {
      const applianceName = cleanName(args.name);
      const kind = kinds.includes(args.kind as ApplianceKind) ? args.kind as ApplianceKind : guessApplianceKind(applianceName);
      const appliance: Omit<PreviewAppliance, "id"> = { name: applianceName, kind, watts: toNumber(args.watts) ?? Number.NaN, hours: toNumber(args.hours) ?? Number.NaN, quantity: toNumber(args.quantity) ?? 1, days: toNumber(args.days) ?? 30, source: "manual", wattageBasis: "approximate" };
      const issue = validateAppliance(appliance);
      return issue ? invalid(issue) : { kind: "action", action: { type: "add_appliance", appliance } };
    }
    case "update_appliance": {
      const target = cleanName(args.name);
      const changes: Partial<Pick<PreviewAppliance, "watts" | "hours" | "quantity" | "days">> = {};
      for (const field of ["watts", "hours", "quantity", "days"] as const) { const value = toNumber(args[field]); if (value !== undefined) changes[field] = value; }
      if (!target || !Object.keys(changes).length) return invalid("Tell me which appliance and what to change.");
      return { kind: "action", action: { type: "update_appliance", name: target, changes } };
    }
    case "remove_appliance": {
      const target = cleanName(args.name);
      return target ? { kind: "action", action: { type: "remove_appliance", name: target } } : invalid("Tell me which appliance to remove.");
    }
    case "add_bill": {
      const subsidy = toNumber(args.subsidy);
      const bill: Omit<PreviewBill, "id"> = { month: typeof args.month === "string" ? args.month.trim() : "", kwh: toNumber(args.kwh) ?? Number.NaN, amount: money(toNumber(args.amount) ?? Number.NaN), source: "manual",
        ...(subsidy ? { subsidy: money(subsidy) } : {}), ...(typeof args.dueDate === "string" && args.dueDate.trim() ? { dueDate: args.dueDate.trim() } : {}) };
      const issue = validateBill(bill);
      return issue ? invalid(issue) : { kind: "action", action: { type: "add_bill", bill } };
    }
    case "open_page": {
      const link = typeof args.page === "string" ? pages[args.page] : undefined;
      return link ? { kind: "link", link } : invalid("Unknown page.");
    }
    default: return invalid("Unknown action.");
  }
}

function findAppliance(home: Pick<PreviewHousehold, "appliances">, name: string) {
  const wanted = name.trim().toLowerCase();
  return home.appliances.find(item => item.name.toLowerCase() === wanted) ?? home.appliances.find(item => item.name.toLowerCase().includes(wanted) || wanted.includes(item.name.toLowerCase()));
}
const trim = (value: number) => Number(value.toFixed(2)).toString();
const usage = (item: Partial<Pick<PreviewAppliance, "watts" | "hours" | "quantity" | "days">>) => [
  item.watts !== undefined && `${trim(item.watts)} W`, item.hours !== undefined && `${trim(item.hours)} ${item.hours === 1 ? "hr" : "hrs"}/day`,
  item.quantity !== undefined && item.quantity !== 1 && `×${item.quantity}`, item.days !== undefined && item.days !== 30 && `${item.days} days`,
].filter(Boolean).join(" · ");

/** Plain words for the Confirm card. */
export function describeAgentAction(action: AgentAction, home: Pick<PreviewHousehold, "appliances" | "bills">): string {
  switch (action.type) {
    case "set_budget": return `Set your monthly budget to ${pesos(action.amount)}`;
    case "set_monthly_subsidy": return action.amount > 0 ? `Set your monthly subsidy to ${pesos(action.amount)}` : "Turn off the monthly subsidy";
    case "add_appliance": return `Add ${action.appliance.name} · ${usage(action.appliance)}`;
    case "update_appliance": return `Change ${findAppliance(home, action.name)?.name ?? action.name}: ${usage(action.changes)}`;
    case "remove_appliance": return `Remove ${findAppliance(home, action.name)?.name ?? action.name}`;
    case "add_bill": {
      const exists = home.bills.some(item => item.month === action.bill.month);
      return `${exists ? "Replace" : "Add"} your ${billMonth(action.bill.month)} bill: ${trim(action.bill.kwh)} kWh · ${pesos(action.bill.amount)}${action.bill.subsidy ? ` (${pesos(action.bill.subsidy)} subsidy)` : ""}`;
    }
  }
}

const newId = () => typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `ai-${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** The household change for a confirmed action, or why it cannot be applied now. */
export function applyAgentAction(home: Pick<PreviewHousehold, "appliances" | "bills">, action: AgentAction): { patch: Partial<PreviewHousehold> } | { error: string } {
  // Checked again here, so a change is only saved when it is valid for the records on this device.
  switch (action.type) {
    case "set_budget": { const issue = validateBudget(action.amount); return issue ? { error: issue } : { patch: { budget: action.amount } }; }
    case "set_monthly_subsidy": return action.amount >= 0 && action.amount <= maxMonthlySubsidy ? { patch: { monthlySubsidy: action.amount } } : { error: "That subsidy amount is not valid." };
    case "add_appliance": { const issue = validateAppliance(action.appliance); return issue ? { error: issue } : { patch: { appliances: [...home.appliances, { ...action.appliance, id: newId() }] } }; }
    case "update_appliance":
    case "remove_appliance": {
      const target = findAppliance(home, action.name);
      if (!target) return { error: `No appliance named ${action.name} in your list.` };
      if (action.type === "remove_appliance") return { patch: { appliances: home.appliances.filter(item => item.id !== target.id) } };
      const updated = { ...target, ...action.changes };
      const issue = validateAppliance(updated);
      return issue ? { error: issue } : { patch: { appliances: home.appliances.map(item => item.id === target.id ? updated : item) } };
    }
    case "add_bill": { const issue = validateBill(action.bill); return issue ? { error: issue } : { patch: { bills: [...home.bills.filter(item => item.month !== action.bill.month), { ...action.bill, id: newId() }] } }; }
  }
}

/** Applies several confirmed actions in order, each one seeing the result of the one before. */
export function applyAgentActions(home: Pick<PreviewHousehold, "appliances" | "bills">, actions: AgentAction[]) {
  let current = home;
  const patch: Partial<PreviewHousehold> = {};
  const results = actions.map(action => {
    const result = applyAgentAction(current, action);
    if ("patch" in result) { Object.assign(patch, result.patch); current = { ...current, ...result.patch }; }
    return result;
  });
  return { patch, results };
}
