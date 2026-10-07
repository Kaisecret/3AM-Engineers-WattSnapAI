"use client";
import Image from "next/image";
import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";
import { usePreviewHousehold } from "@/features/dashboard/use-preview-household";
import { usePreviewAdvisories } from "../use-preview-advisories";
import { usePreparationProgress } from "../use-preparation-progress";
import { advisoryPreparationItems, pendingPreparation } from "../preparation-progress";

export default function HomePreparationCard() {
  const { household, ready: householdReady } = usePreviewHousehold(), saved = usePreviewAdvisories(), progress = usePreparationProgress();
  if (!householdReady || !saved.ready || !progress.ready || saved.loadError) return null;
  if (progress.loadError) return <section className="ws-card ws-checklist-error" role="alert"><p>{progress.error}</p><button type="button" onClick={progress.reload}>Retry loading checklist</button></section>;
  const pending = pendingPreparation(saved.records, progress.entries, household);
  if (!pending) return null;
  const count = pending.checked.length, total = advisoryPreparationItems.length;
  return <Link href={`/advisories?reviewed=${encodeURIComponent(pending.record.id)}&checklist=1`} className="ws-card ws-checklist-progress" aria-label={`Continue preparation for ${pending.record.details.title || "your advisory"}, ${count} of ${total} done`}>
    <Image src="/assets/branding/actions-2.png" alt="" width={1280} height={1280} sizes="(min-width: 900px) 100px, 70px" />
    <div className="ws-checklist-copy"><div className="ws-checklist-heading"><h2>Checklist Progress</h2><span className="ws-checklist-count"><Check aria-hidden="true" />{count}/{total} Done</span></div>
      <p>You&apos;ve completed {count} of {total} preparation steps.</p>
      <progress value={count} max={total} aria-label="Preparation checklist progress" />
      <small>{pending.record.original.kind === "sample" ? "Sample · " : ""}{pending.record.details.title || "Reviewed interruption"}</small>
    </div>
    <ChevronRight className="ws-checklist-arrow" aria-hidden="true" />
  </Link>;
}
