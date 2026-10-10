"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { FileImage, Info, ShieldCheck, TriangleAlert, WifiOff, X, Zap } from "lucide-react";
import { appliancePresets, pesos, type PreviewAppliance } from "@/features/dashboard/preview-data";
import AppliancePicker from "./appliance-picker";
import { nameplateEstimate, reviewNameplate, sampleNameplates, type NameplateDraft } from "../nameplate-preview";

export type NameplateSource = { kind: "manual" } | { kind: "sample"; sample: keyof typeof sampleNameplates } | { kind: "photo"; name: string; url: string };

export function SampleNameplate({ type }: { type: keyof typeof sampleNameplates }) {
  const sample = sampleNameplates[type];
  return <div className="np-label" aria-label="Sample appliance nameplate"><span>WATTSNAP · EXAMPLE LABEL</span><strong>{sample.name}</strong><dl><div><dt>Model</dt><dd>{sample.model}</dd></div><div><dt>Rated input</dt><dd>{sample.power ? `${sample.power} W` : "Not printed"}</dd></div><div><dt>Voltage</dt><dd>{sample.voltage}</dd></div><div><dt>Frequency</dt><dd>{sample.frequency}</dd></div></dl><small>Sample only · not a real product specification</small></div>;
}

export default function NameplateReview({ initial, source, appliances, rate, ready, offline, storageError, onRestart, onSave, onDraftChange, onReplaceSource, onRemoveSource }: {
  initial: NameplateDraft; source: NameplateSource; appliances: PreviewAppliance[]; rate: number; ready: boolean; offline: boolean; storageError: string;
  onDraftChange?: (draft: NameplateDraft) => void; onReplaceSource?: () => void; onRemoveSource?: () => void;
  onRestart: () => void; onSave: (appliance: Omit<PreviewAppliance, "id">, replacement?: string) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [confirmed, setConfirmed] = useState(false);
  const [duplicateAction, setDuplicateAction] = useState("");
  const [error, setError] = useState("");
  const original = useRef<HTMLDialogElement>(null);
  const originalButton = useRef<HTMLButtonElement>(null);
  const confirmation = useRef<HTMLInputElement>(null);
  const sample = source.kind === "sample";
  const result = reviewNameplate(draft, sample ? "sample" : "manual");
  const estimate = result.appliance ? nameplateEstimate(result.appliance) : null;
  const duplicate = appliances.find(item => item.name.trim().toLowerCase() === draft.name.trim().toLowerCase() && (item.model ?? "").trim().toLowerCase() === draft.model.trim().toLowerCase());
  const changes = sample ? (["name", "model", "power", "unit"] as const).filter(field => draft[field] !== initial[field]).length : 0;

  useEffect(() => { setConfirmed(false); }, [source]);
  function edit(patch: Partial<NameplateDraft>) {
    const next = { ...draft, ...patch }; setDraft(next); onDraftChange?.(next); setConfirmed(false); setDuplicateAction(""); setError("");
  }
  function pick(kind: NameplateDraft["kind"]) {
    const previous = appliancePresets.find(preset => preset.kind === draft.kind)?.name;
    const name = !draft.name.trim() || draft.name === previous ? appliancePresets.find(preset => preset.kind === kind)?.name ?? "" : draft.name;
    edit({ kind, name });
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!result.appliance) { setError(result.error); return; }
    if (!confirmed) { setError("Confirm that you reviewed every calculation input before saving."); confirmation.current?.focus(); return; }
    if (duplicate && !duplicateAction) { setError("Choose whether to add a separate appliance or replace the saved one."); return; }
    setError(""); onSave(result.appliance, duplicateAction === "replace" ? duplicate?.id : undefined);
  }

  return <div className="np-review-layout">
    <aside className="ui-panel np-reference" aria-labelledby="np-reference-heading">
      <span className="np-eyebrow">YOUR REFERENCE</span><h2 id="np-reference-heading">{sample ? "Sample nameplate" : source.kind === "photo" ? "Your nameplate photo" : "Look for rated input"}</h2>
      {source.kind === "photo" ? <><div className="np-image-wrap"><Image src={source.url} alt="Uploaded appliance nameplate" fill sizes="(min-width: 900px) 34vw, 100vw" unoptimized /></div><p className="np-filename">{source.name}</p></> : sample ? <SampleNameplate type={source.sample} /> : <div className="np-manual-guide"><Zap aria-hidden="true" /><strong>W or kW</strong><p>Copy the power value from your appliance’s label. Model numbers are optional.</p></div>}
      {source.kind !== "manual" && <button ref={originalButton} type="button" className="ui-secondary" onClick={() => original.current?.showModal()}><FileImage size={17} aria-hidden="true" />View original</button>}
      {onReplaceSource && <button type="button" className="ui-secondary" onClick={onReplaceSource}>Replace photo</button>}
      {source.kind === "photo" && onRemoveSource && <button type="button" className="ui-secondary" onClick={onRemoveSource}>Remove photo</button>}
      <p className="ui-helper">Voltage (V) and apparent power (VA) alone cannot give us rated watts. If you do not know the wattage, leave it blank until you can check.</p>
      {source.kind === "photo" && <p className="ui-helper">Your photo stays on this device for this session. Only the reviewed values are saved.</p>}
    </aside>

    <form className="ui-panel np-form" onSubmit={submit} noValidate>
      <div className="ui-panel-heading"><div><span className="np-eyebrow">REVIEW BEFORE SAVING</span><h2>{sample ? "Review the sample appliance" : "Review your appliance"}</h2><p>Check the label, then tell us how you use it.</p></div><span className="np-heading-icon"><ShieldCheck aria-hidden="true" /></span></div>
      {sample && <div className="np-note"><Info aria-hidden="true" /><p><strong>Sample reading · UI preview</strong>This is an example. It will stay labeled Sample after saving.</p></div>}
      {source.kind === "photo" && <div className="np-note"><Info aria-hidden="true" /><p><strong>Photo ready · enter its values</strong>Copy the printed nameplate values into the fields below. The photo is a reference; values are entered manually.</p></div>}
      {sample && source.sample === "voltage" && <div className="np-note is-warning"><TriangleAlert aria-hidden="true" /><p><strong>Wattage missing from this label</strong>The sample shows 230 V, but no rated power. Enter watts or an approximate value before saving.</p></div>}
      {offline && <div className="np-note is-offline" role="status"><WifiOff aria-hidden="true" /><p><strong>You’re offline.</strong>You can enter, review, and save these values locally.</p></div>}
      <AppliancePicker value={draft.kind} onChange={pick} />
      <div className="ap-fields">
        <label className="ap-wide">Appliance name<input value={draft.name} maxLength={80} placeholder="e.g. Bedroom fan" required onChange={event => edit({ name: event.target.value })} /></label>
        <label className="ap-wide">Model (optional)<input value={draft.model} maxLength={80} placeholder="Copy it from the nameplate, if known" onChange={event => edit({ model: event.target.value })} /></label>
        <label>Rated power<input type="number" inputMode="decimal" min="0.001" step="any" placeholder="Unknown" required value={draft.power} onChange={event => edit({ power: event.target.value })} /></label>
        <label>Power unit<select aria-label="Power unit" value={draft.unit} onChange={event => edit({ unit: event.target.value })}><option value="W">W · watts</option><option value="kW">kW · kilowatts</option><option value="V">V · voltage only</option><option value="VA">VA · apparent power</option></select></label>
      </div>
      {draft.unit === "V" || draft.unit === "VA" ? <p className="np-unit-warning" role="status">This unit cannot be used as wattage. Check for W or kW, or use your own approximate wattage.</p> : draft.unit === "kW" && Number(draft.power) > 0 ? <p className="np-unit-hint">{draft.power} kW = {(Number(draft.power) * 1000).toLocaleString()} W</p> : null}
      <fieldset className="np-basis"><legend>Where did the wattage come from?</legend><label><input type="radio" name="basis" checked={draft.wattageBasis === "nameplate"} onChange={() => edit({ wattageBasis: "nameplate" })} />Rated power on the nameplate</label><label><input type="radio" name="basis" checked={draft.wattageBasis === "approximate"} onChange={() => edit({ wattageBasis: "approximate" })} />My approximate wattage</label></fieldset>
      <div className="np-usage-heading"><h3>Your usage assumptions</h3><p>Type selection only changes the name. Enter the power and usage yourself.</p></div>
      <div className="ap-fields np-usage-fields">
        <label>Hours per day<input type="number" inputMode="decimal" min="0" max="24" step="any" required placeholder="e.g. 8" value={draft.hours} onChange={event => edit({ hours: event.target.value })} /></label>
        <label>Quantity<input type="number" inputMode="numeric" min="1" max="50" step="1" required value={draft.quantity} onChange={event => edit({ quantity: event.target.value })} /></label>
        <label className="ap-wide">Days in this period<input type="number" inputMode="numeric" min="1" max="366" step="1" required value={draft.days} onChange={event => edit({ days: event.target.value })} /></label>
      </div>
      <div className="np-estimate" aria-live="polite"><span className="np-estimate-icon"><Zap aria-hidden="true" /></span><div><span>Estimated use · {draft.days || "—"} days{draft.wattageBasis === "approximate" ? " · approximate watts" : ""}</span><strong>{estimate === null ? "Waiting for your inputs" : `${estimate.toFixed(2)} kWh`}</strong><p>{estimate === null ? "Enter valid power, quantity, hours, and days to see an estimate." : rate > 0 ? `≈ ${pesos(estimate * rate)} using the latest bill’s amount ÷ kWh; this includes fees and is not a tariff.` : "Add a bill to include approximate peso estimates."}</p></div></div>
      <p className="ui-helper">Watts × quantity × hours/day × days ÷ 1,000. This estimate does not measure cycling, standby draw, or actual meter readings.</p>
      {changes > 0 && <p className="np-corrections">{changes} {changes === 1 ? "field corrected" : "fields corrected"} from the sample reading.</p>}
      {duplicate && <fieldset className="np-duplicate"><legend>Already in your list</legend><p><strong>{duplicate.name}</strong> · {duplicate.watts} W · {duplicate.hours} hrs/day · ×{duplicate.quantity}</p><label><input type="radio" name="duplicate" checked={duplicateAction === "separate"} onChange={() => { setDuplicateAction("separate"); setError(""); }} />Add as a separate appliance</label><label><input type="radio" name="duplicate" checked={duplicateAction === "replace"} onChange={() => { setDuplicateAction("replace"); setError(""); }} />Replace the saved appliance</label></fieldset>}
      <label className="np-confirm"><input ref={confirmation} type="checkbox" checked={confirmed} onChange={event => { setConfirmed(event.target.checked); setError(""); }} /><span>I checked the power, unit, quantity, hours, and days.<small>Changes to these fields will require another review.</small></span></label>
      {error && <p className="ui-error" role="alert">{error}</p>}{storageError && <p className="ui-error" role="alert">{storageError}</p>}
      {!ready && <p className="ui-helper" role="status">Loading your saved appliances…</p>}
      <div className="np-form-actions"><button type="button" className="ui-secondary" onClick={onRestart}>Choose another input</button><button type="submit" className="ui-primary" disabled={!ready}>{duplicateAction === "replace" ? "Replace appliance" : sample ? "Save sample appliance" : "Save appliance"}</button></div>
    </form>
    <dialog ref={original} className="np-original" aria-labelledby="np-original-heading" onClose={() => originalButton.current?.focus()} onClick={event => { if (event.currentTarget === event.target) original.current?.close(); }}><div className="np-original-head"><h2 id="np-original-heading">{sample ? "Original sample nameplate" : "Original nameplate photo"}</h2><button type="button" className="ui-icon-button" aria-label="Close original nameplate" onClick={() => original.current?.close()}><X aria-hidden="true" /></button></div>{source.kind === "photo" ? <Image src={source.url} alt="Original uploaded appliance nameplate" width={1000} height={1000} unoptimized /> : sample ? <SampleNameplate type={source.sample} /> : null}<p className="ui-helper">This reference stays unchanged while you correct the review fields.</p><button type="button" className="ui-secondary" onClick={() => original.current?.close()}>Back to review</button></dialog>
  </div>;
}
