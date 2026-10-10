"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, CircleCheck, House, Lightbulb, PlugZap, ReceiptText, Zap } from "lucide-react";
import PageShell from "@/features/dashboard/components/PageShell";
import { useSetupProgress } from "../use-setup-progress";
import "../setup.css";

const icons = [House, Zap, ReceiptText, PlugZap, Lightbulb];

export default function SetupChecklist() {
  const progress = useSetupProgress();
  return <PageShell title="Your home setup" subtitle="Small steps toward a clearer energy picture" active="Home" className="setup-page">
    <section className="setup-hero"><div><span className="setup-eyebrow">LET’S GET YOUR HOME READY</span><h2>{progress.ready && progress.complete ? "You’re all set!" : "One step at a time."}</h2><p>{progress.complete ? "Your WattSnap home setup is complete." : "Save your home details, review your first records, and find a practical tip. You can come back anytime."}</p><Link href="/dashboard" className="setup-later">Go to dashboard <ArrowRight size={18} aria-hidden="true" /></Link></div><Image src="/assets/branding/actions-2.png" alt="WattSnap holds your home setup checklist" width={240} height={240} sizes="(min-width: 700px) 200px, 110px" unoptimized={process.env.NODE_ENV === "development"} priority /></section>
    <section className="ui-panel setup-panel" aria-labelledby="setup-list-title">
      <div className="setup-heading"><div><h2 id="setup-list-title">Your Home Setup Progress</h2><p aria-live="polite">{progress.ready ? `${progress.count}/5 Completed` : "Opening your saved setup…"}</p></div><span className="setup-percent">{progress.ready ? progress.percent : 0}%</span></div>
      <progress max={5} value={progress.ready ? progress.count : 0} aria-label="Home setup progress" />
      <ol className="setup-list">{progress.steps.map((step, index) => {
        const Icon = icons[index]; const done = progress.ready && step.complete;
        return <li key={step.id} className={done ? "is-complete" : ""} id={`setup-${step.id}`}><span className="setup-step-icon">{done ? <Check aria-hidden="true" /> : <Icon aria-hidden="true" />}</span><div><h3>{step.label}</h3><p>{step.detail}</p><span className="setup-status">{done ? "Completed" : "To do"}</span></div><Link href={step.href} aria-label={`${done ? "Review" : "Start"}: ${step.label}`}>{done ? "Review" : "Start"}<ArrowRight size={18} aria-hidden="true" /></Link></li>;
      })}</ol>
      {progress.error && <div className="setup-error" role="alert"><p>{progress.error}</p><button type="button" onClick={progress.reload}>Retry loading progress</button></div>}
      {progress.ready && progress.complete ? <div className="setup-complete"><CircleCheck aria-hidden="true" /><p>You’re all set! Your WattSnap home setup is complete.</p></div> : <p className="setup-footnote">Steps complete when you save and confirm your own information. Sample records do not count. You can finish in any order.</p>}
    </section>
  </PageShell>;
}
