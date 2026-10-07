import type { ReviewedAdvisory } from "../advisory-intelligence/types";

export type PreparationId = "charge" | "work" | "lights" | "unplug" | "fridge";
export interface BrownoutPreviewPlan {
  version: "brownout-ui-v1";
  id: string;
  advisory: ReviewedAdvisory;
  relevanceConfirmed: boolean;
  sourceConfirmed: boolean;
  checked: PreparationId[];
  acknowledgedUpdates: { id: string; revision: number }[];
  createdAt: string;
  updatedAt: string;
}
