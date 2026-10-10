"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock3, ExternalLink, Info, Plus, ShieldCheck, TriangleAlert, WifiOff } from "lucide-react";
import PageShell from "@/features/dashboard/components/PageShell";
import { usePreviewHousehold } from "@/features/dashboard/use-preview-household";
import { usePreviewAdvisories } from "@/features/advisory-intelligence/use-preview-advisories";
import { captureMatch, matchLabels, scheduleLabel, sourceLink } from "@/features/advisory-intelligence/review-preview";
import AdvisoryOriginalView from "@/features/advisory-intelligence/components/advisory-original";
import LocationMatchPreview from "@/features/advisory-intelligence/components/location-match-preview";
import type { ReviewedAdvisory } from "@/features/advisory-intelligence/types";
import { activationPreview, manilaTimestamp, planChanges } from "../calculations";
import { usePreviewPlans } from "../use-preview-plans";
import type { BrownoutPreviewPlan, PreparationId } from "../types";
import ReadinessPanel from "./readiness-panel";

export default function BrownoutReadyScreen() {
  const { household, ready: householdReady, storageError } = usePreviewHousehold(), advisories = usePreviewAdvisories(), saved = usePreviewPlans();
  const queryRead = useRef(false);
  const [now, setNow] = useState<number | null>(null), [offline, setOffline] = useState(false), [selection, setSelection] = useState(""), [planning, setPlanning] = useState(false), [reviewing, setReviewing] = useState(false), [sourceConfirmed, setSourceConfirmed] = useState(false), [relevanceConfirmed, setRelevanceConfirmed] = useState(false), [deleting, setDeleting] = useState(false), [message, setMessage] = useState("");
  const ready = householdReady && advisories.ready && saved.ready && now !== null;
  const plan = saved.plans.find(item => item.id === selection) || (!selection && !planning ? saved.plans[0] : undefined);
  const chosen = advisories.records.find(record => record.id === selection);
  const changes = plan ? planChanges(plan, advisories.records, household) : null;
  const draft = reviewing ? changes?.current : planning ? chosen : undefined;
  const eligibility = draft && now !== null ? activationPreview(draft, household, now) : null;
  const disabled = !ready || saved.loadError || advisories.loadError || Boolean(storageError);
  const source = plan ? sourceLink(plan.advisory.details.sourceUrl) : null;
  useEffect(() => {
    const tick = () => setNow(Date.now()), sync = () => setOffline(!navigator.onLine); tick(); sync();
    const timer = window.setInterval(tick, 1000); window.addEventListener("online", sync); window.addEventListener("offline", sync);
    return () => { window.clearInterval(timer); window.removeEventListener("online", sync); window.removeEventListener("offline", sync); };
  }, []);
  useEffect(() => {
    if (!ready || queryRead.current) return;
    queryRead.current = true;
    const id = new URLSearchParams(window.location.search).get("advisory");
    if (id && !selection && advisories.records.some(record => record.id === id)) { setSelection(id); setPlanning(!saved.plans.some(item => item.id === id)); }
  }, [ready, selection, advisories.records, saved.plans]);
  useEffect(() => { setSourceConfirmed(false); setRelevanceConfirmed(false); }, [draft?.id, draft?.revision, draft?.match.householdSignature, household.location, household.provider, household.locality?.province, household.locality?.municipality, household.locality?.barangay]);
  function resetConfirmation() { setSourceConfirmed(false); setRelevanceConfirmed(false); setMessage(""); setDeleting(false); }
  function begin(id = "") { setSelection(id); setPlanning(true); setReviewing(false); resetConfirmation(); }
  function savePlan() {
    if (!draft || !eligibility || eligibility.blocked || !sourceConfirmed || (eligibility.status === "possibly-affected" && !relevanceConfirmed) || disabled) return;
    setMessage("");
    const stamp = new Date().toISOString(), old = saved.plans.find(item => item.id === draft.id);
    const next: BrownoutPreviewPlan = { version: "brownout-ui-v1", id: draft.id, advisory: { ...draft, match: captureMatch(draft.details, household) }, sourceConfirmed: true, relevanceConfirmed, checked: old?.checked ?? [], acknowledgedUpdates: old?.acknowledgedUpdates ?? [], createdAt: old?.createdAt ?? stamp, updatedAt: stamp };
    if (saved.save(next)) { setSelection(next.id); setPlanning(false); setReviewing(false); resetConfirmation(); setMessage(old ? "Plan updated to the reviewed source and household. Your checklist was kept." : "Preparation plan saved in this browser."); }
  }
  function toggle(id: PreparationId) {
    if (!plan || disabled) return;
    setMessage("");
    const checked = plan.checked.includes(id) ? plan.checked.filter(item => item !== id) : [...plan.checked, id];
    if (saved.save({ ...plan, checked, updatedAt: new Date().toISOString() })) setMessage("Checklist progress saved.");
  }
  function confirmMatch() {
    setMessage("");
    if (draft && advisories.save({ ...draft, match: captureMatch(draft.details, household) })) resetConfirmation();
  }
  function acknowledge(record: ReviewedAdvisory) {
    setMessage("");
    if (plan && saved.save({ ...plan, acknowledgedUpdates: [...plan.acknowledgedUpdates.filter(item => item.id !== record.id), { id: record.id, revision: record.revision }], updatedAt: new Date().toISOString() })) setMessage("Update marked as reviewed. The earlier source and scheduled times are retained; live power status is unconfirmed.");
  }
  return <PageShell title="Brownout Ready" subtitle="A little preparation, less rushing." active="Advisories" className="bready-page">
    <div className="bready-toolbar"><Link href="/advisories"><ArrowLeft size={16} aria-hidden="true" />Advisories</Link><span>Local plan · published schedule only</span></div>
    <section className="bready-hero"><div><p>PREPARE WITH YOUR HOUSEHOLD</p><h2>Essentials ready.<br />One step at a time.</h2><p>Keep a reviewed announcement, its schedule, and your preparation checklist together.</p></div><Image src="/assets/branding/actions-6.png" alt="" width={260} height={260} sizes="(min-width: 900px) 175px, 90px" priority /></section>
    {offline && <div className="bready-note is-offline" role="status"><WifiOff aria-hidden="true" /><p><strong>You’re offline.</strong>Saved originals and checklist changes remain available in this open preview. The clock uses device time. Check your provider when connected for new announcements; automatic updates are not connected.</p></div>}
    {!ready && <div className="bready-note" role="status"><Clock3 aria-hidden="true" /><p>Loading saved plans and advisory reviews…</p></div>}
    {(saved.error || advisories.error || storageError) && <div className="ui-error" role="alert">{saved.error || advisories.error || storageError}{(saved.loadError || advisories.loadError) && <button type="button" onClick={() => { saved.reload(); advisories.reload(); }}>Retry loading</button>}</div>}
    {message && <p className="ui-success" role="status">{message}</p>}
    {ready && <>
      {saved.plans.length > 0 && <section className="bready-plan-list ui-panel" aria-label="Saved preparation plans"><div className="ui-panel-heading"><div><h2>Your saved plans</h2><p>Each plan keeps its own source and checklist.</p></div><button className="ui-secondary" type="button" onClick={() => begin()}><Plus size={16} aria-hidden="true" />New plan</button></div><div className="bready-plan-buttons">{saved.plans.map(item => <button key={item.id} type="button" aria-pressed={!planning && plan?.id === item.id} onClick={() => { setSelection(item.id); setPlanning(false); setReviewing(false); resetConfirmation(); }}><ShieldCheck size={18} aria-hidden="true" /><span><strong>{item.advisory.details.title || "Interruption plan"}</strong><small>{item.advisory.original.kind === "sample" ? "Sample · " : ""}{item.advisory.details.date || "Date unknown"} · {item.checked.length}/5 checked</small></span></button>)}</div></section>}
      {!saved.plans.length && !planning && <section className="bready-empty ui-panel"><ShieldCheck aria-hidden="true" /><h2>No preparation plan yet</h2><p>Start with an advisory you have reviewed. A matching future schedule will be recommended; an uncertain match needs your confirmation.</p><button type="button" className="ui-primary" onClick={() => begin()}>Choose reviewed advisory</button><Link href="/advisories/new">Add your provider announcement</Link></section>}
      {(planning || reviewing) && <section className="bready-draft ui-panel" aria-label="Review readiness activation"><div className="ui-panel-heading"><div><h2>{reviewing ? "Review changes to your plan" : "Choose a reviewed announcement"}</h2><p>Check the original provider source and the listed areas before preparing.</p></div><button type="button" className="bready-cancel" onClick={() => { setPlanning(false); setReviewing(false); setSelection(plan?.id || ""); resetConfirmation(); }}>Cancel</button></div>
        {!reviewing && <label className="bready-select">Reviewed advisory<select value={selection} onChange={event => { setSelection(event.target.value); resetConfirmation(); }}><option value="">Choose a saved review</option>{advisories.records.filter(record => ["scheduled", "unscheduled"].includes(record.details.type)).map(record => <option key={record.id} value={record.id}>{record.original.kind === "sample" ? "Sample · " : ""}{record.details.title || "Interruption"} · {record.details.date || "Date unknown"}</option>)}</select></label>}
        {!advisories.records.some(record => ["scheduled", "unscheduled"].includes(record.details.type)) && <div className="bready-note"><Info aria-hidden="true" /><p><strong>No reviewed interruptions available.</strong><Link href="/advisories/new">Upload or paste an advisory</Link> to create your first saved review.</p></div>}
        {draft && eligibility && <>
          <div className="bready-draft-summary"><span className={`bready-match is-${eligibility.status}`}>{matchLabels[eligibility.status]}</span>{eligibility.recommended && <span className="bready-recommended"><CheckCircle2 size={15} aria-hidden="true" />Recommended for preparation</span>}<h3>{draft.details.title || "Reviewed advisory"}{draft.original.kind === "sample" ? " · Sample" : ""}</h3><p>{draft.details.date || "Date unknown"} · {scheduleLabel(draft.details)}</p><p>{draft.details.areaText}</p></div>
          <LocationMatchPreview details={draft.details} household={household} record={draft} onRecheck={confirmMatch} disabled={disabled} />
          <AdvisoryOriginalView key={`${draft.id}-${draft.revision}`} original={draft.original} />
          {eligibility.blocked ? <div className="bready-note is-warning" role="status"><TriangleAlert aria-hidden="true" /><p>{eligibility.blocked}</p></div> : <div className="bready-confirmations">{eligibility.status === "possibly-affected" && <label><input type="checkbox" checked={relevanceConfirmed} onChange={event => setRelevanceConfirmed(event.target.checked)} /><span>I reviewed the uncertain area and confirm this announcement is relevant to my household.</span></label>}<label><input type="checkbox" checked={sourceConfirmed} onChange={event => setSourceConfirmed(event.target.checked)} /><span>{draft.original.kind === "sample" ? "I understand this is a fictional sample and am saving a practice plan." : "I checked the original provider source and the published schedule for this preparation plan."}</span></label><p className="bready-muted">{eligibility.schedule.state === "unknown" ? "The start is incomplete. This plan will have no countdown until a complete schedule is reviewed." : eligibility.schedule.state === "started" ? "The published start has passed. This plan will show that status instead of a future countdown." : "This countdown describes the published start. It does not confirm an actual outage."} Saving does not verify the announcement or enable automatic collection.</p></div>}
          <button type="button" className="ui-primary bready-save-plan" disabled={disabled || Boolean(eligibility.blocked) || !sourceConfirmed || (eligibility.status === "possibly-affected" && !relevanceConfirmed)} onClick={savePlan}>{reviewing || saved.plans.some(item => item.id === draft.id) ? "Save reviewed plan changes" : "Save preparation plan"}</button>
        </>}
      </section>}
      {plan && !planning && now !== null && <>
        {changes && (changes.missing || changes.sourceChanged || changes.householdChanged) && <section className="bready-note is-warning bready-changes" role="status"><TriangleAlert aria-hidden="true" /><div><h2>Plan needs another review</h2><p>{changes.missing ? "The advisory was removed from your saved reviews. This plan still keeps its earlier original and checklist." : changes.sourceChanged ? "The saved advisory review changed. This plan still shows its previous reviewed schedule." : "Your household location or provider changed. This plan keeps the earlier household basis."}</p>{changes.householdChanged && changes.sourceChanged && <p>The household basis also changed.</p>}{changes.current ? <button type="button" className="ui-secondary" onClick={() => { setReviewing(true); resetConfirmation(); }}>Review updated source and match</button> : <Link href="/advisories/new">Add and review a current advisory</Link>}</div></section>}
        <ReadinessPanel plan={plan} now={now} stale={Boolean(changes?.sourceChanged || changes?.householdChanged || changes?.missing)} disabled={disabled} onToggle={toggle} />
        {changes?.updates.map(update => <section className="bready-update ui-panel" key={`${update.id}-${update.revision}`} aria-label="Related provider update"><div className="bready-section-head"><span><Info aria-hidden="true" /></span><div><p>{update.original.kind === "sample" ? "Sample update · fictional" : "Related saved update"}</p><h2>{update.details.title || "Provider update"}</h2></div></div><p>{update.details.expectedRestoration || "Restoration time unknown · not provided"}</p><p>{scheduleLabel(update.details)}</p><p className="bready-muted">Reviewed {manilaTimestamp(update.reviewedAt)} Asia/Manila. This separate update does not overwrite the plan’s source or establish live power status.</p><AdvisoryOriginalView original={update.original} /><Link href={`/advisories?reviewed=${encodeURIComponent(update.id)}`}>Open saved update review</Link><button type="button" className="ui-secondary" disabled={disabled} onClick={() => acknowledge(update)}>Mark this update reviewed</button></section>)}
        <section className="bready-source ui-panel"><div className="bready-section-head"><span><ExternalLink aria-hidden="true" /></span><div><p>Source retained with this plan</p><h2>Review {plan.advisory.revision} · original announcement</h2></div></div><p>{plan.advisory.details.publisher || "Publisher not provided"}</p>{source ? <a href={source} target="_blank" rel="noreferrer">Open provider source link<ExternalLink size={14} aria-hidden="true" /></a> : <p className="bready-muted">Source link not provided. Keep the original and check your provider directly.</p>}<AdvisoryOriginalView key={`${plan.id}-${plan.advisory.revision}`} original={plan.advisory.original} /><Link href={`/advisories?reviewed=${encodeURIComponent(plan.id)}`}>Open advisory review</Link><p className="bready-muted">No live outage feed, push reminders, AI parsing, or automatic web scraping is connected. This plan uses your locally reviewed source.</p></section>
        <details className="bready-manage"><summary>Manage this preparation plan</summary>{deleting ? <div><p>Remove this plan and its checklist? The saved advisory and its original will remain.</p><button type="button" onClick={() => { if (saved.remove(plan.id)) { setSelection(""); setDeleting(false); setMessage("Preparation plan removed. The saved advisory is unchanged."); } }}>Remove preparation plan</button><button type="button" onClick={() => setDeleting(false)}>Keep plan</button></div> : <button type="button" onClick={() => setDeleting(true)}>Remove this plan</button>}</details>
      </>}
    </>}
  </PageShell>;
}
