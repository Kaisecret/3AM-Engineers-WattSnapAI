"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUp, ChartColumnBig, ChevronDown, ChevronRight, ReceiptText, ScanText, Sparkles, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import SnapBillLink from "@/features/bill-scanner/components/SnapBillLink";
import PageShell from "./PageShell";
import { usePreviewHousehold } from "../use-preview-household";
import { amountPaid, averageKwh, billMonth, chartMonths, compareWithPrevious, dueDateLabel, monthName, monthlySeries, pesos, shortMonth, sortBillsByMonth, type PreviewBill } from "../preview-data";
import { previewProviderName } from "@/features/household-profile/provider-preview";
import ConfirmRecordRemoval from "@/components/ui/ConfirmRecordRemoval";
import { consumptionChange } from "@/features/consumption-change/local-summary";

const sourceLabels = { scan: "Snap AI", manual: "Typed", sample: "Sample" };
const shortDate = (date: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));

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
      <div><dt>Added by</dt><dd className={`en-source is-${source}`}>{source === "scan" && <Sparkles aria-hidden="true" />}{sourceLabels[source]}</dd></div>
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
  const history = sortBillsByMonth(household.bills).reverse();
  const latest = history[0];
  const latestChange = latest ? compareWithPrevious(household.bills, latest.month) : null;
  const changeSummary = latest && latestChange ? consumptionChange(latest, latestChange.previous) : null;
  const series = monthlySeries(household.bills, 6);
  const bars = chartMonths(household.bills, 6);
  const focus = bars.find(bar => bar.month === selected) ?? bars[bars.length - 1];
  const focusChange = focus && !focus.example ? compareWithPrevious(household.bills, focus.month) : null;
  const value = (bill: PreviewBill) => unit === "kwh" ? bill.kwh : bill.amount;
  const max = Math.max(...bars.map(value), 1) * 1.18;
  // The average line only uses saved bills, never example months.
  const average = series.length ? series.reduce((sum, bill) => sum + value(bill), 0) / series.length : 0;
  const lowest = series.reduce<PreviewBill | undefined>((low, bill) => !low || bill.kwh < low.kwh ? bill : low, undefined);
  const highest = series.reduce<PreviewBill | undefined>((high, bill) => !high || bill.kwh > high.kwh ? bill : high, undefined);
  const budgetPercent = latest && household.budget > 0 ? Math.round(latest.amount / household.budget * 100) : 0;
  const format = (amount: number) => unit === "kwh" ? `${Math.round(amount)}` : `₱${Math.round(amount).toLocaleString("en-PH")}`;

  useEffect(() => {
    const added = new URLSearchParams(window.location.search).get("added");
    if (!added) return;
    setHighlight(added); setOpen(added);
    window.history.replaceState(null, "", "/bills");
    window.setTimeout(() => document.getElementById(`bill-${added}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 300);
  }, []);

  function remove(bill: PreviewBill) {
    if (update({ bills: household.bills.filter(item => item.id !== bill.id) })) { setMessage(`${billMonth(bill.month)} bill removed.`); if (selected === bill.month) setSelected(null); return true; } return false;
  }

  return <PageShell title="Energy" subtitle="Compare your electricity use month by month" active="Energy" className="en-page">

    {latest ? <>
      <div className="en-top">
        <section className="en-hero" aria-labelledby="en-hero-title">
          <div className="en-hero-copy">
            <p className="en-eyebrow">Latest bill · {billMonth(latest.month)}</p>
            <h2 id="en-hero-title"><span>{latest.kwh}</span> kWh</h2>
            <p className="en-hero-meta">{pesos(latest.amount)}{latest.dueDate && <> · Due {dueDateLabel(latest.dueDate)}</>}</p>
            {latestChange ? <p className={`en-hero-change ${latestChange.kwhPercent <= 0 ? "is-lower" : "is-higher"}`}>{latestChange.kwhPercent !== 0 && (latestChange.kwhPercent < 0 ? <TrendingDown aria-hidden="true" /> : <TrendingUp aria-hidden="true" />)}{latestChange.kwhPercent === 0 ? `No change from ${monthName(latestChange.previous.month)}` : `${Math.abs(latestChange.kwhPercent).toFixed(0)}% ${latestChange.kwhPercent < 0 ? "less" : "more"} than ${monthName(latestChange.previous.month)}`}</p> : <p className="en-hero-change">Add another month to compare</p>}
            <div className="en-hero-actions"><SnapBillLink className="en-hero-button"><ScanText size={18} aria-hidden="true" /> Scan new bill</SnapBillLink><Link href="/budget" className="en-hero-link">Budget {budgetPercent}% used <ChevronRight size={16} aria-hidden="true" /></Link></div>
          </div>
          <Image className="en-hero-art" src="/assets/branding/actions-7.png" alt="" width={260} height={260} sizes="(min-width: 900px) 190px, 130px" />
        </section>

        <section className="en-compare ui-panel" aria-labelledby="en-compare-title">
          <div className="ui-panel-heading"><div><h2 id="en-compare-title">Latest vs previous saved bill</h2><p>{latestChange ? `${billMonth(latest.month)} compared with ${billMonth(latestChange.previous.month)}` : "Your comparison appears after two bills."}</p></div></div>
          {latestChange ? <>
            {[latestChange.previous, latest].map(bill => <div key={bill.id} className={`en-compare-row${bill === latest ? " is-latest" : ""}`}>
              <span className="en-compare-label">{shortMonth(bill.month)}</span>
              <div className="en-compare-track"><span style={{ width: `${bill.kwh / Math.max(latest.kwh, latestChange.previous.kwh) * 100}%` }} /></div>
              <strong>{bill.kwh} kWh</strong>
            </div>)}
            <dl className="en-compare-diff">
              <div><dt>Energy</dt><dd>{latestChange.kwhChange > 0 ? "+" : "−"}{Math.abs(latestChange.kwhChange)} kWh <Change percent={latestChange.kwhPercent} compact /></dd></div>
              <div><dt>Cost</dt><dd>{latestChange.amountChange > 0 ? "+" : "−"}{pesos(Math.abs(latestChange.amountChange))} <Change percent={latestChange.amountPercent} compact /></dd></div>
            </dl>
            {changeSummary && <p className="ui-note"><strong>{changeSummary.label}.</strong> A change of 20% or more is highlighted for review. {changeSummary.note} These totals do not explain what caused a change.</p>}
          </> : <div className="en-compare-empty"><ChartColumnBig aria-hidden="true" /><p>Scan last month&apos;s bill to see how your use changed.</p></div>}
        </section>
      </div>

      <div className="ui-stats en-stats">
        <div><span>Recorded-period average</span><strong>{Math.round(averageKwh(series))} <small>kWh</small></strong></div>
        <div><span>Lowest month</span><strong>{lowest ? `${lowest.kwh}` : "—"} <small>kWh</small></strong>{lowest && <em>{billMonth(lowest.month)}</em>}</div>
        <div><span>Highest month</span><strong>{highest ? `${highest.kwh}` : "—"} <small>kWh</small></strong>{highest && <em>{billMonth(highest.month)}</em>}</div>
      </div>

      <section className="ui-panel en-chart-panel" aria-labelledby="en-chart-title">
        <div className="ui-panel-heading"><div><h2 id="en-chart-title">Monthly consumption</h2><p>Only saved periods are shown. Missing months are not estimated. Tap a period to compare.</p></div><div className="ui-segment" aria-label="Chart unit"><button type="button" aria-pressed={unit === "kwh"} onClick={() => setUnit("kwh")}>kWh</button><button type="button" aria-pressed={unit === "amount"} onClick={() => setUnit("amount")}>Pesos</button></div></div>
        <div className="en-chart">
          <div className="en-plot" role="group" aria-label={`Monthly ${unit === "kwh" ? "energy use in kilowatt hours" : "bill amount in pesos"}`}>
            {series.length > 1 && <span className="en-average" style={{ bottom: `${average / max * 100}%` }}><em>Avg {format(average)}</em></span>}
            {bars.map(bill => <button key={bill.id} type="button" className="en-col" aria-pressed={bill.month === focus?.month} aria-label={`${billMonth(bill.month)}: ${bill.kwh} kilowatt hours, ${pesos(bill.amount)}`} onClick={() => setSelected(bill.month)}><span className={`en-bar${bill.month === focus?.month ? " is-selected" : ""}`} style={{ height: `${value(bill) / max * 100}%` }}><b>{format(value(bill))}</b></span></button>)}
          </div>
          <div className="en-labels" aria-hidden="true">{bars.map(bill => <span key={bill.id} className={`${bill.month === focus?.month ? "is-selected" : ""}${bill.example ? " is-example" : ""}`}>{shortMonth(bill.month)} {bill.month.slice(0, 4)}</span>)}</div>
        </div>
        {focus && <div className={`en-focus${focus.example ? " is-example" : ""}`} aria-live="polite">
          <MonthTile month={focus.month} />
          <div><strong>{billMonth(focus.month)}{focus.example && <span className="en-example-tag">Example</span>}</strong><span>{focus.example ? "Example values. Scan this month’s bill to add your real reading." : `${focus.kwh} kWh · ${pesos(focus.amount)}`}</span></div>
          {focus.example ? <SnapBillLink className="en-focus-scan"><ScanText size={16} aria-hidden="true" /> Scan</SnapBillLink> : focusChange ? <div className="en-focus-change"><Change percent={focusChange.kwhPercent} /><small>vs {monthName(focusChange.previous.month)}</small></div> : <small className="en-focus-first">First recorded month</small>}
        </div>}
      </section>
    </> : <section className="ui-panel"><div className="ui-empty"><ReceiptText /><h3>No electricity bills yet</h3><p>Each bill you add becomes a month in your history, so you can compare your use month by month.</p><div className="en-empty-actions"><SnapBillLink className="ui-primary"><ScanText size={18} aria-hidden="true" /> Add Electricity Bill</SnapBillLink></div></div></section>}

    {history.length > 0 && <section className="ui-panel en-history" aria-labelledby="en-history-title">
      <div className="ui-panel-heading"><div><h2 id="en-history-title">Bill history</h2><p>Every confirmed bill you save is added here.</p></div><SnapBillLink className="ui-primary en-add"><ScanText size={17} aria-hidden="true" /> Add bill</SnapBillLink></div>
      <ul className="en-list">
        {history.map(bill => { const change = compareWithPrevious(household.bills, bill.month); const expanded = open === bill.id; return <li key={bill.id} id={`bill-${bill.id}`} className={`${bill.id === highlight ? "is-new" : ""}${expanded ? " is-open" : ""}`}>
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
