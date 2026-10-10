"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Camera, Check, ChevronRight, CircleCheck, Keyboard, Plus, Upload, WifiOff, X } from "lucide-react";
import PageShell from "@/features/dashboard/components/PageShell";
import { usePreviewHousehold } from "@/features/dashboard/use-preview-household";
import { dailyApplianceKwh, effectiveRate, pesos, type PreviewAppliance } from "@/features/dashboard/preview-data";
import NameplateReview, { type NameplateSource } from "./nameplate-review";
import { blankNameplate, nameplateEstimate, type NameplateDraft } from "../nameplate-preview";

export default function ApplianceRegistrationScreen() {
  const { household, update, ready, storageError } = usePreviewHousehold();
  const [phase, setPhase] = useState<"input" | "review" | "saved">("input");
  const [source, setSource] = useState<NameplateSource>({ kind: "manual" });
  const [initial, setInitial] = useState<NameplateDraft>(blankNameplate);
  const [saved, setSaved] = useState<PreviewAppliance | null>(null);
  const [replaced, setReplaced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [offline, setOffline] = useState(false);
  const upload = useRef<HTMLInputElement>(null);
  const capture = useRef<HTMLInputElement>(null);
  const sheet = useRef<HTMLDialogElement>(null);
  const blobUrl = useRef("");
  const request = useRef(0);
  const stageHeading = useRef<HTMLHeadingElement>(null);
  const rate = effectiveRate(household.bills);

  useEffect(() => {
    const connectivity = () => setOffline(!navigator.onLine);
    connectivity(); window.addEventListener("online", connectivity); window.addEventListener("offline", connectivity);
    return () => { window.removeEventListener("online", connectivity); window.removeEventListener("offline", connectivity); request.current++; if (blobUrl.current) URL.revokeObjectURL(blobUrl.current); };
  }, []);
  useEffect(() => { if (phase !== "input") stageHeading.current?.focus(); }, [phase]);

  function releasePhoto() { if (blobUrl.current) URL.revokeObjectURL(blobUrl.current); blobUrl.current = ""; }
  function startOver() {
    request.current++; releasePhoto(); setSource({ kind: "manual" });
    setLoading(false); setPhase("input"); setError(""); setSaved(null); setInitial(blankNameplate);
  }
  function manual() { releasePhoto(); setError(""); setSource({ kind: "manual" }); setPhase("review"); }

  async function chooseFile(file?: File) {
    if (upload.current) upload.current.value = ""; if (capture.current) capture.current.value = "";
    if (!file || !ready || loading) return;
    setError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setError("Choose a JPG, PNG, or WebP image of the nameplate."); return; }
    if (file.size === 0 || file.size > 10 * 1024 * 1024) { setError("Choose an image up to 10 MB."); return; }
    setLoading(true); const current = ++request.current; const url = URL.createObjectURL(file);
    try {
      const image = new window.Image(); image.src = url; await image.decode();
      if (current !== request.current) { URL.revokeObjectURL(url); return; }
      releasePhoto(); blobUrl.current = url; setSource({ kind: "photo", name: file.name, url }); if (phase === "input" && !initial.name) setInitial(blankNameplate); setPhase("review");
    } catch { URL.revokeObjectURL(url); if (current === request.current) setError("This image could not be opened. Try a clearer photo or enter the details manually."); }
    finally { if (current === request.current) setLoading(false); }
  }
  function save(appliance: Omit<PreviewAppliance, "id">, replacement?: string) {
    const record = { ...appliance, id: replacement ?? crypto.randomUUID() };
    const appliances = replacement ? household.appliances.map(item => item.id === replacement ? record : item) : [...household.appliances, record];
    if (update({ appliances })) { setSaved(record); setReplaced(Boolean(replacement)); setPhase("saved"); }
  }

  const stage = phase === "input" ? 0 : phase === "review" ? 1 : 2;
  const choices = [
    { id: "camera", label: "Take photo", hint: "Snap the nameplate", Icon: Camera, run: () => capture.current?.click() },
    { id: "upload", label: "Upload photo", hint: "Pick from your gallery", Icon: Upload, run: () => upload.current?.click() },
    { id: "manual", label: "Enter manually", hint: "Type the wattage", Icon: Keyboard, run: manual },
  ];
  return <PageShell active="Appliances" className="np-page">
    <div className="np-toolbar"><Link href="/appliances"><ArrowLeft size={17} aria-hidden="true" />Back to appliances</Link></div>
    <ol className="np-steps" aria-label="Appliance registration progress">{["Choose input", "Review details", "Saved"].map((label, index) => <li key={label} aria-current={index === stage ? "step" : undefined} className={index < stage ? "is-done" : index === stage ? "is-current" : ""}><span>{index < stage ? <Check aria-hidden="true" /> : index + 1}</span>{label}</li>)}</ol>
    {phase !== "input" && <h2 className="ws-sr-only" ref={stageHeading} tabIndex={-1}>{phase === "review" ? "Review appliance details" : "Appliance saved"}</h2>}
    {phase === "input" && <>
      {offline && <div className="np-note is-offline" role="status"><WifiOff aria-hidden="true" /><p><strong>You’re offline.</strong>Photo review, manual entry, and saved calculations work locally.</p></div>}
      <section className="ui-panel np-start" aria-labelledby="np-start-heading">
        <Image className="np-start-bee" src="/assets/branding/wattsnap-bee-point.png" alt="" width={160} height={160} sizes="(min-width: 600px) 104px, 80px" />
        <div className="np-start-copy"><h2 id="np-start-heading">Track a new device</h2><p>Snap its label or type it in.</p></div>
        <button type="button" className="ui-primary np-start-button" aria-haspopup="dialog" disabled={!ready || loading} onClick={() => sheet.current?.showModal()}><Plus size={20} aria-hidden="true" />Add device</button>
      </section>
      <dialog ref={sheet} className="np-sheet" aria-labelledby="np-sheet-heading" onClick={event => { if (event.target === event.currentTarget) sheet.current?.close(); }}><div className="np-sheet-body">
        <div className="np-sheet-head"><h2 id="np-sheet-heading">How do you want to add it?</h2><button type="button" className="np-sheet-close" aria-label="Close" onClick={() => sheet.current?.close()}><X size={20} aria-hidden="true" /></button></div>
        <div className="np-sheet-options">{choices.map(({ id, label, hint, Icon, run }) => <button key={id} type="button" className={`np-sheet-option is-${id}`} aria-label={label} aria-describedby={`np-sheet-${id}`} disabled={!ready || loading} onClick={() => { sheet.current?.close(); run(); }}><span className="np-sheet-icon"><Icon aria-hidden="true" /></span><span className="np-sheet-copy"><strong>{label}</strong><small id={`np-sheet-${id}`}>{hint}</small></span><ChevronRight className="np-sheet-chevron" aria-hidden="true" /></button>)}</div>
        <small>Photos: JPG, PNG or WebP · up to 10 MB</small>
      </div></dialog>

      {loading && <div className="np-loading" role="status"><span aria-hidden="true" />Opening your photo…<button type="button" onClick={startOver}>Cancel</button></div>}
      {!ready && <p className="ui-helper" role="status">Loading your saved appliances…</p>}{error && <p className="ui-error" role="alert">{error}</p>}{storageError && <p className="ui-error" role="alert">{storageError}</p>}
    </>}
      <input ref={upload} type="file" className="ws-sr-only" tabIndex={-1} aria-hidden="true" disabled={!ready || loading} accept="image/jpeg,image/png,image/webp" onChange={event => void chooseFile(event.target.files?.[0])} />
      <input ref={capture} type="file" capture="environment" className="ws-sr-only" tabIndex={-1} aria-hidden="true" disabled={!ready || loading} accept="image/jpeg,image/png,image/webp" onChange={event => void chooseFile(event.target.files?.[0])} />
    {error && phase !== "input" && <p className="ui-error" role="alert">{error}</p>}
    {phase === "review" && <NameplateReview initial={initial} source={source} appliances={household.appliances} rate={rate} ready={ready} offline={offline} storageError={storageError} onRestart={() => { releasePhoto(); setSource({ kind: "manual" }); setPhase("input"); }} onDraftChange={setInitial} onReplaceSource={() => upload.current?.click()} onRemoveSource={() => { releasePhoto(); setSource({ kind: "manual" }); }} onSave={save} />}
    {phase === "saved" && saved && <section className="ui-panel np-saved" aria-labelledby="np-saved-heading"><span className="np-saved-icon"><CircleCheck aria-hidden="true" /></span><h2 id="np-saved-heading">{replaced ? "Appliance updated!" : "Appliance added!"}</h2><p>{saved.name}{saved.model ? ` · ${saved.model}` : ""}</p>{saved.source === "sample" && <span className="np-sample-badge">Sample appliance · UI preview</span>}{saved.wattageBasis === "approximate" && <p className="np-approximate">Wattage is your approximate input.</p>}<dl><div><dt>Rated power</dt><dd>{saved.watts.toLocaleString()} W</dd></div><div><dt>Daily use</dt><dd>{saved.hours} hrs · ×{saved.quantity}</dd></div><div><dt>Period</dt><dd>{saved.days ?? 30} days</dd></div><div><dt>Estimated use</dt><dd>{nameplateEstimate(saved).toFixed(2)} kWh</dd></div></dl><p className="np-saved-cost">{rate > 0 && <>≈ {pesos(nameplateEstimate(saved) * rate)} for this period · </>}{dailyApplianceKwh(saved).toFixed(2)} kWh/day</p><p className="ui-helper">Reviewed values are saved locally. Estimates cover this appliance only.</p><div className="np-saved-actions"><Link className="ui-primary" href="/appliances">View appliances</Link><button type="button" className="ui-secondary" onClick={startOver}>Add another</button></div></section>}
  </PageShell>;
}
