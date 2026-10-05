"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ReceiptText, ScanLine, Trash2 } from "lucide-react";
import PageShell from "./PageShell";
import { usePreviewHousehold } from "../use-preview-household";
import { billMonth, pesos } from "../preview-data";

const periods = {
  week: { labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], values: [9.1, 11.4, 14, 12.6, 10.7, 14, 11.4] },
  month: { labels: ["May", "Jun", "Jul", "Aug", "Sep", "Oct"], values: [168, 181, 172, 164, 151, 143] },
};
export default function EnergyScreen() {
  const { household, update, ready, storageError } = usePreviewHousehold();
  const [period, setPeriod] = useState<"week" | "month">("week");
  const [message, setMessage] = useState("");
  const bills = [...household.bills].sort((a, b) => b.month.localeCompare(a.month));
  const chart = periods[period];
  const max = Math.max(...chart.values) * 1.18;
  return <PageShell title="Energy" subtitle="Your consumption and bill history" active="Energy">
    <div className="ui-toolbar"><p>Keep your electricity records in one place.</p><Link className="ui-primary" href="/bills/new"><ScanLine size={18} /> Add bill</Link></div>
    <div className="ui-stats"><div><span>Latest bill</span><strong>{bills[0] ? pesos(bills[0].amount) : "—"}</strong></div><div><span>Recorded consumption</span><strong>{bills[0] ? `${bills[0].kwh} kWh` : "—"}</strong></div><Link href="/budget"><span>Monthly budget</span><strong>{pesos(household.budget)}</strong><ArrowUpRight size={18} /></Link></div>
    <section className="ui-panel"><div className="ui-panel-heading"><div><h2>Consumption overview</h2><p>Sample readings to explore the chart</p></div><div className="ui-segment" aria-label="Chart period"><button aria-pressed={period === "week"} onClick={() => setPeriod("week")}>Week</button><button aria-pressed={period === "month"} onClick={() => setPeriod("month")}>Month</button></div></div>
      <div className="ui-energy-chart" role="img" aria-label={`Sample ${period} consumption in kilowatt hours: ${chart.labels.map((label, i) => `${label} ${chart.values[i]}`).join(", ")}`}>
        {chart.values.map((value, i) => <div key={chart.labels[i]} className={i === 3 ? "is-current" : ""}><div className="ui-chart-track"><span style={{ height: `${value / max * 100}%` }}><b>{value}</b></span></div><span>{chart.labels[i]}</span></div>)}
      </div>
    </section>
    <section className="ui-panel"><div className="ui-panel-heading"><h2>Bill history</h2><span className="ui-count">{bills.length} {bills.length === 1 ? "bill" : "bills"}</span></div>
      {bills.length ? <div className="ui-table-wrap"><table className="ui-table"><thead><tr><th>Billing month</th><th>Consumption</th><th>Amount</th><th><span className="ws-sr-only">Actions</span></th></tr></thead><tbody>{bills.map(bill => <tr key={bill.id}><td>{billMonth(bill.month)}</td><td>{bill.kwh} kWh</td><td>{pesos(bill.amount)}</td><td><button className="ui-icon-button" disabled={!ready} aria-label={`Remove ${billMonth(bill.month)} bill`} onClick={() => { if (update({ bills: household.bills.filter(item => item.id !== bill.id) })) setMessage("Bill removed."); }}><Trash2 size={17} /></button></td></tr>)}</tbody></table></div> : <div className="ui-empty"><ReceiptText /><h3>Add your first electricity bill</h3><p>Your saved bills and monthly consumption will appear here.</p><Link href="/bills/new" className="ui-primary">Add bill</Link></div>}
    </section>
    {message && <p className="ui-success" role="status">{message}</p>}{storageError && <p className="ui-error" role="alert">{storageError}</p>}
  </PageShell>;
}
