"use client";
import { useState } from "react";
import { ChartNoAxesColumnIncreasing } from "lucide-react";
import PageShell from "./PageShell";
import { usePreviewHousehold } from "../use-preview-household";
import { pesos } from "../preview-data";

export default function BudgetScreen() {
  const { household, update, ready, storageError } = usePreviewHousehold();
  const [message, setMessage] = useState(""); const [error, setError] = useState("");
  const latest = [...household.bills].sort((a, b) => b.month.localeCompare(a.month))[0];
  const spent = latest?.amount || 0; const percent = spent / household.budget * 100;
  return <PageShell title="Smart Energy Budget" subtitle="Keep your electricity spending on track" active="Energy">
    <div className="ui-two-columns">
      <section className="ui-panel ui-budget-overview"><span className="ws-icon-tile ws-icon-green"><ChartNoAxesColumnIncreasing /></span><h2>Monthly target</h2><strong>{pesos(household.budget)}</strong><p>{latest ? `${pesos(spent)} on your latest recorded bill` : "Add a bill to compare your spending with your target."}</p><div className="ui-budget-progress" role="progressbar" aria-label="Budget used by latest bill" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={Math.max(100, Math.ceil(percent))}><span style={{ width: `${Math.min(percent, 100)}%`, background: percent > 100 ? "#f2a238" : undefined }} /></div><div className="ui-budget-labels"><span>{Math.round(percent)}% used</span><span>{spent > household.budget ? `${pesos(spent - household.budget)} over target` : `${pesos(household.budget - spent)} remaining`}</span></div></section>
      <section className="ui-panel"><div className="ui-panel-heading"><div><h2>Set your monthly budget</h2><p>Choose an amount that works for your household.</p></div></div><form className="ui-form" onSubmit={event => { event.preventDefault(); const budget = Number(new FormData(event.currentTarget).get("budget")); if (!Number.isFinite(budget) || budget <= 0) { setError("Enter a budget greater than zero."); return; } if (update({ budget })) { setError(""); setMessage("Monthly budget saved."); } }}><label>Monthly budget (₱)<input key={household.budget} name="budget" type="number" min="1" step="0.01" defaultValue={household.budget} required /></label><button className="ui-primary" disabled={!ready} type="submit">Save budget</button></form>{message && <p className="ui-success" role="status">{message}</p>}{(error || storageError) && <p className="ui-error" role="alert">{error || storageError}</p>}</section>
    </div>
  </PageShell>;
}
