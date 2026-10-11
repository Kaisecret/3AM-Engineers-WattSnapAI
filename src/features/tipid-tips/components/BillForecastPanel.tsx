"use client";
import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, ChartNoAxesCombined, ChevronDown, Minus, TriangleAlert } from "lucide-react";
import { pesos } from "@/features/dashboard/preview-data";
import { forecastMonthName, type BillForecast } from "../bill-forecast";

const number = (n: number) => new Intl.NumberFormat("en-PH", { maximumFractionDigits: 1 }).format(n);
export default function BillForecastPanel({ forecast, stale = false, saved = false }: { forecast: BillForecast; stale?: boolean; saved?: boolean }) {
  const id = useId();
  const [selected, setSelected] = useState(forecast.peakMonth ?? 1);
  useEffect(() => { setSelected(forecast.peakMonth ?? 1); }, [forecast.targetYear, forecast.peakMonth]);
  if (forecast.status !== "ready") return <section className="tt-forecast-empty" aria-labelledby={`${id}-title`}><ChartNoAxesCombined size={21} aria-hidden="true" /><div><h2 id={`${id}-title`}>Next-year outlook</h2><p>Add a complete January–December receipt history from {forecast.targetYear-2} or {forecast.targetYear-1} to see monthly estimates.</p><details><summary>Check your history<ChevronDown size={14} aria-hidden="true" /></summary><p>{forecast.receiptCount} usable receipts. Samples and future receipts are excluded.</p><ul>{forecast.limitations.slice(2).map(note => <li key={note}>{note}</li>)}</ul></details></div><Link href="/bills">View bills<ArrowUpRight size={15} aria-hidden="true" /></Link></section>;
  const month = forecast.months[selected-1];
  const years = [...new Set(forecast.months.flatMap(m => m.history.map(h => h.year)))].sort((a,b) => a-b).slice(-2);
  const maximum = Math.max(1,...forecast.months.flatMap(m => [m.kwh ?? 0,...m.history.filter(h => years.includes(h.year)).map(h => h.kwh)]));
  const top = Math.ceil(maximum / 50) * 50;
  const x = (index: number) => 48 + index * 53;
  const y = (value: number) => 198 - value / top * 158;
  const path = (values: Array<number | null>) => { let prior = false; return values.map((value,index) => { if (value === null) { prior = false; return ""; } const point = `${prior ? "L" : "M"}${x(index)},${y(value)}`; prior = true; return point; }).join(" "); };
  const Direction = month.direction === "up" ? ArrowUpRight : month.direction === "down" ? ArrowDownRight : Minus;
  const units = forecast.unit === "kwh-30-days" ? "per 30 days" : "per billing month";
  return <section className="tt-forecast" aria-labelledby={`${id}-title`}>
    <div className="tt-forecast-heading"><div><h2 id={`${id}-title`}>{forecast.targetYear} outlook</h2><p>Estimated electricity use & bill · {units}</p></div><span className="tt-forecast-estimate">Planning estimate</span></div>
    {stale && <p className="tt-forecast-stale" role="status"><TriangleAlert size={14} aria-hidden="true" />{saved ? "Saved forecast · refresh for the current year and latest records" : "Refresh tips to include this outlook"}</p>}
    <div className="tt-forecast-legend">{years.map((year,index) => <span key={year} className={`is-history-${index}`}><i aria-hidden="true" />{year} recorded</span>)}<span className="is-projected"><i aria-hidden="true" />{forecast.targetYear} estimate</span></div>
    <svg className="tt-forecast-chart" viewBox="0 0 660 232" role="img" aria-labelledby={`${id}-chart-title ${id}-chart-desc`}>
      <title id={`${id}-chart-title`}>Monthly electricity pattern and {forecast.targetYear} estimates</title><desc id={`${id}-chart-desc`}>{forecast.peakMonth ? `${forecastMonthName(forecast.peakMonth)} may have the highest use and ${forecastMonthName(forecast.lowMonth!)} the lowest. ` : "Monthly use is roughly steady. "}Select a month below for kWh and peso estimates. Gaps mean no recorded receipt.</desc>
      {[0,.5,1].map(tick => <g key={tick}><line x1="48" x2="631" y1={y(top*tick)} y2={y(top*tick)} className="tt-forecast-gridline" /><text x="39" y={y(top*tick)+4} textAnchor="end" className="tt-forecast-axis">{number(top*tick)}</text></g>)}
      <text x="48" y="22" className="tt-forecast-axis">kWh</text>
      {years.map((year,index) => <g key={year} className={`tt-forecast-history is-history-${index}`}><path d={path(forecast.months.map(m => m.history.find(h => h.year === year)?.kwh ?? null))} />{forecast.months.map((m,i) => { const actual = m.history.find(h => h.year === year); return actual ? <circle key={m.month} cx={x(i)} cy={y(actual.kwh)} r="3" /> : null; })}</g>)}
      <path d={path(forecast.months.map(m => m.kwh))} className="tt-forecast-projection" />
      <line x1={x(selected-1)} x2={x(selected-1)} y1="30" y2="198" className="tt-forecast-selection" />
      <circle cx={x(selected-1)} cy={y(month.kwh!)} r="5" className="tt-forecast-dot" />
      {forecast.months.map((m,i) => <text key={m.month} x={x(i)} y="220" textAnchor="middle" className="tt-forecast-axis">{forecastMonthName(m.month,true)}</text>)}
    </svg>
    <div className="tt-forecast-months" role="group" aria-label="Forecast month">{forecast.months.map(m => <button key={m.month} type="button" aria-pressed={selected === m.month} aria-label={`${forecastMonthName(m.month)} ${forecast.targetYear}`} onClick={() => setSelected(m.month)}>{forecastMonthName(m.month,true)}</button>)}</div>
    <div className="tt-forecast-selected" aria-live="polite" aria-atomic="true"><div><span>{forecastMonthName(selected)} {forecast.targetYear}</span><strong>≈ {number(month.kwh!)} <small>kWh</small></strong></div><div><span>Estimated bill · before subsidies</span><strong>{month.amount === null ? "No rate basis" : `≈ ${pesos(month.amount)}`}</strong></div><p><Direction size={17} aria-hidden="true" />{month.direction === "up" ? "May rise" : month.direction === "down" ? "May fall" : "About the same"}{selected === 1 ? " vs December’s pattern" : ` vs ${forecastMonthName(selected-1,true)}`}</p></div>
    <p className="tt-forecast-highlights">{forecast.peakMonth ? <>Possible high: <strong>{forecastMonthName(forecast.peakMonth,true)}</strong><span aria-hidden="true"> · </span>Possible low: <strong>{forecastMonthName(forecast.lowMonth!,true)}</strong></> : "No clear higher or lower month in this pattern."}</p>
    <details className="tt-forecast-method"><summary>How this is estimated<ChevronDown size={15} aria-hidden="true" /></summary><p>Repeats your {forecast.baseYear} monthly usage pattern{forecast.scale !== 1 ? `, adjusted by ${((forecast.scale-1)*100).toFixed(1)}% using ${forecast.matchedMonths} same-month comparisons` : ""}. {forecast.unit === "kwh-30-days" ? "Recorded periods are normalized to 30 days." : "Uses recorded monthly totals; billing lengths are unverified."} Up/down compares consecutive projected months; January uses the December pattern. Changes within 5% or 1 kWh are treated as steady.</p>{forecast.effectiveRate !== null && <p>Bill scenario: estimated kWh × {pesos(forecast.effectiveRate)}/kWh. The rate comes from {forecast.rateMonths.join(", ")} using recorded bill amounts before subsidies. It includes recorded charges and stays unchanged in this scenario.</p>}<ul>{forecast.limitations.map(note => <li key={note}>{note}</li>)}</ul><p>Gemini explains the pattern and suggests actions. The app calculates the chart and estimates.</p></details>
  </section>;
}
