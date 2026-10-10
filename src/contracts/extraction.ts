/** Future integration contracts only. All returned values require frontend validation and review. */
import type { ApplianceKind } from "../features/dashboard/preview-data";
import type { AdvisoryArea, AdvisoryDetails } from "../features/advisory-intelligence/types";

interface ReviewableExtraction {
  reviewRequired: true;
  unknownFields: string[];
  sourceReference?: string;
}

export interface BillExtractionResult extends ReviewableExtraction {
  provider?: string | null;
  billingMonth?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  billingDate?: string | null;
  /** Current month bill before any subsidy or past balance (what WattSnap saves as the bill amount). */
  amountDue?: number | null;
  /** Government subsidy deducted on the bill, e.g. Antique PEPS. */
  subsidy?: number | null;
  dueDate?: string | null;
  consumptionKwh?: number | null;
  notes?: string | null;
}

export interface ApplianceLabelExtractionResult extends ReviewableExtraction {
  applianceName?: string | null;
  applianceType?: ApplianceKind | null;
  model?: string | null;
  ratedPower?: number | null;
  powerUnit?: "W" | "kW" | "V" | "VA" | null;
}

export interface AdvisoryAnalysisResult extends ReviewableExtraction {
  provider?: string | null;
  type?: AdvisoryDetails["type"] | null;
  affectedAreas?: AdvisoryArea[];
  date?: string | null;
  startTime?: string | null;
  endDate?: string | null;
  endTime?: string | null;
  expectedRestoration?: string | null;
  reason?: string | null;
  simplifiedExplanation?: string | null;
}

export interface TipRecommendation {
  id: string;
  title: string;
  explanation: string;
  action: string;
  relatedApplianceIds?: string[];
  relatedBillIds?: string[];
  assumptions: string[];
  origin: "local-rule" | "future-model";
}
