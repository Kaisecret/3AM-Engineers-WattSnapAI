"use client";
import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUp, Camera, Check, ChevronRight, CircleCheck, ImageUp, Keyboard, Lightbulb, ScanText, Sparkles, Upload, X, Zap, ZapOff } from "lucide-react";
import PageShell from "./PageShell";
import { BillArt } from "./DashboardArtwork";
import { usePreviewHousehold } from "../use-preview-household";
import { billMonth, compareWithPrevious, currentMonth, dueDateLabel, latestBill, monthName, pesos, sampleScanReading, shiftMonth, sortBillsByMonth, type PreviewBill } from "../preview-data";
import BillReview, { type BillReviewDraft, type BillPreviewSource } from "@/features/bill-scanner/components/bill-review";
import { previewProviderName } from "@/features/household-profile/provider-preview";

type Phase = "camera" | "scanning" | "review" | "saved";
type CameraState = "idle" | "starting" | "live" | "blocked" | "unavailable";
type Reading = Omit<PreviewBill, "id">;

const scanSteps = ["Preparing the sample preview", "Showing a billing month", "Showing an example kWh value", "Showing an example amount", "Preparing the review fields"];
const acceptedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const sourceLabels = { scan: "Scanned", manual: "Manual", sample: "Sample" };

const toDraft = (reading: Reading): BillReviewDraft => ({ month: reading.month, kwh: String(reading.kwh), amount: reading.amount.toFixed(2), dueDate: reading.dueDate ?? "", periodStart: "", periodEnd: "" });
const shortPeriod = (month: string) => new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`));

function ChangeBadge({ percent, month }: { percent: number; month: string }) {
  const lower = percent <= 0;
  return <span className={`scan-change ${lower ? "is-lower" : "is-higher"}`}>{lower ? <ArrowDown aria-hidden="true" /> : <ArrowUp aria-hidden="true" />}{Math.abs(percent).toFixed(0)}% {lower ? "lower" : "higher"} than {monthName(month)}</span>;
}

export default function ScanScreen() {
  const { household, update, ready, storageError } = usePreviewHousehold();
  const [phase, setPhase] = useState<Phase>("camera");
  const [camera, setCamera] = useState<CameraState>("idle");
  const [torch, setTorch] = useState(false);
  const [image, setImage] = useState<{ src: string; fit: "cover" | "contain" } | null>(null);
  const [reading, setReading] = useState<Reading | null>(null);
  const [mode, setMode] = useState<"scan" | "manual">("scan");
  const [draft, setDraft] = useState<BillReviewDraft>({ month: "", kwh: "", amount: "", dueDate: "", periodStart: "", periodEnd: "" });
  const [source, setSource] = useState<BillPreviewSource | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [offline, setOffline] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<PreviewBill | null>(null);
  const [flash, setFlash] = useState(0);
  const [dragging, setDragging] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const request = useRef(0);
  const uploadRequest = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const objectUrl = useRef("");
  const preview = reading ?? sampleScanReading(household.bills, new Date(), () => 0.5);

  const releaseCamera = useCallback(() => {
    request.current += 1;
    stream.current?.getTracks().forEach(track => track.stop());
    stream.current = null;
    setTorch(false);
  }, []);

  const startCamera = useCallback(async () => {
    releaseCamera();
    const id = request.current;
    if (!navigator.mediaDevices?.getUserMedia) { setCamera("unavailable"); return; }
    setCamera("starting");
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } } });
      // A newer request or leaving the page makes this stream stale.
      if (id !== request.current) { media.getTracks().forEach(track => track.stop()); return; }
      stream.current = media;
      setCamera("live");
    } catch (reason) {
      if (id !== request.current) return;
      setCamera(reason instanceof DOMException && (reason.name === "NotAllowedError" || reason.name === "SecurityError") ? "blocked" : "unavailable");
    }
  }, [releaseCamera]);

  const stopCamera = useCallback(() => { releaseCamera(); setCamera("idle"); }, [releaseCamera]);

  // Camera permission is requested only after choosing the camera action.
  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      releaseCamera(); uploadRequest.current += 1;
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
      window.removeEventListener("online", sync); window.removeEventListener("offline", sync);
    };
  }, [releaseCamera]);

  useEffect(() => {
    const element = video.current;
    if (camera === "live" && element && stream.current && element.srcObject !== stream.current) {
      element.srcObject = stream.current;
      void element.play().catch(() => undefined);
    }
  }, [camera, phase]);

  useEffect(() => {
    if (phase !== "scanning") return;
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 1200 : 4200;
    const start = performance.now();
    let finish: number | undefined;
    const timer = window.setInterval(() => {
      const value = Math.min(100, (performance.now() - start) / duration * 100);
      setProgress(value);
      if (value >= 100) { window.clearInterval(timer); finish = window.setTimeout(() => setPhase("review"), 500); }
    }, 60);
    return () => { window.clearInterval(timer); if (finish) window.clearTimeout(finish); };
  }, [phase]);

  function beginScan() {
    const next = sampleScanReading(household.bills, new Date(), () => 0.5);
    setReading(next); setDraft(toDraft(next)); setMode("scan"); setError(""); setProgress(0); setPhase("scanning");
  }

  function capture() {
    uploadRequest.current += 1; setLoadingFile(false);
    setFlash(value => value + 1);
    const element = video.current;
    if (camera === "live" && element?.videoWidth) {
      const canvas = document.createElement("canvas");
      canvas.width = element.videoWidth; canvas.height = element.videoHeight;
      canvas.getContext("2d")?.drawImage(element, 0, 0);
      const photo = canvas.toDataURL("image/jpeg", 0.86);
      setImage({ src: photo, fit: "cover" });
      setSource({ name: "Camera photo", kind: "image", url: photo });
    } else { setImage(null); setSource({ name: "Sample electricity bill", kind: "sample" }); }
    stopCamera();
    beginScan();
  }

  async function chooseFile(file?: File) {
    setError("");
    if (!file) return;
    if (fileInput.current) fileInput.current.value = "";
    if (!acceptedTypes.includes(file.type)) { setError("Choose a JPG, PNG, WebP, or PDF bill."); return; }
    if (file.size > 10 * 1024 * 1024) { setError("Choose a file up to 10 MB."); return; }
    const uploadId = ++uploadRequest.current;
    const nextUrl = URL.createObjectURL(file);
    setLoadingFile(true);
    if (file.type.startsWith("image/")) {
      const photo = new window.Image();
      photo.src = nextUrl;
      try { await photo.decode(); }
      catch {
        URL.revokeObjectURL(nextUrl);
        if (uploadId === uploadRequest.current) { setLoadingFile(false); setError("That image could not be opened. Try another photo or enter the bill manually."); }
        return;
      }
    }
    if (uploadId !== uploadRequest.current) { URL.revokeObjectURL(nextUrl); return; }
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = nextUrl;
    setImage(file.type.startsWith("image/") ? { src: nextUrl, fit: "contain" } : null);
    setSource({ name: file.name, kind: file.type.startsWith("image/") ? "image" : "pdf", url: nextUrl });
    setLoadingFile(false);
    stopCamera();
    beginScan();
  }

  function enterManually() {
    uploadRequest.current += 1; setLoadingFile(false);
    stopCamera();
    const latest = latestBill(household.bills);
    setDraft({ month: latest ? shiftMonth(latest.month, 1) : currentMonth(), kwh: "", amount: "", dueDate: "", periodStart: "", periodEnd: "" });
    setMode("manual"); setImage(null); setSource(null); setReading(null); setError(""); setPhase("review");
  }

  function restart() {
    uploadRequest.current += 1; setLoadingFile(false);
    setPhase("camera"); setImage(null); setSource(null); setSaved(null); setReading(null); setError(""); setProgress(0);
    if (objectUrl.current) { URL.revokeObjectURL(objectUrl.current); objectUrl.current = ""; }
    stopCamera();
  }

  async function toggleTorch() {
    const next = !torch;
    setTorch(next);
    try { await stream.current?.getVideoTracks()[0]?.applyConstraints({ advanced: [{ torch: next } as unknown as MediaTrackConstraintSet] }); }
    catch { /* Torch control is optional; many cameras do not offer it. */ }
  }

  function save(bill: Omit<PreviewBill, "id">) {
    const existing = household.bills.find(item => item.month === bill.month);
    const record: PreviewBill = { ...bill, provider: household.provider, id: existing?.id ?? crypto.randomUUID() };
    if (update({ bills: [...household.bills.filter(item => item.month !== bill.month), record] })) { setSaved(record); setError(""); setPhase("saved"); }
  }

  function onDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault(); setDragging(false);
    if (phase === "camera") void chooseFile(event.dataTransfer.files[0]);
  }

  const live = camera === "live" && phase === "camera";
  const step = Math.min(scanSteps.length - 1, Math.floor(progress / (100 / scanSteps.length)));
  const duplicate = phase === "review" ? household.bills.find(bill => bill.month === draft.month) : undefined;
  const savedChange = saved ? compareWithPrevious(household.bills, saved.month) : null;
  const recent = sortBillsByMonth(household.bills).slice(-3).reverse();
  const stage = phase === "camera" ? 0 : phase === "scanning" ? 1 : phase === "review" ? 2 : 3;
  const cameraMessage = loadingFile ? "Opening your file…" : camera === "blocked" ? "Camera access is blocked. Upload a photo or enter details manually." : camera === "unavailable" ? "No camera found. Upload a photo or enter details manually." : camera === "live" ? "Fit the whole bill inside the frame" : camera === "starting" ? "Opening your camera…" : "Try a sample bill, upload, or open your camera";
  const bubble = phase === "scanning" ? "Sample preview…" : phase === "camera" ? (live ? "Hold steady!" : "Let’s try an example!") : "Ready to review!";

  return (
    <PageShell title="Snap AI" subtitle="Scan your bill and add it to your monthly history" active="Snap AI" className="scan-page">
      <div className={`scan-app phase-${phase}${live ? " camera-live" : ""}${image ? " has-photo" : ""}`}>
        <section className={`scan-stage${dragging ? " is-dragging" : ""}`} aria-label="Bill scanner" onDragOver={event => { if (phase === "camera") { event.preventDefault(); setDragging(true); } }} onDragLeave={() => setDragging(false)} onDrop={onDrop}>
          <video ref={video} className={`scan-video${live ? " is-live" : ""}`} playsInline muted autoPlay aria-hidden="true" />
          {image && phase !== "camera" && <Image className={`scan-photo is-${image.fit}`} src={image.src} alt="Your bill photo" fill sizes="(min-width: 1200px) 50vw, 100vw" unoptimized />}
          <span className="scan-dots" aria-hidden="true" />

          <div className="scan-topbar">
            <Link href="/dashboard" className="scan-round" aria-label="Close scanner"><X aria-hidden="true" /></Link>
            <div className="scan-title"><strong>Snap AI</strong><span>Scan your electricity bill</span></div>
            {live ? <button type="button" className={`scan-round${torch ? " is-on" : ""}`} aria-label={torch ? "Turn flashlight off" : "Turn flashlight on"} aria-pressed={torch} onClick={toggleTorch}>{torch ? <Zap aria-hidden="true" /> : <ZapOff aria-hidden="true" />}</button> : <span className="scan-round is-ghost" aria-hidden="true"><Sparkles /></span>}
          </div>
          <p className="scan-preview-tag" role="note">{offline ? "Offline UI preview · manual entry available" : "UI preview · scanning shows sample values"}</p>

          <div className="scan-frame-wrap">
            <div className="scan-frame">
              {!image && !live && <div className="scan-frame-bill"><BillArt period={shortPeriod(preview.month)} kwh={String(preview.kwh)} amount={pesos(preview.amount)} due={preview.dueDate ? dueDateLabel(preview.dueDate) : "—"} /></div>}
              <i className="scan-corner is-tl" /><i className="scan-corner is-tr" /><i className="scan-corner is-bl" /><i className="scan-corner is-br" />
              <div className="scan-track" aria-hidden="true">
                <span className="scan-beam" />
                <span className="scan-cone" />
                <span className="scan-bot">
                  <span className="scan-bubble">{bubble}</span>
                  <Image src="/assets/branding/Cheerful Bee Robot Thumbs-Up.png" alt="" width={260} height={260} sizes="140px" priority />
                </span>
              </div>
              {phase === "scanning" && <>
                <span className="scan-sparkle is-one" aria-hidden="true" /><span className="scan-sparkle is-two" aria-hidden="true" /><span className="scan-sparkle is-three" aria-hidden="true" />
                {progress >= 38 && <span className="scan-chip is-month"><span><Check aria-hidden="true" /></span><span><small>Billing month</small><strong>{shortPeriod(preview.month)}</strong></span></span>}
                {progress >= 58 && <span className="scan-chip is-kwh"><span><Check aria-hidden="true" /></span><span><small>kWh used</small><strong>{preview.kwh} kWh</strong></span></span>}
                {progress >= 78 && <span className="scan-chip is-amount"><span><Check aria-hidden="true" /></span><span><small>Amount due</small><strong>{pesos(preview.amount)}</strong></span></span>}
              </>}
              {(phase === "review" || phase === "saved") && <span className="scan-done-badge" aria-hidden="true"><CircleCheck /></span>}
            </div>
          </div>

          {phase === "camera" && <p className="scan-hint" role="status">{cameraMessage}{(camera === "blocked" || camera === "unavailable" || camera === "idle") && <button type="button" onClick={() => void startCamera()}>{camera === "idle" ? "Open camera" : "Try camera again"}</button>}</p>}
          {phase === "camera" && error && <p className="scan-toast" role="alert">{error}</p>}

          {phase === "scanning" && <div className="scan-progress" role="status" aria-live="polite">
            <div className="scan-progress-top"><Sparkles aria-hidden="true" /><strong>{scanSteps[step]}…</strong><span>{Math.round(progress)}%</span></div>
            <div className="scan-progress-bar"><span style={{ width: `${progress}%` }} /></div>
            <small>Sample animation · no image extraction is performed</small>
          </div>}

          {phase === "camera" && <div className="scan-controls">
            <button type="button" className="scan-side" disabled={!ready || loadingFile} onClick={() => fileInput.current?.click()}><span><ImageUp aria-hidden="true" /></span>Upload</button>
            <button type="button" className="scan-shutter" disabled={!ready || loadingFile} aria-label={live ? "Capture bill photo" : "Scan the sample bill"} onClick={capture}><span /></button>
            <button type="button" className="scan-side" disabled={!ready || loadingFile} onClick={enterManually}><span><Keyboard aria-hidden="true" /></span>Type it</button>
            {live && <button type="button" className="scan-side scan-stop-camera" onClick={stopCamera}><span><X aria-hidden="true" /></span>Close camera</button>}
          </div>}

          {phase === "camera" && !live && <div className={`scan-placeholder${dragging ? " is-dragging" : ""}`}>
            <div className="scan-placeholder-art" aria-hidden="true">
              <span className="scan-placeholder-bill"><BillArt period={shortPeriod(preview.month)} kwh={String(preview.kwh)} amount={pesos(preview.amount)} due={preview.dueDate ? dueDateLabel(preview.dueDate) : "—"} /><i /></span>
              <Image className="scan-placeholder-bot" src="/assets/branding/Cheerful Bee Robot Thumbs-Up.png" alt="" width={260} height={260} sizes="150px" priority />
            </div>
            <h2>Drop your electricity bill here</h2>
            <p>Try the scan and review flow with sample values, or manually enter the details from your own bill.</p>
            <div className="scan-placeholder-actions">
              <button type="button" className="ui-primary" disabled={!ready || loadingFile} onClick={() => fileInput.current?.click()}><Upload size={18} aria-hidden="true" /> {loadingFile ? "Opening file…" : "Upload bill"}</button>
              <button type="button" className="ui-secondary" onClick={() => void startCamera()} disabled={camera === "starting"}><Camera size={18} aria-hidden="true" /> {camera === "starting" ? "Opening camera…" : "Use webcam"}</button>
            </div>
            <button type="button" className="scan-text-button" disabled={!ready || loadingFile} onClick={capture}><Sparkles size={16} aria-hidden="true" /> Try it with a sample bill</button>
            <span className="scan-file-note">JPG, PNG, WebP or PDF · up to 10 MB</span>
            {(camera === "blocked" || camera === "unavailable") && <p className="scan-inline-note">{camera === "blocked" ? "Webcam access is blocked in this browser." : "No webcam was found."} You can still upload a bill.</p>}
            {error && <p className="ui-error" role="alert">{error}</p>}
          </div>}
          <input ref={fileInput} className="ws-sr-only" type="file" disabled={!ready || loadingFile} accept="image/jpeg,image/png,image/webp,application/pdf" tabIndex={-1} aria-hidden="true" onChange={event => void chooseFile(event.target.files?.[0])} />
          {flash > 0 && <span key={flash} className="scan-flash" aria-hidden="true" />}
        </section>

        <section className="scan-panel" aria-label="Scan details">
          <ol className="scan-steps" aria-label="Scan progress">
            {["Capture", "Sample preview", "Review & save"].map((label, index) => <li key={label} className={index < stage ? "is-done" : index === stage ? "is-current" : ""} aria-current={index === stage ? "step" : undefined}><span>{index < stage ? <Check aria-hidden="true" /> : index + 1}</span>{label}</li>)}
          </ol>

          {phase === "camera" && <div className="scan-intro">
            <h2>How Snap AI works</h2>
            <ol className="scan-how">
              <li><span><Camera aria-hidden="true" /></span><div><strong>Snap or upload</strong><p>Take a clear photo of your whole bill, or upload one.</p></div></li>
              <li><span><Sparkles aria-hidden="true" /></span><div><strong>Preview a sample reading</strong><p>Example values show where AI results will appear.</p></div></li>
              <li><span><CircleCheck aria-hidden="true" /></span><div><strong>Review &amp; save</strong><p>Fix anything, then it joins your month-by-month history.</p></div></li>
            </ol>
            <div className="scan-tips"><h3><Lightbulb aria-hidden="true" /> Tips for a clear scan</h3><ul><li>Lay the bill flat in good light</li><li>Keep all four corners in view</li><li>Avoid glare and shadows</li></ul></div>
            <button type="button" className="ui-secondary scan-manual" disabled={!ready} onClick={enterManually}><Keyboard size={18} aria-hidden="true" /> Enter bill manually</button>
            {recent.length > 0 && <div className="scan-recent"><div className="scan-recent-head"><h3>Recently added</h3><Link href="/bills">View all <ChevronRight size={15} aria-hidden="true" /></Link></div>
              {recent.map(bill => <div key={bill.id} className="scan-recent-row"><span className="scan-recent-icon"><ScanText aria-hidden="true" /></span><div><strong>{billMonth(bill.month)}</strong><small>{bill.kwh} kWh · {pesos(bill.amount)}</small></div><em className={`scan-source is-${bill.source ?? "manual"}`}>{sourceLabels[bill.source ?? "manual"]}</em></div>)}
            </div>}
          </div>}

          {phase === "scanning" && <div className="scan-reading">
            <h2>Preparing the sample reading</h2>
            <ul>{scanSteps.map((label, index) => <li key={label} className={index < step || progress >= 100 ? "is-done" : index === step ? "is-current" : ""}><span>{index < step || progress >= 100 ? <Check aria-hidden="true" /> : <i />}</span>{label}</li>)}</ul>
          </div>}

          {phase === "review" && <BillReview mode={mode} draft={draft} original={reading} source={source} provider={previewProviderName(household.provider)} duplicate={duplicate} offline={offline} ready={ready} storageError={storageError} onChange={setDraft} onRestart={restart} onSave={save} />}

          {phase === "saved" && saved && <div className="scan-saved" role="status">
            <Image className="scan-saved-art" src="/assets/branding/actions-3.png" alt="" width={240} height={240} sizes="150px" />
            <h2>Added to your history!</h2>
            <p>Your {billMonth(saved.month)} {saved.source === "sample" ? "sample bill" : "bill"} is saved in this browser.</p>
            {saved.source === "sample" && <p className="scan-saved-sample">Sample record · not extracted from an uploaded document</p>}
            <div className="scan-saved-card">
              <div><small>Billing month</small><strong>{billMonth(saved.month)}</strong></div>
              <div><small>Energy used</small><strong>{saved.kwh} kWh</strong></div>
              <div><small>Amount due</small><strong>{pesos(saved.amount)}</strong></div>
              {saved.dueDate && <div><small>Due date</small><strong>{dueDateLabel(saved.dueDate)}</strong></div>}
              {saved.periodStart && saved.periodEnd && <div className="scan-saved-wide"><small>Billing period</small><strong>{dueDateLabel(saved.periodStart)} – {dueDateLabel(saved.periodEnd)}</strong></div>}
              <div><small>Provider snapshot</small><strong>{previewProviderName(saved.provider)}</strong></div>
            </div>
            {savedChange && <ChangeBadge percent={savedChange.kwhPercent} month={savedChange.previous.month} />}
            <div className="scan-actions">
              <Link href={`/bills?added=${saved.id}`} className="ui-primary">View monthly history <ChevronRight size={18} aria-hidden="true" /></Link>
              <button type="button" className="ui-secondary" onClick={restart}><ScanText size={18} aria-hidden="true" /> Scan another bill</button>
            </div>
          </div>}
        </section>
      </div>
    </PageShell>
  );
}
