import type { PreviewHousehold } from "../dashboard/preview-data";
import type { AdvisoryStatus, AdvisoryType } from "./advisory-preview";

export type AdvisorySample = "scheduled" | "uncertain" | "not-listed" | "restored" | "notice";
export interface AdvisoryOriginal { kind: "text" | "image" | "sample"; name: string; text: string; image?: string; capturedAt: string; sample?: AdvisorySample; }
export interface AdvisoryArea { province: string; municipality: string; barangay: string; scope: "barangay" | "municipality" | "uncertain"; }
export interface AdvisoryDetails {
  type: AdvisoryType; title: string; provider: string; publisher: string; sourceUrl: string;
  date: string; startTime: string; endDate: string; endTime: string; expectedRestoration: string;
  areaText: string; areas: AdvisoryArea[]; reason: string; relatedId: string;
}
export interface AdvisoryMatch { status: AdvisoryStatus; rationale: string[]; householdSignature: string; householdBasis: Pick<PreviewHousehold, "location" | "provider" | "locality">; matchedAt: string; }
export interface ReviewedAdvisory { version: "advisory-ui-v1"; id: string; revision: number; createdAt: string; reviewedAt: string; original: AdvisoryOriginal; details: AdvisoryDetails; match: AdvisoryMatch; }
