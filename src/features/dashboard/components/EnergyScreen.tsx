"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUp, CalendarDays, ChartColumnBig, ChevronDown, ChevronRight, ReceiptText, ScanText, Sparkles, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import PageShell from "./PageShell";
import { usePreviewHousehold } from "../use-preview-household";
import { amountPaid, averageKwh, billMonth, budgetStatus, compareWithPrevious, dueDateLabel, monthName, pesos, shortMonth, sortBillsByMonth, type PreviewBill } from "../preview-data";
import { billHistoryFilters, filterBillHistory, type BillHistoryFilter } from "../bill-history-filter";
import { forecastNextMonth } from "../next-month-forecast";
import NextMonthForecast from "./NextMonthForecast";
import { previewProviderName } from "@/features/household-profile/provider-preview";
import ConfirmRecordRemoval from "@/components/ui/ConfirmRecordRemoval";
import { consumptionChange } from "@/features/consumption-change/local-summary";

const sourceLabels = { scan: "WattSnap AI", manual: "WattSnap AI", sample: "Sample" };
const shortDate = (date: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
const whole = (value: number) => pesos(Math.round(value)).replace(/\.00$/, "");

/** Everything saved for one bill, including what Snap AI read: meter, subsidy and the charge groups. */
function BillDetails({ bill, onRemove, disabled }: { bill: PreviewBill; onRemove: () => void; disabled: boolean }) {
  const charges = bill.charges ?? [];
  const positive = charges.reduce((sum, item) => sum + Math.max(item.amount, 0), 0);
  const source = bill.source ?? "manual";
  return <div className="en-details" id={`bill-details-${bill.id}`}>
    <dl className="en-details-grid">
      <div><dt>Energy used</dt><dd>{bill.kwh} kWh</dd></div>
      {bill.readings && <div><dt>Meter</dt><dd>{bill.readings.previous.toLocaleString()} → {bill.readings.present.toLocaleString()}</dd></div>}
      <div><dt>Current month bill</dt><dd>{pesos(bill.amount)}</dd></div>
      {bill.subsidy ? <div><dt>Subsidy</dt><dd className="is-subsidy">−{pesos(bill.subsidy)}</dd></div> : null}
      <div className="is-pay"><dt>You pay</dt><dd>{pesos(amountPaid(bill))}</dd></div>
      <div><dt>Price per kWh</dt><dd>{pesos(bill.amount / bill.kwh)}</dd></div>
      {bill.periodStart && bill.periodEnd && <div><dt>Billing period</dt><dd>{shortDate(bill.periodStart)} – {dueDateLabel(bill.periodEnd)}</dd></div>}
      {bill.dueDate && <div><dt>Due date</dt><dd>{dueDateLabel(bill.dueDate)}</dd></div>}
      {bill.billingDate && <div><dt>Bill issued</dt><dd>{dueDateLabel(bill.billingDate)}</dd></div>}
      {bill.provider && <div><dt>Provider</dt><dd>{previewProviderName(bill.provider)}</dd></div>}
      <div><dt>Added by</dt><dd className={`en-source is-${source}`}>{source !== "sample" && <Sparkles aria-hidden="true" />}{sourceLabels[source]}</dd></div>
    </dl>
    {charges.length > 0 && <div className="en-charges">
      <h3>Where your money goes</h3>
      <ul>{charges.map(item => <li key={item.label}><div><span>{item.label}</span><strong>{pesos(item.amount)}</strong></div>{item.amount > 0 && positive > 0 && <i aria-hidden="true"><b style={{ width: `${Math.max(item.amount / positive * 100, 1.5)}%` }} /></i>}</li>)}</ul>
    </div>}
    {bill.notes && <p className="en-details-notes">Notes: {bill.notes}</p>}
    <button type="button" className="en-details-remove" disabled={disabled} onClick={onRemove}><Trash2 size={16} aria-hidden="true" />Remove this bill</button>
  </div>;
}

function Change({ percent, compact = false }: { percent: number; compact?: boolean }) {
  if (percent === 0) return <span className="en-change">{compact ? "0%" : "No change"}</span>;
  const lower = percent < 0;
  return <span className={`en-change ${lower ? "is-lower" : "is-higher"}`}>{lower ? <ArrowDown aria-hidden="true" /> : <ArrowUp aria-hidden="true" />}{Math.abs(percent).toFixed(0)}%{!compact && (lower ? " lower" : " higher")}</span>;
}

function MonthTile({ month }: { month: string }) {
  return <span className="en-month-tile"><b>{shortMonth(month)}</b><small>{month.slice(0, 4)}</small></span>;
}

export default function EnergyScreen() {
  const { household, update, ready, storageError } = usePreviewHousehold();
  const [unit, setUnit] = useState<"kwh" | "amount">("kwh");
  const [selected, setSelected] = useState<string | null>(null);
  const [highlight, setHighlight] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [removing, setRemoving] = useState<PreviewBill | null>(null);
  const [period, setPeriod] = useState<BillHistoryFilter>("recent");
  const now = new Date();
  const filters = billHistoryFilters(household.bills, now);
  // Keep the selected year visible if its final bill was removed or changed elsewhere.
  if (!filters.some(option => option.value === period)) filters.push({ value: period, label: period });
  const periodLabel = filters.find(option => option.value === period)?.label ?? period;
  const series = filterBillHistory(household.bills, period, now);
  const history = [...series].reverse();
  const latest = sortBillsByMonth(household.bills).at(-1);
  const latestChange = latest ? compareWithPrevious(household.bills, latest.month) : null;
  const changeSummary = latest && latestChange ? consumptionChange(latest, latestChange.previous) : null;
  const forecast = forecastNextMonth(household.bills, now);
  const bars = series.map(bill => ({ ...bill, example: false }));
  const focus = bars.find(bar => bar.month === selected) ?? bars[bars.length - 1];
  const focusChange = focus ? compareWithPrevious(series, focus.month) : null;
  const value = (bill: PreviewBill) => unit === "kwh" ? bill.kwh : bill.amount;
  const max = Math.max(...bars.map(value), 1) * 1.18;
  // The average line only uses saved bills, never example months.
  const average = series.length ? series.reduce((sum, bill) => sum + value(bill), 0) / series.length : 0;
  const lowest = series.reduce<PreviewBill | undefined>((low, bill) => !low || bill.kwh < low.kwh ? bill : low, undefined);
  const highest = series.reduce<PreviewBill | undefined>((high, bill) => !high || bill.kwh > high.kwh ? bill : high, undefined);
  // As on the Budget screen, the share used counts what was paid after any subsidy.
  const budgetSpent = latest ? amountPaid(latest) : 0;
  const budgetPercent = household.budget > 0 ? Math.round(budgetSpent / household.budget * 100) : 0;
  const format = (amount: number) => unit === "kwh" ? `${Math.round(amount)}` : `₱${Math.round(amount).toLocaleString("en-PH")}`;
  const highlightedMonth = household.bills.find(bill => bill.id === highlight)?.month;
  const highlightOutsideRecent = Boolean(highlightedMonth && !filterBillHistory(household.bills, "recent", now).some(bill => bill.id === highlight));

  useEffect(() => {
    const added = new URLSearchParams(window.location.search).get("added");
    if (!added) return;
    setHighlight(added); setOpen(added);
    window.history.replaceState(null, "", "/bills");
  }, []);

  useEffect(() => {
    if (!highlightedMonth) return;
    if (highlightOutsideRecent) setPeriod(highlightedMonth.slice(0, 4) as `${number}`);
    setSelected(highlightedMonth);
    const timer = window.setTimeout(() => document.getElementById(`bill-${highlight}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 300);
    return () => window.clearTimeout(timer);
  }, [highlight, highlightedMonth, highlightOutsideRecent]);

  function remove(bill: PreviewBill) {
    if (update({ bills: household.bills.filter(item => item.id !== bill.id) })) { setMessage(`${billMonth(bill.month)} bill removed.`); if (selected === bill.month) setSelected(null); return true; } return false;
  }

  return <PageShell title="Energy" subtitle="Compare your electricity use month by month" active="Energy" className="en-page">

    {latest ? <>
      <div className="en-top">
        <section className="en-hero" aria-labelledby="en-hero-title">
          <div className="en-hero-copy">
            <div className="en-hero-facts">
              <h2 id="en-hero-title" className="en-hero-title">{billMonth(latest.month)} bill</h2>
              <p className="en-hero-figure"><strong>{latest.kwh}</strong> kWh</p>
              <p className="en-hero-meta"><span>{pesos(latest.amount)}</span>{latest.dueDate && <span className="en-hero-due">Due {dueDateLabel(latest.dueDate)}</span>}</p>
            </div>
            {latestChange ? <p className={`en-hero-change ${latestChange.kwhPercent <= 0 ? "is-lower" : "is-higher"}`}>{latestChange.kwhPercent !== 0 && (latestChange.kwhPercent < 0 ? <TrendingDown aria-hidden="true" /> : <TrendingUp aria-hidden="true" />)}{latestChange.kwhPercent === 0 ? `No change from ${monthName(latestChange.previous.month)}` : `${Math.abs(latestChange.kwhPercent).toFixed(0)}% ${latestChange.kwhPercent < 0 ? "less" : "more"} than ${monthName(latestChange.previous.month)}`}</p> : <p className="en-hero-change">Add another month to compare</p>}
            {household.budget > 0 ? <Link href="/budget" className={`en-hero-budget is-${budgetStatus(budgetSpent, household.budget)}`}>
              <span className="en-hero-budget-label">Budget</span>
              <span className="en-hero-budget-value">{budgetPercent}% of {whole(household.budget)}</span>
              <ChevronRight size={16} aria-hidden="true" />
              <span className="en-hero-budget-bar" aria-hidden="true"><span style={{ width: `${Math.min(budgetPercent, 100)}%` }} /></span>
            </Link> : <Link href="/budget" className="en-hero-budget">Set a monthly budget<ChevronRight size={16} aria-hidden="true" /></Link>}
            <Link href="/bills/new" className="en-hero-button"><ScanText size={18} aria-hidden="true" /> Scan new bill</Link>
          </div>
          <Image className="en-hero-art" src="/assets/branding/actions-7.png" alt="" width={260} height={260} sizes="(min-width: 900px) 190px, 130px" />
        </section>

        <section className="en-compare ui-panel" aria-labelledby="en-compare-title">
          <div className="ui-panel-heading"><div><h2 id="en-compare-title">Bill comparison</h2><p>{latestChange ? `${shortMonth(latest.month)} ${latest.month.slice(0, 4)} vs ${shortMonth(latestChange.previous.month)} ${latestChange.previous.month.slice(0, 4)}` : "Add two bills to compare."}</p></div></div>
          {latestChange ? <>
            {[latestChange.previous, latest].map(bill => <div key={bill.id} className={`en-compare-row${bill === latest ? " is-latest" : ""}`}>
              <span className="en-compare-label">{shortMonth(bill.month)}</span>
              <div className="en-compare-track"><span style={{ width: `${bill.kwh / Math.max(latest.kwh, latestChange.previous.kwh) * 100}%` }} /></div>
              <strong>{bill.kwh} kWh</strong>
            </div>)}
            <dl className="en-compare-diff">
              <div><dt>Energy</dt><dd><strong>{latestChange.kwhChange > 0 ? "+" : latestChange.kwhChange < 0 ? "−" : ""}{Math.abs(latestChange.kwhChange)} kWh</strong><Change percent={latestChange.kwhPercent} compact /></dd></div>
              <div><dt>Bill amount</dt><dd><strong>{latestChange.amountChange > 0 ? "+" : latestChange.amountChange < 0 ? "−" : ""}{pesos(Math.abs(latestChange.amountChange))}</strong><Change percent={latestChange.amountPercent} compact /></dd></div>
            </dl>
            {changeSummary && <div className="en-compare-insight">
              <span className={`en-compare-status${latestChange.kwhPercent < 0 ? " is-lower" : latestChange.kwhPercent > 0 ? " is-higher" : ""}`}>{changeSummary.label}</span>
              <details className="en-compare-details"><summary>Comparison details<ChevronDown size={14} aria-hidden="true" /></summary><p>A change of 20% or more is highlighted for review. {changeSummary.note} These totals do not explain what caused a change.</p></details>
            </div>}
          </> : <div className="en-compare-empty"><ChartColumnBig aria-hidden="true" /><p>Scan last month&apos;s bill to see how your use changed.</p></div>}
        </section>
      </div>

    </> : <section className="ui-panel"><div className="ui-empty"><ReceiptText /><h3>No electricity bills yet</h3><p>Each bill you add becomes a month in your history, so you can compare your use month by month.</p><div className="en-empty-actions"><Link href="/bills/new" className="ui-primary"><ScanText size={18} aria-hidden="true" /> Add Electricity Bill</Link></div></div></section>}

    <NextMonthForecast forecast={forecast} />

    <div className="en-history-toolbar">
      <div className="en-history-field"><label htmlFor="en-history-period">History period</label><div className="en-history-select"><CalendarDays size={17} aria-hidden="true" /><select id="en-history-period" value={period} onChange={event => { setPeriod(event.target.value as BillHistoryFilter); setSelected(null); setOpen(null); }}>
        {filters.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select><ChevronDown size={16} aria-hidden="true" /></div></div>
      <p className="en-history-count" aria-live="polite"><strong>{series.length}</strong><span>{series.length === 1 ? "bill" : "bills"} in view</span></p>
      <p className="en-history-hint">Forecast uses all bills.</p>
    </div>

    {series.length > 0 ? <>

      <div className="ui-stats en-stats">
        <div><span>Average</span><strong>{Math.round(averageKwh(series))} <small>kWh</small></strong></div>
        <div><span>Lowest</span><strong>{lowest ? `${lowest.kwh}` : "—"} <small>kWh</small></strong>{lowest && <em>{shortMonth(lowest.month)} {lowest.month.slice(0, 4)}</em>}</div>
        <div><span>Highest</span><strong>{highest ? `${highest.kwh}` : "—"} <small>kWh</small></strong>{highest && <em>{shortMonth(highest.month)} {highest.month.slice(0, 4)}</em>}</div>
      </div>

      <section className="ui-panel en-chart-panel" aria-labelledby="en-chart-title">
        <div className="ui-panel-heading"><div><h2 id="en-chart-title">Monthly use</h2><p>Saved bills only · Tap a month</p></div><div className="ui-segment" aria-label="Chart unit"><button type="button" aria-pressed={unit === "kwh"} onClick={() => setUnit("kwh")}>kWh</button><button type="button" aria-pressed={unit === "amount"} onClick={() => setUnit("amount")}>Pesos</button></div></div>
        <div className="en-chart-scroll" tabIndex={0} role="region" aria-label="Scrollable monthly consumption chart"><div className="en-chart" style={bars.length > 6 ? { minWidth: `${bars.length * 72}px` } : undefined}>
          <div className="en-plot" role="group" aria-label={`Monthly ${unit === "kwh" ? "energy use in kilowatt hours" : "bill amount in pesos"}`}>
            {series.length > 1 && <span className="en-average" style={{ bottom: `${average / max * 100}%` }}><em>Avg {format(average)}</em></span>}
            {bars.map(bill => <button key={bill.id} type="button" className="en-col" aria-pressed={bill.month === focus?.month} aria-label={`${billMonth(bill.month)}: ${bill.kwh} kilowatt hours, ${pesos(bill.amount)}`} onClick={() => setSelected(bill.month)}><span className={`en-bar${bill.month === focus?.month ? " is-selected" : ""}`} style={{ height: `${value(bill) / max * 100}%` }}><b>{format(value(bill))}</b></span></button>)}
          </div>
          <div className="en-labels" aria-hidden="true">{bars.map(bill => <span key={bill.id} className={`${bill.month === focus?.month ? "is-selected" : ""}${bill.example ? " is-example" : ""}`}>{shortMonth(bill.month)} {bill.month.slice(0, 4)}</span>)}</div>
        </div></div>
        {focus && <div className={`en-focus${focus.example ? " is-example" : ""}`} aria-live="polite">
          <MonthTile month={focus.month} />
          <div><strong>{billMonth(focus.month)}{focus.example && <span className="en-example-tag">Example</span>}</strong><span>{focus.example ? "Example values. Scan this month’s bill to add your real reading." : `${focus.kwh} kWh · ${pesos(focus.amount)}`}</span></div>
          {focus.example ? <Link href="/bills/new" className="en-focus-scan"><ScanText size={16} aria-hidden="true" /> Scan</Link> : focusChange ? <div className="en-focus-change"><Change percent={focusChange.kwhPercent} /><small>vs {monthName(focusChange.previous.month)}</small></div> : <small className="en-focus-first">First month in this period</small>}
        </div>}
      </section>
    </> : latest ? <section className="ui-panel"><div className="ui-empty"><ReceiptText aria-hidden="true" /><h3>No bills for this period</h3><p>No saved bills match {periodLabel.toLowerCase()}. Choose another year or add a bill from this period.</p><button type="button" className="ui-secondary" onClick={() => { setPeriod("all"); setSelected(null); setOpen(null); }}>Show all years</button></div></section> : null}

    {history.length > 0 && <section className="ui-panel en-history" aria-labelledby="en-history-title">
      <div className="ui-panel-heading"><div><h2 id="en-history-title">Bill history</h2><p>{periodLabel} · {history.length} saved {history.length === 1 ? "bill" : "bills"}</p></div><Link href="/bills/new" className="ui-primary en-add"><ScanText size={17} aria-hidden="true" /> Add bill</Link></div>
      <ul className="en-list">
        {history.map(bill => { const change = compareWithPrevious(series, bill.month); const expanded = open === bill.id; return <li key={bill.id} id={`bill-${bill.id}`} className={`${bill.id === highlight ? "is-new" : ""}${expanded ? " is-open" : ""}`}>
          <button type="button" className="en-row" aria-expanded={expanded} aria-controls={`bill-details-${bill.id}`} onClick={() => setOpen(expanded ? null : bill.id)}>
            <MonthTile month={bill.month} />
            <span className="en-list-main"><strong>{billMonth(bill.month)}{bill.id === highlight && <span className="en-new">New</span>}</strong><span>{bill.dueDate ? `Due ${dueDateLabel(bill.dueDate)}` : sourceLabels[bill.source ?? "manual"]}</span></span>
            <span className="en-list-values"><strong>{bill.kwh} kWh</strong><span>{pesos(amountPaid(bill))}</span></span>
            <span className="en-list-change">{change ? <Change percent={change.kwhPercent} compact /> : <span className="en-first">First</span>}</span>
            <ChevronDown className="en-row-chevron" aria-hidden="true" />
          </button>
          {expanded && <BillDetails bill={bill} disabled={!ready} onRemove={() => setRemoving(bill)} />}
        </li>; })}
      </ul>
    </section>}
    <ConfirmRecordRemoval name={removing ? `${billMonth(removing.month)} bill` : null} error={storageError} onKeep={() => setRemoving(null)} onRemove={() => removing ? remove(removing) : false} />
    {message && <p className="ui-success" role="status">{message}</p>}{storageError && <p className="ui-error" role="alert">{storageError}</p>}
  </PageShell>;
}
