"use client";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type DragEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, Check, ChevronRight, CircleCheck, ImageUp, Keyboard, Lightbulb, ScanText, Sparkles, Trash2, Upload, X, Zap, ZapOff } from "lucide-react";
import PageShell from "./PageShell";
import { BillArt } from "./DashboardArtwork";
import { usePreviewHousehold } from "../use-preview-household";
import { billMonth, currentMonth, latestBill, pesos, shiftMonth, sortBillsByMonth, type PreviewBill } from "../preview-data";
import BillReview, { type AiReading, type BillReviewDraft, type BillPreviewSource } from "@/features/bill-scanner/components/bill-review";
import { previewProviderName } from "@/features/household-profile/provider-preview";
import { previewStorageFor, usePreviewStorageKey } from "@/features/auth/use-preview-storage-key";
import { billDraftStorageKey, normalizeBillDraft } from "@/features/bill-scanner/local-draft";
import { readBillPhoto, type BillScanInput } from "@/features/bill-scanner/snap";
import { cameraGuideCrop, cameraImageSize } from "@/features/bill-scanner/camera-frame";
import ReceiptPanorama from "@/features/bill-scanner/components/receipt-panorama";
import type { BillExtractionResult } from "@/contracts/extraction";

type Phase = "camera" | "scanning" | "review" | "failed";
type CameraState = "idle" | "starting" | "live" | "blocked" | "unavailable";

const acceptedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "application/pdf"];
const readingSteps = ["Reading the printed text", "Extracting kWh, amount & dates", "Comparing the bill values"];
const emptyDraft: BillReviewDraft = { month: "", kwh: "", amount: "", dueDate: "", periodStart: "", periodEnd: "" };
const sourceLabels = { scan: "Scanned", manual: "Manual", sample: "Sample" };


