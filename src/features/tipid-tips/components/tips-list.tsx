import Link from "next/link";
import { ArrowUpRight, ChevronDown, Lightbulb, PlugZap, ReceiptText } from "lucide-react";
import type { PreviewTip } from "../types";

export default function TipsList({ tips, filter, sample }: { tips: PreviewTip[]; filter: "all" | "appliance" | "bill"; sample: boolean }) {
  const shown = tips.filter(tip => filter === "all" || tip.category === filter).sort((a, b) => Number(b.category === "appliance") - Number(a.category === "appliance"));
  if (!shown.length) return <section className="tt-filter-empty" aria-live="polite"><Lightbulb aria-hidden="true" /><h2>No {filter === "bill" ? "bill" : "appliance"} tips yet</h2><p>Add a {filter === "bill" ? "bill" : "device"} to get personalized ideas.</p><Link href={filter === "bill" ? "/bills/new" : "/appliances/new"}>Add {filter === "bill" ? "a bill" : "an appliance"}<ArrowUpRight size={15} aria-hidden="true" /></Link></section>;
  return <div className="tt-tip-grid">{shown.map((tip, index) => {
    const Icon = tip.category === "bill" ? ReceiptText : tip.category === "appliance" ? PlugZap : Lightbulb;
    return <article key={tip.id} className={"tt-tip is-" + tip.category} aria-labelledby={"tip-" + tip.id} style={{ animationDelay: index * 45 + "ms" }}>
      <div className="tt-tip-top"><span className="tt-tip-icon"><Icon aria-hidden="true" /></span><span>{tip.category === "bill" ? "Bill habit" : tip.category === "appliance" ? "Appliance habit" : "Get started"}</span>{(sample || tip.sample) && <small>Sample</small>}</div>
      <h3 id={"tip-" + tip.id}>{tip.title}</h3><p className="tt-tip-action">{tip.action}</p>
      <details className="tt-tip-basis"><summary>Why this tip?<ChevronDown size={15} aria-hidden="true" /></summary><div className="tt-tip-detail"><p>{tip.reason}</p><ul>{tip.facts.map(fact => <li key={fact}>{fact}</li>)}</ul>{tip.assumptions.map(assumption => <p key={assumption}>{assumption}</p>)}{tip.guidance && <a href={tip.guidance.href} target="_blank" rel="noreferrer">Read guidance<ArrowUpRight size={13} aria-hidden="true" /><span className="ws-sr-only"> · {tip.guidance.label}</span></a>}</div></details>
      <div className="tt-tip-links"><Link href={tip.link.href}>{tip.link.label}<ArrowUpRight size={15} aria-hidden="true" /></Link></div>
    </article>;
  })}</div>;
}
