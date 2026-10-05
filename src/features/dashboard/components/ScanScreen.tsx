"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FileImage, ImagePlus, ScanLine, X } from "lucide-react";
import PageShell from "./PageShell";
import { usePreviewHousehold } from "../use-preview-household";
import { validateBill } from "../preview-data";

export default function ScanScreen() {
  const { household, update, ready, storageError } = usePreviewHousehold();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  function chooseFile(next: File | undefined) {
    setError("");
    if (!next) return;
    if (!["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(next.type)) { setError("Choose a JPG, PNG, WebP, or PDF bill."); return; }
    if (next.size > 10 * 1024 * 1024) { setError("Choose a file smaller than 10 MB."); return; }
    setFile(next); setPreviewUrl(next.type.startsWith("image/") ? URL.createObjectURL(next) : ""); setSaved(false);
  }
  return <PageShell title="Snap AI" subtitle="Add and review your electricity bill" active="Snap AI">
    <div className="ui-two-columns">
      <section className="ui-panel"><div className="ui-panel-heading"><h2><ScanLine size={21} /> Bill image</h2></div>
        <label className={`ui-upload${file ? " has-file" : ""}`} htmlFor="ui-bill-file">
          {previewUrl ? <img src={previewUrl} alt="Selected electricity bill preview" /> : <>{file ? <FileImage /> : <ImagePlus />}<strong>{file ? file.name : "Upload your electricity bill"}</strong><span>{file ? "Select to choose a different file" : "JPG, PNG, WebP or PDF · Up to 10 MB"}</span></>}
        </label>
        <input ref={input} className="ws-sr-only" type="file" id="ui-bill-file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={event => chooseFile(event.target.files?.[0])} />
        {file && <div className="ui-file-row"><span>{file.name}</span><button className="ui-icon-button" aria-label="Remove selected bill file" onClick={() => { setFile(null); setPreviewUrl(""); if (input.current) input.current.value = ""; }}><X size={17} /></button></div>}
        <p className="ui-helper">Upload a bill for reference, then enter its details. Automatic AI extraction is not connected in this preview.</p>
      </section>
      <section className="ui-panel"><div className="ui-panel-heading"><div><h2>Review bill details</h2><p>You can also add a bill manually.</p></div></div>
        <form className="ui-form" onSubmit={event => {
          event.preventDefault(); setSaved(false);
          const data = new FormData(event.currentTarget);
          const bill = { month: String(data.get("month")), amount: Number(data.get("amount")), kwh: Number(data.get("kwh")) };
          const issue = validateBill(bill); if (issue) { setError(issue); return; }
          if (update({ bills: [{ ...bill, id: crypto.randomUUID() }, ...household.bills] })) { setError(""); setSaved(true); event.currentTarget.reset(); }
        }}>
          <label>Billing month<input name="month" type="month" defaultValue="2026-10" required /></label>
          <label>Bill amount (₱)<input name="amount" type="number" inputMode="decimal" min="0.01" step="0.01" placeholder="1,248.50" required /></label>
          <label>Consumption (kWh)<input name="kwh" type="number" inputMode="decimal" min="0.01" step="0.01" placeholder="126" required /></label>
          <button className="ui-primary" type="submit" disabled={!ready}>Save bill</button>
        </form>
        {saved && <div className="ui-success" role="status">Bill saved. <Link href="/bills">View your bill history →</Link></div>}
        {(error || storageError) && <p className="ui-error" role="alert">{error || storageError}</p>}
      </section>
    </div>
  </PageShell>;
}
