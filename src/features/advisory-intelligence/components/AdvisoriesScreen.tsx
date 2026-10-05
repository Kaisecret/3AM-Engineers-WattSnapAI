"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { CalendarDays, ChevronDown, ChevronRight, CircleAlert, CircleCheck, Clock3, Info, MapPin, Megaphone, Wrench, X } from "lucide-react";
import AppHeader from "@/features/dashboard/components/AppHeader";
import AppNavigation from "@/features/dashboard/components/AppNavigation";
import { advisoryPreview, advisoryStatusLabels, advisoryTypeLabels, filterAdvisories, formatAdvisoryDate, type AdvisoryFilter, type AdvisoryTab, type PreviewAdvisory } from "../advisory-preview";

const typeIcons = { scheduled: Megaphone, unscheduled: CircleAlert, notice: Info, restored: CircleCheck };

function AdvisoryCard({ advisory, onOpen }: { advisory: PreviewAdvisory; onOpen: () => void }) {
  const Icon = typeIcons[advisory.type];
  return (
    <article className={`adv-card adv-type-${advisory.type}`}>
      <button className="adv-card-button" onClick={onOpen} aria-label={`View ${advisoryTypeLabels[advisory.type]}, ${formatAdvisoryDate(advisory.date)}`}>
        <span className="adv-card-aside" aria-hidden="true">
          <span className="adv-event-mark"><Icon /></span>
          <span className="adv-timeline"><i /><i /><i /><i /></span>
        </span>
        <span className="adv-card-content">
          <span className="adv-card-title-row"><span className="adv-card-title">{advisoryTypeLabels[advisory.type]}</span><span className={`adv-status adv-status-${advisory.status}`}>{advisoryStatusLabels[advisory.status]}</span></span>
          <span className="adv-card-details">
            <span><CalendarDays aria-hidden="true" /><span>{formatAdvisoryDate(advisory.date)}</span></span>
            <span><Clock3 aria-hidden="true" /><span>{advisory.time}{advisory.duration && <span className="adv-detail-muted"> ({advisory.duration})</span>}</span></span>
            <span className="adv-detail-muted"><MapPin aria-hidden="true" /><span>{advisory.area}</span></span>
            <span className="adv-detail-muted"><Wrench aria-hidden="true" /><span>{advisory.reason}</span></span>
          </span>
        </span>
        <ChevronRight className="adv-card-chevron" aria-hidden="true" />
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
  const editDialog = useRef<HTMLDialogElement>(null);
  const detailDialog = useRef<HTMLDialogElement>(null);
  const tabButtons = useRef<Partial<Record<AdvisoryTab, HTMLButtonElement | null>>>({});
  const visibleAdvisories = filterAdvisories(advisoryPreview, tab, typeFilter);

  function handleTabKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? "active" : event.key === "End" ? "history" : tab === "active" ? "history" : "active";
    setTab(next);
    tabButtons.current[next]?.focus();
  }

  function openAdvisory(advisory: PreviewAdvisory) {
    setSelected(advisory);
    detailDialog.current?.showModal();
  }

  return (
    <div className="ws-home adv-page">
      <div className="ws-shell">
        <AppHeader title="Advisories" subtitle="Know what affects your household" />
        <main className="adv-main">
          <div className="adv-intro"><h1>Advisories</h1><p>Know what affects your household</p></div>
          <div className="adv-tabs" role="tablist" aria-label="Advisory views">
            <button ref={element => { tabButtons.current.active = element; }} id="adv-active-tab" role="tab" aria-selected={tab === "active"} aria-controls="adv-list-panel" tabIndex={tab === "active" ? 0 : -1} className={tab === "active" ? "is-selected" : ""} onClick={() => setTab("active")} onKeyDown={handleTabKey}><Megaphone aria-hidden="true" /> Active</button>
            <button ref={element => { tabButtons.current.history = element; }} id="adv-history-tab" role="tab" aria-selected={tab === "history"} aria-controls="adv-list-panel" tabIndex={tab === "history" ? 0 : -1} className={tab === "history" ? "is-selected" : ""} onClick={() => setTab("history")} onKeyDown={handleTabKey}><Clock3 aria-hidden="true" /> History</button>
          </div>
          <section className="adv-location" aria-label="Your location">
            <span className="adv-location-icon"><MapPin aria-hidden="true" /></span>
            <div><h2>Your Location</h2><p>{location}</p></div>
            <button className="adv-edit" onClick={() => { setLocationDraft(location); setLocationError(""); editDialog.current?.showModal(); }}>Edit</button>
          </section>
          <section id="adv-list-panel" role="tabpanel" aria-labelledby={`adv-${tab}-tab`} tabIndex={0}>
            <div className="adv-list-heading">
              <h2>{tab === "active" ? "Active Advisories" : "Past Advisories"}</h2>
              <div className="adv-filter">
                <label htmlFor="adv-type-filter" className="ws-sr-only">Filter advisory type</label>
                <select id="adv-type-filter" value={typeFilter} onChange={event => setTypeFilter(event.target.value as AdvisoryFilter)}>
                  <option value="all">All Types</option><option value="scheduled">Scheduled</option><option value="unscheduled">Unscheduled</option><option value="notice">Notice</option><option value="restored">Restored</option>
                </select>
                <ChevronDown aria-hidden="true" />
              </div>
            </div>
            <div className="adv-list" key={tab}>
              {visibleAdvisories.map(advisory => <AdvisoryCard key={advisory.id} advisory={advisory} onOpen={() => openAdvisory(advisory)} />)}
              {visibleAdvisories.length === 0 && <div className="adv-empty"><Info aria-hidden="true" /><h3>No matching advisories</h3><p>There are no {typeFilter} advisories in this view.</p><button onClick={() => setTypeFilter("all")}>Show all types</button></div>}
            </div>
            <span className="ws-sr-only" aria-live="polite">{visibleAdvisories.length} {tab === "active" ? "active" : "past"} advisories shown</span>
          </section>
        </main>
        <AppNavigation active="Advisories" />

        <dialog ref={editDialog} className="adv-dialog" aria-labelledby="adv-edit-title" onClick={event => { if (event.target === event.currentTarget) editDialog.current?.close(); }}>
          <div className="adv-dialog-content">
            <button className="adv-dialog-close" aria-label="Close location editor" onClick={() => editDialog.current?.close()}><X /></button>
            <span className="adv-location-icon"><MapPin aria-hidden="true" /></span>
            <h2 id="adv-edit-title">Your Location</h2><p>Choose the location for your household.</p>
            <form onSubmit={event => {
              event.preventDefault();
              if (!locationDraft.trim()) { setLocationError("Enter your household location."); return; }
              setLocation(locationDraft.trim()); editDialog.current?.close();
            }}>
              <label htmlFor="adv-location-input">Municipality and province</label>
              <input id="adv-location-input" autoFocus required maxLength={120} value={locationDraft} onChange={event => { setLocationDraft(event.target.value); setLocationError(""); }} placeholder="San Jose de Buenavista, Antique" aria-describedby={locationError ? "adv-location-error" : undefined} aria-invalid={!!locationError} />
              {locationError && <p className="adv-form-error" id="adv-location-error" role="alert">{locationError}</p>}
              <p className="adv-preview-note">This preview keeps your location until you leave the page. Advisory cards show the example information from the design.</p>
              <div className="adv-dialog-actions"><button type="button" onClick={() => editDialog.current?.close()}>Cancel</button><button type="submit" className="adv-primary">Save location</button></div>
            </form>
          </div>
        </dialog>

        <dialog ref={detailDialog} className="adv-dialog" aria-labelledby="adv-detail-title" onClick={event => { if (event.target === event.currentTarget) detailDialog.current?.close(); }}>
          {selected && <div className={`adv-dialog-content adv-type-${selected.type}`}>
            <button autoFocus className="adv-dialog-close" aria-label="Close advisory details" onClick={() => detailDialog.current?.close()}><X /></button>
            <span className="adv-event-mark">{(() => { const Icon = typeIcons[selected.type]; return <Icon aria-hidden="true" />; })()}</span>
            <p className="adv-dialog-eyebrow">{selected.tab === "active" ? "Active advisory" : "Past advisory"}</p>
            <h2 id="adv-detail-title">{advisoryTypeLabels[selected.type]}</h2>
            <span className={`adv-status adv-status-${selected.status}`}>{advisoryStatusLabels[selected.status]}</span>
            <dl className="adv-detail-list">
              <div><dt><CalendarDays aria-hidden="true" /> Date</dt><dd>{formatAdvisoryDate(selected.date)}</dd></div>
              <div><dt><Clock3 aria-hidden="true" /> Time</dt><dd>{selected.time}{selected.duration && ` (${selected.duration})`}</dd></div>
              <div><dt><MapPin aria-hidden="true" /> Affected areas</dt><dd>{selected.area}</dd></div>
              <div><dt><Wrench aria-hidden="true" /> Reason</dt><dd>{selected.reason}</dd></div>
            </dl>
            <p className="adv-preview-note">Example advisory from the design reference. Check your electricity provider for current interruption information.</p>
            <button className="adv-primary adv-dialog-done" onClick={() => detailDialog.current?.close()}>Done</button>
          </div>}
        </dialog>
      </div>
    </div>
  );
}
