"use client";
import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, ChevronRight, CircleCheck, Eye, EyeOff, Lightbulb, ReceiptText, Sparkles, TrendingDown, TriangleAlert, Wallet } from "lucide-react";
import PageShell from "./PageShell";
import { usePreviewHousehold } from "../use-preview-household";
import { averageKwh, billMonth, budgetPresets, budgetStatus, effectiveRate, latestBill, monthlySeries, parseAmount, pesos, shortMonth, suggestedBudget, validateBudget, type BudgetStatus } from "../preview-data";

const statusCopy: Record<BudgetStatus, { label: string; detail: string }> = {
  "on-track": { label: "On track", detail: "Your latest bill is well within budget." },
  near: { label: "Near your limit", detail: "Your latest bill used most of your budget." },
  over: { label: "Over budget", detail: "Your latest bill went past your budget." },
};
const whole = (value: number) => pesos(Math.round(value)).replace(/\.00$/, "");

export default function BudgetScreen() {
  const { household, update, ready, storageError } = usePreviewHousehold();
  const [draft, setDraft] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  const latest = latestBill(household.bills);
  const recent = monthlySeries(household.bills, 6).reverse();
  const budget = household.budget;
  const spent = latest?.amount ?? 0;
  const used = budget > 0 ? spent / budget * 100 : 0;
  const status = budgetStatus(spent, budget);
  const suggestion = suggestedBudget(household.bills);
  const rate = effectiveRate(household.bills);
  const value = draft ?? (budget > 0 ? String(budget) : "");
  const amount = parseAmount(value);
  const changed = draft !== null && amount !== budget;
  // History bars share one scale so the budget marker sits inside the track.
  const scale = Math.max(budget, ...recent.map(bill => bill.amount)) * 1.08;
  const money = (number: number) => hidden ? "₱ ••••" : pesos(number);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function type(text: string) {
    // Digits with an optional two-decimal fraction, like a wallet amount field.
    const cleaned = text.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
    const [integer, fraction] = cleaned.split(".");
    setDraft(fraction === undefined ? integer.slice(0, 6) : `${integer.slice(0, 6)}.${fraction.slice(0, 2)}`);
    setError("");
  }
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const issue = validateBudget(amount);
    if (issue) { setError(issue); return; }
    if (update({ budget: amount })) { setDraft(null); setError(""); setToast({ id: Date.now(), text: `Budget set to ${whole(amount)} a month` }); }
  }

  return <PageShell title="Smart Energy Budget" subtitle="Keep your electricity spending on track" active="Energy" className="bg-page">
    <div className="bg-layout">
      <section className={`bg-wallet is-${status}`} aria-labelledby="bg-wallet-title">
        <div className="bg-wallet-top">
          <span className="bg-wallet-icon"><Wallet aria-hidden="true" /></span>
          <div><p id="bg-wallet-title">Monthly budget</p><small>{latest ? `${billMonth(latest.month)} bill` : "No bills yet"}</small></div>
          <button type="button" className="bg-eye" aria-label={hidden ? "Show amounts" : "Hide amounts"} aria-pressed={hidden} onClick={() => setHidden(value => !value)}>{hidden ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}</button>
        </div>
        <strong className="bg-wallet-amount">{budget > 0 ? money(budget) : "Not set"}</strong>
        <p className="bg-wallet-left">{budget <= 0 ? "Set a budget to compare your spending" : latest ? spent > budget ? <>Over by <b>{money(spent - budget)}</b></> : <><b>{money(budget - spent)}</b> left this month</> : "Scan a bill to see how much is left"}</p>
        <div className="bg-meter" role="progressbar" aria-label="Budget used by latest bill" aria-valuenow={Math.round(used)} aria-valuemin={0} aria-valuemax={Math.max(100, Math.ceil(used))}><span style={{ width: `${Math.min(used, 100)}%` }} /></div>
        <div className="bg-meter-labels"><span>{Math.round(used)}% used</span><span>{money(spent)} spent</span></div>
        <div className="bg-wallet-foot">
          <span className="bg-status">{status === "on-track" ? <CircleCheck aria-hidden="true" /> : <TriangleAlert aria-hidden="true" />}{budget <= 0 ? "Budget not set" : latest ? statusCopy[status].label : "Waiting for a bill"}</span>
          <span className="bg-avg">Avg bill {money(recent.length ? recent.reduce((sum, bill) => sum + bill.amount, 0) / recent.length : 0)}</span>
        </div>
        <Image className="bg-wallet-art" src="/assets/branding/Cheerful Bee Robot Thumbs-Up.png" alt="" width={240} height={240} sizes="(min-width: 900px) 150px, 100px" />
      </section>

      <section className="ui-panel bg-set" aria-labelledby="bg-set-title">
        <div className="bg-set-head"><h2 id="bg-set-title">Set your monthly budget</h2><p>Tap an amount or type your own.</p></div>
        <form onSubmit={save} noValidate>
          <label className="bg-amount">
            <span className="ws-sr-only">Monthly budget in pesos</span>
            <span className="bg-amount-field"><em aria-hidden="true">₱</em><input inputMode="decimal" autoComplete="off" value={value} placeholder="0" style={{ width: `${Math.max(value.length, 1) + 0.6}ch` }} aria-invalid={!!error} aria-describedby="bg-amount-hint" onChange={event => type(event.target.value)} /></span>
            <small id="bg-amount-hint">{Number.isFinite(amount) && amount > 0 ? `≈ ${Math.round(amount / rate)} kWh a month at ${pesos(rate)}/kWh` : "Enter an amount in pesos"}</small>
          </label>
          {suggestion && <button type="button" className="bg-suggest" onClick={() => { setDraft(String(suggestion)); setError(""); }}><Sparkles aria-hidden="true" /><span>Suggested <b>{whole(suggestion)}</b><small>Your recent average plus a little room</small></span><ChevronRight aria-hidden="true" /></button>}
          <div className="bg-presets" role="group" aria-label="Quick amounts">
            {budgetPresets.map(preset => <button type="button" key={preset} className={amount === preset ? "is-selected" : ""} aria-pressed={amount === preset} onClick={() => { setDraft(String(preset)); setError(""); }}>
              <strong>{whole(preset)}</strong><small>≈ {Math.round(preset / rate)} kWh</small>{amount === preset && <span className="bg-check"><Check aria-hidden="true" /></span>}
            </button>)}
          </div>
          {(error || storageError) && <p className="ui-error" role="alert">{error || storageError}</p>}
          <button type="submit" className="ui-primary bg-save" disabled={!ready || !changed}>{changed ? <>Set budget to {Number.isFinite(amount) ? whole(amount) : "—"}</> : <><Check size={18} aria-hidden="true" /> Budget saved</>}</button>
        </form>
      </section>

      <section className="ui-panel bg-history" aria-labelledby="bg-history-title">
        <div className="ui-panel-heading"><div><h2 id="bg-history-title">Bills vs budget</h2><p>Each month compared with your {whole(budget)} target.</p></div><Link href="/bills" className="bg-link">All bills <ChevronRight size={16} aria-hidden="true" /></Link></div>
        {recent.length ? <ul className="bg-months">
          {recent.map(bill => { const share = budget > 0 ? bill.amount / budget * 100 : 0; const state = budgetStatus(bill.amount, budget); return <li key={bill.id} className={`is-${state}`}>
            <span className="bg-month-tile"><b>{shortMonth(bill.month)}</b><small>{bill.month.slice(0, 4)}</small></span>
            <div className="bg-month-main">
              <div className="bg-month-top"><strong>{money(bill.amount)}</strong><span className="bg-month-chip">{budget <= 0 ? "No target" : state === "over" ? `+${whole(bill.amount - budget)}` : `${Math.round(share)}%`}</span></div>
              <div className="bg-month-bar"><span style={{ width: `${bill.amount / scale * 100}%` }} /><i style={{ left: `${budget / scale * 100}%` }} aria-hidden="true" /></div>
              <small>{bill.kwh} kWh · {budget <= 0 ? "Set a budget to compare" : state === "over" ? "over budget" : `${whole(budget - bill.amount)} under`}</small>
            </div>
          </li>; })}
        </ul> : <div className="bg-empty"><ReceiptText aria-hidden="true" /><p>Scan your bills to compare them with your budget.</p><Link href="/bills/new" className="ui-primary">Scan a bill</Link></div>}
      </section>

      <section className="bg-tips" aria-labelledby="bg-tips-title">
        <Image src="/assets/branding/actions-5.png" alt="" width={240} height={240} sizes="110px" />
        <div>
          <h2 id="bg-tips-title"><Lightbulb aria-hidden="true" /> Stay on budget</h2>
          <ul>
            <li><TrendingDown aria-hidden="true" /> {recent.length ? `Your saved bills average ${Math.round(averageKwh(recent))} kWh per recorded period.` : "Add a reviewed bill to give your tips a bill basis."}</li>
            <li><TrendingDown aria-hidden="true" /> Review tips based on your own appliance inputs and usage assumptions.</li>
          </ul>
          <Link href="/tips" className="bg-tips-link">View Tipid Tips <ChevronRight size={16} aria-hidden="true" /></Link>
        </div>
      </section>
    </div>
    <div className="ws-toast-region" role="status" aria-live="polite">{toast && <div key={toast.id} className="ws-toast"><CircleCheck aria-hidden="true" /> {toast.text}</div>}</div>
  </PageShell>;
}
