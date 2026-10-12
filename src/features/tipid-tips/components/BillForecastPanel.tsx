"use client";
import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, ChartNoAxesCombined, ChevronDown, Minus } from "lucide-react";
import { pesos, type PreviewBill } from "@/features/dashboard/preview-data";
import { forecastMonthName, type BillForecast } from "../bill-forecast";

const number = (n: number) => new Intl.NumberFormat("en-PH", { maximumFractionDigits: 1 }).format(n);
/** The saved bill behind a recorded month, when exactly one real bill covers it. */
function recordedAmount(bills: PreviewBill[], year: number, month: number) {
  const matches = bills.filter(bill => bill.month === `${year}-${String(month).padStart(2, "0")}` && bill.source !== "sample" && !bill.id.startsWith("sample-"));
  return matches.length === 1 ? matches[0].amount : null;
}
export default function BillForecastPanel({ forecast, bills }: { forecast: BillForecast; bills: PreviewBill[] }) {
  const id = useId();
  const [selected, setSelected] = useState(forecast.peakMonth ?? 1);
  const [year, setYear] = useState(forecast.targetYear);
  useEffect(() => { setSelected(forecast.peakMonth ?? 1); }, [forecast.targetYear, forecast.peakMonth]);
  useEffect(() => { setYear(forecast.targetYear); }, [forecast.targetYear]);
  if (forecast.status !== "ready") return <section className="tt-forecast-empty" aria-labelledby={`${id}-title`}><ChartNoAxesCombined size={21} aria-hidden="true" /><div><h2 id={`${id}-title`}>Next-year outlook</h2><p>Add a complete January–December receipt history from {forecast.targetYear-2} or {forecast.targetYear-1} to see monthly estimates.</p><details><summary>Check your history<ChevronDown size={14} aria-hidden="true" /></summary><p>{forecast.receiptCount} usable receipts. Samples and future receipts are excluded.</p><ul>{forecast.limitations.slice(2).map(note => <li key={note}>{note}</li>)}</ul></details></div><Link href="/bills">View bills<ArrowUpRight size={15} aria-hidden="true" /></Link></section>;
  const month = forecast.months[selected-1];
  const years = [...new Set(forecast.months.flatMap(m => m.history.map(h => h.year)))].sort((a,b) => a-b).slice(-2);
  // A recorded year that left the history falls back to the estimate.
  const view = years.includes(year) ? year : forecast.targetYear;
  const estimate = view === forecast.targetYear;
  const recorded = (index: number, of = view) => forecast.months[index].history.find(h => h.year === of)?.kwh ?? null;
  const value = estimate ? month.kwh : recorded(selected-1);
  const maximum = Math.max(1,...forecast.months.flatMap(m => [m.kwh ?? 0,...m.history.filter(h => years.includes(h.year)).map(h => h.kwh)]));
  const top = Math.ceil(maximum / 50) * 50;
  const x = (index: number) => 48 + index * 53;
  const y = (value: number) => 198 - value / top * 158;
  const path = (values: Array<number | null>) => { let prior = false; return values.map((value,index) => { if (value === null) { prior = false; return ""; } const point = `${prior ? "L" : "M"}${x(index)},${y(value)}`; prior = true; return point; }).join(" "); };
  // Recorded months compare with the receipt before them, using the same steady band as the estimate.
  const before = selected === 1 ? recorded(11, view-1) : recorded(selected-2);
  const direction = estimate ? month.direction : value === null || before === null ? "unknown" : Math.abs(value - before) <= Math.max(before * .05, 1) ? "steady" : value > before ? "up" : "down";
  const Direction = direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : Minus;
  const amount = estimate ? month.amount : recordedAmount(bills, view, selected);
  const receipts = forecast.months.flatMap((m,index) => { const kwh = recorded(index); return kwh === null ? [] : [{ month: m.month, kwh }]; });
  const high = receipts.reduce<typeof receipts[number] | null>((most, item) => !most || item.kwh > most.kwh ? item : most, null);
  const low = receipts.reduce<typeof receipts[number] | null>((least, item) => !least || item.kwh < least.kwh ? item : least, null);
  const units = forecast.unit === "kwh-30-days" ? "per 30 days" : "per billing month";
  return <section className="tt-forecast" aria-labelledby={`${id}-title`}>
    <div className="tt-forecast-heading"><div><h2 id={`${id}-title`}>Yearly outlook</h2><p>{estimate ? "Estimated" : "Recorded"} electricity use & bill · {units}</p></div>
      <div className="tt-forecast-years" role="group" aria-label="Outlook year">{[...years, forecast.targetYear].map((option,index) => <button key={option} type="button" className={option === forecast.targetYear ? "is-projected" : `is-history-${index}`} aria-pressed={view === option} aria-label={`${option} ${option === forecast.targetYear ? "estimate" : "recorded"}`} onClick={() => setYear(option)}><i aria-hidden="true" />{option}{option === forecast.targetYear && " est."}</button>)}</div>
    </div>
    <svg className="tt-forecast-chart" viewBox="0 0 660 232" role="img" aria-labelledby={`${id}-chart-title ${id}-chart-desc`}>
      <title id={`${id}-chart-title`}>Monthly electricity pattern and {forecast.targetYear} estimates</title><desc id={`${id}-chart-desc`}>{forecast.peakMonth ? `${forecastMonthName(forecast.peakMonth)} may have the highest use and ${forecastMonthName(forecast.lowMonth!)} the lowest. ` : "Monthly use is roughly steady. "}Choose a year above and a month below for kWh and peso figures. Gaps mean no recorded receipt.</desc>
      {[0,.5,1].map(tick => <g key={tick}><line x1="48" x2="631" y1={y(top*tick)} y2={y(top*tick)} className="tt-forecast-gridline" /><text x="39" y={y(top*tick)+4} textAnchor="end" className="tt-forecast-axis">{number(top*tick)}</text></g>)}
      <text x="48" y="22" className="tt-forecast-axis">kWh</text>
      {years.map((past,index) => <g key={past} className={`tt-forecast-history is-history-${index}${view === past ? " is-active" : ""}`}><path d={path(forecast.months.map((_,i) => recorded(i, past)))} />{forecast.months.map((m,i) => { const actual = recorded(i, past); return actual !== null ? <circle key={m.month} cx={x(i)} cy={y(actual)} r="3" /> : null; })}</g>)}
      <path d={path(forecast.months.map(m => m.kwh))} className={`tt-forecast-projection${estimate ? " is-active" : ""}`} />
      <line x1={x(selected-1)} x2={x(selected-1)} y1="30" y2="198" className="tt-forecast-selection" />
      {value !== null && <circle cx={x(selected-1)} cy={y(value)} r="5" className="tt-forecast-dot" />}
      {forecast.months.map((m,i) => <text key={m.month} x={x(i)} y="220" textAnchor="middle" className="tt-forecast-axis">{forecastMonthName(m.month,true)}</text>)}
    </svg>
    <div className="tt-forecast-months" role="group" aria-label={estimate ? "Forecast month" : "Recorded month"}>{forecast.months.map(m => <button key={m.month} type="button" aria-pressed={selected === m.month} aria-label={`${forecastMonthName(m.month)} ${view}`} onClick={() => setSelected(m.month)}>{forecastMonthName(m.month,true)}</button>)}</div>
    <div className="tt-forecast-selected" aria-live="polite" aria-atomic="true"><div><span>{forecastMonthName(selected)} {view}</span><strong>{value === null ? "No receipt" : <>{estimate && "≈ "}{number(value)} <small>kWh</small></>}</strong></div>{value !== null && <div><span>{estimate ? "Estimated" : "Recorded"} bill · before subsidies</span><strong>{amount === null ? estimate ? "No rate basis" : "Not available" : `${estimate ? "≈ " : ""}${pesos(amount)}`}</strong></div>}{direction !== "unknown" && <p><Direction size={17} aria-hidden="true" />{estimate ? direction === "up" ? "May rise" : direction === "down" ? "May fall" : "About the same" : direction === "up" ? "Higher" : direction === "down" ? "Lower" : "About the same"}{estimate && selected === 1 ? " vs December’s pattern" : ` vs ${forecastMonthName(selected === 1 ? 12 : selected-1,true)}`}</p>}</div>
    <p className="tt-forecast-highlights">{estimate ? forecast.peakMonth ? <>Possible high: <strong>{forecastMonthName(forecast.peakMonth,true)}</strong><span aria-hidden="true"> · </span>Possible low: <strong>{forecastMonthName(forecast.lowMonth!,true)}</strong></> : "No clear higher or lower month in this pattern." : <>{high && low && high.month !== low.month && <>Highest: <strong>{forecastMonthName(high.month,true)}</strong><span aria-hidden="true"> · </span>Lowest: <strong>{forecastMonthName(low.month,true)}</strong><span aria-hidden="true"> · </span></>}{receipts.length} of 12 months recorded</>}</p>
    {estimate && <details className="tt-forecast-method"><summary>How this is estimated<ChevronDown size={15} aria-hidden="true" /></summary><p>Repeats your {forecast.baseYear} monthly usage pattern{forecast.scale !== 1 ? `, adjusted by ${((forecast.scale-1)*100).toFixed(1)}% using ${forecast.matchedMonths} same-month comparisons` : ""}. {forecast.unit === "kwh-30-days" ? "Recorded periods are normalized to 30 days." : "Uses recorded monthly totals; billing lengths are unverified."} Up/down compares consecutive projected months; January uses the December pattern. Changes within 5% or 1 kWh are treated as steady.</p>{forecast.effectiveRate !== null && <p>Bill scenario: estimated kWh × {pesos(forecast.effectiveRate)}/kWh. The rate comes from {forecast.rateMonths.join(", ")} using recorded bill amounts before subsidies. It includes recorded charges and stays unchanged in this scenario.</p>}<ul>{forecast.limitations.map(note => <li key={note}>{note}</li>)}</ul><p>WattSnap AI explains the pattern and suggests actions. The app calculates the chart and estimates.</p></details>}
  </section>;
}
