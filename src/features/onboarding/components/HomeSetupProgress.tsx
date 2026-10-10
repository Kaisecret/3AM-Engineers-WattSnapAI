"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useSetupProgress } from "../use-setup-progress";
import "../setup.css";

export default function HomeSetupProgress() {
  const progress = useSetupProgress();
  if (!progress.ready || progress.complete) return null;
  return <section className="setup-progress-card" aria-labelledby="home-setup-heading">
    <Image src="/assets/branding/actions-2.png" alt="WattSnap holds your checklist" width={160} height={160} sizes="(min-width: 700px) 110px, 52px" unoptimized={process.env.NODE_ENV === "development"} />
    <div className="setup-progress-copy"><h2 id="home-setup-heading">Your Home Setup Progress</h2><p className="setup-progress-message">You’ve completed {progress.count} of 5 setup steps. Keep going!</p><progress max={5} value={progress.count} aria-label="Home setup progress" /><span className="setup-progress-status">{progress.count}/5 Completed</span>{progress.error && <p className="ui-error" role="alert">{progress.error}</p>}</div>
    <Link className="setup-progress-action" href={`/setup#setup-${progress.next?.id ?? "profile"}`}><span className="setup-progress-label">Continue Setup</span> <ArrowRight size={18} aria-hidden="true" /></Link>
  </section>;
}
