import { ChartNoAxesColumnIncreasing } from "lucide-react";
import { billMonth, pesos } from "../preview-data";
import type { NextMonthForecast as Forecast } from "../next-month-forecast";

const labels = { seasonal: "Seasonal baseline", "recent-average": "Recent average", "latest-bill": "Starting estimate", insufficient: "More history needed" };

export default function NextMonthForecast({ forecast }: { forecast: Forecast }) {
  const basis = forecast.method === "seasonal"
    ? `Based on ${billMonth(forecast.basisMonths[0])}${forecast.adjustmentMonths.length ? ", adjusted to your recent usage" : ""}.`
    : forecast.method === "recent-average" ? "Based on your three recent billing months."
    : "Repeats your latest recent bill. More receipts will improve the basis.";
  return <section className="ui-panel en-forecast" aria-labelledby="en-forecast-title">
    <div className="ui-panel-heading">
      <div><h2 id="en-forecast-title"><ChartNoAxesColumnIncreasing size={20} aria-hidden="true" />Next month estimate</h2><p>{billMonth(forecast.month)}</p></div>
      <span className="en-forecast-method">{labels[forecast.method]}</span>
    </div>
    {forecast.kwh !== null ? <>
      <dl className="en-forecast-values">
        <div><dt>Estimated use</dt><dd><strong>{forecast.kwh.toLocaleString("en-PH", { maximumFractionDigits: 1 })}</strong> <span>{forecast.unit === "kwh-30-days" ? "kWh / 30 days" : "kWh"}</span></dd></div>
        <div><dt>Estimated cost</dt><dd><strong>{forecast.amount !== null ? pesos(forecast.amount) : "—"}</strong></dd><small>{forecast.amount !== null ? "Before subsidy" : "A recorded bill rate is needed"}</small></div>
      </dl>
      <p className="en-forecast-basis">{basis} Actual usage and rates may change.</p>
    </> : <p className="en-forecast-basis">Save a recent bill or all twelve months from last year to estimate next month&apos;s use.</p>}
    <details className="en-forecast-details">
      <summary>How this is estimated</summary>
      {forecast.basisMonths.length > 0 && <p>Usage basis: {forecast.basisMonths.map(billMonth).join(", ")}.</p>}
      {forecast.adjustmentMonths.length > 0 && <p>Adjustment: the median usage ratio across {forecast.adjustmentMonths.map(billMonth).join(", ")} compared with the same months in {forecast.baseYear}. Applied once, ×{Number(forecast.scale.toFixed(2))}.</p>}
      {forecast.rate !== null && forecast.rateMonth && <p>Cost = estimated use × {pesos(forecast.rate)}/kWh, from {billMonth(forecast.rateMonth)} (bill amount before subsidy ÷ recorded kWh). The cost uses unrounded consumption.</p>}
      <p>Uses all eligible saved history, regardless of the history period filter.</p>
      <ul>{forecast.notes.map(note => <li key={note}>{note}</li>)}</ul>
    </details>
  </section>;
}
