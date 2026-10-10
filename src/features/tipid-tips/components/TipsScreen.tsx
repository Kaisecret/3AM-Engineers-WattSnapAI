"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Check, Clock3, Info, Lightbulb, PlugZap, ReceiptText, RotateCcw, Sparkles, TriangleAlert, WifiOff } from "lucide-react";
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
  const [offline, setOffline] = useState(false);
  const [filter, setFilter] = useState<"all" | "appliance" | "bill">("all");
  const [message, setMessage] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const ready = householdReady && saved.ready;
  const snapshot = saved.snapshot;
  const stale = snapshot ? tipsAreStale(snapshot, household) : false;
  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine); sync(); window.addEventListener("online", sync); window.addEventListener("offline", sync);
    return () => { window.removeEventListener("online", sync); window.removeEventListener("offline", sync); };
  }, []);
  function refresh() {
    if (!ready) return;
    const next = generatePreviewTips(household);
    if (saved.save(next)) { setFilter("all"); setMessage("Tips updated and saved on this device."); heading.current?.focus(); }
  }

  return <PageShell title="Tipid Tips" subtitle="Practical ideas with a clear household basis" active="Home" className="tt-page">
    <div className="tt-toolbar"><Link href="/dashboard"><ArrowLeft size={17} aria-hidden="true" />Back to home</Link><span><Sparkles size={14} aria-hidden="true" />Local energy-saving guidance</span></div>
    <section className="tt-hero"><div><span>SMALL HABITS, CLEARER CHOICES</span><h2>Find your next<br />tipid habit.</h2><p>Review ideas based on the bills and appliances you entered. Every tip shows why it appears.</p></div><Image src="/assets/branding/actions-5.png" alt="" width={260} height={260} sizes="(min-width: 900px) 160px, 82px" priority /></section>
    <section className="ui-panel tt-inputs" aria-labelledby="tt-inputs-heading"><div className="tt-inputs-heading"><span><Lightbulb aria-hidden="true" /></span><div><h2 id="tt-inputs-heading">Your household input basis</h2><p>Review your records to make the tips more relevant.</p></div></div><div className="tt-input-counts"><Link href="/bills"><ReceiptText aria-hidden="true" /><strong>{ready ? household.bills.length : "—"}</strong><span>saved bills</span></Link><Link href="/appliances"><PlugZap aria-hidden="true" /><strong>{ready ? household.appliances.length : "—"}</strong><span>appliance entries</span></Link></div><div className="tt-refresh-actions"><button type="button" className="ui-primary" disabled={!ready} onClick={() => refresh()}><RotateCcw size={17} aria-hidden="true" />{snapshot ? "Refresh tips" : "Create tips"}</button></div><p className="tt-preview-note">Tips use local rules and your saved inputs. Savings are not guaranteed.</p></section>
    {!ready && <div className="tt-loading" role="status"><Clock3 aria-hidden="true" />Loading your saved tips and inputs…</div>}
    {offline && <div className="tt-note is-offline" role="status"><WifiOff aria-hidden="true" /><p><strong>You’re offline.</strong>You can read, create, and refresh these local tips without a connection.</p></div>}
    {saved.error && <p className="ui-error" role="alert">{saved.error}</p>}{storageError && <p className="ui-error" role="alert">{storageError}</p>}{message && <p className="ui-success" role="status">{message}</p>}
    {snapshot ? <>
      <section className={`ui-panel tt-freshness${stale ? " is-stale" : ""}`} aria-labelledby="tt-freshness-heading"><div><span className="tt-freshness-icon">{stale ? <TriangleAlert aria-hidden="true" /> : snapshot.origin === "sample" ? <Sparkles aria-hidden="true" /> : <Check aria-hidden="true" />}</span><div><h2 id="tt-freshness-heading" ref={heading} tabIndex={-1}>{stale ? "Your inputs changed" : snapshot.origin === "sample" ? "Tips from a sample household" : "Based on your current saved inputs"}</h2><p>{stale ? "These saved tips use an earlier input snapshot. Refresh explicitly to use your latest bills and appliances." : snapshot.origin === "sample" ? "Example inputs show the design; your household records are unchanged." : "Saved advice reflects the bill and appliance inputs present when you created it."}</p></div></div><dl><div><dt>Tips created</dt><dd><time dateTime={snapshot.generatedAt}>{dateLabel(snapshot.generatedAt)}</time></dd></div><div><dt>Inputs used</dt><dd>{snapshot.context.billCount} bills · {snapshot.context.applianceCount} appliance entries{snapshot.context.sample && " · Includes samples"}</dd></div></dl></section>
      {snapshot.context.sample && <div className="tt-note"><Info aria-hidden="true" /><p><strong>Includes sample data · UI preview</strong>Tips and calculations based on example records remain labeled Sample.</p></div>}
      {!!snapshot.context.limitations.length && <details className="ui-panel tt-limitations"><summary>What these inputs cannot tell us<Info size={16} aria-hidden="true" /></summary><ul>{snapshot.context.limitations.map(limitation => <li key={limitation}>{limitation}</li>)}</ul></details>}
      <div className="tt-list-heading"><h2>Ideas to review</h2><div className="tt-filters" role="group" aria-label="Filter tips">{(["all", "appliance", "bill"] as const).map(value => <button type="button" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value === "all" ? "All tips" : value === "appliance" ? "Appliances" : "Bills"}</button>)}</div></div>
      <TipsList tips={snapshot.tips} filter={filter} sample={snapshot.origin === "sample"} />
      <section className="tt-next"><Lightbulb aria-hidden="true" /><div><h2>Explore an idea before changing a habit</h2><p>Use Watt-If to compare your own power and usage assumptions over an equal period.</p></div><Link href="/simulator">Open Watt-If</Link></section>
    </> : ready ? <section className="ui-panel tt-empty"><Lightbulb aria-hidden="true" /><h2>No saved tips yet</h2><p>Create tips from your saved bills and appliances. Missing inputs will be explained.</p></section> : null}
    <TipsSetupReview />

  </PageShell>;
}
