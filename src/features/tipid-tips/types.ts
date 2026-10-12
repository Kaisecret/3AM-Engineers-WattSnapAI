export type TipCategory = "appliance" | "bill" | "getting-started";
/** What a tip offers, in plain words. The app computes it; WattSnap AI never rewrites it. */
export interface TipBenefit { tone: "save" | "cost" | "warn" | "info"; label: string; value: string; detail?: string; }
export interface PreviewTip {
  id: string; category: TipCategory; title: string; action: string; reason: string;
  benefit?: TipBenefit;
  facts: string[]; assumptions: string[]; sample: boolean;
  link: { label: string; href: string }; guidance?: { label: string; href: string };
}
export interface PreviewTipsSnapshot {
  forecast?: import("./bill-forecast").BillForecast;
  source?: "gemini" | "local-rule";
  version: "tips-ui-v1"; generatedAt: string; inputSignature: string; origin: "household" | "sample";
  context: { billCount: number; applianceCount: number; sample: boolean; limitations: string[] };
  tips: PreviewTip[];
}
