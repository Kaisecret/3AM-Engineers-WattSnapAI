export type TipCategory = "appliance" | "bill" | "getting-started";
export interface PreviewTip {
  id: string; category: TipCategory; title: string; action: string; reason: string;
  facts: string[]; assumptions: string[]; sample: boolean;
  link: { label: string; href: string }; guidance?: { label: string; href: string };
}
export interface PreviewTipsSnapshot {
  version: "tips-ui-v1"; generatedAt: string; inputSignature: string; origin: "household" | "sample";
  context: { billCount: number; applianceCount: number; sample: boolean; limitations: string[] };
  tips: PreviewTip[];
}
