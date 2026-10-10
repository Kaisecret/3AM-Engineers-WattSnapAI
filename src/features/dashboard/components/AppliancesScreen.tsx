"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Pencil, Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import { applianceIcons as kindIcons } from "@/features/appliance-registration/components/appliance-picker";
import ApplianceDialog, { AddApplianceSheet, type AddChoice, type AppliancePhoto } from "@/features/appliance-registration/components/ApplianceDialog";
import ConfirmRecordRemoval from "@/components/ui/ConfirmRecordRemoval";
import PageShell from "./PageShell";
import { usePreviewHousehold } from "../use-preview-household";
import { dailyApplianceKwh, effectiveRate, guessApplianceKind, latestBill, monthName, pesos, type PreviewAppliance } from "../preview-data";
import { billCoverage } from "../bill-coverage";

const kindOf = (item: PreviewAppliance) => item.kind ?? guessApplianceKind(item.name);
const trim = (value: number) => Number(value.toFixed(2)).toString();
const photoTypes = ["image/jpeg", "image/png", "image/webp"];

/** `startAdding` (the /appliances/new link) opens the Add popup straight away. */
export default function AppliancesScreen({ startAdding = false }: { startAdding?: boolean }) {
  const { household, update, ready, storageError } = usePreviewHousehold();
  const [form, setForm] = useState<{ item?: PreviewAppliance } | null>(null);
  const [photo, setPhoto] = useState<AppliancePhoto | undefined>();
  const [removing, setRemoving] = useState<PreviewAppliance | null>(null);
  const [highlight, setHighlight] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const sheet = useRef<HTMLDialogElement>(null);
  const upload = useRef<HTMLInputElement>(null);
  const capture = useRef<HTMLInputElement>(null);
  const started = useRef(false);
  const rate = effectiveRate(household.bills);
  const items = [...household.appliances].sort((a, b) => dailyApplianceKwh(b) - dailyApplianceKwh(a));
  const totalDaily = items.reduce((sum, item) => sum + dailyApplianceKwh(item), 0);
  const latest = latestBill(household.bills);
  const coverage = latest ? billCoverage(totalDaily * 30, latest.kwh) : null;

  useEffect(() => {
    if (!startAdding || !ready || started.current) return;
    started.current = true; sheet.current?.showModal();
  }, [startAdding, ready]);
  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo.url); }, [photo]);
  useEffect(() => {
    if (!highlight) return;
    document.getElementById(`ap-item-${highlight}`)?.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    const timer = window.setTimeout(() => setHighlight(""), 2400);
    return () => window.clearTimeout(timer);
  }, [highlight]);

  function startAdd() { setError(""); setMessage(""); sheet.current?.showModal(); }
  function choose(choice: AddChoice) {
    if (choice === "manual") { setPhoto(undefined); setForm({}); }
    else (choice === "camera" ? capture : upload).current?.click();
  }
  async function choosePhoto(file?: File) {
    if (upload.current) upload.current.value = ""; if (capture.current) capture.current.value = "";
    if (!file) return;
    if (!photoTypes.includes(file.type)) { setError("Use a JPG, PNG or WebP photo."); return; }
    if (file.size === 0 || file.size > 10 * 1024 * 1024) { setError("Use a photo up to 10 MB."); return; }
    const url = URL.createObjectURL(file);
    try {
      const image = new window.Image(); image.src = url; await image.decode();
      setError(""); setPhoto({ url, name: file.name }); setForm(current => current ?? {});
    } catch { URL.revokeObjectURL(url); setError("That photo could not be opened. Try another one or type it in."); }
  }
  function edit(item: PreviewAppliance) { setError(""); setMessage(""); setPhoto(undefined); setForm({ item }); }

  function save(appliance: Omit<PreviewAppliance, "id">) {
    const editing = form?.item;
    const record = editing ? { ...editing, ...appliance } : { ...appliance, source: "manual" as const, id: crypto.randomUUID() };
    const appliances = editing ? household.appliances.map(item => item.id === editing.id ? record : item) : [...household.appliances, record];
    if (!update({ appliances })) return false;
    setMessage(`${record.name} ${editing ? "updated" : "added"}.`); setHighlight(record.id);
    return true;
  }

  function remove(item: PreviewAppliance) {
    if (update({ appliances: household.appliances.filter(appliance => appliance.id !== item.id) })) { setMessage(`${item.name} removed.`); return true; } return false;
  }

  return <PageShell title="Appliances" subtitle="See how your appliances use energy" active="Appliances" className="ap-page">
    <section className="ap-summary" aria-labelledby="ap-summary-title">
      <div className="ap-summary-copy">
        <p className="ap-eyebrow">Monthly estimate</p>
        <h2 id="ap-summary-title"><span>{(totalDaily * 30).toFixed(1)}</span> kWh / month</h2>
        <p className="ap-summary-cost">{rate > 0 ? `≈ ${pesos(totalDaily * 30 * rate)} per month` : "Add a bill to see the cost."}</p>
        <button type="button" className="ap-add" aria-haspopup="dialog" disabled={!ready} onClick={startAdd}><Plus aria-hidden="true" /> Add appliance</button>
      </div>
      <dl className="ap-summary-stats">
        <div><dt>Appliances</dt><dd>{items.reduce((sum, item) => sum + item.quantity, 0)}</dd></div>
        <div><dt>Per day</dt><dd>{totalDaily.toFixed(2)} <small>kWh</small></dd></div>
      </dl>
      <Image className="ap-summary-art" src="/assets/branding/actions-5.png" alt="" width={260} height={260} sizes="(min-width: 900px) 170px, 112px" />
    </section>

    {coverage && latest && <p className={`ap-coverage is-${coverage.status}`}>{coverage.status === "over" ? <>Your devices add up to more than your {monthName(latest.month)} bill ({(totalDaily * 30).toFixed(0)} vs {latest.kwh} kWh). Check the hours you entered.</> : <>Your devices explain {coverage.percent}% of your {monthName(latest.month)} bill ({(totalDaily * 30).toFixed(0)} of {latest.kwh} kWh).{coverage.status === "under" && " Add the rest to see the full picture."}</>}<span className="ap-coverage-bar" aria-hidden="true"><i style={{ width: `${Math.min(coverage.percent, 100)}%` }} /></span></p>}

    {items.some(item => item.source === "sample" || item.id.startsWith("sample-")) && <p className="ap-sample-note">Your list includes sample appliances for this UI preview. Add your own readings or edit their values to explore the estimates.</p>}

    <section className="ui-panel ap-simulator" aria-labelledby="ap-simulator-heading"><span><SlidersHorizontal aria-hidden="true" /></span><div><h2 id="ap-simulator-heading">What could you save?</h2><p>Try changes in Watt-If.</p></div><Link href="/simulator" className="ap-simulator-link"><span className="ws-sr-only">Open simulator</span><ChevronRight size={20} aria-hidden="true" /></Link></section>

    <section className="ui-panel ap-list-panel" aria-labelledby="ap-list-title">
      <div className="ui-panel-heading"><div><h2 id="ap-list-title">Top energy users</h2><p>Sorted by estimated monthly use</p></div><span className="ui-count">{items.length} {items.length === 1 ? "entry" : "entries"}</span></div>
      {items.length ? <ul className="ap-list">
        {items.map(item => { const kind = kindOf(item); const Icon = kindIcons[kind]; const daily = dailyApplianceKwh(item); const share = totalDaily ? daily / totalDaily * 100 : 0; return <li key={item.id} id={`ap-item-${item.id}`} className={item.id === highlight ? "is-new" : undefined}>
          <span className={`ap-icon is-${kind}`}><Icon aria-hidden="true" /></span>
          <div className="ap-item-main">
            <div className="ap-item-top"><h3>{item.name}</h3><strong>{(daily * 30).toFixed(1)} <small>kWh/mo</small></strong></div>
            <p>{trim(item.watts)} W · {trim(item.hours)} hrs/day{item.quantity > 1 && ` · ×${item.quantity}`}{rate > 0 && <span>≈ {pesos(daily * 30 * rate)}/30 days</span>}</p>
            <p className="ap-item-detail">{item.model && `${item.model} · `}{item.source === "sample" || item.id.startsWith("sample-") ? "Sample" : "Manual"} · {item.wattageBasis === "nameplate" ? "Nameplate watts" : "Approximate watts"}</p>
            {item.days !== undefined && item.days !== 30 && <p className="ap-item-detail">{item.days} days selected · {(daily * item.days).toFixed(2)} kWh for this period</p>}
            <div className="ap-share" role="img" aria-label={`${share.toFixed(0)} percent of estimated appliance use`}><span style={{ width: `${share > 0 ? Math.max(share, 2) : 0}%` }} /><em>{share.toFixed(0)}%</em></div>
          </div>
          <div className="ap-item-actions">
            <button type="button" className="ui-icon-button ap-edit" disabled={!ready} aria-label={`Edit ${item.name}`} onClick={() => edit(item)}><Pencil size={16} /></button>
            <button type="button" className="ui-icon-button" disabled={!ready} aria-label={`Remove ${item.name}`} onClick={() => setRemoving(item)}><Trash2 size={16} /></button>
          </div>
        </li>; })}
      </ul> : <div className="ap-empty"><Image src="/assets/branding/actions-7.png" alt="" width={200} height={200} sizes="120px" /><h3>No appliances yet</h3><p>Add one to see what uses the most energy.</p><button type="button" className="ui-primary" aria-haspopup="dialog" disabled={!ready} onClick={startAdd}><Plus size={18} aria-hidden="true" /> Add appliance</button></div>}
      {items.length > 0 && <p className="ui-helper">Estimates use watts × hours × quantity over 30 days and may differ from your meter.</p>}
    </section>
    <ConfirmRecordRemoval name={removing?.name ?? null} error={storageError} onKeep={() => setRemoving(null)} onRemove={() => removing ? remove(removing) : false} />
    {message && <p className="ui-success" role="status">{message}</p>}{storageError && <p className="ui-error" role="alert">{storageError}</p>}

    {error && <p className="ui-error" role="alert">{error}</p>}

    <AddApplianceSheet ref={sheet} disabled={!ready} onChoose={choose} />
    <input ref={upload} type="file" className="ws-sr-only" tabIndex={-1} aria-hidden="true" accept={photoTypes.join(",")} onChange={event => void choosePhoto(event.target.files?.[0])} />
    <input ref={capture} type="file" capture="environment" className="ws-sr-only" tabIndex={-1} aria-hidden="true" accept={photoTypes.join(",")} onChange={event => void choosePhoto(event.target.files?.[0])} />
    <ApplianceDialog open={!!form} item={form?.item} photo={form?.item ? undefined : photo} appliances={household.appliances} rate={rate} ready={ready} storageError={storageError}
      onSave={save} onClose={() => { setForm(null); setPhoto(undefined); }} onChangePhoto={() => upload.current?.click()} onRemovePhoto={() => setPhoto(undefined)} />
  </PageShell>;
}
