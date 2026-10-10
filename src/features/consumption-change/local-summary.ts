import type { PreviewBill } from "../dashboard/preview-data";

export const notableChangePercent = 20;
export function consumptionChange(current: PreviewBill, previous: PreviewBill) {
  const difference = current.kwh - previous.kwh;
  const percentage = previous.kwh > 0 ? difference / previous.kwh * 100 : null;
  const label = difference === 0 ? "No change" : percentage === null ? "Percentage unavailable" : Math.abs(percentage) >= notableChangePercent ? difference > 0 ? "Notable increase" : "Notable decrease" : "Small change";
  const days = (bill: PreviewBill) => bill.periodStart && bill.periodEnd ? (Date.parse(`${bill.periodEnd}T00:00:00Z`) - Date.parse(`${bill.periodStart}T00:00:00Z`)) / 86400000 + 1 : null;
  const currentDays = days(current), previousDays = days(previous);
  const note = currentDays !== null && previousDays !== null ? currentDays === previousDays ? "The recorded periods cover the same number of days." : "These billing periods cover different numbers of days. Compare daily use before drawing conclusions." : "Billing-period lengths are unknown. This comparison uses recorded totals.";
  return { difference, percentage, label, note, threshold: notableChangePercent };
}
