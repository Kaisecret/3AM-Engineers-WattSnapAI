"use client";
import { useCallback, useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUp, Camera, Check, ChevronRight, CircleCheck, ImageUp, Info, Keyboard, Lightbulb, RotateCcw, ScanText, Sparkles, Upload, X, Zap, ZapOff } from "lucide-react";
import PageShell from "./PageShell";
import { BillArt } from "./DashboardArtwork";
import { usePreviewHousehold } from "../use-preview-household";
import { billMonth, compareWithPrevious, currentMonth, dueDateLabel, latestBill, monthName, pesos, sampleScanReading, shiftMonth, sortBillsByMonth, validateBill, type PreviewBill } from "../preview-data";

type Phase = "camera" | "scanning" | "review" | "saved";
type CameraState = "idle" | "starting" | "live" | "blocked" | "unavailable";
type Draft = { month: string; kwh: string; amount: string; dueDate: string };
type Reading = Omit<PreviewBill, "id">;

const scanSteps = ["Finding the bill edges", "Reading the billing month", "Reading kWh used", "Reading the amount due", "Checking the due date"];
const acceptedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const sourceLabels = { scan: "Scanned", manual: "Manual", sample: "Sample" };
const phoneQuery = "(max-width: 899px)";

const toDraft = (reading: Reading): Draft => ({ month: reading.month, kwh: String(reading.kwh), amount: reading.amount.toFixed(2), dueDate: reading.dueDate ?? "" });
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
  const [draft, setDraft] = useState<Draft>({ month: "", kwh: "", amount: "", dueDate: "" });
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<PreviewBill | null>(null);
  const [flash, setFlash] = useState(0);
  const [dragging, setDragging] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const request = useRef(0);
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

  // Phones open straight into the camera, like a native scanner.
  useEffect(() => {
    if (window.matchMedia(phoneQuery).matches) void startCamera();
    return () => { releaseCamera(); if (objectUrl.current) URL.revokeObjectURL(objectUrl.current); };
  }, [startCamera, releaseCamera]);

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
    setFlash(value => value + 1);
    const element = video.current;
    if (camera === "live" && element?.videoWidth) {
      const canvas = document.createElement("canvas");
      canvas.width = element.videoWidth; canvas.height = element.videoHeight;
      canvas.getContext("2d")?.drawImage(element, 0, 0);
      setImage({ src: canvas.toDataURL("image/jpeg", 0.86), fit: "cover" });
    } else setImage(null);
    stopCamera();
    beginScan();
  }

  function chooseFile(file?: File) {
    setError("");
    if (!file) return;
    if (!acceptedTypes.includes(file.type)) { setError("Choose a JPG, PNG, WebP, or PDF bill."); return; }
    if (file.size > 10 * 1024 * 1024) { setError("Choose a file smaller than 10 MB."); return; }
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = file.type.startsWith("image/") ? URL.createObjectURL(file) : "";
    setImage(objectUrl.current ? { src: objectUrl.current, fit: "contain" } : null);
    if (fileInput.current) fileInput.current.value = "";
    stopCamera();
    beginScan();
  }

  function enterManually() {
    stopCamera();
    const latest = latestBill(household.bills);
    setDraft({ month: latest ? shiftMonth(latest.month, 1) : currentMonth(), kwh: "", amount: "", dueDate: "" });
    setMode("manual"); setReading(null); setError(""); setPhase("review");
  }

  function restart() {
    setPhase("camera"); setImage(null); setSaved(null); setReading(null); setError(""); setProgress(0);
    if (window.matchMedia(phoneQuery).matches) void startCamera(); else setCamera("idle");
  }

  async function toggleTorch() {
    const next = !torch;
    setTorch(next);
    try { await stream.current?.getVideoTracks()[0]?.applyConstraints({ advanced: [{ torch: next } as unknown as MediaTrackConstraintSet] }); }
    catch { /* Torch control is optional; many cameras do not offer it. */ }
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const bill = { month: draft.month, kwh: Number(draft.kwh), amount: Number(draft.amount), dueDate: draft.dueDate || undefined, source: mode };
    const issue = validateBill(bill);
    if (issue) { setError(issue); return; }
    const record: PreviewBill = { ...bill, id: crypto.randomUUID() };
    if (update({ bills: [...household.bills.filter(item => item.month !== bill.month), record] })) { setSaved(record); setError(""); setPhase("saved"); }
  }

  function onDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault(); setDragging(false);
    if (phase === "camera") chooseFile(event.dataTransfer.files[0]);
  }

  const live = camera === "live" && phase === "camera";
  const step = Math.min(scanSteps.length - 1, Math.floor(progress / (100 / scanSteps.length)));
  const duplicate = phase === "review" ? household.bills.find(bill => bill.month === draft.month) : undefined;
  const previous = sortBillsByMonth(household.bills).filter(bill => bill.month < draft.month).at(-1);
  const draftKwh = Number(draft.kwh);
  const savedChange = saved ? compareWithPrevious(household.bills, saved.month) : null;
  const recent = sortBillsByMonth(household.bills).slice(-3).reverse();
  const stage = phase === "camera" ? 0 : phase === "scanning" ? 1 : phase === "review" ? 2 : 3;
  const cameraMessage = camera === "blocked" ? "Camera access is blocked. Try the sample bill, or upload a photo." : camera === "unavailable" ? "No camera found. Try the sample bill, or upload a photo." : camera === "live" ? "Fit the whole bill inside the frame" : "Opening your camera…";
  const bubble = phase === "scanning" ? "Reading your bill…" : phase === "camera" ? (live ? "Hold steady!" : "I'll read it for you!") : "All done!";

  return (
    <PageShell title="Snap AI" subtitle="Scan your bill and add it to your monthly history" active="Snap AI" className="scan-page">
      <div className={`scan-app phase-${phase}${live ? " camera-live" : ""}${image ? " has-photo" : ""}`}>
        <section className={`scan-stage${dragging ? " is-dragging" : ""}`} aria-label="Bill scanner" onDragOver={event => { if (phase === "camera") { event.preventDefault(); setDragging(true); } }} onDragLeave={() => setDragging(false)} onDrop={onDrop}>
          <video ref={video} className={`scan-video${live ? " is-live" : ""}`} playsInline muted autoPlay aria-hidden="true" />
          {image && phase !== "camera" && <img className={`scan-photo is-${image.fit}`} src={image.src} alt="Your bill photo" />}
          <span className="scan-dots" aria-hidden="true" />

          <div className="scan-topbar">
            <Link href="/dashboard" className="scan-round" aria-label="Close scanner"><X aria-hidden="true" /></Link>
            <div className="scan-title"><strong>Snap AI</strong><span>Scan your electricity bill</span></div>
            {live ? <button type="button" className={`scan-round${torch ? " is-on" : ""}`} aria-label={torch ? "Turn flashlight off" : "Turn flashlight on"} aria-pressed={torch} onClick={toggleTorch}>{torch ? <Zap aria-hidden="true" /> : <ZapOff aria-hidden="true" />}</button> : <span className="scan-round is-ghost" aria-hidden="true"><Sparkles /></span>}
          </div>

          <div className="scan-frame-wrap">
            <div className="scan-frame">
              {!image && !live && <div className="scan-frame-bill"><BillArt period={shortPeriod(preview.month)} kwh={String(preview.kwh)} amount={pesos(preview.amount)} due={preview.dueDate ? dueDateLabel(preview.dueDate) : "—"} /></div>}
              <i className="scan-corner is-tl" /><i className="scan-corner is-tr" /><i className="scan-corner is-bl" /><i className="scan-corner is-br" />
              <div className="scan-track" aria-hidden="true">
                <span className="scan-beam" />
                <span className="scan-cone" />
                <span className="scan-bot">
                  <span className="scan-bubble">{bubble}</span>
                  <Image src="/assets/branding/wattsnap-mascot.png" alt="" width={260} height={260} sizes="140px" priority />
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

          {phase === "camera" && <p className="scan-hint" role="status">{cameraMessage}{(camera === "blocked" || camera === "unavailable") && <button type="button" onClick={() => void startCamera()}>Try camera again</button>}</p>}
          {phase === "camera" && error && <p className="scan-toast" role="alert">{error}</p>}

          {phase === "scanning" && <div className="scan-progress" role="status" aria-live="polite">
            <div className="scan-progress-top"><Sparkles aria-hidden="true" /><strong>{scanSteps[step]}…</strong><span>{Math.round(progress)}%</span></div>
            <div className="scan-progress-bar"><span style={{ width: `${progress}%` }} /></div>
            <small>Snap AI preview · keep this screen open</small>
          </div>}

          {phase === "camera" && <div className="scan-controls">
            <button type="button" className="scan-side" onClick={() => fileInput.current?.click()}><span><ImageUp aria-hidden="true" /></span>Upload</button>
            <button type="button" className="scan-shutter" aria-label={live ? "Capture bill photo" : "Scan the sample bill"} onClick={capture}><span /></button>
            <button type="button" className="scan-side" onClick={enterManually}><span><Keyboard aria-hidden="true" /></span>Type it</button>
            {live && <button type="button" className="scan-side scan-stop-camera" onClick={stopCamera}><span><X aria-hidden="true" /></span>Close camera</button>}
          </div>}

          {phase === "camera" && !live && <div className={`scan-placeholder${dragging ? " is-dragging" : ""}`}>
            <div className="scan-placeholder-art" aria-hidden="true">
              <span className="scan-placeholder-bill"><BillArt period={shortPeriod(preview.month)} kwh={String(preview.kwh)} amount={pesos(preview.amount)} due={preview.dueDate ? dueDateLabel(preview.dueDate) : "—"} /><i /></span>
              <Image className="scan-placeholder-bot" src="/assets/branding/wattsnap-mascot.png" alt="" width={260} height={260} sizes="150px" priority />
            </div>
            <h2>Drop your electricity bill here</h2>
            <p>Snap AI reads the billing month, kWh used, amount and due date. You check everything before it&apos;s added to your history.</p>
            <div className="scan-placeholder-actions">
              <button type="button" className="ui-primary" onClick={() => fileInput.current?.click()}><Upload size={18} aria-hidden="true" /> Upload bill</button>
              <button type="button" className="ui-secondary" onClick={() => void startCamera()} disabled={camera === "starting"}><Camera size={18} aria-hidden="true" /> {camera === "starting" ? "Opening camera…" : "Use webcam"}</button>
            </div>
            <button type="button" className="scan-text-button" onClick={capture}><Sparkles size={16} aria-hidden="true" /> Try it with a sample bill</button>
            <span className="scan-file-note">JPG, PNG, WebP or PDF · up to 10 MB</span>
            {(camera === "blocked" || camera === "unavailable") && <p className="scan-inline-note">{camera === "blocked" ? "Webcam access is blocked in this browser." : "No webcam was found."} You can still upload a bill.</p>}
            {error && <p className="ui-error" role="alert">{error}</p>}
          </div>}
          <input ref={fileInput} className="ws-sr-only" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" tabIndex={-1} aria-hidden="true" onChange={event => chooseFile(event.target.files?.[0])} />
          {flash > 0 && <span key={flash} className="scan-flash" aria-hidden="true" />}
        </section>

        <section className="scan-panel" aria-label="Scan details">
          <ol className="scan-steps" aria-label="Scan progress">
            {["Capture", "AI reads", "Review & save"].map((label, index) => <li key={label} className={index < stage ? "is-done" : index === stage ? "is-current" : ""} aria-current={index === stage ? "step" : undefined}><span>{index < stage ? <Check aria-hidden="true" /> : index + 1}</span>{label}</li>)}
          </ol>

          {phase === "camera" && <div className="scan-intro">
            <h2>How Snap AI works</h2>
            <ol className="scan-how">
              <li><span><Camera aria-hidden="true" /></span><div><strong>Snap or upload</strong><p>Take a clear photo of your whole bill, or upload one.</p></div></li>
              <li><span><Sparkles aria-hidden="true" /></span><div><strong>AI reads it</strong><p>Billing month, kWh used, amount and due date.</p></div></li>
              <li><span><CircleCheck aria-hidden="true" /></span><div><strong>Review &amp; save</strong><p>Fix anything, then it joins your month-by-month history.</p></div></li>
            </ol>
            <div className="scan-tips"><h3><Lightbulb aria-hidden="true" /> Tips for a clear scan</h3><ul><li>Lay the bill flat in good light</li><li>Keep all four corners in view</li><li>Avoid glare and shadows</li></ul></div>
            <button type="button" className="ui-secondary scan-manual" onClick={enterManually}><Keyboard size={18} aria-hidden="true" /> Enter bill manually</button>
            {recent.length > 0 && <div className="scan-recent"><div className="scan-recent-head"><h3>Recently added</h3><Link href="/bills">View all <ChevronRight size={15} aria-hidden="true" /></Link></div>
              {recent.map(bill => <div key={bill.id} className="scan-recent-row"><span className="scan-recent-icon"><ScanText aria-hidden="true" /></span><div><strong>{billMonth(bill.month)}</strong><small>{bill.kwh} kWh · {pesos(bill.amount)}</small></div><em className={`scan-source is-${bill.source ?? "manual"}`}>{sourceLabels[bill.source ?? "manual"]}</em></div>)}
            </div>}
          </div>}

          {phase === "scanning" && <div className="scan-reading">
            <h2>Snap AI is reading your bill</h2>
            <ul>{scanSteps.map((label, index) => <li key={label} className={index < step || progress >= 100 ? "is-done" : index === step ? "is-current" : ""}><span>{index < step || progress >= 100 ? <Check aria-hidden="true" /> : <i />}</span>{label}</li>)}</ul>
          </div>}

          {phase === "review" && <form className="scan-review" onSubmit={save} noValidate>
            <div className="scan-review-head">
              <span className="scan-review-icon">{mode === "scan" ? <Sparkles aria-hidden="true" /> : <Keyboard aria-hidden="true" />}</span>
              <div><h2>{mode === "scan" ? "Check what Snap AI found" : "Enter your bill details"}</h2><p>{mode === "scan" ? "Compare each value with your bill before saving." : "Copy these from your printed or digital bill."}</p></div>
            </div>
            {mode === "scan" && <p className="scan-sample-note"><Info aria-hidden="true" /> Preview: AI reading isn&apos;t connected yet, so these are sample values that continue your history.</p>}
            <div className="scan-fields">
              <label><span className="scan-label">Billing month</span><input type="month" required value={draft.month} onChange={event => setDraft({ ...draft, month: event.target.value })} /></label>
              <label><span className="scan-label">Due date <small>optional</small></span><input type="date" value={draft.dueDate} onChange={event => setDraft({ ...draft, dueDate: event.target.value })} /></label>
              <label><span className="scan-label">Energy used</span><span className="scan-unit"><input type="number" inputMode="decimal" min="0.01" step="0.01" placeholder="109" required value={draft.kwh} onChange={event => setDraft({ ...draft, kwh: event.target.value })} /><em>kWh</em></span></label>
              <label><span className="scan-label">Amount due</span><span className="scan-unit is-prefix"><em>₱</em><input type="number" inputMode="decimal" min="0.01" step="0.01" placeholder="1248.50" required value={draft.amount} onChange={event => setDraft({ ...draft, amount: event.target.value })} /></span></label>
            </div>
            {previous && draftKwh > 0 && <div className="scan-compare"><span>Compared with {billMonth(previous.month)} ({previous.kwh} kWh)</span><ChangeBadge percent={(draftKwh - previous.kwh) / previous.kwh * 100} month={previous.month} /></div>}
            {duplicate && <p className="scan-warning">You already have a {billMonth(duplicate.month)} bill. Saving replaces it.</p>}
            {(error || storageError) && <p className="ui-error" role="alert">{error || storageError}</p>}
            <div className="scan-actions">
              <button type="button" className="ui-secondary" onClick={restart}><RotateCcw size={17} aria-hidden="true" /> {mode === "scan" ? "Retake" : "Scan instead"}</button>
              <button type="submit" className="ui-primary" disabled={!ready}><Check size={18} aria-hidden="true" /> Save to history</button>
            </div>
          </form>}

          {phase === "saved" && saved && <div className="scan-saved" role="status">
            <Image className="scan-saved-art" src="/assets/branding/actions-3.png" alt="" width={240} height={240} sizes="150px" />
            <h2>Added to your history!</h2>
            <p>Your {billMonth(saved.month)} bill is now part of your monthly comparison.</p>
            <div className="scan-saved-card">
              <div><small>Billing month</small><strong>{billMonth(saved.month)}</strong></div>
              <div><small>Energy used</small><strong>{saved.kwh} kWh</strong></div>
              <div><small>Amount due</small><strong>{pesos(saved.amount)}</strong></div>
              {saved.dueDate && <div><small>Due date</small><strong>{dueDateLabel(saved.dueDate)}</strong></div>}
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
