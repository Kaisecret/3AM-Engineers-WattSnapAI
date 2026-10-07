import type { ApplianceKind, PreviewAppliance } from "../dashboard/preview-data";

export interface ScenarioEntry {
  id: string; name: string; kind: ApplianceKind; watts: string; quantity: string; hours: string; included: boolean;
}
export interface PreviewScenario {
  id: string; title: string; baseline: PreviewAppliance[]; entries: ScenarioEntry[];
  days: string; rate: string; rateBasis: string; origin: "household" | "sample"; baselineSignature: string;
}
export interface ScenarioComparison {
  baselineKwh: number; scenarioKwh: number; savingsKwh: number; savingsPercent: number | null;
  baselineCost?: number; scenarioCost?: number; savingsCost?: number;
}
