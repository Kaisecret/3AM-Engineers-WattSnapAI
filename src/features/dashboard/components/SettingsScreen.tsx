"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { BadgeCheck, CalendarClock, Camera, Check, ChevronRight, CircleCheck, Database, ImageUp, Lightbulb, LogOut, MapPin, Megaphone, PlugZap, ReceiptText, ShieldCheck, Sparkles, Trash2, UserRound, Wallet, Zap } from "lucide-react";
import PageShell from "./PageShell";
import UserAvatar from "./UserAvatar";
import PhotoEditor from "./PhotoEditor";
import LogoutDialog from "./LogoutDialog";
import { usePreviewHousehold } from "../use-preview-household";
import { defaultLocation, defaultNotifications, defaultProvider, isPhotoDataUrl, pesos, validateProfile, type NotificationPrefs } from "../preview-data";

type Draft = { name: string; email: string; location: string };
const alerts: { key: keyof NotificationPrefs; title: string; detail: string; icon: typeof Megaphone; tone: string }[] = [
  { key: "brownouts", title: "Brownout alerts", detail: "When an advisory lists your area", icon: Megaphone, tone: "is-orange" },
  { key: "billReminders", title: "Bill due reminders", detail: "A few days before your due date", icon: CalendarClock, tone: "is-blue" },
  { key: "tips", title: "Tipid Tips", detail: "A weekly idea to save energy", icon: Lightbulb, tone: "is-yellow" },
];
const wholePesos = (value: number) => pesos(Math.round(value)).replace(/\.00$/, "");

