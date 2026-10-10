"use client";
import { useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Minus, Pencil, Plus, SlidersHorizontal, Trash2, X, Zap } from "lucide-react";
import AppliancePicker, { applianceIcons as kindIcons } from "@/features/appliance-registration/components/appliance-picker";
import ConfirmRecordRemoval from "@/components/ui/ConfirmRecordRemoval";
import PageShell from "./PageShell";
import { usePreviewHousehold } from "../use-preview-household";
import { appliancePresets, dailyApplianceKwh, effectiveRate, guessApplianceKind, pesos, validateAppliance, type ApplianceKind, type PreviewAppliance } from "../preview-data";

type Draft = { kind: ApplianceKind; name: string; model: string; watts: string; hours: string; quantity: number; days: string; wattageBasis: "nameplate" | "approximate" };
const emptyDraft: Draft = { kind: "other", name: "", model: "", watts: "", hours: "", quantity: 1, days: "30", wattageBasis: "nameplate" };

const kindOf = (item: PreviewAppliance) => item.kind ?? guessApplianceKind(item.name);
const trim = (value: number) => Number(value.toFixed(2)).toString();

export default function AppliancesScreen() {
  const { household, update, ready, storageError } = usePreviewHousehold();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [removing, setRemoving] = useState<PreviewAppliance | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const rate = effectiveRate(household.bills);
  const items = [...household.appliances].sort((a, b) => dailyApplianceKwh(b) - dailyApplianceKwh(a));
  const totalDaily = items.reduce((sum, item) => sum + dailyApplianceKwh(item), 0);
  const draftDaily = dailyApplianceKwh({ watts: Number(draft.watts) || 0, hours: Number(draft.hours) || 0, quantity: draft.quantity });
  const validEstimate = draft.watts.trim() && draft.hours.trim() && draft.days.trim() && !validateAppliance({ name: draft.name, watts: Number(draft.watts), hours: Number(draft.hours), quantity: draft.quantity, days: Number(draft.days) });

  function open(item: PreviewAppliance) {
    opener.current = document.activeElement as HTMLElement | null;
    setError(""); setMessage("");
    setEditing(item.id); setReviewed(false);
    setDraft({ kind: kindOf(item), name: item.name, model: item.model ?? "", watts: String(item.watts), hours: String(item.hours), quantity: item.quantity, days: String(item.days ?? 30), wattageBasis: item.wattageBasis ?? "approximate" });
    dialog.current?.showModal();
  }
  function close() { dialog.current?.close(); }
  function change(patch: Partial<Draft>) { setDraft(current => ({ ...current, ...patch })); setReviewed(false); setError(""); }

  function pickPreset(kind: ApplianceKind) {
    const preset = appliancePresets.find(item => item.kind === kind)!;
    const previousPreset = appliancePresets.find(item => item.kind === draft.kind);
    // Keep a name the person typed; replace one that came from the previous preset.
    const name = !draft.name.trim() || draft.name === previousPreset?.name ? preset.name : draft.name;
    change({ kind, name });
  }

  function stepHours(delta: number) {
    const next = Math.min(24, Math.max(0, (Number(draft.hours) || 0) + delta));
    change({ hours: trim(next) });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const appliance = { name: draft.name.trim(), model: draft.model.trim() || undefined, watts: Number(draft.watts), hours: draft.hours.trim() ? Number(draft.hours) : NaN, quantity: draft.quantity, kind: draft.kind, days: draft.days.trim() ? Number(draft.days) : NaN, wattageBasis: draft.wattageBasis };
    const issue = validateAppliance(appliance);
    if (issue) { setError(issue); return; }
    if (!reviewed) { setError("Confirm that you reviewed the calculation inputs before saving."); return; }
    const appliances = household.appliances.map(item => item.id === editing ? { ...item, ...appliance } : item);
    if (update({ appliances })) { setMessage(`${appliance.name} updated.`); close(); }
  }

  function remove(item: PreviewAppliance) {
    if (update({ appliances: household.appliances.filter(appliance => appliance.id !== item.id) })) { setMessage(`${item.name} removed.`); return true; } return false;
  }

  return <PageShell title="Appliances" subtitle="See how your appliances use energy" active="Appliances" className="ap-page">
    <section className="ap-summary" aria-labelledby="ap-summary-title">
      <div className="ap-summary-copy">
        <p className="ap-eyebrow">Estimated from your appliances</p>
        <h2 id="ap-summary-title"><span>{(totalDaily * 30).toFixed(1)}</span> kWh / month</h2>
        <p className="ap-summary-cost">≈ {pesos(totalDaily * 30 * rate)} a month at {pesos(rate)}/kWh</p>
        <Link className="ap-add" href="/appliances/new"><Plus aria-hidden="true" /> Add appliance</Link>
      </div>
      <dl className="ap-summary-stats">
        <div><dt>Appliances</dt><dd>{items.reduce((sum, item) => sum + item.quantity, 0)}</dd></div>
        <div><dt>Per day</dt><dd>{totalDaily.toFixed(2)} <small>kWh</small></dd></div>
      </dl>
      <Image className="ap-summary-art" src="/assets/branding/actions-5.png" alt="" width={260} height={260} sizes="(min-width: 900px) 170px, 112px" />
    </section>

    {items.some(item => item.source === "sample" || item.id.startsWith("sample-")) && <p className="ap-sample-note">Your list includes sample appliances for this UI preview. Add your own readings or edit their values to explore the estimates.</p>}

    <section className="ui-panel ap-simulator" aria-labelledby="ap-simulator-heading"><span><SlidersHorizontal aria-hidden="true" /></span><div><h2 id="ap-simulator-heading">What could a small change save?</h2><p>Try different hours, power ratings, or appliances in Watt-If.</p></div><Link href="/simulator">Open simulator<ChevronRight size={16} aria-hidden="true" /></Link></section>

    <section className="ui-panel ap-list-panel" aria-labelledby="ap-list-title">
      <div className="ui-panel-heading"><div><h2 id="ap-list-title">Top energy users</h2><p>Sorted by estimated monthly use</p></div><span className="ui-count">{items.length} {items.length === 1 ? "entry" : "entries"}</span></div>
      {items.length ? <ul className="ap-list">
        {items.map(item => { const kind = kindOf(item); const Icon = kindIcons[kind]; const daily = dailyApplianceKwh(item); const share = totalDaily ? daily / totalDaily * 100 : 0; return <li key={item.id}>
          <span className={`ap-icon is-${kind}`}><Icon aria-hidden="true" /></span>
          <div className="ap-item-main">
            <div className="ap-item-top"><h3>{item.name}</h3><strong>{(daily * 30).toFixed(1)} <small>kWh/mo</small></strong></div>
            <p>{trim(item.watts)} W · {trim(item.hours)} hrs/day{item.quantity > 1 && ` · ×${item.quantity}`}<span>≈ {pesos(daily * 30 * rate)}/mo</span></p>
            <p className="ap-item-detail">{item.model && `${item.model} · `}{item.source === "sample" || item.id.startsWith("sample-") ? "Sample" : "Manual"} · {item.wattageBasis === "nameplate" ? "Nameplate watts" : "Approximate watts"}</p>
            {item.days !== undefined && <p className="ap-item-detail">{item.days} days selected · {(daily * item.days).toFixed(2)} kWh for this period</p>}
            <div className="ap-share" role="img" aria-label={`${share.toFixed(0)} percent of estimated appliance use`}><span style={{ width: `${share > 0 ? Math.max(share, 2) : 0}%` }} /><em>{share.toFixed(0)}%</em></div>
          </div>
          <div className="ap-item-actions">
            <button type="button" className="ui-icon-button ap-edit" disabled={!ready} aria-label={`Edit ${item.name}`} onClick={() => open(item)}><Pencil size={16} /></button>
            <button type="button" className="ui-icon-button" disabled={!ready} aria-label={`Remove ${item.name}`} onClick={() => setRemoving(item)}><Trash2 size={16} /></button>
          </div>
        </li>; })}
      </ul> : <div className="ap-empty"><Image src="/assets/branding/actions-7.png" alt="" width={200} height={200} sizes="120px" /><h3>No appliances yet</h3><p>Add the appliances you use at home to see which ones use the most energy.</p><Link className="ui-primary" href="/appliances/new"><Plus size={18} aria-hidden="true" /> Add appliance</Link></div>}
      <p className="ui-helper">Monthly comparisons use watts × hours × quantity over 30 days. Each entry also shows its selected period. These estimates cover registered appliances only; actual use varies with settings, age, and cycling.</p>
    </section>
    <ConfirmRecordRemoval name={removing?.name ?? null} error={storageError} onKeep={() => setRemoving(null)} onRemove={() => removing ? remove(removing) : false} />
    {message && <p className="ui-success" role="status">{message}</p>}{storageError && <p className="ui-error" role="alert">{storageError}</p>}

    <dialog ref={dialog} className="ap-dialog" aria-labelledby="ap-dialog-title" onClose={() => opener.current?.focus()} onClick={event => { if (event.target === event.currentTarget) close(); }}>
      <form className="ap-dialog-body" onSubmit={submit} noValidate>
        <div className="ap-dialog-head">
          <span className={`ap-icon is-${draft.kind}`}>{(() => { const Icon = kindIcons[draft.kind]; return <Icon aria-hidden="true" />; })()}</span>
          <div><h2 id="ap-dialog-title">Edit appliance</h2><p>Review the power and how you use it.</p></div>
          <button type="button" className="ap-close" aria-label="Close" onClick={close}><X aria-hidden="true" /></button>
        </div>
        <AppliancePicker value={draft.kind} onChange={pickPreset} />
        <div className="ap-fields">
          <label className="ap-wide">Name<input value={draft.name} maxLength={80} placeholder="e.g. Bedroom fan" required onChange={event => change({ name: event.target.value })} /></label>
          <label className="ap-wide">Model (optional)<input value={draft.model} maxLength={80} onChange={event => change({ model: event.target.value })} /></label>
          <label>Rated power<span className="ap-unit"><input type="number" aria-label="Rated power" inputMode="decimal" min="0.1" step="any" placeholder="Unknown" required value={draft.watts} onChange={event => change({ watts: event.target.value })} /><em>W</em></span></label>
          <div className="ap-field"><span id="ap-hours-label">Hours per day</span><div className="ap-stepper"><button type="button" aria-label="Fewer hours" onClick={() => stepHours(-0.5)}><Minus aria-hidden="true" /></button><input aria-labelledby="ap-hours-label" type="number" inputMode="decimal" min="0" max="24" step="any" required value={draft.hours} onChange={event => change({ hours: event.target.value })} /><button type="button" aria-label="More hours" onClick={() => stepHours(0.5)}><Plus aria-hidden="true" /></button></div></div>
          <label className="ap-wide">Days in this period<input type="number" inputMode="numeric" min="1" max="366" step="1" required value={draft.days} onChange={event => change({ days: event.target.value })} /></label>
          <div className="ap-field ap-wide"><span id="ap-qty-label">How many?</span><div className="ap-stepper is-qty"><button type="button" aria-label="Fewer" disabled={draft.quantity <= 1} onClick={() => change({ quantity: Math.max(1, draft.quantity - 1) })}><Minus aria-hidden="true" /></button><output aria-labelledby="ap-qty-label">{draft.quantity}</output><button type="button" aria-label="More" disabled={draft.quantity >= 50} onClick={() => change({ quantity: Math.min(50, draft.quantity + 1) })}><Plus aria-hidden="true" /></button></div></div>
          <label className="ap-wide">Wattage basis<select aria-label="Wattage basis" value={draft.wattageBasis} onChange={event => change({ wattageBasis: event.target.value as Draft["wattageBasis"] })}><option value="nameplate">Rated power on the nameplate</option><option value="approximate">My approximate wattage</option></select></label>
        </div>
        <div className="ap-estimate" aria-live="polite">
          <Zap aria-hidden="true" />
          <div><strong>{validEstimate ? `${draftDaily.toFixed(2)} kWh` : "—"}</strong><span>per day</span></div>
          <div><strong>{validEstimate ? `${(draftDaily * Number(draft.days)).toFixed(1)} kWh` : "—"}</strong><span>in {draft.days || "—"} days</span></div>
          <div><strong>{validEstimate ? pesos(draftDaily * Number(draft.days) * rate) : "—"}</strong><span>est. for period</span></div>
        </div>
        {error && <p className="ui-error" role="alert">{error}</p>}
        {storageError && <p className="ui-error" role="alert">{storageError}</p>}
        <label className="ap-edit-confirm"><input type="checkbox" checked={reviewed} onChange={event => { setReviewed(event.target.checked); setError(""); }} />I reviewed the power, quantity, hours, and days.</label>
        <div className="ap-dialog-actions"><button type="button" className="ui-secondary" onClick={close}>Cancel</button><button type="submit" className="ui-primary" disabled={!ready}>Save changes</button></div>
      </form>
    </dialog>
  </PageShell>;
}
