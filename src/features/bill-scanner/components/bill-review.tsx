"use client";

import { useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, ChevronDown, FileImage, FileText, Info, Keyboard, RotateCcw, ShieldCheck, Sparkles, TriangleAlert, WifiOff, X, Zap } from "lucide-react";
import { BillArt } from "@/features/dashboard/components/DashboardArtwork";
import { billMonth, dueDateLabel, pesos, validateBill, type PreviewBill } from "@/features/dashboard/preview-data";
import "../bill-review.css";

export type BillReviewDraft = { month: string; amount: string; kwh: string; dueDate: string; periodStart: string; periodEnd: string };
export type BillPreviewSource = { name: string; kind: "sample" | "image" | "pdf"; url?: string };

type Props = {
  mode: "scan" | "manual";
  draft: BillReviewDraft;
  original: Omit<PreviewBill, "id"> | null;
  source: BillPreviewSource | null;
  provider: string;
  duplicate?: PreviewBill;
  offline: boolean;
  ready: boolean;
  storageError: string;
  onChange: (draft: BillReviewDraft) => void;
  onRestart: () => void;
  onSave: (bill: Omit<PreviewBill, "id">) => void;
};

export default function BillReview({ mode, draft, original, source, provider, duplicate, offline, ready, storageError, onChange, onRestart, onSave }: Props) {
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
      source: sample ? "sample" : "manual", sourceName: source?.name,
    };
    const issue = validateBill(bill);
    if (issue) { setError(issue); if (issue.includes("period")) setPeriodOpen(true); return; }
    if (!reviewed) { setError("Confirm that you reviewed the values before saving."); confirmation.current?.focus(); return; }
    if (duplicate && !replace) { setError("Confirm replacement, or choose a different billing month."); replacement.current?.focus(); return; }
    setError("");
    onSave(bill);
  }

  return <form className="scan-review br-review" onSubmit={save} noValidate>
    <div className="scan-review-head">
      <span className="scan-review-icon">{sample ? <Sparkles aria-hidden="true" /> : <Keyboard aria-hidden="true" />}</span>
      <div><span className="br-eyebrow">REVIEW BEFORE SAVING</span><h2>{sample ? "Review the sample reading" : "Enter your bill details"}</h2><p>{sample ? "Check each field and try correcting the example." : "Copy the values from your printed or digital bill."}</p></div>
    </div>
    {offline && <div className="br-note is-offline" role="status"><WifiOff aria-hidden="true" /><p><strong>You’re offline.</strong> You can review and save locally. New AI extraction will need a connection in the finished app.</p></div>}
    {sample && <div className="br-note is-sample"><Info aria-hidden="true" /><p><strong>Sample values · UI preview</strong>These values are generated examples, including when you upload a photo. The saved record will be labeled Sample.</p></div>}

    {source && <div className="br-source"><span className="br-source-icon">{source.kind === "pdf" ? <FileText aria-hidden="true" /> : <FileImage aria-hidden="true" />}</span><div><strong>{source.name}</strong><small>{source.kind === "sample" ? "Example bill · no uploaded document" : "Original file · available during this session"}</small></div><button ref={originalButton} type="button" onClick={() => dialog.current?.showModal()}>View original</button></div>}
    <div className="br-provider"><Zap size={15} aria-hidden="true" /><span>{provider}</span><Link href="/onboarding">Change household</Link></div>

    <div className="scan-fields br-fields">
      <label htmlFor="review-month"><span id="review-month-label" className="scan-label">Billing month</span><input id="review-month" aria-labelledby="review-month-label" type="month" required value={draft.month} onChange={event => edit({ month: event.target.value })} /></label>
      <label htmlFor="review-due"><span className="scan-label"><span id="review-due-label">Due date</span><small>optional</small></span><input id="review-due" aria-labelledby="review-due-label" aria-describedby="review-due-hint" type="date" value={draft.dueDate} onChange={event => edit({ dueDate: event.target.value })} /><small id="review-due-hint" className="br-field-hint">Leave blank if it’s unreadable.</small></label>
      <label htmlFor="review-kwh"><span id="review-kwh-label" className="scan-label">Energy used</span><span className="scan-unit"><input id="review-kwh" aria-labelledby="review-kwh-label" type="number" inputMode="decimal" min="0.01" step="0.01" placeholder="e.g. 109" required value={draft.kwh} onChange={event => edit({ kwh: event.target.value })} /><em>kWh</em></span></label>
      <label htmlFor="review-amount"><span id="review-amount-label" className="scan-label">Amount due</span><span className="scan-unit is-prefix"><em>₱</em><input id="review-amount" aria-labelledby="review-amount-label" type="number" inputMode="decimal" min="0.01" step="0.01" placeholder="e.g. 1248.50" required value={draft.amount} onChange={event => edit({ amount: event.target.value })} /></span></label>
    </div>
    <div className="br-period">
      <button type="button" aria-expanded={periodOpen} aria-controls="review-period-fields" onClick={() => setPeriodOpen(value => !value)}><span>Exact billing period <small>optional</small></span><ChevronDown aria-hidden="true" /></button>
      {periodOpen && <div id="review-period-fields"><p>Use the dates printed on your bill. Leave both blank if they aren’t available.</p><div className="scan-fields">
        <label htmlFor="review-start"><span id="review-start-label" className="scan-label">Period start</span><input id="review-start" aria-labelledby="review-start-label" type="date" value={draft.periodStart} onChange={event => edit({ periodStart: event.target.value })} /></label>
        <label htmlFor="review-end"><span id="review-end-label" className="scan-label">Period end</span><input id="review-end" aria-labelledby="review-end-label" type="date" value={draft.periodEnd} onChange={event => edit({ periodEnd: event.target.value })} /></label>
      </div></div>}
    </div>
    {sample && changes > 0 && <p className="br-corrections" role="status"><Check size={15} aria-hidden="true" /> {changes} {changes === 1 ? "field corrected" : "fields corrected"} from the example reading</p>}
    {duplicate && <div className="br-duplicate">
      <h3><TriangleAlert aria-hidden="true" /> A bill already exists for {billMonth(duplicate.month)}</h3>
      <p>Your saved bill stays unchanged until you confirm replacement.</p>
      <div className="br-replacement-values"><div><small>Currently saved</small><strong>{duplicate.kwh} kWh</strong><span>{pesos(duplicate.amount)}</span></div><div><small>Your reviewed values</small><strong>{draft.kwh || "—"} kWh</strong><span>{draft.amount && Number.isFinite(Number(draft.amount)) ? pesos(Number(draft.amount)) : "—"}</span></div></div>
      <label className="br-check"><input ref={replacement} type="checkbox" checked={replace} onChange={event => { setReplace(event.target.checked); setError(""); }} /><span>Replace the saved bill for this month with these reviewed values.</span></label>
    </div>}
    <label className={`br-check br-confirm${reviewed ? " is-checked" : ""}`}><input ref={confirmation} type="checkbox" checked={reviewed} onChange={event => { setReviewed(event.target.checked); setError(""); }} /><span><strong>I reviewed all the values above.</strong><small>{sample ? "I understand this is a sample record for the UI preview." : "They match my bill. Any missing optional fields will stay unknown."}</small></span></label>
    {(error || storageError) && <p id="bill-review-error" className="ui-error" role="alert">{error || storageError}</p>}
    <div className="scan-actions br-actions"><button type="button" className="ui-secondary" onClick={onRestart}><RotateCcw size={17} aria-hidden="true" /> {sample ? "Start over" : "Use scanner"}</button><button type="submit" className="ui-primary" disabled={!ready}><Check size={18} aria-hidden="true" /> {duplicate ? "Replace bill" : sample ? "Save sample bill" : "Save to history"}</button></div>
    <p className="br-save-note"><ShieldCheck size={14} aria-hidden="true" /> Only reviewed values are saved in this browser.</p>

    <dialog ref={dialog} className="br-original-dialog" aria-labelledby="original-bill-heading" onClose={() => originalButton.current?.focus()} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className="br-original-head"><div><span className="br-eyebrow">REFERENCE DOCUMENT</span><h2 id="original-bill-heading">{source?.kind === "sample" ? "Sample electricity bill" : "Your original bill"}</h2></div><button type="button" className="ui-icon-button" aria-label="Close original bill" onClick={() => dialog.current?.close()}><X aria-hidden="true" /></button></div>
      {source?.kind === "image" && source.url ? <Image className="br-original-image" src={source.url} alt="Original uploaded electricity bill" width={900} height={1200} unoptimized /> : source?.kind === "pdf" && source.url ? <div className="br-pdf"><FileText aria-hidden="true" /><strong>{source.name}</strong><p>Open the original PDF in another tab to compare its printed values.</p><a className="ui-primary" href={source.url} target="_blank" rel="noreferrer">Open original PDF</a></div> : original ? <div className="br-original-sample"><BillArt period={billMonth(original.month)} kwh={String(original.kwh)} amount={pesos(original.amount)} due={original.dueDate ? dueDateLabel(original.dueDate) : "Unknown"} /></div> : null}
      <p className="br-original-caption">{source?.kind === "sample" ? "This example stays unchanged while you edit the review fields." : "This file stays on your device and is available until you leave or restart this workflow."}</p>
      <button type="button" className="ui-secondary" onClick={() => dialog.current?.close()}>Back to review</button>
    </dialog>
  </form>;
}
