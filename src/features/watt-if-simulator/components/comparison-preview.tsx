import { ArrowDown, ArrowUp, Equal, Scale, Zap } from "lucide-react";
import { pesos } from "@/features/dashboard/preview-data";
import type { ScenarioComparison } from "../types";

export default function ComparisonPreview({ comparison, days, rateBasis, stale, error }: {
  comparison?: ScenarioComparison; days: string; rateBasis: string; stale: boolean; error?: string;
}) {
  const savings = comparison && Math.abs(comparison.savingsKwh) > 1e-8 ? comparison.savingsKwh : 0;
  const tone = savings > 0 ? "less" : savings < 0 ? "more" : "same";
  const scale = comparison ? Math.max(comparison.baselineKwh, comparison.scenarioKwh, 1) : 1;
  return <section className={`ui-panel wi-comparison is-${tone}`} aria-labelledby="wi-comparison-heading">
    <div className="wi-comparison-head"><span><Scale aria-hidden="true" /></span><div><h2 id="wi-comparison-heading">Estimated comparison</h2><p>Both sides use {days || "—"} days</p></div></div>
    {!comparison ? <div className="wi-result-empty"><Zap aria-hidden="true" /><h3>{stale ? "Baseline review needed" : "Check your inputs"}</h3><p>{stale ? "Your saved appliances changed. Refresh the baseline or review the original snapshot before comparing." : error || "Enter valid inputs to compare energy use."}</p></div> : <>
      <dl className="wi-totals"><div><dt>Baseline</dt><dd data-testid="baseline-kwh">{comparison.baselineKwh.toFixed(2)}<small>kWh</small></dd></div><div><dt>What-if</dt><dd data-testid="scenario-kwh">{comparison.scenarioKwh.toFixed(2)}<small>kWh</small></dd></div></dl>
      <div className="wi-bar-comparison" role="img" aria-label={`Baseline ${comparison.baselineKwh.toFixed(2)} kilowatt hours; scenario ${comparison.scenarioKwh.toFixed(2)} kilowatt hours over ${days} days`}><span className="is-baseline" style={{ width: `${comparison.baselineKwh / scale * 100}%` }} /><span className="is-scenario" style={{ width: `${comparison.scenarioKwh / scale * 100}%` }} /></div>
      <div className="wi-difference" aria-live="polite"><span>{tone === "less" ? <ArrowDown aria-hidden="true" /> : tone === "more" ? <ArrowUp aria-hidden="true" /> : <Equal aria-hidden="true" />}</span><div><strong data-testid="energy-difference">{Math.abs(savings).toFixed(2)} kWh {tone === "less" ? "less" : tone === "more" ? "more" : "difference"}</strong><p>{tone === "more" ? "This scenario increases estimated consumption." : tone === "less" ? "Potential energy savings for the selected period." : "Your changes produce the same estimated consumption."}</p>{comparison.savingsPercent !== null && tone !== "same" && <small>{Math.abs(comparison.savingsPercent).toFixed(1)}% {tone === "less" ? "lower" : "higher"} than baseline</small>}</div></div>
      {comparison.baselineCost !== undefined && comparison.scenarioCost !== undefined && comparison.savingsCost !== undefined ? <div className="wi-costs"><span>Approximate peso comparison</span><dl><div><dt>Baseline</dt><dd>{pesos(comparison.baselineCost)}</dd></div><div><dt>What-if</dt><dd>{pesos(comparison.scenarioCost)}</dd></div></dl><strong>{pesos(Math.abs(comparison.savingsCost))} {tone === "less" ? "potential savings" : tone === "more" ? "estimated increase" : "difference"}</strong><p>{rateBasis || "Your entered rate"}. Bill fees, taxes, and actual usage can change the amount.</p></div> : <div className="wi-no-rate"><strong>Energy-only comparison</strong><p>Choose or enter a rate to include approximate peso estimates.</p></div>}
      <p className="wi-result-caption">Calculated locally: watts × quantity × hours/day × {days} days ÷ 1,000. These are appliance estimates; they do not predict your official bill.</p>
    </>}
  </section>;
}
