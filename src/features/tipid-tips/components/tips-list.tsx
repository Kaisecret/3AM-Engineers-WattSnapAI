import { Fragment } from "react";
import Link from "next/link";
import { ArrowUpRight, CalendarClock, ChevronDown, Coins, Lightbulb, PiggyBank, PlugZap, ReceiptText, TriangleAlert } from "lucide-react";
import type { PreviewTip, TipBenefit } from "../types";

// Peso, energy and percent figures stand out wherever a tip quotes them, as they do in WattSnap AI's answers.
const figures = /((?:₱\s*|PHP\s+)-?\d[\d,]*(?:\.\d+)?|(?<![\w.])-?\d[\d,]*(?:\.\d+)?\s*(?:kWh|kW|W|watts?|%)(?!\w))/gi;
function Figures({ value }: { value: string }) {
  return <>{value.split(figures).map((part, index) => index % 2 ? <mark key={index} className="tt-figure">{part}</mark> : <Fragment key={index}>{part}</Fragment>)}</>;
}
const benefitIcons: Record<TipBenefit["tone"], typeof PiggyBank> = { save: PiggyBank, cost: Coins, warn: TriangleAlert, info: CalendarClock };

export default function TipsList({ tips, filter, sample }: { tips: PreviewTip[]; filter: "all" | "appliance" | "bill"; sample: boolean }) {
  const shown = tips.filter(tip => filter === "all" || tip.category === filter).sort((a, b) => Number(b.category === "appliance") - Number(a.category === "appliance"));
  if (!shown.length) return <section className="tt-filter-empty" aria-live="polite"><Lightbulb aria-hidden="true" /><h2>No {filter === "bill" ? "bill" : "appliance"} tips yet</h2><p>Add a {filter === "bill" ? "bill" : "device"} to get personalized ideas.</p><Link href={filter === "bill" ? "/bills/new" : "/appliances/new"}>Add {filter === "bill" ? "a bill" : "an appliance"}<ArrowUpRight size={15} aria-hidden="true" /></Link></section>;
  return <div className="tt-tip-grid">{shown.map((tip, index) => {
    const Icon = tip.category === "bill" ? ReceiptText : tip.category === "appliance" ? PlugZap : Lightbulb;
    const Benefit = tip.benefit ? benefitIcons[tip.benefit.tone] : null;
    return <article key={tip.id} className={"tt-tip is-" + tip.category} aria-labelledby={"tip-" + tip.id} style={{ animationDelay: index * 45 + "ms" }}>
      <div className="tt-tip-top"><span className="tt-tip-icon"><Icon aria-hidden="true" /></span><span>{tip.category === "bill" ? "Bill habit" : tip.category === "appliance" ? "Appliance habit" : "Get started"}</span>{(sample || tip.sample) && <small>Sample</small>}</div>
      <h3 id={"tip-" + tip.id}>{tip.title}</h3>
      {/* What the tip gives comes first, so the reason to act is clear before the instructions. */}
      {tip.benefit && Benefit && <p className={"tt-benefit is-" + tip.benefit.tone}><span className="tt-benefit-icon"><Benefit aria-hidden="true" /></span><span className="tt-benefit-copy"><small>{tip.benefit.label}</small><strong>{tip.benefit.value}</strong></span>{tip.benefit.detail && <span className="tt-benefit-detail">{tip.benefit.detail}</span>}</p>}
      <p className="tt-tip-action"><Figures value={tip.action} /></p>
      <p className="tt-tip-why"><b>Why:</b> <Figures value={tip.reason} /></p>
      <details className="tt-tip-basis"><summary>See the numbers<ChevronDown size={15} aria-hidden="true" /></summary><div className="tt-tip-detail"><ul>{tip.facts.map(fact => <li key={fact}>{fact}</li>)}</ul>{tip.assumptions.map(assumption => <p key={assumption}>{assumption}</p>)}{tip.guidance && <a href={tip.guidance.href} target="_blank" rel="noreferrer">Read guidance<ArrowUpRight size={13} aria-hidden="true" /><span className="ws-sr-only"> · {tip.guidance.label}</span></a>}</div></details>
      <div className="tt-tip-links"><Link href={tip.link.href}>{tip.link.label}<ArrowUpRight size={15} aria-hidden="true" /></Link></div>
    </article>;
  })}</div>;
}
