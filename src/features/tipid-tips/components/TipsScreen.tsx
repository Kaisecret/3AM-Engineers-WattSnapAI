"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { Check, Clock3, Info, Lightbulb, PlugZap, ReceiptText, RotateCcw, Sparkles, TriangleAlert } from "lucide-react";
import PageShell from "@/features/dashboard/components/PageShell";
import { usePreviewHousehold } from "@/features/dashboard/use-preview-household";
import { generatePreviewTips, tipsAreStale } from "../preview-tips";
import { usePreviewTips } from "../use-preview-tips";
import TipsSetupReview from "@/features/onboarding/components/TipsSetupReview";
import TipsList from "./tips-list";

const dateLabel = (date: string) => new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(date));
export default function TipsScreen() {
  const { household, ready: householdReady, storageError } = usePreviewHousehold();
  const saved = usePreviewTips();
  const [filter, setFilter] = useState<"all" | "appliance" | "bill">("all");
  const [message, setMessage] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const ready = householdReady && saved.ready;
  const snapshot = saved.snapshot;
  const stale = snapshot ? tipsAreStale(snapshot, household) : false;
  function refresh() {
    if (!ready) return;
    const next = generatePreviewTips(household);
    if (saved.save(next)) { setFilter("all"); setMessage("Tips saved."); heading.current?.focus(); }
  }

  return <PageShell title="Tipid Tips" active="Home" className="tt-page">
    <section className="ui-panel tt-inputs" aria-labelledby="tt-inputs-heading"><div className="tt-inputs-heading"><span><Lightbulb aria-hidden="true" /></span><h2 id="tt-inputs-heading">Your saved records</h2></div><div className="tt-input-counts"><Link href="/bills"><ReceiptText aria-hidden="true" /><strong>{ready ? household.bills.length : "—"}</strong><span>Bills</span></Link><Link href="/appliances"><PlugZap aria-hidden="true" /><strong>{ready ? household.appliances.length : "—"}</strong><span>Appliances</span></Link></div><div className="tt-refresh-actions"><button type="button" className="ui-primary" disabled={!ready} onClick={() => refresh()}><RotateCcw size={17} aria-hidden="true" />{snapshot ? "Refresh tips" : "Create tips"}</button></div><p className="tt-preview-note">Personalized from your saved records.</p></section>
    {!ready && <div className="tt-loading" role="status"><Clock3 aria-hidden="true" />Loading your saved tips and inputs…</div>}
    {saved.error && <p className="ui-error" role="alert">{saved.error}</p>}{storageError && <p className="ui-error" role="alert">{storageError}</p>}{message && <p className="ui-success" role="status">{message}</p>}
    {snapshot ? <>
      <section className={`ui-panel tt-freshness${stale ? " is-stale" : ""}`} aria-labelledby="tt-freshness-heading"><div><span className="tt-freshness-icon">{stale ? <TriangleAlert aria-hidden="true" /> : snapshot.origin === "sample" ? <Sparkles aria-hidden="true" /> : <Check aria-hidden="true" />}</span><div><h2 id="tt-freshness-heading" ref={heading} tabIndex={-1}>{stale ? "Time to refresh" : snapshot.origin === "sample" ? "Sample tips" : "Tips are up to date"}</h2><p>{stale ? "Refresh to include your latest records." : snapshot.origin === "sample" ? "Examples only. Your records are unchanged." : "Based on your latest saved records."}</p></div></div><dl><div><dt>Created</dt><dd><time dateTime={snapshot.generatedAt}>{dateLabel(snapshot.generatedAt)}</time></dd></div><div><dt>Records used</dt><dd>{snapshot.context.billCount} bills · {snapshot.context.applianceCount} appliances{snapshot.context.sample && " · Includes samples"}</dd></div></dl></section>
      {snapshot.context.sample && <div className="tt-note"><Info aria-hidden="true" /><p><strong>Includes sample data · UI preview</strong>Tips and calculations based on example records remain labeled Sample.</p></div>}
      {!!snapshot.context.limitations.length && <details className="ui-panel tt-limitations"><summary>About these estimates<Info size={16} aria-hidden="true" /></summary><ul>{snapshot.context.limitations.map(limitation => <li key={limitation}>{limitation}</li>)}</ul></details>}
      <div className="tt-list-heading"><h2>Ideas to review</h2><div className="tt-filters" role="group" aria-label="Filter tips">{(["all", "appliance", "bill"] as const).map(value => <button type="button" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value === "all" ? "All tips" : value === "appliance" ? "Appliances" : "Bills"}</button>)}</div></div>
      <TipsList tips={snapshot.tips} filter={filter} sample={snapshot.origin === "sample"} />
      <section className="tt-next"><Lightbulb aria-hidden="true" /><div><h2>Try a small change</h2><p>Compare its estimated impact in Watt-If.</p></div><Link href="/simulator">Open Watt-If</Link></section>
    </> : ready ? <section className="tt-empty"><Lightbulb aria-hidden="true" /><h2>No tips yet</h2><p>Tap Create tips to get started.</p></section> : null}
    <TipsSetupReview />

  </PageShell>;
}
