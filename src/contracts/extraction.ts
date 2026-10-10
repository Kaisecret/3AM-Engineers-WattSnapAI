/** Future integration contracts only. All returned values require frontend validation and review. */
import type { ApplianceKind } from "../features/dashboard/preview-data";
import type { AdvisoryArea, AdvisoryDetails } from "../features/advisory-intelligence/types";

interface ReviewableExtraction {
  reviewRequired: true;
  unknownFields: string[];
  sourceReference?: string;
}

/** One charge group on a bill, e.g. "Distribution" ₱480.27. Refunds can be negative. */
export interface BillCharge { label: string; amount: number; }

export interface BillExtractionResult extends ReviewableExtraction {
  /** Utility name as printed, and WattSnap's provider id when it is a listed one. */
  provider?: string | null;
  providerId?: string | null;
  billingMonth?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  /** Statement date. */
  billingDate?: string | null;
  /** Current month bill before any subsidy or past balance (what WattSnap saves as the bill amount). */
  amountDue?: number | null;
  /** Government subsidy deducted on the bill, e.g. Antique PEPS. */
  subsidy?: number | null;
  /** The printed amount left to pay after the subsidy. */
  amountPayable?: number | null;
  dueDate?: string | null;
  consumptionKwh?: number | null;
  previousReading?: number | null;
  presentReading?: number | null;
  multiplier?: number | null;
  charges?: BillCharge[];
  /** Values that disagree with each other, for the person to check. */
  checks?: string[];
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
