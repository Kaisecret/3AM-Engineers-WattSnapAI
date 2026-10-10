"use client";

import { forwardRef, useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { Camera, ChevronRight, Keyboard, Minus, Plus, Upload, X, Zap } from "lucide-react";
import AppliancePicker, { applianceIcons } from "./appliance-picker";
import { appliancePresets, dailyApplianceKwh, pesos, validateAppliance, type ApplianceKind, type PreviewAppliance } from "@/features/dashboard/preview-data";
import { applianceFrom, blankDraft, draftFrom, type ApplianceDraft } from "../appliance-draft";
import { typicalUse } from "../typical-use";

export type AppliancePhoto = { url: string; name: string };
export type AddChoice = "camera" | "upload" | "manual";

type Draft = ApplianceDraft;
const blank = blankDraft;
const trim = (value: number) => Number(value.toFixed(2)).toString();

const choices: { id: AddChoice; label: string; hint: string; Icon: typeof Camera }[] = [
  { id: "camera", label: "Take photo", hint: "Snap the label", Icon: Camera },
  { id: "upload", label: "Upload photo", hint: "From your gallery", Icon: Upload },
  { id: "manual", label: "Type it in", hint: "Enter the watts", Icon: Keyboard },
];

/** First popup after tapping Add appliance: photo or manual entry. */
export const AddApplianceSheet = forwardRef<HTMLDialogElement, { disabled: boolean; onChoose: (choice: AddChoice) => void }>(function AddApplianceSheet({ disabled, onChoose }, ref) {
  const close = (event: { currentTarget: HTMLElement }) => event.currentTarget.closest("dialog")?.close();
  return <dialog ref={ref} className="np-sheet" aria-labelledby="np-sheet-heading" onClick={event => { if (event.target === event.currentTarget) event.currentTarget.close(); }}><div className="np-sheet-body">
    <div className="np-sheet-head"><h2 id="np-sheet-heading">Add an appliance</h2><button type="button" className="np-sheet-close" aria-label="Close" onClick={close}><X size={20} aria-hidden="true" /></button></div>
    <div className="np-sheet-options">{choices.map(({ id, label, hint, Icon }) => <button key={id} type="button" className={`np-sheet-option is-${id}`} aria-describedby={`np-sheet-${id}`} disabled={disabled} onClick={event => { close(event); onChoose(id); }}><span className="np-sheet-icon"><Icon aria-hidden="true" /></span><span className="np-sheet-copy"><strong>{label}</strong><small id={`np-sheet-${id}`}>{hint}</small></span><ChevronRight className="np-sheet-chevron" aria-hidden="true" /></button>)}</div>
  </div></dialog>;
});

/** Popup form to add or edit one appliance. Nothing is saved until the person checks the values and taps save. */
export default function ApplianceDialog({ open, item, photo, appliances, rate, ready, storageError, onSave, onClose, onChangePhoto, onRemovePhoto }: {
  open: boolean; item?: PreviewAppliance; photo?: AppliancePhoto; appliances: PreviewAppliance[]; rate: number; ready: boolean; storageError: string;
  onSave: (appliance: Omit<PreviewAppliance, "id">) => boolean; onClose: () => void; onChangePhoto: () => void; onRemovePhoto: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const [draft, setDraft] = useState<Draft>(blank);
  const [checked, setChecked] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [error, setError] = useState("");
  const editing = Boolean(item);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) {
      opener.current = document.activeElement as HTMLElement | null;
      setDraft(draftFrom(item)); setChecked(false); setZoom(false); setError("");
      element.showModal();
    } else if (!open && element.open) element.close();
  }, [open, item]);

  const appliance = applianceFrom(draft);
  const valid = !validateAppliance(appliance);
  const daily = valid ? dailyApplianceKwh(appliance) : 0;
  const days = Number(draft.days) || 0;
  const typical = typicalUse(draft.kind);
  const duplicate = !editing && draft.name.trim() ? appliances.find(other => other.name.trim().toLowerCase() === draft.name.trim().toLowerCase()) : undefined;
  const Icon = applianceIcons[draft.kind];

  function change(patch: Partial<Draft>) { setDraft(current => ({ ...current, ...patch })); setChecked(false); setError(""); }
  function pick(kind: ApplianceKind) {
    const preset = appliancePresets.find(entry => entry.kind === kind);
    const previous = appliancePresets.find(entry => entry.kind === draft.kind)?.name;
    // Keep a name the person typed; replace one that came from the previous type.
    change({ kind, name: !draft.name.trim() || draft.name === previous ? preset?.name ?? draft.name : draft.name });
  }
  const stepHours = (delta: number) => change({ hours: trim(Math.min(24, Math.max(0, (Number(draft.hours) || 0) + delta))) });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const issue = validateAppliance(appliance);
    if (issue) { setError(issue); return; }
    if (!checked) { setError("Tick “I checked these values” to save."); return; }
    if (onSave(appliance)) dialog.current?.close();
  }

  return <dialog ref={dialog} className="ap-dialog ad-dialog" aria-labelledby="ad-title" onClose={() => { onClose(); opener.current?.focus(); }} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
    <form className="ap-dialog-body" onSubmit={submit} noValidate>
      <div className="ap-dialog-head">
        <span className={`ap-icon is-${draft.kind}`}><Icon aria-hidden="true" /></span>
        <div><h2 id="ad-title">{editing ? "Edit appliance" : "Add appliance"}</h2></div>
        <button type="button" className="ap-close" aria-label="Close" onClick={() => dialog.current?.close()}><X aria-hidden="true" /></button>
      </div>

      {photo && <div className="ad-photo">
        <button type="button" className="ad-photo-thumb" aria-expanded={zoom} aria-label={zoom ? "Make the photo smaller" : "Make the photo bigger"} onClick={() => setZoom(value => !value)}><Image src={photo.url} alt="" width={120} height={120} unoptimized /></button>
        <div className="ad-photo-copy"><strong>Your label photo</strong><span>Copy the watts (W) from it</span></div>
        <button type="button" className="ad-photo-change" onClick={onChangePhoto}>Change</button>
        <button type="button" className="ad-photo-remove" aria-label="Remove photo" onClick={onRemovePhoto}><X aria-hidden="true" /></button>
        {zoom && <Image className="ad-photo-large" src={photo.url} alt="Appliance label photo" width={1000} height={1000} unoptimized />}
      </div>}

      <AppliancePicker value={draft.kind} onChange={pick} />
      <div className="ap-fields">
        <label className="ap-wide">Name<input value={draft.name} maxLength={80} placeholder="e.g. Bedroom fan" required onChange={event => change({ name: event.target.value })} /></label>
        <div className="ap-field"><span id="ad-power-label">Power</span>
          <div className="ad-power">
            <input aria-labelledby="ad-power-label" type="number" inputMode="decimal" min="0.001" step="any" placeholder="Watts" required value={draft.power} onChange={event => change({ power: event.target.value })} />
            <div className="ad-unit" role="radiogroup" aria-label="Power unit">{(["W", "kW"] as const).map(unit => <button key={unit} type="button" role="radio" aria-checked={draft.unit === unit} className={draft.unit === unit ? "is-on" : ""} onClick={() => change({ unit })}>{unit}</button>)}</div>
          </div>
        </div>
        <div className="ap-field"><span id="ad-hours-label">Hours a day</span><div className="ap-stepper"><button type="button" aria-label="Fewer hours" onClick={() => stepHours(-0.5)}><Minus aria-hidden="true" /></button><input aria-labelledby="ad-hours-label" type="number" inputMode="decimal" min="0" max="24" step="any" required placeholder="0" value={draft.hours} onChange={event => change({ hours: event.target.value })} /><button type="button" aria-label="More hours" onClick={() => stepHours(0.5)}><Plus aria-hidden="true" /></button></div></div>
        {(typical || (draft.unit === "kW" && Number(draft.power) > 0)) && <p className="ad-hint ap-wide">{draft.unit === "kW" && Number(draft.power) > 0 ? `${draft.power} kW = ${(Number(draft.power) * 1000).toLocaleString()} W` : typical ? `Typical ${typical.label}: ${typical.watts[0].toLocaleString()}–${typical.watts[1].toLocaleString()} W${typical.hours ? `. ${typical.hours}` : ""}` : ""}</p>}
        <div className="ap-field"><span id="ad-qty-label">How many</span><div className="ap-stepper is-qty"><button type="button" aria-label="Fewer" disabled={draft.quantity <= 1} onClick={() => change({ quantity: Math.max(1, draft.quantity - 1) })}><Minus aria-hidden="true" /></button><output aria-labelledby="ad-qty-label">{draft.quantity}</output><button type="button" aria-label="More" disabled={draft.quantity >= 50} onClick={() => change({ quantity: Math.min(50, draft.quantity + 1) })}><Plus aria-hidden="true" /></button></div></div>
        <label>Days<input type="number" inputMode="numeric" min="1" max="366" step="1" required value={draft.days} onChange={event => change({ days: event.target.value })} /></label>
        <div className="ap-field ap-wide"><span id="ad-basis-label">Watts from</span><div className="ad-segment" role="radiogroup" aria-labelledby="ad-basis-label">{([["nameplate", "The label"], ["approximate", "My guess"]] as const).map(([value, label]) => <button key={value} type="button" role="radio" aria-checked={draft.wattageBasis === value} className={draft.wattageBasis === value ? "is-on" : ""} onClick={() => change({ wattageBasis: value })}>{label}</button>)}</div></div>
        <label className="ap-wide"><span>Model <small>(optional)</small></span><input value={draft.model} maxLength={80} placeholder="From the label" onChange={event => change({ model: event.target.value })} /></label>
      </div>

      <div className="ap-estimate" aria-live="polite">
        <Zap aria-hidden="true" />
        <div><strong>{valid ? `${daily.toFixed(2)} kWh` : "—"}</strong><span>per day</span></div>
        <div><strong>{valid ? `${(daily * days).toFixed(1)} kWh` : "—"}</strong><span>in {draft.days || "—"} days</span></div>
        <div><strong>{valid && rate > 0 ? pesos(daily * days * rate) : "—"}</strong><span>{rate > 0 ? "est. cost" : "add a bill for ₱"}</span></div>
      </div>
      {duplicate && <p className="ad-hint">You already have {duplicate.name}. Saving adds another one.</p>}
      {error && <p className="ui-error" role="alert">{error}</p>}
      {storageError && <p className="ui-error" role="alert">{storageError}</p>}
      <label className="ap-edit-confirm"><input type="checkbox" checked={checked} onChange={event => { setChecked(event.target.checked); setError(""); }} />I checked these values</label>
      <div className="ap-dialog-actions"><button type="button" className="ui-secondary" onClick={() => dialog.current?.close()}>Cancel</button><button type="submit" className="ui-primary" disabled={!ready}>{editing ? "Save changes" : "Add appliance"}</button></div>
    </form>
  </dialog>;
}
