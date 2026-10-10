"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Check, ChevronRight, Clock3, FolderOpen, Info, Plus, RotateCcw, Save, SlidersHorizontal, Sparkles, Trash2, TriangleAlert, WifiOff, X } from "lucide-react";
import PageShell from "@/features/dashboard/components/PageShell";
import { usePreviewHousehold } from "@/features/dashboard/use-preview-household";
import { billMonth, latestBill, pesos } from "@/features/dashboard/preview-data";
import { applianceIcons } from "@/features/appliance-registration/components/appliance-picker";
import { applianceSignature, compareScenario, createScenario, isStaleScenario, scenarioEntries } from "../calculations";
import { exampleScenario, scenarioExamples, type ScenarioExample } from "../preview-examples";
import { usePreviewScenarios } from "../use-preview-scenarios";
import type { PreviewScenario, ScenarioEntry } from "../types";
import ScenarioEditor from "./scenario-editor";
import ComparisonPreview from "./comparison-preview";

export default function SimulatorScreen() {
  const { household, ready: householdReady, storageError } = usePreviewHousehold();
  const saved = usePreviewScenarios();
  const [working, setWorking] = useState<PreviewScenario | null>(null);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [offline, setOffline] = useState(false);
  const [acceptedSnapshot, setAcceptedSnapshot] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const refreshDialog = useRef<HTMLDialogElement>(null);
  const refreshButton = useRef<HTMLButtonElement>(null);
  const ready = householdReady && saved.ready;
  const currentSignature = applianceSignature(household.appliances);
  const stale = working ? isStaleScenario(working, household.appliances) : false;
  const blockedByStale = stale && acceptedSnapshot !== currentSignature;
  const result = working ? compareScenario(working) : null;
  const latest = latestBill(household.bills);
  const hasSample = working && (working.origin === "sample" || working.baseline.some(item => item.source === "sample" || item.id.startsWith("sample-")));

  useEffect(() => { const sync = () => setOffline(!navigator.onLine); sync(); window.addEventListener("online", sync); window.addEventListener("offline", sync); return () => { window.removeEventListener("online", sync); window.removeEventListener("offline", sync); }; }, []);
  useEffect(() => { heading.current?.focus(); }, [working?.id]);
  function open(scenario: PreviewScenario, fromSaved = false) {
    setWorking({ ...scenario, baseline: scenario.baseline.map(item => ({ ...item })), entries: scenario.entries.map(item => ({ ...item })) });
    setDirty(!fromSaved); setError(""); setMessage(""); setAcceptedSnapshot(null);
  }
  function startHousehold() { open(createScenario(household.appliances, crypto.randomUUID())); }
  function startExample(type: ScenarioExample) { open(exampleScenario(type, crypto.randomUUID())); }
  function patch(change: Partial<PreviewScenario>) { setWorking(current => current ? { ...current, ...change } : null); setDirty(true); setMessage(""); setError(""); }
  function entryChange(id: string, change: Partial<ScenarioEntry>) {
    if (working) patch({ entries: working.entries.map(entry => entry.id === id ? { ...entry, ...change } : entry) });
  }
  function addEntry() {
    if (working) patch({ entries: [...working.entries, { id: crypto.randomUUID(), name: "", kind: "other", watts: "", quantity: "1", hours: "", included: true }] });
  }
  function resetEntry(id: string) {
    if (!working) return; const original = scenarioEntries(working.baseline).find(entry => entry.id === id);
    if (original) entryChange(id, original);
  }
  function save() {
    if (!working) return;
    if (!working.title.trim()) { setError("Give your scenario a name before saving."); return; }
    if (!result?.comparison) { setError(result?.error ?? "Check the scenario inputs before saving."); return; }
    if (blockedByStale) { setError("Review the original snapshot or refresh the baseline before saving."); return; }
    const record = { ...working, title: working.title.trim() };
    if (saved.save(record)) { setWorking(record); setDirty(false); setError(""); setMessage("Scenario saved in this browser. Your registered appliances are unchanged."); }
  }
  function refreshBaseline() {
    if (!working || !household.appliances.length) return;
    const fresh = createScenario(household.appliances, working.id);
    setWorking({ ...fresh, title: working.title, days: working.days, rate: working.rate, rateBasis: working.rateBasis });
    setDirty(true); setError(""); setAcceptedSnapshot(null); setMessage("Baseline refreshed. Review your new scenario inputs before saving."); refreshDialog.current?.close();
  }

  return <PageShell title="Watt-If simulator" subtitle="Try a change and compare estimated energy use" active="Appliances" className="wi-page">
    <div className="wi-toolbar"><Link href="/appliances"><ArrowLeft size={17} aria-hidden="true" />Back to appliances</Link><span><SlidersHorizontal size={14} aria-hidden="true" />Local what-if comparison</span></div>
    {offline && <div className="wi-note is-offline" role="status"><WifiOff aria-hidden="true" /><p><strong>You’re offline.</strong>Scenarios run locally and can be saved in this browser.</p></div>}
    {!ready && <div className="wi-loading" role="status"><Clock3 aria-hidden="true" />Loading your appliances and saved scenarios…</div>}
    {!working ? <>
      <section className="wi-hero"><div><span>ONE SMALL CHANGE AT A TIME</span><h2>Try a change.<br />See its impact.</h2><p>Compare a change in power or usage over the same number of days.</p></div><Image src="/assets/branding/actions-6.png" alt="" width={260} height={260} sizes="(min-width: 900px) 185px, 86px" priority /></section>
      <section className="ui-panel wi-start" aria-labelledby="wi-start-heading"><span className="wi-section-icon"><SlidersHorizontal aria-hidden="true" /></span><div><h2 id="wi-start-heading">Start with your appliances</h2><p>{ready && household.appliances.length ? `${household.appliances.length} saved appliance ${household.appliances.length === 1 ? "entry" : "entries"} ready to compare. Your scenario uses its own copy.` : ready ? "No appliances yet. Add one to create your own baseline, then compare your own usage assumptions." : "Your saved inputs will appear here."}</p>{household.appliances.some(item => item.source === "sample" || item.id.startsWith("sample-")) && <small>Your saved list includes sample appliances.</small>}</div>{household.appliances.length ? <button type="button" className="ui-primary" disabled={!ready} onClick={startHousehold}>Use saved appliances<ChevronRight size={16} aria-hidden="true" /></button> : <Link className="ui-primary" href="/appliances/new"><Plus size={17} aria-hidden="true" />Add an appliance</Link>}</section>

    </> : <>
      <section className="ui-panel wi-settings" aria-labelledby="wi-workspace-heading"><div className="ui-panel-heading"><div><span className="wi-eyebrow">YOUR SCENARIO WORKSPACE</span><h2 ref={heading} tabIndex={-1} id="wi-workspace-heading">Build your Watt-If</h2><p>Changes here stay separate from your registered appliances.</p></div><button type="button" className="wi-new" onClick={() => { setWorking(null); setError(""); setMessage(""); }}>New scenario</button></div>
        {hasSample && <div className="wi-note is-sample"><Info aria-hidden="true" /><p><strong>{working.origin === "sample" ? "Sample scenario · UI preview" : "Baseline includes sample appliances"}</strong>These inputs are examples. All results remain estimates.</p></div>}
        <div className="wi-settings-fields"><label className="wi-wide">Scenario name<input value={working.title} maxLength={60} onChange={event => patch({ title: event.target.value })} /></label><label>Comparison period <small>days</small><input aria-label="Comparison period in days" type="number" inputMode="numeric" min="1" max="366" step="1" value={working.days} onChange={event => patch({ days: event.target.value })} /></label><label>Optional rate <small>₱/kWh</small><input aria-label="Optional rate in pesos per kWh" type="number" inputMode="decimal" min="0.001" step="any" placeholder="Leave blank" value={working.rate} onChange={event => patch({ rate: event.target.value, rateBasis: event.target.value.trim() ? "Your entered rate" : "" })} /></label></div>
        <div className="wi-rate-options">{latest && <button type="button" onClick={() => patch({ rate: (latest.amount / latest.kwh).toFixed(4), rateBasis: `${latest.source === "sample" ? "Sample" : "Saved"} ${billMonth(latest.month)} bill rate (amount ÷ kWh)` })}>Use {latest.source === "sample" ? "sample" : "latest"} bill rate · {pesos(latest.amount / latest.kwh)}/kWh</button>}{working.origin === "sample" && <button type="button" onClick={() => patch({ rate: "11.45", rateBasis: "Example rate of ₱11.45/kWh" })}>Use example rate · ₱11.45/kWh</button>}{working.rate && <button type="button" onClick={() => patch({ rate: "", rateBasis: "" })}>Clear rate</button>}</div>
        <p className="wi-rate-hint">{working.rate ? working.rateBasis || "Your entered rate" : "No rate selected · energy comparison only."} Both sides use this period and rate. Nameplate power and usage assumptions are approximate.</p>
        <details className="wi-baseline"><summary>View baseline snapshot · {working.baseline.length} {working.baseline.length === 1 ? "entry" : "entries"}</summary><ul>{working.baseline.map(item => <li key={item.id}><strong>{item.name}</strong><span>{item.watts} W · ×{item.quantity} · {item.hours} hrs/day{item.source === "sample" || item.id.startsWith("sample-") ? " · Sample" : ""}</span></li>)}</ul><p>Both baseline and scenario are calculated over {working.days || "—"} days, regardless of each appliance’s original registration period.</p></details>
      </section>
      {stale && <section className="wi-note wi-stale is-stale" aria-labelledby="wi-stale-heading"><TriangleAlert aria-hidden="true" /><div><h2 id="wi-stale-heading">Your saved appliances changed</h2><p>This scenario retains its original baseline snapshot. Refresh it to use the current list, or review the original snapshot to compare with the older inputs.</p><div className="wi-stale-actions"><button ref={refreshButton} type="button" disabled={!household.appliances.length} onClick={() => refreshDialog.current?.showModal()}>Refresh baseline</button><button type="button" onClick={() => { setAcceptedSnapshot(currentSignature); setError(""); }}>{blockedByStale ? "Review original snapshot" : <><Check size={15} aria-hidden="true" />Using original snapshot</>}</button></div>{!household.appliances.length && <Link href="/appliances/new">Add an appliance to refresh the baseline</Link>}</div></section>}
      <a className="wi-mobile-compare" href="#wi-comparison-heading">View comparison<ChevronRight size={16} aria-hidden="true" /></a>
      <div className="wi-workspace-layout"><ScenarioEditor entries={working.entries} baseline={working.baseline} days={working.days} onChange={entryChange} onAdd={addEntry} onRemove={id => patch({ entries: working.entries.filter(entry => entry.id !== id) })} onReset={resetEntry} /><div className="wi-results-column"><ComparisonPreview comparison={blockedByStale ? undefined : result?.comparison} days={working.days} rateBasis={working.rateBasis} stale={blockedByStale} error={result?.error} /><section className="ui-panel wi-save"><span className={`wi-save-status${dirty ? " is-dirty" : ""}`}>{dirty ? "Unsaved scenario changes" : "Scenario saved locally"}</span><button type="button" className="ui-primary" disabled={!ready || !dirty} onClick={save}><Save size={18} aria-hidden="true" />{saved.scenarios.some(item => item.id === working.id) ? "Save scenario changes" : "Save scenario"}</button><button type="button" className="wi-reset" onClick={() => patch({ entries: scenarioEntries(working.baseline) })}><RotateCcw size={15} aria-hidden="true" />Reset scenario appliances</button><p>Your household appliances and bills stay unchanged. To update a real appliance, use its separate <Link href="/appliances">review and edit screen</Link>.</p></section></div></div>
      {error && <p className="ui-error" role="alert">{error}</p>}{message && <p className="ui-success" role="status">{message}</p>}
    </>}
    {(storageError || saved.error) && <p className="ui-error" role="alert">{saved.error || storageError}</p>}
    <section className="ui-panel wi-history" aria-labelledby="wi-history-heading"><div className="ui-panel-heading"><div><h2 id="wi-history-heading"><FolderOpen size={20} aria-hidden="true" />Saved scenarios</h2><p>Browser previews with their original baseline inputs.</p></div><span className="ui-count">{saved.scenarios.length}</span></div>{saved.scenarios.length ? <ul>{saved.scenarios.map(scenario => { const old = isStaleScenario(scenario, household.appliances); const comparison = compareScenario(scenario).comparison; const difference = comparison?.savingsKwh ?? 0; return <li key={scenario.id}><div><h3>{scenario.title}</h3><p>{scenario.days} days · {scenario.origin === "sample" ? "Sample baseline" : "Saved appliance baseline"}{old ? " · Baseline changed" : ""}</p>{!old && comparison && <strong>{Math.abs(difference).toFixed(2)} kWh {difference > 1e-8 ? "less" : difference < -1e-8 ? "more" : "difference"}</strong>}</div><button type="button" className="wi-history-open" onClick={() => open(scenario, true)} aria-label={`Open ${scenario.title}`}>Open<ChevronRight size={15} aria-hidden="true" /></button><button type="button" className="ui-icon-button" aria-label={`Remove ${scenario.title}`} onClick={() => { if (saved.remove(scenario.id) && working?.id === scenario.id) { setWorking(null); setMessage(""); } }}><Trash2 size={17} aria-hidden="true" /></button></li>; })}</ul> : <div className="wi-history-empty"><FolderOpen aria-hidden="true" /><h3>No saved scenarios yet</h3><p>Save a what-if comparison to revisit its assumptions later.</p></div>}</section>
    <dialog ref={refreshDialog} className="wi-refresh-dialog" aria-labelledby="wi-refresh-heading" onClose={() => refreshButton.current?.focus()}><div><h2 id="wi-refresh-heading">Refresh this baseline?</h2><button type="button" className="ui-icon-button" aria-label="Close baseline refresh" onClick={() => refreshDialog.current?.close()}><X aria-hidden="true" /></button></div><p>This resets the scenario appliances to your current saved list. The comparison period and rate stay as entered. Your stored scenario changes only when you save it again.</p><button type="button" className="ui-primary" onClick={refreshBaseline}>Refresh and reset scenario</button><button type="button" className="ui-secondary" onClick={() => refreshDialog.current?.close()}>Keep current scenario</button></dialog>
  </PageShell>;
}
