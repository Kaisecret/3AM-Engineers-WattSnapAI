import { dailyApplianceKwh, guessApplianceKind, validateAppliance, type PreviewAppliance } from "../dashboard/preview-data";
import type { PreviewScenario, ScenarioComparison, ScenarioEntry } from "./types";

export const scenariosStorageKey = "wattsnap-scenarios-ui-preview-v1";
export function applianceSignature(appliances: PreviewAppliance[]) {
  return JSON.stringify([...appliances].sort((a, b) => a.id.localeCompare(b.id)).map(item => [item.id, item.name, item.model ?? "", item.watts, item.quantity, item.hours, item.days ?? 30, item.kind ?? guessApplianceKind(item.name), item.source ?? "", item.wattageBasis ?? "approximate"]));
}
export function scenarioEntries(appliances: PreviewAppliance[]): ScenarioEntry[] {
  return appliances.map(item => ({ id: item.id, name: item.name, kind: item.kind ?? guessApplianceKind(item.name), watts: String(item.watts), quantity: String(item.quantity), hours: String(item.hours), included: true }));
}
export function createScenario(appliances: PreviewAppliance[], id: string): PreviewScenario {
  return { id, title: "My Watt-If scenario", baseline: appliances.map(item => ({ ...item })), entries: scenarioEntries(appliances), days: "30", rate: "", rateBasis: "", origin: "household", baselineSignature: applianceSignature(appliances) };
}
export function compareScenario(scenario: PreviewScenario): { comparison: ScenarioComparison; error?: never } | { error: string; comparison?: never } {
  const days = Number(scenario.days);
  if (!scenario.days.trim() || !Number.isInteger(days) || days < 1 || days > 366) return { error: "Use a whole number from 1 to 366 for the comparison period." };
  if (!scenario.baseline.length) return { error: "Add a baseline appliance or choose a sample scenario first." };
  if (scenario.baseline.some(item => validateAppliance(item))) return { error: "The baseline has missing or invalid appliance inputs. Refresh it from reviewed appliances." };
  let scenarioKwh = 0;
  for (const entry of scenario.entries) {
    if (!entry.included) continue;
    if (!entry.watts.trim() || !entry.hours.trim() || !entry.quantity.trim()) return { error: `Enter the watts, quantity, and daily hours for ${entry.name.trim() || "your scenario appliance"}.` };
    const appliance = { name: entry.name, watts: Number(entry.watts), quantity: Number(entry.quantity), hours: Number(entry.hours) };
    const issue = validateAppliance(appliance);
    if (issue) return { error: `${entry.name.trim() || "Scenario appliance"}: ${issue}` };
    scenarioKwh += dailyApplianceKwh(appliance) * days;
  }
  const baselineKwh = scenario.baseline.reduce((sum, item) => sum + dailyApplianceKwh(item) * days, 0);
  if (!Number.isFinite(baselineKwh) || !Number.isFinite(scenarioKwh)) return { error: "These inputs produce an estimate too large to display. Check the power, quantity, hours, and period." };
  const savingsKwh = baselineKwh - scenarioKwh;
  const comparison: ScenarioComparison = { baselineKwh, scenarioKwh, savingsKwh, savingsPercent: baselineKwh > 0 ? savingsKwh / baselineKwh * 100 : null };
  if (scenario.rate.trim()) {
    const rate = Number(scenario.rate);
    if (!Number.isFinite(rate) || rate <= 0) return { error: "Enter a rate greater than zero in pesos per kWh, or leave it blank for energy-only results." };
    comparison.baselineCost = baselineKwh * rate; comparison.scenarioCost = scenarioKwh * rate; comparison.savingsCost = savingsKwh * rate;
    if (![comparison.baselineCost, comparison.scenarioCost, comparison.savingsCost].every(Number.isFinite)) return { error: "This rate produces an amount too large to display. Check the rate or leave it blank." };
  }
  return { comparison };
}
export function isStaleScenario(scenario: PreviewScenario, appliances: PreviewAppliance[]) {
  return scenario.origin === "household" && scenario.baselineSignature !== applianceSignature(appliances);
}
const kinds = new Set(["fan", "aircon", "fridge", "tv", "rice-cooker", "washer", "lights", "laptop", "phone", "microwave", "iron", "other"]);
/** Read only complete, valid UI snapshots; never merge them into household records. */
export function normalizeScenarios(value: unknown): PreviewScenario[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is PreviewScenario => {
    if (!item || typeof item !== "object" || typeof item.id !== "string" || typeof item.title !== "string" || !item.title.trim() || item.title.length > 60 || !Array.isArray(item.baseline) || !Array.isArray(item.entries) || typeof item.days !== "string" || typeof item.rate !== "string" || typeof item.rateBasis !== "string" || typeof item.baselineSignature !== "string" || !["household", "sample"].includes(item.origin)) return false;
    if (item.baseline.some((entry: PreviewAppliance) => !entry || typeof entry.id !== "string" || typeof entry.name !== "string" || validateAppliance(entry))) return false;
    if (item.entries.some((entry: ScenarioEntry) => !entry || typeof entry.id !== "string" || typeof entry.name !== "string" || entry.name.length > 80 || !kinds.has(entry.kind) || typeof entry.watts !== "string" || typeof entry.quantity !== "string" || typeof entry.hours !== "string" || typeof entry.included !== "boolean")) return false;
    if (new Set(item.entries.map((entry: ScenarioEntry) => entry.id)).size !== item.entries.length) return false;
    if (applianceSignature(item.baseline) !== item.baselineSignature) return false;
    return !compareScenario(item).error;
  });
}
