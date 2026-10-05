"use client";
import { useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { AirVent, CookingPot, Fan, Laptop, Lightbulb, Microwave, Minus, Pencil, Plug, Plus, Refrigerator, Shirt, Smartphone, Trash2, Tv, WashingMachine, X, Zap, type LucideIcon } from "lucide-react";
import PageShell from "./PageShell";
import { usePreviewHousehold } from "../use-preview-household";
import { appliancePresets, dailyApplianceKwh, effectiveRate, guessApplianceKind, pesos, validateAppliance, type ApplianceKind, type PreviewAppliance } from "../preview-data";

const kindIcons: Record<ApplianceKind, LucideIcon> = { fan: Fan, aircon: AirVent, fridge: Refrigerator, tv: Tv, "rice-cooker": CookingPot, washer: WashingMachine, lights: Lightbulb, laptop: Laptop, phone: Smartphone, microwave: Microwave, iron: Shirt, other: Plug };
const presetLabels: Record<ApplianceKind, string> = { fan: "Fan", aircon: "Aircon", fridge: "Fridge", tv: "TV", "rice-cooker": "Rice cooker", washer: "Washer", lights: "Lights", laptop: "Laptop", phone: "Charger", microwave: "Microwave", iron: "Iron", other: "Other" };
type Draft = { kind: ApplianceKind; name: string; watts: string; hours: string; quantity: number };
const emptyDraft: Draft = { kind: "fan", name: "Electric fan", watts: "55", hours: "8", quantity: 1 };

const kindOf = (item: PreviewAppliance) => item.kind ?? guessApplianceKind(item.name);
const trim = (value: number) => Number(value.toFixed(2)).toString();

export default function AppliancesScreen() {
  const { household, update, ready, storageError } = usePreviewHousehold();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const rate = effectiveRate(household.bills);
  const items = [...household.appliances].sort((a, b) => dailyApplianceKwh(b) - dailyApplianceKwh(a));
  const totalDaily = items.reduce((sum, item) => sum + dailyApplianceKwh(item), 0);
  const draftDaily = dailyApplianceKwh({ watts: Number(draft.watts) || 0, hours: Number(draft.hours) || 0, quantity: draft.quantity });

  function open(item?: PreviewAppliance) {
    opener.current = document.activeElement as HTMLElement | null;
    setError(""); setMessage("");
    setEditing(item?.id ?? null);
    setDraft(item ? { kind: kindOf(item), name: item.name, watts: String(item.watts), hours: String(item.hours), quantity: item.quantity } : emptyDraft);
    dialog.current?.showModal();
  }
  function close() { dialog.current?.close(); }

  function pickPreset(kind: ApplianceKind) {
    const preset = appliancePresets.find(item => item.kind === kind)!;
    const previousPreset = appliancePresets.find(item => item.kind === draft.kind);
    // Keep a name the person typed; replace one that came from the previous preset.
    const name = !draft.name.trim() || draft.name === previousPreset?.name ? preset.name : draft.name;
    setDraft(kind === "other" ? { ...draft, kind, name: draft.name === previousPreset?.name ? "" : draft.name } : { ...draft, kind, name, watts: String(preset.watts), hours: String(preset.hours) });
  }

  function stepHours(delta: number) {
    const next = Math.min(24, Math.max(0.5, (Number(draft.hours) || 0) + delta));
    setDraft({ ...draft, hours: trim(next) });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const appliance = { name: draft.name.trim(), watts: Number(draft.watts), hours: Number(draft.hours), quantity: draft.quantity, kind: draft.kind };
    const issue = validateAppliance(appliance);
    if (issue) { setError(issue); return; }
    const appliances = editing ? household.appliances.map(item => item.id === editing ? { ...appliance, id: editing } : item) : [...household.appliances, { ...appliance, id: crypto.randomUUID() }];
    if (update({ appliances })) { setMessage(editing ? `${appliance.name} updated.` : `${appliance.name} added.`); close(); }
  }

  function remove(item: PreviewAppliance) {
    if (update({ appliances: household.appliances.filter(appliance => appliance.id !== item.id) })) setMessage(`${item.name} removed.`);
  }

  return <PageShell title="Appliances" subtitle="See how your appliances use energy" active="Appliances" className="ap-page">
    <section className="ap-summary" aria-labelledby="ap-summary-title">
      <div className="ap-summary-copy">
        <p className="ap-eyebrow">Estimated from your appliances</p>
        <h2 id="ap-summary-title"><span>{(totalDaily * 30).toFixed(1)}</span> kWh / month</h2>
        <p className="ap-summary-cost">≈ {pesos(totalDaily * 30 * rate)} a month at {pesos(rate)}/kWh</p>
        <button type="button" className="ap-add" disabled={!ready} onClick={() => open()}><Plus aria-hidden="true" /> Add appliance</button>
      </div>
      <dl className="ap-summary-stats">
        <div><dt>Appliances</dt><dd>{items.reduce((sum, item) => sum + item.quantity, 0)}</dd></div>
        <div><dt>Per day</dt><dd>{totalDaily.toFixed(2)} <small>kWh</small></dd></div>
      </dl>
      <Image className="ap-summary-art" src="/assets/branding/actions-5.png" alt="" width={260} height={260} sizes="(min-width: 900px) 170px, 112px" />
    </section>

    <section className="ui-panel ap-list-panel" aria-labelledby="ap-list-title">
      <div className="ui-panel-heading"><div><h2 id="ap-list-title">Top energy users</h2><p>Sorted by estimated monthly use</p></div><span className="ui-count">{items.length} {items.length === 1 ? "entry" : "entries"}</span></div>
      {items.length ? <ul className="ap-list">
        {items.map(item => { const kind = kindOf(item); const Icon = kindIcons[kind]; const daily = dailyApplianceKwh(item); const share = totalDaily ? daily / totalDaily * 100 : 0; return <li key={item.id}>
          <span className={`ap-icon is-${kind}`}><Icon aria-hidden="true" /></span>
          <div className="ap-item-main">
            <div className="ap-item-top"><h3>{item.name}</h3><strong>{(daily * 30).toFixed(1)} <small>kWh/mo</small></strong></div>
            <p>{trim(item.watts)} W · {trim(item.hours)} hrs/day{item.quantity > 1 && ` · ×${item.quantity}`}<span>≈ {pesos(daily * 30 * rate)}/mo</span></p>
            <div className="ap-share" role="img" aria-label={`${share.toFixed(0)} percent of estimated appliance use`}><span style={{ width: `${Math.max(share, 2)}%` }} /><em>{share.toFixed(0)}%</em></div>
          </div>
          <div className="ap-item-actions">
            <button type="button" className="ui-icon-button ap-edit" disabled={!ready} aria-label={`Edit ${item.name}`} onClick={() => open(item)}><Pencil size={16} /></button>
            <button type="button" className="ui-icon-button" disabled={!ready} aria-label={`Remove ${item.name}`} onClick={() => remove(item)}><Trash2 size={16} /></button>
          </div>
        </li>; })}
      </ul> : <div className="ap-empty"><Image src="/assets/branding/actions-7.png" alt="" width={200} height={200} sizes="120px" /><h3>No appliances yet</h3><p>Add the appliances you use at home to see which ones use the most energy.</p><button type="button" className="ui-primary" disabled={!ready} onClick={() => open()}><Plus size={18} aria-hidden="true" /> Add appliance</button></div>}
      <p className="ui-helper">Estimates use watts × hours × quantity over 30 days. Actual use varies with settings, age, and how often appliances cycle on.</p>
    </section>
    {message && <p className="ui-success" role="status">{message}</p>}{storageError && <p className="ui-error" role="alert">{storageError}</p>}

    <dialog ref={dialog} className="ap-dialog" aria-labelledby="ap-dialog-title" onClose={() => opener.current?.focus()} onClick={event => { if (event.target === event.currentTarget) close(); }}>
      <form className="ap-dialog-body" onSubmit={submit} noValidate>
        <div className="ap-dialog-head">
          <span className={`ap-icon is-${draft.kind}`}>{(() => { const Icon = kindIcons[draft.kind]; return <Icon aria-hidden="true" />; })()}</span>
          <div><h2 id="ap-dialog-title">{editing ? "Edit appliance" : "Add appliance"}</h2><p>Pick a type, then adjust how you use it.</p></div>
          <button type="button" className="ap-close" aria-label="Close" onClick={close}><X aria-hidden="true" /></button>
        </div>
        <fieldset className="ap-presets"><legend>Appliance type</legend>
          {appliancePresets.map(preset => { const Icon = kindIcons[preset.kind]; return <label key={preset.kind} className={draft.kind === preset.kind ? "is-selected" : ""}><input type="radio" name="kind" value={preset.kind} checked={draft.kind === preset.kind} onChange={() => pickPreset(preset.kind)} /><Icon aria-hidden="true" /><span>{presetLabels[preset.kind]}</span></label>; })}
        </fieldset>
        <div className="ap-fields">
          <label className="ap-wide">Name<input value={draft.name} maxLength={80} placeholder="e.g. Bedroom fan" required onChange={event => setDraft({ ...draft, name: event.target.value })} /></label>
          <label>Rated power<span className="ap-unit"><input type="number" inputMode="decimal" min="0.1" step="0.1" placeholder="60" required value={draft.watts} onChange={event => setDraft({ ...draft, watts: event.target.value })} /><em>W</em></span></label>
          <div className="ap-field"><span id="ap-hours-label">Hours per day</span><div className="ap-stepper"><button type="button" aria-label="Fewer hours" onClick={() => stepHours(-0.5)}><Minus aria-hidden="true" /></button><input aria-labelledby="ap-hours-label" type="number" inputMode="decimal" min="0.1" max="24" step="0.1" required value={draft.hours} onChange={event => setDraft({ ...draft, hours: event.target.value })} /><button type="button" aria-label="More hours" onClick={() => stepHours(0.5)}><Plus aria-hidden="true" /></button></div></div>
          <div className="ap-field ap-wide"><span id="ap-qty-label">How many?</span><div className="ap-stepper is-qty"><button type="button" aria-label="Fewer" disabled={draft.quantity <= 1} onClick={() => setDraft({ ...draft, quantity: Math.max(1, draft.quantity - 1) })}><Minus aria-hidden="true" /></button><output aria-labelledby="ap-qty-label">{draft.quantity}</output><button type="button" aria-label="More" disabled={draft.quantity >= 50} onClick={() => setDraft({ ...draft, quantity: Math.min(50, draft.quantity + 1) })}><Plus aria-hidden="true" /></button></div></div>
        </div>
        <div className="ap-estimate" aria-live="polite">
          <Zap aria-hidden="true" />
          <div><strong>{draftDaily.toFixed(2)} kWh</strong><span>per day</span></div>
          <div><strong>{(draftDaily * 30).toFixed(1)} kWh</strong><span>per month</span></div>
          <div><strong>{pesos(draftDaily * 30 * rate)}</strong><span>est. monthly</span></div>
        </div>
        {error && <p className="ui-error" role="alert">{error}</p>}
        <div className="ap-dialog-actions"><button type="button" className="ui-secondary" onClick={close}>Cancel</button><button type="submit" className="ui-primary" disabled={!ready}>{editing ? "Save changes" : <><Plus size={18} aria-hidden="true" /> Add appliance</>}</button></div>
      </form>
    </dialog>
  </PageShell>;
}
