"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, ChevronDown, Lightbulb, LoaderCircle, PlugZap, ReceiptText, RotateCcw, Sparkles, TriangleAlert, WifiOff } from "lucide-react";
import PageShell from "@/features/dashboard/components/PageShell";
import { usePreviewHousehold } from "@/features/dashboard/use-preview-household";
import { previewStorageFor, usePreviewStorageKey } from "@/features/auth/use-preview-storage-key";
import { generatePreviewTips, tipsAreStale, tipsInputSignature, tipsStorageKey } from "../preview-tips";
import { requestGeminiTips } from "../ai-tips";
import { usePreviewTips } from "../use-preview-tips";
import TipsSetupReview from "@/features/onboarding/components/TipsSetupReview";
import TipsList from "./tips-list";
import BillForecastPanel from "./BillForecastPanel";
import { buildBillForecast } from "../bill-forecast";

const dateLabel = (date: string) => new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(date));
const countLabel = (count: number, noun: string) => `${count} ${noun}${count === 1 ? "" : "s"}`;

export default function TipsScreen() {
  const { household, ready: householdReady, storageError } = usePreviewHousehold();
  const saved = usePreviewTips();
  const storageKey = usePreviewStorageKey(tipsStorageKey);
  const [filter, setFilter] = useState<"all" | "appliance" | "bill">("all");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState(false);
  const request = useRef<AbortController | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const currentSignature = useRef(tipsInputSignature(household));
  currentSignature.current = tipsInputSignature(household);
  const ready = householdReady && saved.ready;
  const snapshot = saved.snapshot;
  const stale = snapshot ? tipsAreStale(snapshot, household) : false;
  const forecast = useMemo(() => snapshot?.forecast ?? buildBillForecast(household.bills), [snapshot, household.bills]);

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync(); window.addEventListener("online", sync); window.addEventListener("offline", sync);
    return () => { window.removeEventListener("online", sync); window.removeEventListener("offline", sync); };
  }, []);
  useEffect(() => {
    setBusy(false); setMessage(""); setError("");
    return () => { request.current?.abort(); request.current = null; };
  }, [storageKey]);

  function cancel() {
    request.current?.abort(); request.current = null;
    setBusy(false); setMessage("Cancelled. Your saved tips are unchanged.");
  }
  async function refresh() {
    if (!ready || busy || request.current || saved.error || storageError || (offline && snapshot)) return;
    setError(""); setMessage("");
    let expectedTips: string | null;
    try { expectedTips = localStorage.getItem(storageKey); }
    catch { setError("Saved tips could not be opened. Reopen this page and try again."); return; }
    const tipsUnchanged = () => {
      try { return localStorage.getItem(storageKey) === expectedTips; }
      catch { return false; }
    };
    const basis = { ...generatePreviewTips(household), source: "local-rule" as const };
    const controller = new AbortController(); request.current = controller;
    setBusy(true);
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 35000);
    try {
      const useLocal = !navigator.onLine || basis.context.sample || (!household.bills.length && !household.appliances.length);
      const next = useLocal ? basis : await requestGeminiTips(household, basis, controller.signal);
      if (request.current !== controller || previewStorageFor(tipsStorageKey) !== storageKey) return;
      if (currentSignature.current !== basis.inputSignature) { setError("Your records changed. Create tips again to use the latest inputs."); return; }
      if (!tipsUnchanged()) { setError("Saved tips changed in another tab. Review them before refreshing again."); return; }
      if (saved.save(next)) { setFilter("all"); setMessage(useLocal ? "Basic tips saved on this device." : "Your new tips are ready."); heading.current?.focus(); }
    } catch (problem) {
      if (request.current !== controller || previewStorageFor(tipsStorageKey) !== storageKey) return;
      if (controller.signal.aborted && !timedOut) return;
      if (!tipsUnchanged()) { setError("Saved tips changed in another tab. Review them before refreshing again."); return; }
      const reason = timedOut ? "Gemini took too long. Try again." : problem instanceof Error ? problem.message : "Gemini is unavailable. Try again.";
      if (!snapshot && currentSignature.current === basis.inputSignature && saved.save(basis)) setMessage("Gemini is unavailable. Basic tips saved for now.");
      setError(snapshot ? reason + " Your saved tips are unchanged." : reason);
    } finally {
      clearTimeout(timer);
      if (request.current === controller) { request.current = null; setBusy(false); }
    }
  }

  return <PageShell title="Tipid Tips" active="Home" className="tt-page">
    <section className="tt-intro" aria-labelledby="tt-intro-heading">
      <span className="tt-intro-icon"><Lightbulb aria-hidden="true" /></span>
      <div className="tt-intro-copy"><h2 id="tt-intro-heading">Your home. Your tips.</h2><p>Simple ways to use less electricity.</p>
        <div className="tt-records"><Link href="/appliances"><PlugZap size={15} aria-hidden="true" />{ready ? countLabel(household.appliances.length, "appliance") : "— appliances"}</Link><span aria-hidden="true">·</span><Link href="/bills"><ReceiptText size={15} aria-hidden="true" />{ready ? countLabel(household.bills.length, "bill") : "— bills"}</Link></div>
      </div>
      <div className="tt-refresh-actions"><button type="button" className="ui-primary" disabled={!ready || busy || !!saved.error || !!storageError || (offline && !!snapshot)} onClick={() => void refresh()}>{busy ? <LoaderCircle className="tt-spin" size={17} aria-hidden="true" /> : snapshot ? <RotateCcw size={17} aria-hidden="true" /> : <Sparkles size={17} aria-hidden="true" />}{busy ? "Creating tips…" : snapshot ? "Refresh tips" : "Create tips"}</button>{busy && <button className="tt-cancel" type="button" onClick={cancel}>Cancel</button>}</div>
    </section>

    {!ready && <p className="tt-notice" role="status"><LoaderCircle className="tt-spin" size={17} aria-hidden="true" />Loading saved tips…</p>}
    {busy && <p className="tt-notice" role="status">Finding practical ideas for your home…</p>}
    {offline && <p className="tt-notice" role="status"><WifiOff size={16} aria-hidden="true" />Offline · saved tips are available.</p>}
    {saved.error && <p className="ui-error" role="alert">{saved.error}</p>}
    {storageError && <p className="ui-error" role="alert">{storageError}</p>}
    {error && <div className="tt-error" role="alert"><TriangleAlert size={17} aria-hidden="true" /><div><p>{error}</p><button type="button" disabled={busy} onClick={() => void refresh()}>Try again</button></div></div>}
    {message && <p className="tt-notice" role="status"><Check size={16} aria-hidden="true" />{message}</p>}

    {ready && household.bills.length > 0 && <BillForecastPanel forecast={forecast} stale={stale || (!!snapshot && !snapshot.forecast && forecast.status === "ready")} saved={!!snapshot?.forecast} />}
    {snapshot ? <>
      <div className="tt-list-heading"><div><h2 ref={heading} tabIndex={-1}>For your home</h2><p className={stale ? "tt-status is-stale" : "tt-status"}>{stale ? <TriangleAlert size={14} aria-hidden="true" /> : snapshot.source === "gemini" ? <Sparkles size={14} aria-hidden="true" /> : <Check size={14} aria-hidden="true" />}{stale ? "Records changed · refresh your tips" : snapshot.context.sample ? "Sample tips" : snapshot.source === "gemini" ? "AI tips · based on your records" : "Basic tips · based on your records"}</p></div><div className="tt-filters" role="group" aria-label="Filter tips">{(["all", "appliance", "bill"] as const).map(value => <button type="button" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value === "all" ? "All tips" : value === "appliance" ? "Appliances" : "Bills"}</button>)}</div></div>
      <TipsList tips={snapshot.tips} filter={filter} sample={snapshot.origin === "sample"} />
      <details className="tt-about"><summary>About these tips<ChevronDown size={15} aria-hidden="true" /></summary><p>Created <time dateTime={snapshot.generatedAt}>{dateLabel(snapshot.generatedAt)}</time> · {snapshot.context.applianceCount} appliances · {snapshot.context.billCount} bills.</p><p>{snapshot.source === "gemini" ? "Gemini writes the advice. Recorded facts and estimates come from your saved inputs." : "Basic suggestions from your saved inputs. Refresh online for AI tips."}</p>{snapshot.context.sample && <p>Includes sample records. These are examples only.</p>}{!!snapshot.context.limitations.length && <ul>{snapshot.context.limitations.map(limitation => <li key={limitation}>{limitation}</li>)}</ul>}</details>
      <Link className="tt-next" href="/simulator"><Lightbulb size={21} aria-hidden="true" /><span>Try a change in Watt-If</span><ArrowUpRight size={19} aria-hidden="true" /></Link>
      <details className="tt-setup"><summary>Home setup<ChevronDown size={15} aria-hidden="true" /></summary><TipsSetupReview /></details>
    </> : ready ? <section className="tt-empty"><Lightbulb aria-hidden="true" /><h2>Your next small change starts here</h2><p>Create tips from your saved bills and appliances.</p></section> : null}
  </PageShell>;
}
