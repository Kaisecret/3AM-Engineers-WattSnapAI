import { sortBillsByMonth, type PreviewBill } from "./preview-data";
import { manilaMonth } from "./next-month-forecast";

export type BillHistoryFilter = "recent" | "all" | "this-year" | "last-year" | `${number}`;

export function filterBillHistory(bills: PreviewBill[], filter: BillHistoryFilter, now = new Date()): PreviewBill[] {
  const sorted = sortBillsByMonth(bills);
  if (filter === "all") return sorted;
  if (filter === "recent") return sorted.slice(-6);
  const currentYear = Number(manilaMonth(now).slice(0, 4));
  const year = filter === "this-year" ? currentYear : filter === "last-year" ? currentYear - 1 : Number(filter);
  return sorted.filter(bill => Number(bill.month.slice(0, 4)) === year);
}

export function billHistoryFilters(bills: PreviewBill[], now = new Date()): Array<{ value: BillHistoryFilter; label: string }> {
  const year = Number(manilaMonth(now).slice(0, 4));
  const years = [...new Set(bills.map(bill => bill.month.slice(0, 4)))].sort().reverse();
  return [
    { value: "recent", label: "Recent 6 bills" }, { value: "all", label: "All years" },
    { value: "this-year", label: `This year (${year})` }, { value: "last-year", label: `Last year (${year - 1})` },
    ...years.map(value => ({ value: value as `${number}`, label: value })),
  ];
}
