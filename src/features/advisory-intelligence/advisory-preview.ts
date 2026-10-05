export type AdvisoryTab = "active" | "history";
export type AdvisoryType = "scheduled" | "unscheduled" | "notice" | "restored";
export type AdvisoryFilter = AdvisoryType | "all";
export type AdvisoryStatus = "affected" | "possibly-affected" | "not-listed";

export interface PreviewAdvisory {
  id: string;
  tab: AdvisoryTab;
  type: AdvisoryType;
  status: AdvisoryStatus;
  date: string;
  time: string;
  duration?: string;
  area: string;
  reason: string;
}

export const advisoryTypeLabels: Record<AdvisoryType, string> = {
  scheduled: "Scheduled Power Interruption",
  unscheduled: "Unscheduled Interruption",
  notice: "Notice",
  restored: "Restored",
};

export const advisoryStatusLabels: Record<AdvisoryStatus, string> = {
  affected: "Affected",
  "possibly-affected": "Possibly affected",
  "not-listed": "Not listed",
};

export const advisoryPreview: PreviewAdvisory[] = [
  { id: "active-scheduled", tab: "active", type: "scheduled", status: "affected", date: "2026-09-12", time: "9:00 AM – 3:00 PM", duration: "6 hrs", area: "Brgy. Payao, San Jose de Buenavista", reason: "Line maintenance and upgrading works" },
  { id: "active-unscheduled", tab: "active", type: "unscheduled", status: "possibly-affected", date: "2026-09-14", time: "2:00 PM – TBD", area: "Nearby areas", reason: "Technical issue" },
  { id: "active-notice", tab: "active", type: "notice", status: "not-listed", date: "2026-09-16", time: "8:00 AM – 12:00 PM", area: "Some areas in Antique", reason: "System testing activity" },
  { id: "history-scheduled", tab: "history", type: "scheduled", status: "affected", date: "2026-08-28", time: "9:00 AM – 4:00 PM", area: "Brgy. Sto. Niño, San Jose de Buenavista", reason: "Line maintenance" },
  { id: "history-notice", tab: "history", type: "notice", status: "not-listed", date: "2026-08-15", time: "8:00 AM – 12:00 PM", area: "Selected areas in Antique", reason: "System testing activity" },
  { id: "history-restored", tab: "history", type: "restored", status: "possibly-affected", date: "2026-08-10", time: "1:00 PM – 5:00 PM", area: "Brgy. Payao and nearby areas", reason: "Emergency line repair" },
  { id: "history-unscheduled", tab: "history", type: "unscheduled", status: "not-listed", date: "2026-07-22", time: "8:00 AM – 2:00 PM", area: "San Jose de Buenavista", reason: "Equipment maintenance" },
];

export function filterAdvisories(records: PreviewAdvisory[], tab: AdvisoryTab, type: AdvisoryFilter) {
  return records.filter(record => record.tab === tab && (type === "all" || record.type === type));
}

export function formatAdvisoryDate(date: string) {
  const value = new Date(`${date}T00:00:00Z`);
  const day = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(value);
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" }).format(value);
  return `${day} (${weekday})`;
}