export default function ScanScreen() {
  const { household, update, ready, storageError } = usePreviewHousehold();
  const [phase, setPhase] = useState<Phase>("camera");
  const [camera, setCamera] = useState<CameraState>("idle");
  const [cameraReady, setCameraReady] = useState(false);
  const [guide, setGuide] = useState<"bill" | "receipt" | "panorama">("panorama");
  const [sections,setSections] = useState<string[]>([]);
  const frame = useRef<HTMLDivElement>(null);
  const [cameraSize, setCameraSize] = useState({ width: 0, height: 0 });
  const viewfinder = useRef<HTMLDivElement>(null);
  const [torch, setTorch] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [image, setImage] = useState<{ src: string } | null>(null);
  const [draft, setDraft] = useState<BillReviewDraft>({ month: "", kwh: "", amount: "", dueDate: "", periodStart: "", periodEnd: "" });
  const [source, setSource] = useState<BillPreviewSource | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState("");
  const [ai, setAi] = useState<AiReading | null>(null);
  const [readingStep, setReadingStep] = useState(0);
  const [flash, setFlash] = useState(0);
  const router = useRouter();
  const reading = useRef<AbortController | null>(null);
  const scanInput = useRef<BillScanInput | null>(null);
  const [dragging, setDragging] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const request = useRef(0);
  const uploadRequest = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const objectUrl = useRef("");
  const draftKey = usePreviewStorageKey(billDraftStorageKey);
  const [loadedDraftKey, setLoadedDraftKey] = useState<string | null>(null);
  const [draftNotice, setDraftNotice] = useState("");
  const [draftBlocked, setDraftBlocked] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<BillReviewDraft | null>(null);
  const discard = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    setDraft(emptyDraft); setPendingDraft(null); setDraftNotice(""); setSource(null); setImage(null); setAi(null); setPhase("camera"); reading.current?.abort(); scanInput.current = null; uploadRequest.current++; setLoadingFile(false); setCameraReady(false);
    request.current++; stream.current?.getTracks().forEach(track => track.stop()); stream.current = null; setCamera("idle");
    setSections([]);
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current); objectUrl.current = "";
    if (!ready) { setLoadedDraftKey(null); return; }
    try { const raw = sessionStorage.getItem(draftKey); if (raw) { setPendingDraft(normalizeBillDraft(JSON.parse(raw))); setDraftNotice("You have an unfinished bill."); } setDraftBlocked(false); }
    catch { setDraftBlocked(true); setDraftNotice("Your earlier draft could not be opened. It is unchanged. Choose Discard draft to start again, or keep your entered values on this page."); }
    setLoadedDraftKey(draftKey);
  }, [ready, draftKey]);
  useEffect(() => {
    if (loadedDraftKey !== draftKey || phase !== "review" || draftBlocked) return;
    try { sessionStorage.setItem(draftKey, JSON.stringify({ version: 1, draft })); }
    catch { setDraftNotice("Unfinished fields cannot be retained in this tab. Keep this page open until you save the reviewed bill."); }
  }, [draft, draftKey, loadedDraftKey, phase, draftBlocked]);

  const releaseCamera = useCallback(() => {
    request.current += 1;
    stream.current?.getTracks().forEach(track => track.stop());
    stream.current = null;
    setTorch(false);
    setTorchAvailable(false);
    setCameraReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    releaseCamera();
    const id = request.current;
    if (!navigator.mediaDevices?.getUserMedia) { setCamera("unavailable"); return; }
    setCamera("starting");
    try {
      const portrait = window.innerHeight > window.innerWidth;
      const media = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: "environment" }, width: { ideal: portrait ? 2160 : 3840 }, height: { ideal: portrait ? 3840 : 2160 } } });
      // A newer request or leaving the page makes this stream stale.
      if (id !== request.current) { media.getTracks().forEach(track => track.stop()); return; }
      const track = media.getVideoTracks()[0];
      if ((track?.getCapabilities?.() as MediaTrackCapabilities & {focusMode?:string[]})?.focusMode?.includes("continuous")) {
        try { await track.applyConstraints({advanced:[{focusMode:"continuous"} as MediaTrackConstraintSet]}); } catch { /* Capture works even without focus control. */ }
        if (id !== request.current) { media.getTracks().forEach(item => item.stop()); return; }
      }
      stream.current = media;
      setTorchAvailable(Boolean((media.getVideoTracks()[0]?.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean })?.torch));
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
      releaseCamera(); uploadRequest.current += 1; reading.current?.abort();
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

  const measureCamera = useCallback(() => {
    const element = video.current, area = viewfinder.current;
    if (!element || !area) return;
    setCameraSize(cameraImageSize(element.videoWidth, element.videoHeight, area.clientWidth, area.clientHeight));
    setCameraReady(element.readyState >= 2 && element.videoWidth > 0 && element.videoHeight > 0);
  }, []);

  useEffect(() => {
    const area = viewfinder.current;
    if (!area) return;
    const observer = new ResizeObserver(measureCamera);
    observer.observe(area);
    return () => observer.disconnect();
  }, [measureCamera]);

  function enterFromPhoto() {
    uploadRequest.current++; setLoadingFile(false); reading.current?.abort();
    setPendingDraft(null); setDraftNotice("");
    setDraft(previous => ({ ...previous, month: previous.month || currentMonth(), provider: previous.provider || household.provider || "" })); setError(""); setPhase("review");
  }

  /** The AI's values go into the form; anything it could not read stays empty for the person to type. */
  function applyReading(data: BillExtractionResult) {
    setPendingDraft(null); setDraftNotice("");
    const known = (value?: number | null) => value === null || value === undefined ? "" : String(value);
    setDraft({
      month: data.billingMonth ?? "", kwh: known(data.consumptionKwh), amount: known(data.amountDue),
      dueDate: data.dueDate ?? "", periodStart: data.periodStart ?? "", periodEnd: data.periodEnd ?? "", billingDate: data.billingDate ?? "", notes: "",
      provider: data.providerId ?? (data.provider ? `custom:${encodeURIComponent(data.provider)}` : household.provider ?? ""),
      subsidy: known(data.subsidy),
    });
    setAi({
      checks: [...(data.checks ?? []), ...(data.notes ? [data.notes] : []), ...(data.unknownFields?.includes("subsidy") ? ["The subsidy could not be read. Check the subsidy and amount due on your bill."] : [])], missing: data.unknownFields ?? [], charges: data.charges ?? [],
      ...(data.previousReading != null && data.presentReading != null ? { readings: { previous: data.previousReading, present: data.presentReading, ...(data.multiplier ? { multiplier: data.multiplier } : {}) } } : {}),
    });
    setError(""); setPhase("review");
  }

  /** Review follows a reading. Failed scans offer retry or explicit manual entry. */
  async function readBill(input: BillScanInput) {
    reading.current?.abort();
    scanInput.current = input;
    // A new source must never inherit fields from an earlier bill.
    setDraft(emptyDraft); setAi(null);
    const fail = (reason: string) => { setAi({ failed: reason, checks: [], missing: [], charges: [] }); setPhase("failed"); };
    if (!navigator.onLine) { fail("You’re offline. Connect to read this photo, or enter its details below."); return; }
    const controller = new AbortController(); reading.current = controller;
    setReadingStep(0); setPhase("scanning"); setError("");
    try {
      const hint = household.provider ? previewProviderName(household.provider) : "";
      const outcome = await readBillPhoto(input, hint === "Not selected" ? "" : hint, controller.signal);
      if (controller.signal.aborted || previewStorageFor(billDraftStorageKey) !== draftKey) return;
      if (outcome.ok && (outcome.data.consumptionKwh != null || outcome.data.amountDue != null)) applyReading(outcome.data);
      else fail(outcome.ok ? "The bill values weren’t readable. Include the whole receipt and make sure the text is sharp." : outcome.reason);
    } catch {
      if (controller.signal.aborted || previewStorageFor(billDraftStorageKey) !== draftKey) return;
      fail("We couldn’t reach WattSnap AI. Try reading the photo again.");
    }
  }

  function capture() {
    if (!ready || previewStorageFor(billDraftStorageKey) !== draftKey) return;
    uploadRequest.current += 1; setLoadingFile(false);
    const element = video.current;
    if (camera === "live" && cameraReady && element?.videoWidth && element.videoHeight) {
      const canvas = document.createElement("canvas");
      let crop: ReturnType<typeof cameraGuideCrop> = null;
      if (guide === "panorama") {
        if (sections.length >= 4) return;
        const area=viewfinder.current?.getBoundingClientRect(), bounds=frame.current?.getBoundingClientRect();
        if (area && bounds) crop=cameraGuideCrop(element.videoWidth,element.videoHeight,area.width,area.height,{left:bounds.left-area.left,top:bounds.top-area.top,width:bounds.width,height:bounds.height});
        if (!crop) { setError("Wait for the camera frame to settle, then try again."); return; }
      }
      canvas.width = crop?.width ?? element.videoWidth; canvas.height = crop?.height ?? element.videoHeight;
      const context = canvas.getContext("2d");
      if (!context) { setError("This camera photo could not be captured. Try uploading a bill."); return; }
      if (crop) context.drawImage(element,crop.x,crop.y,crop.width,crop.height,0,0,canvas.width,canvas.height);
      else context.drawImage(element, 0, 0);
      const photo = canvas.toDataURL("image/jpeg", 0.95);
      setFlash(value => value + 1);
      if (guide === "panorama") { setError(""); setSections(previous => previous.length < 4 ? [...previous,photo] : previous); return; }
      setImage({ src: photo });
      setSource({ name: "Camera photo", kind: "image", url: photo });
      stopCamera();
      void readBill(photo);
    } else if (camera !== "live" && camera !== "starting") void startCamera();
  }

  function readReceipt() {
    if (!sections.length || loadingFile || !ready) return;
    const photos=[...sections];
    setImage({src:photos[0]});
    setSource({name:`Receipt panorama · ${photos.length} ${photos.length===1?"section":"sections"}`,kind:"image",url:photos[0],sections:photos});
    stopCamera(); void readBill(photos);
  }

  async function chooseFile(file?: File) {
    setError("");
    if (!file) return;
    if (fileInput.current) fileInput.current.value = "";
    // Own every async step, including PDF validation, so cancellation and scope changes win.
    const uploadId = ++uploadRequest.current;
    if (!acceptedTypes.includes(file.type)) { setError("Choose a JPG, PNG, WebP, or PDF bill."); return; }
    if (file.size > 10 * 1024 * 1024) { setError("Choose a file up to 10 MB."); return; }
    if (file.size === 0) { setError("That file could not be opened. Choose a valid bill image or PDF."); return; }
    if (file.type === "application/pdf") {
      let valid = false;
      try { valid = /%PDF-\d\.\d/.test(await file.slice(0, 1024).text()); } catch { /* Report an unreadable file below. */ }
      if (uploadId !== uploadRequest.current) return;
      if (!valid) { setError("That file could not be opened. Choose a valid bill image or PDF."); return; }
    }
    const nextUrl = URL.createObjectURL(file);
    setLoadingFile(true);
    if (file.type.startsWith("image/") && !/hei[cf]/.test(file.type)) {
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
    setSections([]);
    setImage(file.type.startsWith("image/") && !/hei[cf]/.test(file.type) ? { src: nextUrl } : null);
    setSource({ name: file.name, kind: file.type.startsWith("image/") ? "image" : "pdf", url: nextUrl });
    setLoadingFile(false);
    stopCamera();
    void readBill(file);
  }

  function enterManually() {
    uploadRequest.current += 1; setLoadingFile(false);
    stopCamera();
    setSections([]);
    setPendingDraft(null); setDraftNotice("");
    const latest = latestBill(household.bills);
    setDraft(previous => ({ ...previous, month: previous.month || (latest ? shiftMonth(latest.month, 1) : currentMonth()), provider: previous.provider || household.provider || "" }));
    setImage(null); setSource(null); setAi(null); setError(""); setPhase("review");
  }

  function restart(clear = false) {
    uploadRequest.current += 1; setLoadingFile(false);
    reading.current?.abort();
    scanInput.current = null;
    if (phase === "review") { setPendingDraft(draft); setDraftNotice("You have an unfinished bill."); }
    setPhase("camera"); setImage(null); setSource(null); setAi(null); setError("");
    setSections([]);
    if (objectUrl.current) { URL.revokeObjectURL(objectUrl.current); objectUrl.current = ""; }
    stopCamera();
    if (clear) { try { sessionStorage.removeItem(draftKey); } catch { setDraftNotice("The draft could not be removed from this browser."); return; } setPendingDraft(null); setDraft(emptyDraft); setDraftBlocked(false); setDraftNotice(""); }
  }

  async function toggleTorch() {
    if (!torchAvailable) return;
    const next = !torch;
    try { await stream.current?.getVideoTracks()[0]?.applyConstraints({ advanced: [{ torch: next } as unknown as MediaTrackConstraintSet] }); setTorch(next); }
    catch { setTorch(false); setTorchAvailable(false); setError("This camera does not support a flashlight. You can still take a photo."); }
  }

  function save(bill: Omit<PreviewBill, "id">) {
    const existing = household.bills.find(item => item.month === bill.month);
    const record: PreviewBill = { ...bill, id: existing?.id ?? crypto.randomUUID() };
    if (update({ bills: [...household.bills.filter(item => item.month !== bill.month), record] })) {
      try { sessionStorage.removeItem(draftKey); } catch { /* Confirmed local record is already saved. */ }
      // Saved bills open in the Energy tab with their details showing.
      router.push(`/bills?added=${record.id}`);
    }
  }

  function onDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault(); setDragging(false);
    if (phase === "camera") void chooseFile(event.dataTransfer.files[0]);
  }

  // The reading steps move on while Gemini works, so the wait feels shorter.
  useEffect(() => {
    if (phase !== "scanning") return;
    const timer = window.setInterval(() => setReadingStep(step => Math.min(step + 1, readingSteps.length - 1)), 2200);
    return () => window.clearInterval(timer);
  }, [phase]);

  const live = camera === "live" && phase === "camera";
  const duplicate = phase === "review" ? household.bills.find(bill => bill.month === draft.month) : undefined;
  const recent = sortBillsByMonth(household.bills).slice(-3).reverse();
  const stage = phase === "review" ? 2 : phase === "scanning" ? 1 : 0;
  const cameraMessage = loadingFile ? "Opening your file…" : camera === "blocked" ? "Camera access is blocked. Upload a photo or enter details manually." : camera === "unavailable" ? "No camera found. Upload a photo or enter details manually." : camera === "live" ? (cameraReady ? guide === "panorama" ? sections.length >= 4 ? "Last section captured. Preview your photos, then read the receipt." : sections.length ? "Move down. Match the previous strip, then capture the next section." : "Include the receipt header. Hold steady and keep the text sharp." : `Fit the whole ${guide} inside the frame` : "Preparing your camera…") : camera === "starting" ? "Opening your camera…" : "Upload your bill, open your camera, or type its details";
  const bubble = phase === "camera" ? (live ? "Hold steady!" : "Let’s add your bill!") : phase === "scanning" ? "Reading…" : phase === "failed" ? "Try again" : "Ready to review!";

  return (
    <PageShell title="Snap AI" subtitle="Scan your bill and add it to your monthly history" active="Snap AI" className="scan-page">
      <div className={`scan-app phase-${phase}${live ? " camera-live" : ""}${image ? " has-photo" : ""}${guide === "panorama" ? " mode-panorama" : ""}`}>
        <section className={`scan-stage${dragging ? " is-dragging" : ""}`} aria-label="Bill scanner" onDragOver={event => { if (phase === "camera") { event.preventDefault(); setDragging(true); } }} onDragLeave={() => setDragging(false)} onDrop={onDrop}>
          <span className="scan-dots" aria-hidden="true" />

          <div className="scan-topbar">
            <Link href="/dashboard" className="scan-round" aria-label="Close scanner"><X aria-hidden="true" /></Link>
            <div className="scan-title"><strong>Snap AI</strong><span>Scan your electricity bill</span></div>
            {live ? <button type="button" className={`scan-round${torch ? " is-on" : ""}`} disabled={!torchAvailable} aria-label={!torchAvailable ? "Flashlight unavailable on this camera" : torch ? "Turn flashlight off" : "Turn flashlight on"} aria-pressed={torch} onClick={toggleTorch}>{torch ? <Zap aria-hidden="true" /> : <ZapOff aria-hidden="true" />}</button> : <span className="scan-round is-ghost" aria-hidden="true"><Sparkles /></span>}
          </div>
          <p className="scan-preview-tag" role="note">{offline ? "Offline · upload or enter details manually" : "Scan first · review before saving"}</p>
          {phase === "camera" && draftNotice && <div className="scan-draft-banner"><span>{draftNotice}</span>{pendingDraft && <button type="button" onClick={() => { uploadRequest.current++; setLoadingFile(false); stopCamera(); setDraft(pendingDraft); setPendingDraft(null); setDraftNotice("We restored your unfinished bill."); setPhase("review"); }}>Resume draft</button>}<button type="button" onClick={() => discard.current?.showModal()}>Discard draft</button></div>}
          {phase === "camera" && <div className="scan-guide-options" aria-label="Capture mode">{([['bill','Bill'],['receipt','Receipt'],['panorama','Panorama']] as const).map(([value,label])=><button type="button" key={value} disabled={loadingFile || sections.length>0} aria-pressed={guide===value} onClick={()=>setGuide(value)}>{label}</button>)}</div>}

          <div className="scan-frame-wrap">
            <div ref={viewfinder} className="scan-viewfinder" style={live && cameraSize.width > 0 ? { "--camera-image-width": `${cameraSize.width}px`, "--camera-image-height": `${cameraSize.height}px` } as CSSProperties : undefined}>
              <video ref={video} className={`scan-video${live ? " is-live" : ""}`} playsInline muted autoPlay aria-hidden="true" onLoadedData={measureCamera} onResize={measureCamera} />
              {image && phase !== "camera" && <Image className="scan-photo is-contain" src={image.src} alt="Your bill photo" fill sizes="(min-width: 1200px) 50vw, 100vw" unoptimized />}
            <div ref={frame} className={`scan-frame guide-${guide}`}>
              {live && guide === "panorama" && sections.length>0 && sections.length<4 && <div className="scan-overlap" aria-hidden="true"><img src={sections[sections.length-1]} alt=""/><span>Match this strip</span></div>}
              {!image && !live && <div className="scan-frame-bill"><BillArt period="Your billing period" kwh="—" amount="—" due="—" /></div>}
              <i className="scan-corner is-tl" /><i className="scan-corner is-tr" /><i className="scan-corner is-bl" /><i className="scan-corner is-br" />
              <div className="scan-track" aria-hidden="true">
                <span className="scan-beam" />
                <span className="scan-cone" />
                <span className="scan-bot">
                  <span className="scan-bubble">{bubble}</span>
                  <Image src="/assets/branding/Cheerful Bee Robot Thumbs-Up.png" alt="" width={260} height={260} sizes="140px" priority />
                </span>
              </div>
              {phase === "review" && <span className="scan-done-badge" aria-hidden="true"><CircleCheck /></span>}
            </div>
            </div>
          </div>

          {phase === "camera" && <p className="scan-hint" role="status">{cameraMessage}{(camera === "blocked" || camera === "unavailable" || camera === "idle") && <button type="button" disabled={!ready || loadingFile} onClick={() => void startCamera()}>{camera === "idle" ? "Open camera" : "Try camera again"}</button>}</p>}
          {phase === "camera" && error && <p className="scan-toast" role="alert">{error}</p>}

          {phase === "camera" && guide === "panorama" && (live || sections.length>0) && <ReceiptPanorama sections={sections} disabled={!ready || loadingFile} onUndo={()=>setSections(previous=>previous.slice(0,-1))} onRead={readReceipt}/>}

          {phase === "camera" && <div className="scan-controls">
            <button type="button" className="scan-side" disabled={!ready || loadingFile} onClick={() => fileInput.current?.click()}><span><ImageUp aria-hidden="true" /></span>Upload</button>
            <button type="button" className="scan-shutter" disabled={!ready || loadingFile || camera === "starting" || (live && (!cameraReady || (guide === "panorama" && sections.length >= 4)))} aria-label={live ? guide === "panorama" ? "Capture receipt section" : "Capture bill photo" : "Open bill camera"} onClick={capture}><span /></button>
            <button type="button" className="scan-side" disabled={!ready || loadingFile} onClick={enterManually}><span><Keyboard aria-hidden="true" /></span>Type it</button>
            {live && <button type="button" className="scan-side scan-stop-camera" onClick={stopCamera}><span><X aria-hidden="true" /></span>Close camera</button>}
          </div>}

          {phase === "scanning" && <div className="scan-progress" role="status">
            <div className="scan-progress-top"><Sparkles aria-hidden="true" /><strong>Reading your bill…</strong><button type="button" className="scan-cancel" onClick={() => restart()}>Cancel</button></div>
            <div className="scan-progress-bar is-indeterminate"><span /></div>
            <small>{readingSteps[readingStep]}</small>
          </div>}
          {phase === "failed" && <div className="scan-retry" role="alert"><h2>Try a clearer scan</h2><p>{ai?.failed}</p>{error && <p className="ui-error">{error}</p>}<div><button type="button" className="ui-primary" onClick={() => { if (scanInput.current) void readBill(scanInput.current); }} disabled={offline || loadingFile}>Try reading again</button><button type="button" className="ui-secondary" onClick={() => { restart(); void startCamera(); }}>Retake photo</button><button type="button" className="ui-secondary" disabled={loadingFile} onClick={() => fileInput.current?.click()}>{loadingFile ? "Opening file…" : "Upload another bill"}</button><button type="button" className="scan-retry-manual" onClick={enterFromPhoto}>Enter details from photo</button></div></div>}

          {phase === "camera" && !live && <div className={`scan-placeholder${dragging ? " is-dragging" : ""}`}>
            <div className="scan-placeholder-art" aria-hidden="true">
              <span className="scan-placeholder-bill"><BillArt period="Your billing period" kwh="—" amount="—" due="—" /><i /></span>
              <Image className="scan-placeholder-bot" src="/assets/branding/Cheerful Bee Robot Thumbs-Up.png" alt="" width={260} height={260} sizes="150px" priority />
            </div>
            <h2>Drop your electricity bill here</h2>
            <p>Upload or photograph your bill. WattSnap AI fills in the values, and you review them before saving.</p>
            <div className="scan-placeholder-actions">
              <button type="button" className="ui-primary" disabled={!ready || loadingFile} onClick={() => fileInput.current?.click()}><Upload size={18} aria-hidden="true" /> {loadingFile ? "Opening file…" : "Upload bill"}</button>
              <button type="button" className="ui-secondary" onClick={() => void startCamera()} disabled={!ready || loadingFile || camera === "starting"}><Camera size={18} aria-hidden="true" /> {camera === "starting" ? "Opening camera…" : "Use webcam"}</button>
            </div>
            <span className="scan-file-note">JPG, PNG, WebP or PDF · up to 10 MB</span>
            {(camera === "blocked" || camera === "unavailable") && <p className="scan-inline-note">{camera === "blocked" ? "Webcam access is blocked in this browser." : "No webcam was found."} You can still upload a bill.</p>}
            {error && <p className="ui-error" role="alert">{error}</p>}
          </div>}
          <input ref={fileInput} className="ws-sr-only" type="file" disabled={!ready || loadingFile} accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf" tabIndex={-1} aria-hidden="true" onChange={event => void chooseFile(event.target.files?.[0])} />
          {flash > 0 && <span key={flash} className="scan-flash" aria-hidden="true" />}
        </section>

        <section className="scan-panel" aria-label="Scan details">
          <ol className="scan-steps" aria-label="Scan progress">
            {["Scan bill", "AI reading", "Review & save"].map((label, index) => <li key={label} className={index < stage ? "is-done" : index === stage ? "is-current" : ""} aria-current={index === stage ? "step" : undefined}><span>{index < stage ? <Check aria-hidden="true" /> : index + 1}</span>{label}</li>)}
          </ol>

          {phase === "camera" && <div className="scan-intro">
            <h2>How Snap AI works</h2>
            <ol className="scan-how">
              <li><span><Camera aria-hidden="true" /></span><div><strong>Capture or upload</strong><p>Use Panorama for a long receipt: capture from top to bottom with an overlap between sections.</p></div></li>
              <li><span><Sparkles aria-hidden="true" /></span><div><strong>WattSnap AI reads it</strong><p>The kWh, amount and dates are filled in for you.</p></div></li>
              <li><span><CircleCheck aria-hidden="true" /></span><div><strong>Review &amp; save</strong><p>Fix anything, then it joins your month-by-month history.</p></div></li>
            </ol>
            <div className="scan-tips"><h3><Lightbulb aria-hidden="true" /> Tips for a clear scan</h3><ul><li>Lay the bill flat in good light</li><li>For Panorama, overlap each section by the highlighted strip</li><li>Include the header, meter readings, totals and due date</li><li>Preview each section and retake blurred text</li></ul></div>
            <button type="button" className="ui-secondary scan-manual" disabled={!ready} onClick={enterManually}><Keyboard size={18} aria-hidden="true" /> Enter bill manually</button>
            {recent.length > 0 && <div className="scan-recent"><div className="scan-recent-head"><h3>Recently added</h3><Link href="/bills">View all <ChevronRight size={15} aria-hidden="true" /></Link></div>
              {recent.map(bill => <div key={bill.id} className="scan-recent-row"><span className="scan-recent-icon"><ScanText aria-hidden="true" /></span><div><strong>{billMonth(bill.month)}</strong><small>{bill.kwh} kWh · {pesos(bill.amount)}</small></div><em className={`scan-source is-${bill.source ?? "manual"}`}>{sourceLabels[bill.source ?? "manual"]}</em></div>)}
            </div>}
          </div>}

          {phase === "scanning" && <div className="scan-reading" role="status">
            <h2>Reading your bill…</h2>
            <ul>{readingSteps.map((label, index) => <li key={label} className={index < readingStep ? "is-done" : index === readingStep ? "is-current" : ""}><span>{index < readingStep ? <Check aria-hidden="true" /> : <i />}</span>{label}</li>)}</ul>
            <button type="button" className="ui-secondary scan-manual" onClick={() => restart()}>Cancel</button>
          </div>}

          {draftNotice && phase === "review" && <p className="br-note" role="status">{draftNotice}</p>}
          {phase === "review" && error && <p className="ui-error" role="alert">{error}</p>}
          {phase === "review" && <BillReview mode="manual" ai={ai} draft={draft} original={null} source={source} duplicate={duplicate} offline={offline} ready={ready} storageError={storageError} onChange={setDraft} onRestart={() => restart()} onDiscard={() => discard.current?.showModal()} monthlySubsidy={household.monthlySubsidy} onSave={save} onReplaceSource={() => fileInput.current?.click()} onRemoveSource={() => { if (objectUrl.current) URL.revokeObjectURL(objectUrl.current); objectUrl.current = ""; setSource(null); setImage(null); }} />}
        </section>
      </div>
      <dialog ref={discard} className="br-original-dialog br-discard-dialog" aria-labelledby="discard-bill-title" aria-describedby="discard-bill-description">
        <span className="br-discard-icon" aria-hidden="true"><Trash2 /></span>
        <h2 id="discard-bill-title">Discard unfinished bill?</h2>
        <p id="discard-bill-description">Only this unfinished draft will be removed. Your saved bills stay in your history.</p>
        <div className="br-discard-actions">
          <button type="button" className="ui-secondary" autoFocus onClick={() => discard.current?.close()}>Keep draft</button>
          <button type="button" className="br-discard-confirm" onClick={() => { discard.current?.close(); restart(true); }}>Discard draft</button>
        </div>
      </dialog>
    </PageShell>
  );
}
