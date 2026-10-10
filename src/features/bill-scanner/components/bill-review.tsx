"use client";

import { useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { Check, ChevronDown, FileImage, FileText, Info, Keyboard, RotateCcw, ShieldCheck, Sparkles, Trash2, TriangleAlert, WifiOff, X } from "lucide-react";
import { BillArt } from "@/features/dashboard/components/DashboardArtwork";
import { antiquePepsSubsidy, billMonth, dueDateLabel, isProviderChoice, pesos, subsidyFor, validateBill, type BillChargeLine, type MeterReadings, type PreviewBill } from "@/features/dashboard/preview-data";
import { previewProviderName, previewProviders } from "@/features/household-profile/provider-preview";
import type { LocalBillDraft } from "../local-draft";
import "../bill-review.css";

export type BillReviewDraft = LocalBillDraft;
export type BillPreviewSource = { name: string; kind: "sample" | "image" | "pdf"; url?: string };
/** What Snap AI read from the photo. `failed` explains why the form is empty instead. */
export type AiReading = { failed?: string; checks: string[]; missing: string[]; charges: BillChargeLine[]; readings?: MeterReadings };

type Props = {
  mode: "scan" | "manual";
  draft: BillReviewDraft;
  original: Omit<PreviewBill, "id"> | null;
  source: BillPreviewSource | null;
  duplicate?: PreviewBill;
  /** The household’s own monthly subsidy setting, if any. */
  monthlySubsidy?: number;
  offline: boolean;
  ready: boolean;
  storageError: string;
  onChange: (draft: BillReviewDraft) => void;
  onRestart: () => void;
  onDiscard?: () => void;
  onSave: (bill: Omit<PreviewBill, "id">) => void;
  onReplaceSource?: () => void;
  onRemoveSource?: () => void;
  ai?: AiReading | null;
};

export default function BillReview({ mode, draft, original, source, duplicate, monthlySubsidy, offline, ready, storageError, onChange, onRestart, onDiscard, onSave, onReplaceSource, onRemoveSource, ai }: Props) {
  const read = ai && !ai.failed ? ai : null;
  const [chargesOpen, setChargesOpen] = useState(false);
  // Fields the AI could not read are highlighted until the person fills them in.
  const missing = (field: string, value: string) => read?.missing.includes(field) && !value.trim() ? " is-missing" : "";
  const [reviewed, setReviewed] = useState(false);
  const [replace, setReplace] = useState(false);
  const [error, setError] = useState("");
  const [periodOpen, setPeriodOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const originalButton = useRef<HTMLButtonElement>(null);
  const confirmation = useRef<HTMLInputElement>(null);
  const replacement = useRef<HTMLInputElement>(null);
  const sample = mode === "scan";
  const changes = original ? ["month", "kwh", "amount", "dueDate"].filter(key => {
    const field = key as "month" | "kwh" | "amount" | "dueDate";
    return field === "kwh" || field === "amount" ? Number(draft[field]) !== original[field] : draft[field] !== (original[field] ?? "");
  }).length : 0;

  // The subsidy follows the bill automatically until the person types their own value.
  const billAmount = Number(draft.amount);
  const defaultMonthly = monthlySubsidy ?? (draft.provider === "anteco" ? antiquePepsSubsidy : 0);
  const subsidyText = draft.subsidy ?? (billAmount > 0 && defaultMonthly > 0 ? String(subsidyFor(billAmount, defaultMonthly)) : "");
  const subsidy = subsidyText.trim() === "" ? 0 : Number(subsidyText);
  const pay = billAmount > 0 && Number.isFinite(subsidy) && subsidy >= 0 ? Math.max(0, Math.round((billAmount - subsidy) * 100) / 100) : null;

  function edit(patch: Partial<BillReviewDraft>) {
    setError("");
    setReviewed(false);
    setReplace(false);
    onChange({ ...draft, ...patch });
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const bill: Omit<PreviewBill, "id"> = {
      month: draft.month, amount: Number(draft.amount), kwh: Number(draft.kwh),
      dueDate: draft.dueDate || undefined, periodStart: draft.periodStart || undefined, periodEnd: draft.periodEnd || undefined,
      source: sample ? "sample" : read ? "scan" : "manual", sourceName: source?.name,
      ...(read?.charges.length ? { charges: read.charges } : {}), ...(read?.readings ? { readings: read.readings } : {}),
      provider: draft.provider, billingDate: draft.billingDate || undefined, notes: draft.notes?.trim() || undefined,
      subsidy: subsidyText.trim() === "" || subsidy === 0 ? undefined : subsidy,
    };
    const issue = validateBill(bill);
    if (issue) { setError(issue); if (issue.includes("period")) setPeriodOpen(true); return; }
    if (!sample && !isProviderChoice(draft.provider)) { setError("Select the electricity provider printed on this bill."); return; }
    if (!reviewed) { setError("Confirm that you reviewed the values before saving."); confirmation.current?.focus(); return; }
    if (duplicate && !replace) { setError("Confirm replacement, or choose a different billing month."); replacement.current?.focus(); return; }
    setError("");
    onSave(bill);
  }

  return <form className="scan-review br-review" onSubmit={save} noValidate>
    <div className="scan-review-head">
      <span className="scan-review-icon">{sample || read ? <Sparkles aria-hidden="true" /> : <Keyboard aria-hidden="true" />}</span>
      <div><h2>{sample ? "Review the sample reading" : read ? "Check your bill" : "Enter your bill details"}</h2><p>{sample ? "Check each field and try correcting the example." : read ? "WattSnap AI read it. Fix anything that’s wrong." : ai?.failed ? `${ai.failed} Copy the values from your photo.` : "Copy the values from your bill."}</p></div>
    </div>
    {read && read.checks.length > 0 && <div className="br-checks" role="status"><TriangleAlert aria-hidden="true" /><div><strong>Please double-check</strong><ul>{read.checks.map(check => <li key={check}>{check}</li>)}</ul></div></div>}
    {offline && <div className="br-note is-offline" role="status"><WifiOff aria-hidden="true" /><p><strong>You’re offline.</strong> You can review and save locally. New AI extraction will need a connection in the finished app.</p></div>}
    {sample && <div className="br-note is-sample"><Info aria-hidden="true" /><p><strong>Sample values · UI preview</strong>These values are generated examples, including when you upload a photo. The saved record will be labeled Sample.</p></div>}

    {source && <div className="br-source"><span className="br-source-icon">{source.kind === "pdf" ? <FileText aria-hidden="true" /> : <FileImage aria-hidden="true" />}</span><div><strong>{source.name}</strong><small>{source.kind === "sample" ? "Example bill · no uploaded document" : "Original file · available during this session"}</small></div><button ref={originalButton} type="button" onClick={() => dialog.current?.showModal()}>View original</button></div>}

    <div className="scan-fields br-fields">
      <label className="is-wide"><span className="scan-label">Electricity provider</span><select value={draft.provider?.startsWith("custom:") ? "other" : draft.provider ?? ""} onChange={event => edit({ provider: event.target.value })}><option value="">Select provider</option>{previewProviders.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}<option value="other">Other provider</option></select></label>
      {(draft.provider === "other" || draft.provider?.startsWith("custom:")) && <label className="is-wide"><span className="scan-label">Other provider name</span><input maxLength={80} value={draft.provider.startsWith("custom:") ? previewProviderName(draft.provider) : ""} onChange={event => edit({ provider: `custom:${encodeURIComponent(event.target.value)}` })} /></label>}
      <label htmlFor="review-month" className={missing("billingMonth", draft.month)}><span id="review-month-label" className="scan-label">Billing month</span><input id="review-month" aria-labelledby="review-month-label" type="month" required value={draft.month} onChange={event => edit({ month: event.target.value })} /></label>
      <label htmlFor="review-due" className={missing("dueDate", draft.dueDate)}><span className="scan-label"><span id="review-due-label">Due date</span><small>optional</small></span><input id="review-due" aria-labelledby="review-due-label" type="date" value={draft.dueDate} onChange={event => edit({ dueDate: event.target.value })} /></label>
      <label htmlFor="review-kwh" className={missing("consumptionKwh", draft.kwh)}><span id="review-kwh-label" className="scan-label">Energy used</span><span className="scan-unit"><input id="review-kwh" aria-labelledby="review-kwh-label" type="number" inputMode="decimal" min="0.01" step="0.01" placeholder="e.g. 109" required value={draft.kwh} onChange={event => edit({ kwh: event.target.value })} /><em>kWh</em></span></label>
      <label htmlFor="review-amount" className={missing("amountDue", draft.amount)}><span id="review-amount-label" className="scan-label">Current month bill</span><span className="scan-unit is-prefix"><em>₱</em><input id="review-amount" aria-labelledby="review-amount-label" aria-describedby="review-amount-hint" type="number" inputMode="decimal" min="0.01" step="0.01" placeholder="e.g. 1248.50" required value={draft.amount} onChange={event => edit({ amount: event.target.value })} /></span><small id="review-amount-hint" className="br-field-hint">Before any subsidy or past balance.</small></label>
      <label htmlFor="review-subsidy"><span className="scan-label"><span id="review-subsidy-label">Subsidy</span><small>optional</small></span><span className="scan-unit is-prefix"><em>₱</em><input id="review-subsidy" aria-labelledby="review-subsidy-label" aria-describedby="review-subsidy-hint" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0" value={subsidyText} onChange={event => edit({ subsidy: event.target.value })} /></span><small id="review-subsidy-hint" className="br-field-hint">e.g. Antique PEPS, up to ₱500</small></label>
      <div className="br-pay" aria-live="polite"><span className="scan-label">You pay</span><strong>{pay === null ? "—" : pesos(pay)}</strong></div>
    </div>
    {read && (read.readings || read.charges.length > 0) && <div className="br-read">
      {read.readings && <p className="br-meter"><span>Meter</span><strong>{read.readings.previous.toLocaleString()} → {read.readings.present.toLocaleString()}</strong>{read.readings.multiplier && read.readings.multiplier !== 1 ? <small>× {read.readings.multiplier}</small> : null}</p>}
      {read.charges.length > 0 && <>
        <button type="button" className="br-charges-toggle" aria-expanded={chargesOpen} aria-controls="review-charges" onClick={() => setChargesOpen(value => !value)}><span>Charges <small>{read.charges.length} items · {pesos(read.charges.reduce((sum, item) => sum + item.amount, 0))}</small></span><ChevronDown aria-hidden="true" /></button>
        {chargesOpen && <ul id="review-charges" className="br-charges">{read.charges.map(item => <li key={item.label}><span>{item.label}</span><strong>{pesos(item.amount)}</strong></li>)}</ul>}
      </>}
    </div>}
    {source && <div className="br-actions">{onReplaceSource && <button type="button" className="ui-secondary" onClick={() => { setReviewed(false); onReplaceSource(); }}>Replace file</button>}{onRemoveSource && <button type="button" className="ui-secondary" onClick={() => { setReviewed(false); onRemoveSource(); }}>Remove file</button>}</div>}
    <div className="br-period">
      <button type="button" aria-expanded={periodOpen} aria-controls="review-period-fields" onClick={() => setPeriodOpen(value => !value)}><span>Exact billing period &amp; notes <small>optional</small></span><ChevronDown aria-hidden="true" /></button>
      {periodOpen && <div id="review-period-fields"><p>Use the dates printed on your bill.</p><div className="scan-fields">
        <label htmlFor="review-start"><span id="review-start-label" className="scan-label">Period start</span><input id="review-start" aria-labelledby="review-start-label" type="date" value={draft.periodStart} onChange={event => edit({ periodStart: event.target.value })} /></label>
        <label htmlFor="review-end"><span id="review-end-label" className="scan-label">Period end</span><input id="review-end" aria-labelledby="review-end-label" type="date" value={draft.periodEnd} onChange={event => edit({ periodEnd: event.target.value })} /></label>
        <label><span className="scan-label">Billing date <small>optional</small></span><input type="date" value={draft.billingDate ?? ""} onChange={event => edit({ billingDate: event.target.value })} /></label>
        <label className="is-wide"><span className="scan-label">Bill notes <small>optional</small></span><input maxLength={500} value={draft.notes ?? ""} onChange={event => edit({ notes: event.target.value })} /></label>
      </div></div>}
    </div>
    {sample && changes > 0 && <p className="br-corrections" role="status"><Check size={15} aria-hidden="true" /> {changes} {changes === 1 ? "field corrected" : "fields corrected"} from the example reading</p>}
    {duplicate && <div className="br-duplicate">
      <h3><TriangleAlert aria-hidden="true" /> A bill already exists for {billMonth(duplicate.month)}</h3>
      <p>Your saved bill stays unchanged until you confirm replacement.</p>
      <div className="br-replacement-values"><div><small>Currently saved</small><strong>{duplicate.kwh} kWh</strong><span>{pesos(duplicate.amount)}</span></div><div><small>Your reviewed values</small><strong>{draft.kwh || "—"} kWh</strong><span>{draft.amount && Number.isFinite(Number(draft.amount)) ? pesos(Number(draft.amount)) : "—"}</span></div></div>
      <label className="br-check"><input ref={replacement} type="checkbox" checked={replace} onChange={event => { setReplace(event.target.checked); setError(""); }} /><span>Replace the saved bill for this month with these reviewed values.</span></label>
    </div>}
    <label className={`br-check br-confirm${reviewed ? " is-checked" : ""}`}><input ref={confirmation} type="checkbox" checked={reviewed} onChange={event => { setReviewed(event.target.checked); setError(""); }} /><span><strong>I reviewed all the values above.</strong><small>{sample ? "I understand this is a sample record for the UI preview." : "They match my bill."}</small></span></label>
    {(error || storageError) && <p id="bill-review-error" className="ui-error" role="alert">{error || storageError}</p>}
    <div className="br-submit"><button type="submit" className="ui-primary" disabled={!ready}><Check size={18} aria-hidden="true" /> {duplicate ? "Replace bill" : sample ? "Save sample bill" : "Save to history"}</button><div className="br-links"><button type="button" onClick={onRestart}><RotateCcw size={16} aria-hidden="true" /> {sample ? "Start over" : "Use scanner"}</button>{onDiscard && <button type="button" onClick={onDiscard}><Trash2 size={16} aria-hidden="true" /> Discard draft</button>}</div></div>
    <p className="br-save-note"><ShieldCheck size={14} aria-hidden="true" /> Saved on this device. Re-attach photos after a refresh.</p>

    <dialog ref={dialog} className="br-original-dialog" aria-labelledby="original-bill-heading" onClose={() => originalButton.current?.focus()} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className="br-original-head"><div><span className="br-eyebrow">REFERENCE DOCUMENT</span><h2 id="original-bill-heading">{source?.kind === "sample" ? "Sample electricity bill" : "Your original bill"}</h2></div><button type="button" className="ui-icon-button" aria-label="Close original bill" onClick={() => dialog.current?.close()}><X aria-hidden="true" /></button></div>
      {source?.kind === "image" && source.url ? <Image className="br-original-image" src={source.url} alt="Original uploaded electricity bill" width={900} height={1200} unoptimized /> : source?.kind === "pdf" && source.url ? <div className="br-pdf"><FileText aria-hidden="true" /><strong>{source.name}</strong><p>Open the original PDF in another tab to compare its printed values.</p><a className="ui-primary" href={source.url} target="_blank" rel="noreferrer">Open original PDF</a></div> : original ? <div className="br-original-sample"><BillArt period={billMonth(original.month)} kwh={String(original.kwh)} amount={pesos(original.amount)} due={original.dueDate ? dueDateLabel(original.dueDate) : "Unknown"} /></div> : null}
      <p className="br-original-caption">{source?.kind === "sample" ? "This example stays unchanged while you edit the review fields." : "This file stays on your device and is available until you leave or restart this workflow."}</p>
      <button type="button" className="ui-secondary" onClick={() => dialog.current?.close()}>Back to review</button>
    </dialog>
  </form>;
}
