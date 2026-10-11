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
  return <section className="ws-card ws-tip ws-tip-preview" aria-labelledby="ws-tip-title"><span className="ws-lightbulb"><Lightbulb aria-hidden="true" /></span><div className="ws-tip-copy"><h2 id="ws-tip-title">Your Tipid Tips</h2><p>{tip?.title ?? "Simple ideas for your home."}</p><small>{snapshot ? stale ? "Records changed · refresh your tips" : snapshot.context.sample ? "Sample tips" : snapshot.source === "gemini" ? "AI tips · saved on this device" : "Basic tips · saved on this device" : "Create tips from your records"}</small><Link href="/tips">View Tipid Tips<ChevronRight size={14} aria-hidden="true" /></Link></div><span className="ws-plug-art" aria-hidden="true"><PlugArtwork /></span></section>;
}
