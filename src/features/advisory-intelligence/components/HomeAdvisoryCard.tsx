"use client";
import Link from "next/link";
import { ChevronRight, Megaphone } from "lucide-react";
import { PowerLinesArtwork } from "@/features/dashboard/components/DashboardArtwork";
import { usePreviewHousehold } from "@/features/dashboard/use-preview-household";
import { usePreviewAdvisories } from "../use-preview-advisories";
import { advisoryTypeLabels, formatAdvisoryDate } from "../advisory-preview";
import { advisoryTab, matchIsStale, matchPreviewAdvisory, publishedStart, scheduleLabel } from "../review-preview";

export default function HomeAdvisoryCard() {
  const saved = usePreviewAdvisories(), { household } = usePreviewHousehold();
  const stale = saved.records.some(record => matchIsStale(record, household)), matches = saved.records.filter(record => matchPreviewAdvisory(record.details, household).status === "affected").length;
  // The soonest current interruption collected from ANTECO’s page that lists this household’s area.
  const collected = saved.records.filter(record => record.original.feed && ["scheduled", "unscheduled"].includes(record.details.type) && advisoryTab(record) === "active" && !matchIsStale(record, household) && matchPreviewAdvisory(record.details, household).status === "affected")
    .sort((a, b) => (publishedStart(a.details) ?? Infinity) - (publishedStart(b.details) ?? Infinity))[0];
  if (collected) return <section className="ws-advisory" aria-labelledby="ws-advisory-title"><span className="ws-megaphone"><Megaphone aria-hidden="true" /></span><div className="ws-advisory-copy"><h2 id="ws-advisory-title">ANTECO: {advisoryTypeLabels[collected.details.type].toLowerCase()}{collected.details.date ? ` on ${formatAdvisoryDate(collected.details.date)}` : ""}</h2><p>{scheduleLabel(collected.details)}. Your area is listed. Read by AI from ANTECO’s post: check the original.</p></div><span className="ws-power-lines"><PowerLinesArtwork /></span><Link href={`/advisories?reviewed=${encodeURIComponent(collected.id)}&checklist=1`} className="ws-advisory-link">Prepare<ChevronRight aria-hidden="true" /></Link></section>;
  return <section className="ws-advisory" aria-labelledby="ws-advisory-title"><span className="ws-megaphone"><Megaphone aria-hidden="true" /></span><div className="ws-advisory-copy"><h2 id="ws-advisory-title">{stale ? "Review advisory matches" : saved.records.length ? `${matches} saved ${matches === 1 ? "notice matches" : "notices match"} your inputs` : "Review provider advisories"}</h2><p>{stale ? "Your household location or provider changed." : "Saved reviews do not confirm live power status."}</p></div><span className="ws-power-lines"><PowerLinesArtwork /></span><Link href="/advisories" className="ws-advisory-link">View Advisories<ChevronRight aria-hidden="true" /></Link></section>;
}
