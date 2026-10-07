import { dailyApplianceKwh, validateAppliance, type ApplianceKind, type PreviewAppliance } from "../dashboard/preview-data";

export type NameplateDraft = {
  kind: ApplianceKind; name: string; model: string; power: string; unit: string;
  hours: string; quantity: string; days: string; wattageBasis: "nameplate" | "approximate";
};
export const blankNameplate: NameplateDraft = { kind: "other", name: "", model: "", power: "", unit: "W", hours: "", quantity: "1", days: "30", wattageBasis: "nameplate" };
export const sampleNameplates = {
  complete: { name: "Electric fan", model: "WS-F55", power: "55", voltage: "230 V", frequency: "60 Hz", kind: "fan" as ApplianceKind },
  voltage: { name: "Electric fan", model: "WS-V230", power: "", voltage: "230 V", frequency: "60 Hz", kind: "fan" as ApplianceKind },
};
export function sampleNameplateDraft(type: keyof typeof sampleNameplates): NameplateDraft {
  const sample = sampleNameplates[type];
  return { ...blankNameplate, name: sample.name, model: sample.model, power: sample.power, kind: sample.kind };
}
export function reviewNameplate(draft: NameplateDraft, source: "manual" | "sample"):
  { error: string; appliance?: never } | { appliance: Omit<PreviewAppliance, "id">; error?: never } {
  if (!draft.power.trim()) return { error: "Wattage is missing. Enter rated power in W or kW from the label, or mark your own estimate as approximate." };
  if (draft.unit !== "W" && draft.unit !== "kW") return { error: "Use W or kW for rated power. Voltage and VA alone do not tell us the appliance’s wattage." };
  if (!draft.hours.trim()) return { error: "Enter daily usage hours. Use 0 for an appliance you are not using in this period." };
  if (!draft.quantity.trim() || !draft.days.trim()) return { error: "Enter the quantity and days in this period." };
  const appliance: Omit<PreviewAppliance, "id"> = {
    name: draft.name.trim(), model: draft.model.trim() || undefined, kind: draft.kind,
    watts: Number(draft.power) * (draft.unit === "kW" ? 1000 : 1), hours: Number(draft.hours),
    quantity: Number(draft.quantity), days: Number(draft.days), source, wattageBasis: draft.wattageBasis,
  };
  const issue = validateAppliance(appliance);
  return issue ? { error: issue } : { appliance };
}
export function nameplateEstimate(appliance: Omit<PreviewAppliance, "id">) {
  return dailyApplianceKwh(appliance) * (appliance.days ?? 30);
}
