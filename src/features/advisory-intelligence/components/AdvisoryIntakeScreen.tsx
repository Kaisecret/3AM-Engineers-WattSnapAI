"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Check, CircleCheck, WifiOff } from "lucide-react";
import PageShell from "@/features/dashboard/components/PageShell";
import { usePreviewHousehold } from "@/features/dashboard/use-preview-household";
import { advisoryTypeLabels } from "../advisory-preview";
import { blankAdvisory, captureMatch, maxOriginalBytes, maxOriginalText } from "../review-preview";
import { usePreviewAdvisories } from "../use-preview-advisories";
import type { AdvisoryDetails, AdvisoryOriginal, ReviewedAdvisory } from "../types";
import AdvisoryIntake from "./advisory-intake";
import AdvisoryReview from "./advisory-review";
import AdvisoryOriginalView from "./advisory-original";
import LocationMatchPreview from "./location-match-preview";

export default function AdvisoryIntakeScreen() {
  const { household, ready: householdReady, storageError } = usePreviewHousehold(), saved = usePreviewAdvisories();
  const [phase, setPhase] = useState<"input" | "review" | "saved">("input"), [original, setOriginal] = useState<AdvisoryOriginal | null>(null), [initial, setInitial] = useState(blankAdvisory), [editing, setEditing] = useState<ReviewedAdvisory | null>(null), [record, setRecord] = useState<ReviewedAdvisory | null>(null);
  const [loading, setLoading] = useState(false), [error, setError] = useState(""), [offline, setOffline] = useState(false);
  const upload = useRef<HTMLInputElement>(null), initialized = useRef(false), request = useRef(0), heading = useRef<HTMLHeadingElement>(null);
  const ready = householdReady && saved.ready;
  useEffect(() => { const sync = () => setOffline(!navigator.onLine); sync(); window.addEventListener("online", sync); window.addEventListener("offline", sync); return () => { window.removeEventListener("online", sync); window.removeEventListener("offline", sync); request.current++; }; }, []);
  useEffect(() => { if (phase !== "input") heading.current?.focus(); }, [phase]);
  useEffect(() => {
    if (!ready || initialized.current) return; initialized.current = true;
    const params = new URLSearchParams(window.location.search), edit = params.get("edit");
    if (edit) { const entry = saved.records.find(item => item.id === edit); if (entry) { setEditing(entry); setOriginal(entry.original); setInitial(entry.details); setPhase("review"); } else setError("This saved advisory could not be found. Return to your advisory list or choose a new original."); }

  }, [ready, saved.records]);
  function reset() { request.current++; setLoading(false); setError(""); setOriginal(null); setEditing(null); setRecord(null); setInitial(blankAdvisory); setPhase("input"); }
  function useText(text: string) { if (!text.trim()) { setError("Paste the original advisory text before continuing."); return; } if (text.length > maxOriginalText) { setError("Use an original up to 12,000 characters."); return; } setOriginal({ kind: "text", name: "Pasted provider announcement", text, capturedAt: new Date().toISOString() }); setInitial({ ...blankAdvisory, areas: [{ ...blankAdvisory.areas[0] }] }); setError(""); setPhase("review"); }

  async function chooseFile(file?: File) {
    if (upload.current) upload.current.value = ""; if (!file || !ready || loading) return; setError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setError("Choose a JPG, PNG or WebP advisory screenshot."); return; }
    if (file.size === 0 || file.size > maxOriginalBytes) { setError("Choose a screenshot up to 2 MB so its original can be saved locally."); return; }
    const token = ++request.current; setLoading(true);
    try { const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("Unreadable image")); reader.readAsDataURL(file); }); const image = new window.Image(); image.src = data; await image.decode(); if (token !== request.current) return; setOriginal({ kind: "image", name: file.name, image: data, text: "", capturedAt: new Date().toISOString() }); setInitial({ ...blankAdvisory, areas: [{ ...blankAdvisory.areas[0] }] }); setPhase("review"); }
    catch { if (token === request.current) setError("This screenshot could not be opened. Try another image or paste the original text."); }
    finally { if (token === request.current) setLoading(false); }
  }
  function save(details: AdvisoryDetails) {
    if (!original) return; const now = new Date();
    if (editing && saved.records.find(item => item.id === editing.id)?.revision !== editing.revision) { setError("This advisory changed after you opened it. Return to the list and reopen its latest review before saving corrections."); return; }
    const next: ReviewedAdvisory = { version: "advisory-ui-v1", id: editing?.id ?? crypto.randomUUID(), revision: (editing?.revision ?? 0) + 1, createdAt: editing?.createdAt ?? now.toISOString(), reviewedAt: now.toISOString(), original, details, match: captureMatch(details, household, now) };
    if (saved.save(next)) { setRecord(next); setPhase("saved"); }
  }
  const stage = phase === "input" ? 0 : phase === "review" ? 1 : 2;
  return <PageShell title={editing ? "Correct advisory" : "Add advisory"} subtitle="Keep the source. Review what it says." active="Advisories" className="aw-page">
    <div className="aw-toolbar"><Link href="/advisories"><ArrowLeft size={16} aria-hidden="true" />Back to advisories</Link><span>Manual review · saved on this device</span></div>
    <ol className="aw-steps" aria-label="Advisory review progress">{["Choose original", "Review details", "Saved"].map((label, index) => <li key={label} aria-current={stage === index ? "step" : undefined} className={index === stage ? "is-current" : index < stage ? "is-done" : ""}><span>{index < stage ? <Check aria-hidden="true" /> : index + 1}</span>{label}</li>)}</ol>
    {phase !== "input" && <h2 className="ws-sr-only" ref={heading} tabIndex={-1}>{phase === "review" ? "Advisory review opened" : "Advisory saved"}</h2>}
    {offline && <div className="aw-note" role="status"><WifiOff aria-hidden="true" /><p><strong>You’re offline.</strong>Manual reviews and saved originals work locally. Check your provider for newer announcements after reconnecting.</p></div>}
    {phase === "input" && <><section className="aw-hero"><div><span>FROM ANNOUNCEMENT TO UNDERSTANDING</span><h2>Know the notice.<br />Review your area.</h2><p>Use an original provider screenshot or pasted announcement, then check its details and location basis.</p></div><Image src="/assets/branding/actions-6.png" alt="" width={260} height={260} sizes="(min-width: 900px) 160px, 80px" priority /></section><AdvisoryIntake ready={ready} loading={loading} onUpload={() => upload.current?.click()} onText={useText} /><input ref={upload} type="file" accept="image/jpeg,image/png,image/webp" aria-hidden="true" tabIndex={-1} className="ws-sr-only" disabled={!ready || loading} onChange={event => void chooseFile(event.target.files?.[0])} />{loading && <div className="aw-loading" role="status"><span aria-hidden="true" />Opening your original…<button type="button" onClick={() => { request.current++; setLoading(false); }}>Cancel</button></div>}{!ready && <p role="status" className="aw-muted">Loading your saved household and advisory records…</p>}{error && <p className="ui-error" role="alert">{error}</p>}{saved.error && <p className="ui-error" role="alert">{saved.error}<button type="button" onClick={saved.reload}>Retry loading</button></p>}</>}
    {phase === "review" && original && <AdvisoryReview key={`${original.capturedAt}-${editing?.id ?? "new"}`} initial={initial} original={original} household={household} records={saved.records} editingId={editing?.id} ready={ready && !saved.loadError} storageError={error || saved.error || storageError} onSave={save} onRestart={reset} onRetryLoading={saved.loadError ? saved.reload : undefined} />}
    {phase === "saved" && record && <><section className="ui-panel aw-saved"><span><CircleCheck aria-hidden="true" /></span><h2>{editing ? "Review corrected" : "Advisory saved"}</h2><p>{record.details.title || advisoryTypeLabels[record.details.type]}</p>{record.original.kind === "sample" && <small className="aw-sample-badge">Sample advisory · UI preview</small>}<p className="aw-muted">Your original, review fields, and match basis are saved in this browser. {record.details.type === "restored" ? "This restoration update is separate from earlier announcements." : "This review does not confirm a live outage."}</p><div><Link href={`/advisories?reviewed=${record.id}`} className="ui-primary">View saved advisory</Link><button type="button" className="ui-secondary" onClick={reset}>Add another advisory</button></div></section><LocationMatchPreview details={record.details} household={household} record={record} /><AdvisoryOriginalView original={record.original} /></>}
  </PageShell>;
}
