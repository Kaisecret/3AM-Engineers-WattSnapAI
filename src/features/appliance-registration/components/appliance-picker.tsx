"use client";

import { AirVent, CookingPot, Fan, Laptop, Lightbulb, Microwave, Plug, Refrigerator, Shirt, Smartphone, Tv, WashingMachine, type LucideIcon } from "lucide-react";
import { appliancePresets, type ApplianceKind } from "@/features/dashboard/preview-data";

export const applianceIcons: Record<ApplianceKind, LucideIcon> = { fan: Fan, aircon: AirVent, fridge: Refrigerator, tv: Tv, "rice-cooker": CookingPot, washer: WashingMachine, lights: Lightbulb, laptop: Laptop, phone: Smartphone, microwave: Microwave, iron: Shirt, other: Plug };
const labels: Record<ApplianceKind, string> = { fan: "Fan", aircon: "Aircon", fridge: "Fridge", tv: "TV", "rice-cooker": "Rice cooker", washer: "Washer", lights: "Lights", laptop: "Laptop", phone: "Charger", microwave: "Microwave", iron: "Iron", other: "Other" };

export default function AppliancePicker({ value, onChange }: { value: ApplianceKind; onChange: (kind: ApplianceKind) => void }) {
  return <fieldset className="ap-presets"><legend>Appliance type</legend>
    {appliancePresets.map(preset => { const Icon = applianceIcons[preset.kind]; return <label key={preset.kind} className={value === preset.kind ? "is-selected" : ""}><input type="radio" name="kind" value={preset.kind} checked={value === preset.kind} onChange={() => onChange(preset.kind)} /><Icon aria-hidden="true" /><span>{labels[preset.kind]}</span></label>; })}
  </fieldset>;
}
