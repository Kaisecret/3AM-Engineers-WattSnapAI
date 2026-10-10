"use client";
import { useState } from "react";
import { FileText, ImagePlus, Sparkles, Upload } from "lucide-react";
import { maxOriginalText } from "../review-preview";
import type { AdvisorySample } from "../types";

export default function AdvisoryIntake({ ready, loading, onUpload, onText, onSample }: { ready: boolean; loading: boolean; onUpload: () => void; onText: (text: string) => void; onSample: (kind: AdvisorySample) => void }) {
  const [text, setText] = useState("");
  return <>
    <div className="aw-intake-grid"><section className="ui-panel aw-upload"><span className="aw-input-icon"><ImagePlus aria-hidden="true" /></span><h2>Upload a provider screenshot</h2><p>Keep the provider name, affected areas, and schedule visible. Copy the values into the review form.</p><button type="button" className="ui-primary" disabled={!ready || loading} onClick={onUpload}><Upload size={17} aria-hidden="true" />Upload screenshot</button><small>JPG, PNG or WebP · up to 2 MB. The original is kept only when you choose to save it.</small><p className="aw-muted">Enter and review the details manually while viewing your screenshot. To share from another app, save its screenshot and upload it here; direct incoming app sharing is unavailable in this version.</p></section><section className="ui-panel aw-paste"><span className="aw-input-icon"><FileText aria-hidden="true" /></span><h2>Paste the original announcement</h2><p>Paste the complete wording from a provider post or a shared notice. Preserve any source attribution.</p><label htmlFor="aw-pasted-original">Original advisory text<textarea id="aw-pasted-original" rows={6} value={text} disabled={!ready || loading} onChange={event => setText(event.target.value)} placeholder="Paste the original announcement here…" /></label><div className="aw-text-count">{text.length.toLocaleString()} / {maxOriginalText.toLocaleString()} characters</div><button type="button" className="ui-secondary" disabled={!ready || loading} onClick={() => onText(text)}>Review pasted text</button></section></div>

  </>;
}
