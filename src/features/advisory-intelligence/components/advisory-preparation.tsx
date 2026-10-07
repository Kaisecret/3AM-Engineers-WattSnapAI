"use client";
import Image from "next/image";
import { Check, ShieldCheck, X } from "lucide-react";
import { advisoryPreparationItems, type AdvisoryPreparationId } from "../preparation-progress";

export function AdvisoryPreparationChecklist({ checked, disabled, sample, onToggle }: { checked: AdvisoryPreparationId[]; disabled: boolean; sample: boolean; onToggle: (id: AdvisoryPreparationId) => void }) {
  return <section className="adv-ready" aria-label="Brownout ready checklist">
    <h3><ShieldCheck aria-hidden="true" />Brownout ready checklist<span aria-live="polite">{checked.length}/{advisoryPreparationItems.length}</span></h3>
    {sample && <p className="adv-ready-sample">Sample preparation · fictional announcement</p>}
    <ul>{advisoryPreparationItems.map(item => <li key={item.id}><label><input type="checkbox" checked={checked.includes(item.id)} disabled={disabled} onChange={() => onToggle(item.id)} /><span className="adv-check" aria-hidden="true"><Check /></span><span>{item.title}</span></label></li>)}</ul>
    <p className="adv-ready-hint">Check each step as you finish it, then select Done.</p>
  </section>;
}

export function AdvisoryPreparationReminder({ completed, onContinue, onDismiss }: { completed: number; onContinue: () => void; onDismiss: () => void }) {
  const remaining = advisoryPreparationItems.length - completed;
  return <aside className="adv-preparation-toast" aria-label="Incomplete checklist reminder">
    <Image src="/assets/branding/actions-2.png" alt="" width={1280} height={1280} sizes="64px" />
    <div><div className="adv-toast-heading"><h3>Checklist incomplete</h3><span>{completed}/{advisoryPreparationItems.length} Done</span></div>
      <p role="status">{remaining} {remaining === 1 ? "step left" : "steps left"}. Check each remaining item when it’s done.</p>
      <progress value={completed} max={advisoryPreparationItems.length} aria-label="Preparation checklist progress" />
      <button type="button" className="adv-toast-continue" onClick={onContinue}>Continue checklist</button>
    </div>
    <button type="button" className="adv-toast-close" aria-label="Dismiss checklist reminder" onClick={onDismiss}><X size={16} aria-hidden="true" /></button>
  </aside>;
}

export function AdvisoryPreparationComplete({ sample, onBack, onClose }: { sample: boolean; onBack: () => void; onClose: () => void }) {
  return <div className="adv-dialog-content adv-complete-content">
    <button type="button" className="adv-dialog-close" aria-label="Close readiness confirmation" onClick={onClose}><X aria-hidden="true" /></button>
    <span className="adv-complete-badge"><ShieldCheck aria-hidden="true" />Brownout ready</span>
    {sample && <p className="adv-ready-sample">Sample preparation · fictional announcement</p>}
    <Image className="adv-complete-art" src="/assets/branding/All Set Icon.png" alt="WattSnap bee robot giving a thumbs-up with a You're All Set sign" width={1280} height={1280} sizes="300px" priority />
    <h2 id="adv-ready-title">You&apos;re all set!</h2>
    <p id="adv-ready-description">You checked all {advisoryPreparationItems.length} preparation steps.<br />Keep your essentials nearby for the interruption.</p>
    <button type="button" autoFocus className="adv-primary adv-dialog-done" onClick={onClose}>Back to advisories</button>
    <button type="button" className="adv-review-checklist" onClick={onBack}>Review my checklist</button>
  </div>;
}
