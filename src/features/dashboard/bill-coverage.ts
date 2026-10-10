export type BillCoverage = { percent: number; status: "under" | "close" | "over" };

/** How much of a bill's kWh the registered appliances explain, so missing devices or wrong hours stand out. */
export function billCoverage(applianceKwh: number, billKwh: number): BillCoverage | null {
  if (!(applianceKwh > 0) || !(billKwh > 0)) return null;
  const percent = Math.round(applianceKwh / billKwh * 100);
  return { percent, status: percent > 110 ? "over" : percent >= 80 ? "close" : "under" };
}
