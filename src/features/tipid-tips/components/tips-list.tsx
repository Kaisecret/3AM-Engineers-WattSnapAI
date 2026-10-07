import Link from "next/link";
import { ArrowUpRight, ChevronDown, Lightbulb, PlugZap, ReceiptText } from "lucide-react";
import type { PreviewTip } from "../types";

export default function TipsList({ tips, filter, sample }: { tips: PreviewTip[]; filter: "all" | "appliance" | "bill"; sample: boolean }) {
  const shown = tips.filter(tip => filter === "all" || tip.category === filter);
  if (!shown.length) return <section className="ui-panel tt-filter-empty" aria-live="polite"><Lightbulb aria-hidden="true" /><h2>No {filter === "bill" ? "bill" : "appliance"} tips yet</h2><p>Use All tips to see the setup suggestions, then add reviewed inputs for this category.</p></section>;
  return <div className="tt-tip-grid">{shown.map(tip => {
    const Icon = tip.category === "bill" ? ReceiptText : tip.category === "appliance" ? PlugZap : Lightbulb;
    return <article key={tip.id} className={`ui-panel tt-tip is-${tip.category}`} aria-labelledby={`tip-${tip.id}`}><div className="tt-tip-top"><span className="tt-tip-icon"><Icon aria-hidden="true" /></span><span>{tip.category === "bill" ? "Your bill history" : tip.category === "appliance" ? "Your appliance inputs" : "Build your input basis"}</span>{(sample || tip.sample) && <small>Sample</small>}</div><h2 id={`tip-${tip.id}`}>{tip.title}</h2><p className="tt-tip-action">{tip.action}</p><div className="tt-tip-reason"><span>Why this appears</span><p>{tip.reason}</p></div><details className="tt-tip-basis"><summary>Inputs and assumptions<ChevronDown size={15} aria-hidden="true" /></summary><ul>{tip.facts.map(fact => <li key={fact}>{fact}</li>)}</ul><div>{tip.assumptions.map(assumption => <p key={assumption}>{assumption}</p>)}</div></details><div className="tt-tip-links"><Link href={tip.link.href}>{tip.link.label}<ArrowUpRight size={15} aria-hidden="true" /></Link>{tip.guidance && <a href={tip.guidance.href} target="_blank" rel="noreferrer">Read guidance<ArrowUpRight size={13} aria-hidden="true" /><span className="ws-sr-only"> · {tip.guidance.label}</span></a>}</div></article>;
  })}</div>;
}
