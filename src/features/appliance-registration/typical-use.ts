import type { ApplianceKind } from "../dashboard/preview-data";

export type TypicalUse = { label: string; watts: [low: number, high: number]; hours?: string };

// Common Philippine household ranges, shown only as guidance when the label is missing.
// The form never fills them in: people still type the watts they read or choose to estimate.
const guides: Partial<Record<ApplianceKind, TypicalUse>> = {
  fan: { label: "electric fan", watts: [45, 75] },
  aircon: { label: "air conditioner (1–1.5 HP)", watts: [750, 1500], hours: "Inverter models often use less than the label." },
  fridge: { label: "refrigerator", watts: [100, 200], hours: "It switches on and off: count about 8–12 hours, not 24." },
  tv: { label: "LED television", watts: [40, 100] },
  "rice-cooker": { label: "rice cooker", watts: [500, 700], hours: "Count the cooking time, about 1 hour a day." },
  washer: { label: "washing machine", watts: [300, 500], hours: "Count washing time on laundry days only." },
  lights: { label: "LED bulb", watts: [7, 12], hours: "Same bulbs? Add them once and set Quantity." },
  laptop: { label: "laptop", watts: [45, 65], hours: "A desktop computer usually uses 150–300 W." },
  phone: { label: "phone charger", watts: [5, 20] },
  microwave: { label: "microwave", watts: [800, 1200], hours: "Usually under 30 minutes a day (0.5 hours)." },
  iron: { label: "flat iron", watts: [1000, 1200], hours: "Count only the time you iron." },
};

export function typicalUse(kind: ApplianceKind): TypicalUse | null {
  return guides[kind] ?? null;
}
