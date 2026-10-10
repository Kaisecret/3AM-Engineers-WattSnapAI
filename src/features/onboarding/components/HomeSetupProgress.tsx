"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CircleCheck } from "lucide-react";
import { useSetupProgress } from "../use-setup-progress";
import "../setup.css";

export default function HomeSetupProgress() {
  const progress = useSetupProgress();
  if (!progress.ready) return null;
  if (progress.dismissed) return <div className="setup-completion-indicator"><CircleCheck size={18} aria-hidden="true" /><Link href="/setup">Home setup complete</Link></div>;
  return <section className="setup-progress-card" aria-labelledby="home-setup-heading">
    <Image src="/assets/branding/actions-2.png" alt="WattSnap holds your checklist" width={160} height={160} sizes="(min-width: 700px) 110px, 52px" unoptimized={process.env.NODE_ENV === "development"} />
    <div className="setup-progress-copy"><h2 id="home-setup-heading">Your Home Setup Progress</h2><p className="setup-progress-message">{progress.complete ? "You’re all set! Your WattSnap home setup is complete." : `You’ve completed ${progress.count} of 5 setup steps. Keep going!`}</p><progress max={5} value={progress.count} aria-label="Home setup progress" /><span className="setup-progress-status">{progress.count}/5 Completed</span>{progress.error && <p className="ui-error" role="alert">{progress.error}</p>}</div>
    {progress.complete ? <button type="button" className="setup-progress-action" onClick={progress.acknowledge}>Got it <CircleCheck size={18} aria-hidden="true" /></button> : <Link className="setup-progress-action" href={`/setup#setup-${progress.next?.id ?? "profile"}`}><span className="setup-progress-label">Continue Setup</span> <ArrowRight size={18} aria-hidden="true" /></Link>}
  </section>;
}
