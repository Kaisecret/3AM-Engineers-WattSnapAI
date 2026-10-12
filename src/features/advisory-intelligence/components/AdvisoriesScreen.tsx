"use client";
import { isDeviceOffline } from "@/features/offline-access/connectivity";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { CalendarDays, ChevronRight, CircleAlert, CircleCheck, Clock3, ExternalLink, Info, MapPin, Megaphone, Save, WifiOff, Wrench, X } from "lucide-react";
import AppHeader from "@/features/dashboard/components/AppHeader";
import AppNavigation from "@/features/dashboard/components/AppNavigation";
import { usePreviewHousehold } from "@/features/dashboard/use-preview-household";
import { previewProviderName } from "@/features/household-profile/provider-preview";
import { advisoryTypeLabels, formatAdvisoryDate, type AdvisoryFilter, type AdvisoryTab } from "../advisory-preview";
import { advisoryTab, captureMatch, matchIsStale, matchLabels, matchPreviewAdvisory, scheduleHours, scheduleLabel, sourceLink } from "../review-preview";
import { usePreviewAdvisories } from "../use-preview-advisories";
import { useProviderAdvisories } from "../use-provider-advisories";
import { feedCanImport, feedIsCurrent, feedRecord } from "../provider-feed";
import { usePreparationProgress } from "../use-preparation-progress";
import { advisoryPreparationItems, preparationEligible, preparationKey as keyForPreparation, type AdvisoryPreparationId } from "../preparation-progress";
import type { ReviewedAdvisory } from "../types";
import AdvisoryOriginalView from "./advisory-original";
import LocationMatchPreview from "./location-match-preview";
import { AdvisoryPreparationChecklist, AdvisoryPreparationComplete } from "./advisory-preparation";

const icons = { scheduled: Megaphone, unscheduled: CircleAlert, notice: Info, restored: CircleCheck };
const filters: { value: AdvisoryFilter; label: string }[] = [{ value: "all", label: "All" }, { value: "scheduled", label: "Scheduled" }, { value: "unscheduled", label: "Unscheduled" }, { value: "notice", label: "Notice" }, { value: "restored", label: "Restoration updates" }];
const antecoOnly = "Automatic advisories are available for ANTECO households only for now. Check your provider directly for announcements.";
const dateLabel = (date: string) => date ? formatAdvisoryDate(date) : "Date unknown";
const timestamp = (value: string) => new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(value));
const kinds = { scheduled: "Scheduled", unscheduled: "Unscheduled", notice: "Notice", restored: "Restored" };
/** Calendar-tile parts for a saved date: month, day, then the weekday, or the year when it is not this year. */
function dateTile(date: string) {
  const day = new Date(`${date}T00:00:00Z`);
  if (!date || Number.isNaN(day.getTime())) return null;
  const part = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(day);
  return { month: part({ month: "short" }), day: day.getUTCDate(), note: date.slice(0, 4) === String(new Date().getFullYear()) ? part({ weekday: "short" }) : date.slice(0, 4) };
}

