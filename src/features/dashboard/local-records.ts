import type { PreviewAppliance, PreviewBill, PreviewHousehold } from "./preview-data";

export const isExampleRecord = (record: PreviewBill | PreviewAppliance) => record.source === "sample" || record.id.startsWith("sample-") || record.id.startsWith("example-");
/** Hide old fixtures from actual statistics without altering stored records. */
export function householdRecords(home: PreviewHousehold): PreviewHousehold {
  return { ...home, bills: home.bills.filter(item => !isExampleRecord(item)), appliances: home.appliances.filter(item => !isExampleRecord(item)) };
}
/** An ordinary edit preserves legacy fixtures that are absent from the actual-data view. */
export function mergeHouseholdRecords(home: PreviewHousehold, patch: Partial<PreviewHousehold>): PreviewHousehold {
  return { ...home, ...patch,
    ...(patch.bills ? { bills: [...home.bills.filter(isExampleRecord), ...patch.bills.filter(item => !isExampleRecord(item))] } : {}),
    ...(patch.appliances ? { appliances: [...home.appliances.filter(isExampleRecord), ...patch.appliances.filter(item => !isExampleRecord(item))] } : {}),
  };
}
