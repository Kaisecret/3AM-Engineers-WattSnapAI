"use client";
import Link from "next/link";
import { ChevronRight, Lightbulb } from "lucide-react";
import { PlugArtwork } from "@/features/dashboard/components/DashboardArtwork";
import { usePreviewHousehold } from "@/features/dashboard/use-preview-household";
import { usePreviewTips } from "../use-preview-tips";
import { tipsAreStale } from "../preview-tips";

export default function HomeTipCard() {
  const { household } = usePreviewHousehold(); const { snapshot } = usePreviewTips();
  const tip = snapshot?.tips.find(item => item.category === "appliance") ?? snapshot?.tips[0];
  const stale = snapshot ? tipsAreStale(snapshot, household) : false;
  return <section className="ws-card ws-tip ws-tip-preview" aria-labelledby="ws-tip-title"><span className="ws-lightbulb"><Lightbulb aria-hidden="true" /></span><div className="ws-tip-copy"><h2 id="ws-tip-title">Your Tipid Tips</h2><p>{tip?.title ?? "Review practical ideas and the inputs behind them."}</p><small>{snapshot ? stale ? "Saved tips · inputs changed" : snapshot.context.sample ? "Sample advice preview" : "Saved advice preview" : "Create tips from your reviewed records"}</small><Link href="/tips">View Tipid Tips<ChevronRight size={14} aria-hidden="true" /></Link></div><span className="ws-plug-art" aria-hidden="true"><PlugArtwork /></span></section>;
}