export default function AdvisoriesScreen() {
  const { household, ready: householdReady } = usePreviewHousehold(), saved = usePreviewAdvisories(), progress = usePreparationProgress(), feed = useProviderAdvisories();
  const [tab, setTab] = useState<AdvisoryTab>("active"), [filter, setFilter] = useState<AdvisoryFilter>("all");
  const [selection, setSelection] = useState<{ id: string } | null>(null), [deleting, setDeleting] = useState(false), [message, setMessage] = useState(""), [offline, setOffline] = useState(false);
  const [completionKey, setCompletionKey] = useState<string | null>(null), [shownOthers, setShownOthers] = useState(12);
  const dialog = useRef<HTMLDialogElement>(null), trigger = useRef<HTMLButtonElement | null>(null), queryRead = useRef(false), checklistRequested = useRef(false), tabs = useRef<Partial<Record<AdvisoryTab, HTMLButtonElement | null>>>({});
  const ready = householdReady && saved.ready && progress.ready, basis = household, records = saved.records;
  const selected = selection ? saved.records.find(record => record.id === selection.id) : undefined;
  const selectedBasis = household;
  const preparationKey = selected ? keyForPreparation(selected, selectedBasis) : "";
  const checked = progress.entries.find(entry => entry.key === preparationKey)?.checked ?? [];
  const canPrepare = Boolean(selected && preparationEligible(selected, selectedBasis));
  const complete = canPrepare && !progress.error && advisoryPreparationItems.every(item => checked.includes(item.id));
  const showReadyConfirmation = complete && completionKey === preparationKey;
  const list = (view: AdvisoryTab, type: AdvisoryFilter = "all") => records.filter(record => advisoryTab(record) === view && (type === "all" || record.details.type === type));
  const visible = list(tab, filter), relevant = list("active").filter(record => ["scheduled", "unscheduled"].includes(record.details.type) && matchPreviewAdvisory(record.details, basis).status === "affected" && !matchIsStale(record, basis)), next = relevant[0];
  useEffect(() => {
    const sync = () => setOffline(isDeviceOffline()); sync(); window.addEventListener("online", sync); window.addEventListener("offline", sync); return () => { window.removeEventListener("online", sync); window.removeEventListener("offline", sync); };
  }, []);
  useEffect(() => { if (!ready || queryRead.current) return; queryRead.current = true; const query = new URLSearchParams(window.location.search), id = query.get("reviewed"); if (id && saved.records.some(record => record.id === id)) { checklistRequested.current = query.get("checklist") === "1"; setSelection({ id }); } }, [ready, saved.records]);
  useEffect(() => { if (selected && !dialog.current?.open) dialog.current?.showModal(); if (selected && checklistRequested.current) { checklistRequested.current = false; focusUncheckedItem(); } }, [selected]);
  function open(record: ReviewedAdvisory, element: HTMLButtonElement) { trigger.current = element; setDeleting(false); setMessage(""); setCompletionKey(null); setSelection({ id: record.id }); }
  function focusUncheckedItem() { const input = dialog.current?.querySelector<HTMLInputElement>('.adv-ready input:not(:checked)'); input?.closest('label')?.scrollIntoView({ block: 'center' }); input?.focus({ preventScroll: true }); }
  function togglePreparation(id: AdvisoryPreparationId) {
    setCompletionKey(null);
    if (!selected || !canPrepare) return;
    progress.toggle(selected, selectedBasis, id);
  }
  function finishReview() {
    if (complete) { setCompletionKey(preparationKey); dialog.current?.scrollTo({ top: 0 }); }
    else dialog.current?.close();
  }
  function keyTabs(event: KeyboardEvent<HTMLButtonElement>) { if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return; event.preventDefault(); const target = event.key === "Home" ? "active" : event.key === "End" ? "history" : tab === "active" ? "history" : "active"; setTab(target); tabs.current[target]?.focus(); }
  function confirmMatch() { if (selected && saved.save({ ...selected, match: captureMatch(selected.details, household) })) setMessage("Match reviewed for your current household. Advisory fields and original are unchanged."); }
  const source = selected ? sourceLink(selected.details.sourceUrl) : null;
  // Current ANTECO advisories that are not among the saved ones: they do not list this household’s area, or were removed.
  const others = feed.status === "ready" ? feed.rows.flatMap(row => { const record = feedRecord(row, household); return record && feedIsCurrent(record) && !saved.records.some(item => item.id === record.id) ? [record] : []; }) : [];
  return <div className="ws-home adv-page aw-list-page"><div className="ws-shell"><AppHeader title="Advisories" subtitle="Keep the original. Review your area." /><main className="adv-main">
    <div className="adv-intro"><h1>Advisories</h1><p>Keep the original. Review your area.</p></div>
    <section className={`adv-hero ${next ? "is-alert" : "is-clear"}`} aria-labelledby="adv-hero-title"><div className="adv-hero-copy">{<Link href="/onboarding" className="adv-location" aria-label="Review household location and provider"><MapPin aria-hidden="true" /><span>{household.location || "Complete household setup"}</span><em>Change</em></Link>}<p className="adv-hero-eyebrow">{next ? "Matching saved announcement" : "Saved sources, clearer input basis"}</p><h2 id="adv-hero-title">{next ? `${relevant.length} saved ${relevant.length === 1 ? "notice matches" : "notices match"} your inputs` : saved.records.length ? "Review your saved advisories" : "Keep provider notices close"}</h2><p className="adv-hero-when">{next ? <><CalendarDays aria-hidden="true" /><span>{dateLabel(next.details.date)} · {scheduleLabel(next.details)}</span></> : "A saved review does not confirm live power status."}</p>{next && <button type="button" className="adv-hero-button" onClick={event => open(next, event.currentTarget)}>Review match<ChevronRight size={16} aria-hidden="true" /></button>}</div><Image className="adv-hero-art" src={next ? "/assets/branding/actions-6.png" : "/assets/branding/actions-3.png"} alt="" width={260} height={260} sizes="(min-width: 900px) 190px, 82px" priority /></section>
    {offline && <div className="aw-note" role="status"><WifiOff aria-hidden="true" /><p><strong>You’re offline.</strong>Saved reviews, originals, and match explanations are available here. No new provider announcements are fetched.</p></div>}
    {!ready && <div className="aw-loading" role="status"><Clock3 aria-hidden="true" />Loading your saved advisories…</div>}
    {saved.error && <p className="ui-error" role="alert">{saved.error}<button type="button" onClick={saved.reload}>Retry loading</button></p>}
    <div className="adv-toolbar"><div className="adv-tabs" role="tablist" aria-label="Advisory views">{(["active", "history"] as const).map(value => <button type="button" key={value} ref={element => { tabs.current[value] = element; }} id={`adv-${value}-tab`} role="tab" aria-selected={tab === value} aria-controls="adv-list-panel" tabIndex={tab === value ? 0 : -1} className={tab === value ? "is-selected" : ""} onClick={() => setTab(value)} onKeyDown={keyTabs}>{value === "active" ? <Megaphone aria-hidden="true" /> : <Clock3 aria-hidden="true" />}{value === "active" ? "Active" : "History"}<span className="adv-tab-count">{list(value).length}</span></button>)}</div><div className="adv-filters" role="group" aria-label="Filter advisory type">{filters.map(item => <button type="button" key={item.value} aria-pressed={filter === item.value} className={filter === item.value ? "is-selected" : ""} onClick={() => setFilter(item.value)}>{item.label}<span>{list(tab, item.value).length}</span></button>)}</div></div>
    <section id="adv-list-panel" role="tabpanel" aria-labelledby={`adv-${tab}-tab`} tabIndex={0}><h2 className="adv-list-title">{tab === "active" ? "Active advisories" : "Advisory history"}</h2><div className="adv-list">{visible.map(record => { const Icon = icons[record.details.type], status = matchPreviewAdvisory(record.details, basis).status, stale = matchIsStale(record, basis), tile = dateTile(record.details.date); return <article key={record.id} className={`adv-card adv-type-${record.details.type}`}><button type="button" className="adv-card-button" aria-label={`View ${record.details.title || advisoryTypeLabels[record.details.type]}, ${matchLabels[status]}`} onClick={event => open(record, event.currentTarget)}>
      <span className="adv-card-top"><span className="adv-date-tile" aria-hidden="true">{tile ? <><small>{tile.month}</small><b>{tile.day}</b><small>{tile.note}</small></> : <><b>?</b><small>No date</small></>}</span><span className="adv-card-head"><span className="adv-card-title">{record.details.title || advisoryTypeLabels[record.details.type]}</span><span className="adv-card-meta"><span className={`adv-status adv-status-${status}`}>{matchLabels[status]}</span><span className="adv-card-kind"><Icon aria-hidden="true" />{kinds[record.details.type]}</span></span></span></span>
      <span className="adv-card-details"><span><Clock3 aria-hidden="true" /><span>{scheduleHours(record.details)}</span></span><span><MapPin aria-hidden="true" /><span className="adv-card-area">{record.details.areaText}</span></span><span className="adv-detail-muted"><Wrench aria-hidden="true" /><span className="adv-card-reason">{record.details.reason || "Reason not provided"}</span></span></span>
      <span className="adv-card-foot"><span className="aw-card-tags">{record.original.kind === "sample" ? <em>Sample</em> : record.original.feed ? <em>Read by AI</em> : <em>Reviewed locally</em>}{stale && <em className="is-stale">Match needs review</em>}<span>{previewProviderName(record.details.provider)}</span></span><span className="adv-card-more">View details<ChevronRight aria-hidden="true" /></span></span></button></article>; })}{ready && !visible.length && <div className="adv-empty"><Image src="/assets/branding/actions-7.png" alt="" width={200} height={200} sizes="110px" /><h3>{!saved.records.length ? "No saved advisories yet" : "No advisories in this view"}</h3><p>{saved.records.length ? "Try the other tab or show all advisory types." : feed.enabled ? "ANTECO advisories that list your area are saved here automatically when you open the app online." : antecoOnly}</p>{saved.records.length > 0 && <button type="button" onClick={() => setFilter("all")}>Show all types</button>}</div>}</div><span className="ws-sr-only" aria-live="polite">{visible.length} advisories shown</span><p className="adv-source-note"><Info aria-hidden="true" />{feed.enabled ? "Read by AI from ANTECO’s Facebook page and may contain mistakes. The original post is official." : antecoOnly}</p></section>
    {feed.enabled && <section className="aw-feed" aria-labelledby="aw-feed-title"><h2 id="aw-feed-title" className="adv-list-title">More from ANTECO</h2>
      {!feedCanImport(household) && <div className="aw-note"><Info aria-hidden="true" /><p><strong>Add your town to have advisories saved for you.</strong>Set your province and municipality first. <Link href="/onboarding">Review household location</Link></p></div>}
      {feed.status === "loading" && <div className="aw-loading" role="status"><Clock3 aria-hidden="true" />Checking ANTECO’s advisories…</div>}
      {feed.status === "error" && (offline ? <p className="aw-muted" role="status">You’re offline. ANTECO’s newer advisories load when you reconnect; your saved advisories are above.</p> : <p className="ui-error" role="alert">ANTECO’s advisories could not be loaded right now. Your saved advisories are unchanged.<button type="button" onClick={feed.reload}>Try again</button></p>)}
      {feed.status === "ready" && !others.length && <p className="aw-muted">No other ANTECO advisories right now.</p>}
      {others.length > 0 && <ul className="aw-feed-list">{others.slice(0, shownOthers).map(record => { const title = record.details.title || advisoryTypeLabels[record.details.type]; return <li key={record.id}><div><strong>{title}</strong><span className={`adv-status adv-status-${record.match.status}`}>{matchLabels[record.match.status]}</span></div><p className="aw-feed-when">{dateLabel(record.details.date)} · {scheduleHours(record.details)}</p><p className="aw-feed-area">{record.details.areaText}</p><p className="aw-feed-actions"><button type="button" className="ui-secondary" aria-label={`Save ${title} to my advisories`} disabled={!ready || saved.loadError} onClick={() => saved.save(record)}><Save size={15} aria-hidden="true" />Save</button>{record.original.feed && <a href={record.original.feed.url} target="_blank" rel="noreferrer">Original post<ExternalLink size={14} aria-hidden="true" /></a>}</p></li>; })}</ul>}
      {others.length > shownOthers && <button type="button" className="ui-secondary" onClick={() => setShownOthers(count => count + 12)}>Show {Math.min(12, others.length - shownOthers)} more of {others.length}</button>}
    </section>}
  </main><AppNavigation active="Advisories" />
    <dialog ref={dialog} className={`adv-dialog adv-detail aw-detail-dialog${showReadyConfirmation ? " adv-complete" : ""}`} aria-labelledby={showReadyConfirmation ? "adv-ready-title" : "aw-detail-title"} aria-describedby={showReadyConfirmation ? "adv-ready-description" : undefined} onClose={event => { if (event.target !== event.currentTarget) return; setSelection(null); setDeleting(false); setCompletionKey(null); trigger.current?.focus(); }}>
      {selected && (showReadyConfirmation ? <AdvisoryPreparationComplete sample={selected.original.kind === "sample"} onClose={() => dialog.current?.close()} onBack={() => setCompletionKey(null)} /> : <div className="adv-dialog-content" key={selected.id}><div className={`adv-detail-head adv-type-${selected.details.type}`}><button type="button" className="adv-dialog-close" autoFocus aria-label="Close advisory details" onClick={() => dialog.current?.close()}><X /></button><p className="adv-dialog-eyebrow">{selected.original.kind === "sample" ? "Sample advisory · UI preview" : selected.original.feed ? "From ANTECO’s Facebook page · read by AI" : "Saved advisory · reviewed locally"}</p><h2 id="aw-detail-title">{selected.details.title || advisoryTypeLabels[selected.details.type]}</h2><span className="aw-review-stamp">Review {selected.revision} · {timestamp(selected.reviewedAt)} Asia/Manila</span></div><dl className="adv-detail-list"><div><dt><CalendarDays aria-hidden="true" />Date</dt><dd>{dateLabel(selected.details.date)}</dd></div><div><dt><Clock3 aria-hidden="true" />Schedule</dt><dd>{scheduleLabel(selected.details)}</dd></div><div className="adv-detail-wide"><dt><MapPin aria-hidden="true" />Areas as written</dt><dd>{selected.details.areaText}</dd></div><div className="adv-detail-wide"><dt><Wrench aria-hidden="true" />Reason</dt><dd>{selected.details.reason || "Not provided"}</dd></div><div className="adv-detail-wide"><dt>Expected restoration</dt><dd>{selected.details.expectedRestoration || "Unknown · not provided"}</dd></div><div className="adv-detail-wide"><dt>Source attribution</dt><dd>{selected.details.publisher || "Publisher not provided"} · {previewProviderName(selected.details.provider)}{source && <a href={source} target="_blank" rel="noreferrer">Open source link</a>}</dd></div></dl>
      {selected.details.type === "restored" && <div className="aw-note"><Info aria-hidden="true" /><p><strong>Separate restoration update</strong>{selected.details.relatedId ? `Linked earlier advisory: ${saved.records.find(record => record.id === selected.details.relatedId)?.details.title || "earlier saved advisory"}. Its original has not been replaced.` : "No earlier advisory has been linked. This update does not replace another announcement."}</p></div>}
      <LocationMatchPreview details={selected.details} household={selectedBasis} record={selected} onRecheck={confirmMatch} disabled={!ready} />
      {canPrepare && <AdvisoryPreparationChecklist checked={checked} disabled={!ready || progress.loadError} sample={selected.original.kind === "sample"} onToggle={togglePreparation} />}
      {progress.error && <p id="adv-progress-error" className="ui-error" role="alert" tabIndex={-1}>{progress.error}<button type="button" onClick={progress.reload}>Retry loading checklist</button></p>}
      <AdvisoryOriginalView original={selected.original} /><p className="aw-muted">Original retained {timestamp(selected.original.capturedAt)} Asia/Manila. A saved schedule is not a live outage or restoration confirmation.</p>
      {message && <p className="ui-success" role="status">{message}</p>}{saved.error && <p className="ui-error" role="alert">{saved.error}</p>}
      <div className="aw-detail-actions"><div className="aw-detail-buttons"><button type="button" className="ui-secondary" onClick={() => dialog.current?.close()}>Close</button><button type="button" className="ui-primary" onClick={finishReview}>Done</button></div></div>
      {<details className="aw-manage"><summary>Manage saved advisory</summary>{deleting ? <div><p>Remove this review and its locally saved original? Other advisories will stay available.</p><button type="button" onClick={() => { const collected = Boolean(selected.original.feed); if (saved.remove(selected.id)) { if (collected) feed.dismiss(selected.id); dialog.current?.close(); } }}>Remove advisory and original</button><button type="button" onClick={() => setDeleting(false)}>Keep advisory</button></div> : <button type="button" onClick={() => setDeleting(true)}>Remove saved advisory</button>}</details>}
      </div>)}
    </dialog>
  </div></div>;
}
