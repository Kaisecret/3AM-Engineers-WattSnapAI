"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Camera, Check, CircleCheck, Keyboard, ScanText, Upload, WifiOff } from "lucide-react";
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
  return <PageShell title="Add appliance" subtitle="Review its nameplate and your usage" active="Appliances" className="np-page">
    <div className="np-toolbar"><Link href="/appliances"><ArrowLeft size={17} aria-hidden="true" />Back to appliances</Link><span>Saved on this device</span></div>
    <ol className="np-steps" aria-label="Appliance registration progress">{["Choose input", "Review details", "Saved"].map((label, index) => <li key={label} aria-current={index === stage ? "step" : undefined} className={index < stage ? "is-done" : index === stage ? "is-current" : ""}><span>{index < stage ? <Check aria-hidden="true" /> : index + 1}</span>{label}</li>)}</ol>
    {phase !== "input" && <h2 className="ws-sr-only" ref={stageHeading} tabIndex={-1}>{phase === "review" ? "Review appliance details" : "Appliance saved"}</h2>}
    {phase === "input" && <>
      <section className="np-hero"><div><span className="np-eyebrow">GET TO KNOW YOUR ENERGY USE</span><h2>A small label.<br />A clearer estimate.</h2><p>Use the power rating on your appliance, then review how many hours and days you use it.</p></div><Image src="/assets/branding/actions-5.png" alt="" width={260} height={260} sizes="(min-width: 900px) 180px, 112px" priority /></section>
      {offline && <div className="np-note is-offline" role="status"><WifiOff aria-hidden="true" /><p><strong>You’re offline.</strong>Photo review, manual entry, and saved calculations work locally.</p></div>}
      <div className="np-input-grid">
        <section className="ui-panel np-upload-panel" aria-labelledby="np-upload-heading"><span className="np-input-icon"><ScanText aria-hidden="true" /></span><h2 id="np-upload-heading">Start with a nameplate photo</h2><p>Upload a clear image with the model and power rating visible. Copy its values into the review form.</p><div className="np-input-actions"><button type="button" className="ui-primary" disabled={!ready || loading} onClick={() => upload.current?.click()}><Upload size={18} aria-hidden="true" />Upload photo</button><button type="button" className="ui-secondary" disabled={!ready || loading} onClick={() => capture.current?.click()}><Camera size={18} aria-hidden="true" />Take photo</button></div><small>JPG, PNG or WebP · up to 10 MB. Taking a photo uses your device’s photo picker.</small><p className="np-preview-hint">Keep the photo beside the form and copy its printed values.</p></section>
        <section className="ui-panel np-manual-panel" aria-labelledby="np-manual-heading"><span className="np-input-icon"><Keyboard aria-hidden="true" /></span><h2 id="np-manual-heading">Enter the details yourself</h2><p>Choose an appliance type and enter its rated power. Unknown wattage stays blank until you check it.</p><button type="button" className="ui-secondary" disabled={!ready || loading} onClick={manual}>Enter manually</button></section>
      </div>

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
