"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import Image from "next/image";
import { CalendarDays, Check, ChevronRight, CircleAlert, CircleCheck, Clock3, Info, MapPin, Megaphone, ShieldCheck, Wrench, X } from "lucide-react";
import AppHeader from "@/features/dashboard/components/AppHeader";
import AppNavigation from "@/features/dashboard/components/AppNavigation";
import { advisoryPreview, advisoryStatusLabels, advisoryTypeLabels, filterAdvisories, formatAdvisoryDate, type AdvisoryFilter, type AdvisoryTab, type PreviewAdvisory } from "../advisory-preview";

const typeIcons = { scheduled: Megaphone, unscheduled: CircleAlert, notice: Info, restored: CircleCheck };
const filters: { value: AdvisoryFilter; label: string }[] = [
  { value: "all", label: "All" }, { value: "scheduled", label: "Scheduled" }, { value: "unscheduled", label: "Unscheduled" }, { value: "notice", label: "Notice" }, { value: "restored", label: "Restored" },
];
const checklist = ["Charge phones and power banks", "Prepare flashlights or emergency lights", "Unplug sensitive appliances", "Keep the refrigerator closed", "Store drinking water"];
const dateParts = (date: string) => {
  const value = new Date(`${date}T00:00:00Z`);
  return { day: value.getUTCDate(), month: new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(value), weekday: new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" }).format(value) };
};
const isInterruption = (advisory: PreviewAdvisory) => advisory.type === "scheduled" || advisory.type === "unscheduled";

function AdvisoryCard({ advisory, onOpen }: { advisory: PreviewAdvisory; onOpen: () => void }) {
  const Icon = typeIcons[advisory.type];
  const date = dateParts(advisory.date);
  return (
    <article className={`adv-card adv-type-${advisory.type}`}>
      <button type="button" className="adv-card-button" onClick={onOpen} aria-label={`View ${advisoryTypeLabels[advisory.type]}, ${formatAdvisoryDate(advisory.date)}, ${advisoryStatusLabels[advisory.status]}`}>
        <span className="adv-card-top">
          <span className="adv-event-mark" aria-hidden="true"><Icon /></span>
          <span className="adv-card-title">{advisoryTypeLabels[advisory.type]}</span>
          <span className={`adv-status adv-status-${advisory.status}`}>{advisoryStatusLabels[advisory.status]}</span>
        </span>
        <span className="adv-card-body">
          <span className="adv-date-tile" aria-hidden="true"><small>{date.month}</small><b>{date.day}</b><small>{date.weekday}</small></span>
          <span className="adv-card-details">
            <span><Clock3 aria-hidden="true" /><span>{advisory.time}{advisory.duration && <em> · {advisory.duration}</em>}</span></span>
            <span><MapPin aria-hidden="true" /><span>{advisory.area}</span></span>
            <span className="adv-detail-muted"><Wrench aria-hidden="true" /><span>{advisory.reason}</span></span>
          </span>
        </span>
        <span className="adv-card-foot"><span>{advisory.status === "affected" && isInterruption(advisory) ? <><ShieldCheck aria-hidden="true" /> Get ready</> : "View details"}</span><ChevronRight aria-hidden="true" /></span>
      </button>
    </article>
  );
}

export default function AdvisoriesScreen() {
  const [tab, setTab] = useState<AdvisoryTab>("active");
  const [typeFilter, setTypeFilter] = useState<AdvisoryFilter>("all");
  const [location, setLocation] = useState("San Jose de Buenavista, Antique");
  const [locationDraft, setLocationDraft] = useState(location);
  const [locationError, setLocationError] = useState("");
  const [selected, setSelected] = useState<PreviewAdvisory | null>(null);
  const [checked, setChecked] = useState<string[]>([]);
  const [showReadyConfirmation, setShowReadyConfirmation] = useState(false);
  const editDialog = useRef<HTMLDialogElement>(null);
  const detailDialog = useRef<HTMLDialogElement>(null);
  const tabButtons = useRef<Partial<Record<AdvisoryTab, HTMLButtonElement | null>>>({});
  const visibleAdvisories = filterAdvisories(advisoryPreview, tab, typeFilter);
  const affecting = filterAdvisories(advisoryPreview, "active", "all").filter(advisory => advisory.status === "affected" && isInterruption(advisory));
  const next = affecting[0];
  const counts = (value: AdvisoryTab) => filterAdvisories(advisoryPreview, value, "all").length;

  function handleTabKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const target = event.key === "Home" ? "active" : event.key === "End" ? "history" : tab === "active" ? "history" : "active";
    setTab(target);
    tabButtons.current[target]?.focus();
  }

  function openAdvisory(advisory: PreviewAdvisory) {
    setSelected(advisory);
    setShowReadyConfirmation(false);
    detailDialog.current?.showModal();
  }

  function finishChecklist() {
    if (selected?.tab === "active" && isInterruption(selected) && checklist.every(item => checked.includes(item))) {
      setShowReadyConfirmation(true);
      return;
    }
    detailDialog.current?.close();
  }

  return (
    <div className="ws-home adv-page">
      <div className="ws-shell">
        <AppHeader title="Advisories" subtitle="Know what affects your household" />
        <main className="adv-main">
          <div className="adv-intro"><h1>Advisories</h1><p>Know what affects your household</p></div>

          <section className={`adv-hero ${next ? "is-alert" : "is-clear"}`} aria-labelledby="adv-hero-title">
            <div className="adv-hero-copy">
              <button type="button" className="adv-location" onClick={() => { setLocationDraft(location); setLocationError(""); editDialog.current?.showModal(); }} aria-label={`Your location: ${location}. Change location`}>
                <MapPin aria-hidden="true" /><span>{location}</span><em>Change</em>
              </button>
              <p className="adv-hero-eyebrow">{next ? "Brownout alert for your area" : "Your area looks clear"}</p>
              <h2 id="adv-hero-title">{next ? `${affecting.length} ${affecting.length === 1 ? "interruption affects" : "interruptions affect"} your home` : "No interruptions affect your home"}</h2>
              {next ? <p className="adv-hero-when"><CalendarDays aria-hidden="true" /> {formatAdvisoryDate(next.date)} · {next.time}{next.duration && ` (${next.duration})`}</p> : <p className="adv-hero-when">We&apos;ll show scheduled maintenance and outages here.</p>}
              {next && <button type="button" className="adv-hero-button" onClick={() => openAdvisory(next)}><ShieldCheck aria-hidden="true" /> Get brownout ready</button>}
            </div>
            <Image className="adv-hero-art" src={next ? "/assets/branding/actions-6.png" : "/assets/branding/actions-3.png"} alt="" width={260} height={260} sizes="(min-width: 900px) 190px, 120px" priority />
          </section>

          <div className="adv-toolbar">
            <div className="adv-tabs" role="tablist" aria-label="Advisory views">
              {(["active", "history"] as const).map(value => <button key={value} ref={element => { tabButtons.current[value] = element; }} id={`adv-${value}-tab`} type="button" role="tab" aria-selected={tab === value} aria-controls="adv-list-panel" tabIndex={tab === value ? 0 : -1} className={tab === value ? "is-selected" : ""} onClick={() => setTab(value)} onKeyDown={handleTabKey}>{value === "active" ? <Megaphone aria-hidden="true" /> : <Clock3 aria-hidden="true" />}{value === "active" ? "Active" : "History"}<span className="adv-tab-count">{counts(value)}</span></button>)}
            </div>
            <div className="adv-filters" role="group" aria-label="Filter advisory type">
              {filters.map(filter => { const count = filterAdvisories(advisoryPreview, tab, filter.value).length; return <button key={filter.value} type="button" aria-pressed={typeFilter === filter.value} className={typeFilter === filter.value ? "is-selected" : ""} onClick={() => setTypeFilter(filter.value)}>{filter.label}<span>{count}</span></button>; })}
            </div>
          </div>

          <section id="adv-list-panel" role="tabpanel" aria-labelledby={`adv-${tab}-tab`} tabIndex={0}>
            <h2 className="adv-list-title">{tab === "active" ? "Active advisories" : "Past advisories"}</h2>
            <div className="adv-list" key={`${tab}-${typeFilter}`}>
              {visibleAdvisories.map(advisory => <AdvisoryCard key={advisory.id} advisory={advisory} onOpen={() => openAdvisory(advisory)} />)}
              {visibleAdvisories.length === 0 && <div className="adv-empty"><Image src="/assets/branding/actions-7.png" alt="" width={200} height={200} sizes="110px" /><h3>No {filters.find(filter => filter.value === typeFilter)?.label.toLowerCase()} advisories</h3><p>Nothing of this type in {tab === "active" ? "active advisories" : "your history"}.</p><button type="button" onClick={() => setTypeFilter("all")}>Show all types</button></div>}
            </div>
            <span className="ws-sr-only" aria-live="polite">{visibleAdvisories.length} {tab === "active" ? "active" : "past"} advisories shown</span>
            <p className="adv-source-note"><Info aria-hidden="true" /> Example advisories for this preview. Your electricity provider&apos;s announcements remain the official source.</p>
          </section>
        </main>
        <AppNavigation active="Advisories" />

        <dialog ref={editDialog} className="adv-dialog" aria-labelledby="adv-edit-title" onClick={event => { if (event.target === event.currentTarget) editDialog.current?.close(); }}>
          <div className="adv-dialog-content">
            <button type="button" className="adv-dialog-close" aria-label="Close location editor" onClick={() => editDialog.current?.close()}><X /></button>
            <span className="adv-location-icon"><MapPin aria-hidden="true" /></span>
            <h2 id="adv-edit-title">Your location</h2><p>Advisories are matched against this location.</p>
            <form onSubmit={event => {
              event.preventDefault();
              if (!locationDraft.trim()) { setLocationError("Enter your household location."); return; }
              setLocation(locationDraft.trim()); editDialog.current?.close();
            }}>
              <label htmlFor="adv-location-input">Municipality and province</label>
              <input id="adv-location-input" autoFocus required maxLength={120} value={locationDraft} onChange={event => { setLocationDraft(event.target.value); setLocationError(""); }} placeholder="San Jose de Buenavista, Antique" aria-describedby={locationError ? "adv-location-error" : undefined} aria-invalid={!!locationError} />
              {locationError && <p className="adv-form-error" id="adv-location-error" role="alert">{locationError}</p>}
              <p className="adv-preview-note">This preview keeps your location until you leave the page. Advisory cards show example information.</p>
              <div className="adv-dialog-actions"><button type="button" onClick={() => editDialog.current?.close()}>Cancel</button><button type="submit" className="adv-primary">Save location</button></div>
            </form>
          </div>
        </dialog>

        <dialog ref={detailDialog} className={`adv-dialog adv-detail${showReadyConfirmation ? " adv-complete" : ""}`} aria-labelledby={showReadyConfirmation ? "adv-ready-title" : "adv-detail-title"} aria-describedby={showReadyConfirmation ? "adv-ready-description" : undefined} onClick={event => { if (event.target === event.currentTarget) detailDialog.current?.close(); }}>
          {selected && (showReadyConfirmation ? <div className="adv-dialog-content adv-complete-content">
            <button type="button" className="adv-dialog-close" aria-label="Close readiness confirmation" onClick={() => detailDialog.current?.close()}><X /></button>
            <span className="adv-complete-badge"><ShieldCheck aria-hidden="true" /> Brownout ready</span>
            <Image className="adv-complete-art" src="/assets/branding/all-set-bee.png" alt="WattSnap robot bee giving a thumbs-up with a You're All Set sticker" width={1280} height={1280} sizes="(min-width: 360px) 300px, 260px" />
            <h2 id="adv-ready-title">You&apos;re all set!</h2>
            <p id="adv-ready-description">All {checklist.length} preparation steps are complete.<br />Keep your essentials nearby for the interruption.</p>
            <button type="button" autoFocus className="adv-primary adv-dialog-done" onClick={() => detailDialog.current?.close()}>Back to advisories</button>
          </div> : <div className={`adv-dialog-content adv-type-${selected.type}`}>
            <div className="adv-detail-head">
              <button type="button" autoFocus className="adv-dialog-close" aria-label="Close advisory details" onClick={() => detailDialog.current?.close()}><X /></button>
              <span className="adv-event-mark">{(() => { const Icon = typeIcons[selected.type]; return <Icon aria-hidden="true" />; })()}</span>
              <p className="adv-dialog-eyebrow">{selected.tab === "active" ? "Active advisory" : "Past advisory"}</p>
              <h2 id="adv-detail-title">{advisoryTypeLabels[selected.type]}</h2>
              <span className={`adv-status adv-status-${selected.status}`}>{advisoryStatusLabels[selected.status]}</span>
            </div>
            <dl className="adv-detail-list">
              <div><dt><CalendarDays aria-hidden="true" /> Date</dt><dd>{formatAdvisoryDate(selected.date)}</dd></div>
              <div><dt><Clock3 aria-hidden="true" /> Time</dt><dd>{selected.time}{selected.duration && ` (${selected.duration})`}</dd></div>
              <div className="adv-detail-wide"><dt><MapPin aria-hidden="true" /> Affected areas</dt><dd>{selected.area}</dd></div>
              <div className="adv-detail-wide"><dt><Wrench aria-hidden="true" /> Reason</dt><dd>{selected.reason}</dd></div>
            </dl>
            {selected.tab === "active" && isInterruption(selected) && <div className="adv-ready">
              <h3><ShieldCheck aria-hidden="true" /> Brownout ready checklist <span>{checklist.filter(item => checked.includes(item)).length}/{checklist.length}</span></h3>
              <ul>{checklist.map(item => <li key={item}><label><input type="checkbox" checked={checked.includes(item)} onChange={() => setChecked(current => current.includes(item) ? current.filter(entry => entry !== item) : [...current, item])} /><span className="adv-check" aria-hidden="true"><Check /></span>{item}</label></li>)}</ul>
            </div>}
            <p className="adv-preview-note">Example advisory for this preview. Check your electricity provider for current interruption information.</p>
            <button type="button" className="adv-primary adv-dialog-done" onClick={finishChecklist}>Done</button>
          </div>)}
        </dialog>
      </div>
    </div>
  );
}
