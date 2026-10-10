import { isProviderChoice, validateAppliance, validateBill, type PreviewHousehold } from "../dashboard/preview-data";
import { tipsInputSignature } from "../tipid-tips/preview-tips";
import type { PreviewTipsSnapshot } from "../tipid-tips/types";

export const setupStorageKey = "wattsnap-home-setup-v1";
export const setupChangeEvent = "wattsnap-home-setup-change";
export type SetupState = { version: 1; reviewedTips?: string; acknowledged?: string };
export const initialSetup: SetupState = { version: 1 };
export const setupSteps = [
  { id: "profile", label: "Complete Household Profile", detail: "Save your household name and home location.", href: "/onboarding", action: "Add household details" },
  { id: "provider", label: "Select Electricity Provider", detail: "Confirm the provider printed on your electricity bill.", href: "/onboarding?step=provider", action: "Choose your provider" },
  { id: "bill", label: "Scan Your First Electricity Bill", detail: "Add a bill, check its values, and save your review.", href: "/bills/new", action: "Add your first bill" },
  { id: "appliance", label: "Register Your First Appliance", detail: "Save its rated watts, quantity, and usual operating hours.", href: "/appliances/new", action: "Add an appliance" },
  { id: "tips", label: "Explore Personalized Tipid Tips", detail: "Create tips from your saved records, then confirm you reviewed them.", href: "/tips", action: "Explore your tips" },
] as const;

export function normalizeSetup(value: unknown): SetupState {
  if (!value || typeof value !== "object" || (value as SetupState).version !== 1) throw new Error("Invalid setup progress");
  const data = value as SetupState;
  if ((data.reviewedTips !== undefined && typeof data.reviewedTips !== "string") || (data.acknowledged !== undefined && typeof data.acknowledged !== "string")) throw new Error("Invalid setup progress");
  return { version: 1, ...(data.reviewedTips ? { reviewedTips: data.reviewedTips } : {}), ...(data.acknowledged ? { acknowledged: data.acknowledged } : {}) };
}

export function confirmedSetupRecords(household: PreviewHousehold) {
  return {
    bills: household.bills.filter(bill => !bill.id.startsWith("sample-") && (bill.source === "manual" || bill.source === "scan") && !validateBill(bill)),
    appliances: household.appliances.filter(item => !item.id.startsWith("sample-") && item.source === "manual" && !validateAppliance(item)),
  };
}

export function canReviewSetupTips(household: PreviewHousehold, tips: PreviewTipsSnapshot | null) {
  const records = confirmedSetupRecords(household);
  return !!(records.bills.length && records.appliances.length && tips && tips.origin === "household" && !tips.context.sample && tips.inputSignature === tipsInputSignature(household));
}

export function deriveSetupProgress(household: PreviewHousehold, tips: PreviewTipsSnapshot | null, saved: SetupState = initialSetup) {
  const records = confirmedSetupRecords(household);
  const complete = [
    !!(household.name.trim() && household.location?.trim() && household.locality?.province.trim() && household.locality?.municipality.trim()),
    isProviderChoice(household.provider),
    records.bills.length > 0,
    records.appliances.length > 0,
    canReviewSetupTips(household, tips) && saved.reviewedTips === tips!.inputSignature,
  ];
  const steps = setupSteps.map((step, index) => ({ ...step, complete: complete[index] }));
  const count = steps.filter(step => step.complete).length;
  const signature = JSON.stringify([household.name, household.location, household.locality, household.provider, tipsInputSignature(household)]);
  return { steps, count, percent: count * 20, next: steps.find(step => !step.complete), complete: count === 5, signature, dismissed: count === 5 && saved.acknowledged === signature };
}
