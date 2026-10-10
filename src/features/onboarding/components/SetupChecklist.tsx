"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, ChevronRight, House, Lightbulb, PlugZap, ReceiptText, Zap } from "lucide-react";
import PageShell from "@/features/dashboard/components/PageShell";
import { useSetupProgress } from "../use-setup-progress";
import "../setup.css";

const icons = [House, Zap, ReceiptText, PlugZap, Lightbulb];

export default function SetupChecklist() {
  const progress = useSetupProgress();
  const complete = progress.ready && progress.complete;
  return <PageShell title="Home setup" active="Home" className="setup-page">
    <div className="setup-wrap">
      <section className="ui-panel setup-summary" aria-labelledby="setup-list-title">
        <Image src="/assets/branding/actions-2.png" alt="" width={240} height={240} sizes="(min-width: 700px) 104px, 76px" unoptimized={process.env.NODE_ENV === "development"} priority />
        <div className="setup-heading">
          <h2 id="setup-list-title">{complete ? "You’re all set!" : "Set up your home"}</h2>
          <div className="setup-meter"><p aria-live="polite">{progress.ready ? `${progress.count}/5 Completed` : "Opening your saved setup…"}</p><span className="setup-percent">{progress.ready ? progress.percent : 0}%</span></div>
          <progress max={5} value={progress.ready ? progress.count : 0} aria-label="Home setup progress" />
        </div>
      </section>
      {progress.error && <div className="setup-error" role="alert"><p>{progress.error}</p><button type="button" onClick={progress.reload}>Retry loading progress</button></div>}
      <ol className="ui-panel setup-list">{progress.steps.map((step, index) => {
        const Icon = icons[index]; const done = progress.ready && step.complete; const next = progress.ready && !done && progress.next?.id === step.id;
        return <li key={step.id} className={done ? "is-complete" : next ? "is-next" : ""} id={`setup-${step.id}`}>
          <Link href={step.href} aria-label={`${done ? "Review" : "Start"}: ${step.label}`}>
            <span className="setup-step-icon">{done ? <Check aria-hidden="true" /> : <Icon aria-hidden="true" />}</span>
            <span className="setup-step-label">{step.label}</span>
            {(done || next) && <span className="setup-status">{done ? "Done" : "Next"}</span>}
            <ChevronRight className="setup-step-arrow" aria-hidden="true" />
          </Link>
        </li>;
      })}</ol>
      {!complete && <p className="setup-footnote">Finish in any order. Sample records don’t count.</p>}
    </div>
  </PageShell>;
}
