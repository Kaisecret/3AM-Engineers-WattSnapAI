import type { ApplianceLabelExtractionResult } from "../../contracts/extraction";
import { guessApplianceKind, type ApplianceKind, type PreviewAppliance } from "../dashboard/preview-data";

/** What the Add / Edit appliance popup holds while the person types. */
export type ApplianceDraft = {
  kind: ApplianceKind; name: string; model: string; power: string; unit: "W" | "kW";
  hours: string; quantity: number; days: string; wattageBasis: "nameplate" | "approximate";
};

export const blankDraft: ApplianceDraft = { kind: "other", name: "", model: "", power: "", unit: "W", hours: "", quantity: 1, days: "30", wattageBasis: "nameplate" };

export function draftFrom(item?: PreviewAppliance): ApplianceDraft {
  if (!item) return blankDraft;
  return { kind: item.kind ?? guessApplianceKind(item.name), name: item.name, model: item.model ?? "", power: String(item.watts), unit: "W", hours: String(item.hours), quantity: item.quantity, days: String(item.days ?? 30), wattageBasis: item.wattageBasis ?? "approximate" };
}

/** What a label reading adds to the form: only the fields still empty, so typed values are never replaced. Hours are never read. */
export function labelPatch(draft: ApplianceDraft, label: ApplianceLabelExtractionResult): Partial<ApplianceDraft> {
  const patch: Partial<ApplianceDraft> = {};
  if (draft.kind === "other" && label.applianceType && label.applianceType !== "other") patch.kind = label.applianceType;
  if (!draft.name.trim() && label.applianceName) patch.name = label.applianceName;
  if (!draft.model.trim() && label.model) patch.model = label.model;
  if (!draft.power.trim() && label.ratedPower) { patch.power = String(label.ratedPower); patch.unit = "W"; patch.wattageBasis = "nameplate"; }
  return patch;
}

/** kW is converted once; blank fields stay invalid (never zero) so validation asks for them. */
export function applianceFrom(draft: ApplianceDraft): Omit<PreviewAppliance, "id"> {
  return {
    name: draft.name.trim(), model: draft.model.trim() || undefined, kind: draft.kind,
    watts: draft.power.trim() ? Number(draft.power) * (draft.unit === "kW" ? 1000 : 1) : Number.NaN,
    hours: draft.hours.trim() ? Number(draft.hours) : Number.NaN, quantity: draft.quantity,
    days: draft.days.trim() ? Number(draft.days) : Number.NaN, wattageBasis: draft.wattageBasis,
  };
}