export default function SettingsScreen() {
  const { household, update, ready, storageError } = usePreviewHousehold();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [logout, setLogout] = useState(false);
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const saved: Draft = { name: household.name, email: household.email ?? "", location: household.location ?? defaultLocation };
  const values = draft ?? saved;
  const dirty = draft !== null && (draft.name !== saved.name || draft.email !== saved.email || draft.location !== saved.location);
  const prefs = household.notifications ?? defaultNotifications;
  const sampleBills = household.bills.filter(bill => bill.source === "sample").length;
  const sampleAppliances = household.appliances.filter(item => item.id.startsWith("sample-")).length;

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const notify = (text: string) => setToast({ id: Date.now(), text });
  const edit = (change: Partial<Draft>) => { setDraft({ ...values, ...change }); setError(""); };

  function choosePhoto(next?: File) {
    setPhotoError("");
    if (fileInput.current) fileInput.current.value = "";
    if (!next) return;
    if (!next.type.startsWith("image/")) { setPhotoError("Choose an image file, like a JPG or PNG."); return; }
    if (next.size > 10 * 1024 * 1024) { setPhotoError("Choose a photo smaller than 10 MB."); return; }
    setFile(next);
  }
  function savePhoto(dataUrl: string) {
    if (!isPhotoDataUrl(dataUrl)) { setPhotoError("That photo couldn’t be saved. Try a smaller one."); setFile(null); return; }
    if (update({ photo: dataUrl })) { setFile(null); notify("Profile photo updated"); }
  }
  function removePhoto() { if (update({ photo: undefined })) notify("Profile photo removed"); }
  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const issue = validateProfile(values);
    if (issue) { setError(issue); return; }
    if (update({ name: values.name.trim(), email: values.email.trim() || undefined, location: values.location.trim(), provider: defaultProvider })) { setDraft(null); notify("Profile saved"); }
  }
  function toggle(key: keyof NotificationPrefs) {
    const next = { ...prefs, [key]: !prefs[key] };
    if (update({ notifications: next })) notify(`${alerts.find(alert => alert.key === key)?.title} ${next[key] ? "on" : "off"}`);
  }
  function clearSamples() {
    if (update({ bills: household.bills.filter(bill => bill.source !== "sample"), appliances: household.appliances.filter(item => !item.id.startsWith("sample-")) })) notify("Sample data cleared");
  }

  return <PageShell title="Account settings" subtitle="Manage your profile, alerts and account" className="st-page">
    <div className="st-layout">
      <aside className="st-side">
        <section className="st-profile" aria-labelledby="st-name">
          <div className="st-avatar-wrap">
            <span className="st-avatar"><UserAvatar photo={household.photo} alt={`${household.name}'s profile photo`} /></span>
            <button type="button" className="st-avatar-edit" disabled={!ready} aria-label={household.photo ? "Change profile photo" : "Upload profile photo"} onClick={() => fileInput.current?.click()}><Camera aria-hidden="true" /></button>
          </div>
          <h2 id="st-name">{household.name}</h2>
          <p className="st-email">{household.email ?? "Add your email below"}</p>
          <div className="st-chips"><span><MapPin aria-hidden="true" />{household.location ?? defaultLocation}</span><span><Zap aria-hidden="true" />ANTECO</span></div>
          <div className="st-photo-actions">
            <button type="button" disabled={!ready} onClick={() => fileInput.current?.click()}><ImageUp aria-hidden="true" /> {household.photo ? "Change photo" : "Upload photo"}</button>
            {household.photo && <button type="button" className="is-remove" disabled={!ready} onClick={removePhoto}><Trash2 aria-hidden="true" /> Remove</button>}
          </div>
          {photoError && <p className="st-photo-error" role="alert">{photoError}</p>}
          <dl className="st-stats">
            <div><dt>Bills</dt><dd>{household.bills.length}</dd></div>
            <div><dt>Appliances</dt><dd>{household.appliances.length}</dd></div>
            <div><dt>Budget</dt><dd>{wholePesos(household.budget)}</dd></div>
          </dl>
          <input ref={fileInput} className="ws-sr-only" type="file" accept="image/*" tabIndex={-1} aria-hidden="true" onChange={event => choosePhoto(event.target.files?.[0])} />
        </section>

        <nav className="ui-panel st-links" aria-label="Household shortcuts">
          {[
            { href: "/budget", icon: Wallet, title: "Smart Energy Budget", detail: `${wholePesos(household.budget)} a month` },
            { href: "/bills", icon: ReceiptText, title: "Bill history", detail: `${household.bills.length} ${household.bills.length === 1 ? "bill" : "bills"} saved` },
            { href: "/appliances", icon: PlugZap, title: "My appliances", detail: `${household.appliances.length} added` },
            { href: "/assistant", icon: Sparkles, title: "WattSnap AI", detail: "Ask about your energy" },
          ].map(({ href, icon: Icon, title, detail }) => <Link key={href} href={href}><span className="st-row-icon"><Icon aria-hidden="true" /></span><span className="st-row-copy"><strong>{title}</strong><small>{detail}</small></span><ChevronRight className="st-chevron" aria-hidden="true" /></Link>)}
        </nav>
      </aside>

      <div className="st-main">
        <section className="ui-panel st-card" aria-labelledby="st-profile-title">
          <div className="st-card-head"><span className="st-card-icon"><UserRound aria-hidden="true" /></span><div><h2 id="st-profile-title">Profile details</h2><p>How WattSnap greets you and matches advisories to your area.</p></div></div>
          <form className="st-form" onSubmit={saveProfile} noValidate>
            <label><span className="st-label">Full name</span><input value={values.name} maxLength={50} autoComplete="name" required onChange={event => edit({ name: event.target.value })} /></label>
            <label><span className="st-label">Email <small>optional</small></span><input type="email" value={values.email} maxLength={120} autoComplete="email" placeholder="maria@gmail.com" onChange={event => edit({ email: event.target.value })} /></label>
            <label className="st-wide"><span className="st-label">Home location</span><span className="st-icon-input"><MapPin aria-hidden="true" /><input value={values.location} maxLength={120} placeholder="Municipality, province" required onChange={event => edit({ location: event.target.value })} /></span></label>
            <div className="st-wide st-provider"><span className="st-label">Electricity provider</span><div className="st-provider-box"><span className="st-provider-logo"><Zap aria-hidden="true" /></span><span><strong>ANTECO</strong><small>Antique · bills and advisories supported</small></span><span className="st-verified"><BadgeCheck aria-hidden="true" /> Supported</span></div><small className="st-hint">More Panay providers are coming once their coverage is verified.</small></div>
            {(error || storageError) && <p className="ui-error st-wide" role="alert">{error || storageError}</p>}
            <div className="st-form-actions st-wide">
              {dirty && <span className="st-unsaved">Unsaved changes</span>}
              <button type="button" className="ui-secondary" disabled={!dirty} onClick={() => { setDraft(null); setError(""); }}>Cancel</button>
              <button type="submit" className="ui-primary" disabled={!ready || !dirty}><Check size={18} aria-hidden="true" /> Save changes</button>
            </div>
          </form>
        </section>

        <section className="ui-panel st-card" aria-labelledby="st-alerts-title">
          <div className="st-card-head"><span className="st-card-icon is-orange"><Megaphone aria-hidden="true" /></span><div><h2 id="st-alerts-title">Notifications</h2><p>Choose what WattSnap reminds you about.</p></div></div>
          <div className="st-rows">
            {alerts.map(({ key, title, detail, icon: Icon, tone }) => <label key={key} className="st-row">
              <span className={`st-row-icon ${tone}`}><Icon aria-hidden="true" /></span>
              <span className="st-row-copy"><strong>{title}</strong><small>{detail}</small></span>
              <input type="checkbox" role="switch" className="st-switch" checked={prefs[key]} disabled={!ready} onChange={() => toggle(key)} aria-label={title} />
            </label>)}
          </div>
        </section>

        <section className="ui-panel st-card" aria-labelledby="st-data-title">
          <div className="st-card-head"><span className="st-card-icon is-green"><ShieldCheck aria-hidden="true" /></span><div><h2 id="st-data-title">Privacy &amp; data</h2><p>Your household&apos;s records are private to your account.</p></div></div>
          <div className="st-rows">
            <div className="st-row"><span className="st-row-icon is-green"><Database aria-hidden="true" /></span><span className="st-row-copy"><strong>Saved on this device</strong><small>In this preview, bills, appliances and your photo stay in this browser.</small></span></div>
            {sampleBills + sampleAppliances > 0 && <div className="st-row"><span className="st-row-icon"><Sparkles aria-hidden="true" /></span><span className="st-row-copy"><strong>Sample data</strong><small>{sampleBills} sample bills and {sampleAppliances} sample appliances</small></span><button type="button" className="st-row-button" disabled={!ready} onClick={clearSamples}>Clear</button></div>}
          </div>
        </section>

        <section className="ui-panel st-card st-logout" aria-labelledby="st-logout-title">
          <span className="st-card-icon is-red"><LogOut aria-hidden="true" /></span>
          <div><h2 id="st-logout-title">Log out</h2><p>Sign out of WattSnap on this device.</p></div>
          <button type="button" className="st-logout-button" onClick={() => setLogout(true)}><LogOut size={18} aria-hidden="true" /> Log out</button>
        </section>
        <p className="st-version">WattSnap AI · Preview build</p>
      </div>
    </div>

    <div className="ws-toast-region" role="status" aria-live="polite">{toast && <div key={toast.id} className="ws-toast"><CircleCheck aria-hidden="true" /> {toast.text}</div>}</div>
    <PhotoEditor file={file} onCancel={() => setFile(null)} onSave={savePhoto} />
    <LogoutDialog open={logout} onClose={() => setLogout(false)} name={household.name} />
  </PageShell>;
}
