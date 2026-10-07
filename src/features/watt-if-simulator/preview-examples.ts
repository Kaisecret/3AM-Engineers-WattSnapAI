import type { PreviewAppliance } from "../dashboard/preview-data";
import { createScenario } from "./calculations";

export const scenarioExamples = [
  { id: "aircon", title: "Fewer aircon hours", description: "1,000 W · from 8 to 5 hours/day", icon: "aircon" },
  { id: "led", title: "Switch to LED bulbs", description: "Four bulbs · from 100 W to 12 W", icon: "lights" },
  { id: "fan", title: "Use a fan part of the day", description: "5 hours of aircon + 3 hours of fan", icon: "fan" },
] as const;
export type ScenarioExample = typeof scenarioExamples[number]["id"];
export function exampleScenario(type: ScenarioExample, id: string) {
  const baseline: PreviewAppliance[] = type === "led"
    ? [{ id: "sample-bulbs", name: "Incandescent bulbs", kind: "lights", watts: 100, hours: 6, quantity: 4, source: "sample", wattageBasis: "approximate" }]
    : [{ id: "sample-aircon", name: "Air conditioner", kind: "aircon", watts: 1000, hours: 8, quantity: 1, source: "sample", wattageBasis: "approximate" }];
  const scenario = createScenario(baseline, id);
  scenario.origin = "sample"; scenario.title = scenarioExamples.find(example => example.id === type)!.title;
  if (type === "led") scenario.entries[0] = { ...scenario.entries[0], name: "LED bulbs", watts: "12" };
  else scenario.entries[0].hours = "5";
  if (type === "fan") scenario.entries.push({ id: "sample-fan-substitution", name: "Electric fan", kind: "fan", watts: "55", hours: "3", quantity: "1", included: true });
  return scenario;
}
