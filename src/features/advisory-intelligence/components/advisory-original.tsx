"use client";
import { useId, useRef, useState } from "react";
import { FileText, ImageIcon, Maximize2, X } from "lucide-react";
import type { AdvisoryOriginal } from "../types";

export default function AdvisoryOriginalView({ original }: { original: AdvisoryOriginal }) {
  const dialog = useRef<HTMLDialogElement>(null), trigger = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const [imageError, setImageError] = useState(false);
  const content = original.kind === "image" ? <>{imageError ? <p role="alert">The saved screenshot could not be displayed. The stored original is unchanged.</p> : <img src={original.image} alt="Original advisory screenshot uploaded for this review" onError={() => setImageError(true)} />}</> : <pre>{original.text}</pre>;
  return <section className="aw-original ui-panel" aria-label="Original advisory"><div className="aw-original-heading"><span>{original.kind === "image" ? <ImageIcon aria-hidden="true" /> : <FileText aria-hidden="true" />}</span><div><h2>Keep the original close</h2><p>{original.name}{original.kind === "sample" ? " · Sample, not an official announcement" : " · retained locally with your review"}</p></div></div><details><summary>View original {original.kind === "image" ? "screenshot" : "text"}</summary><div className="aw-original-preview">{content}</div><button ref={trigger} type="button" onClick={() => dialog.current?.showModal()}><Maximize2 size={15} aria-hidden="true" />Open full original</button></details><p className="aw-muted">Your review fields do not change the original. An upload does not independently verify its authenticity.</p><dialog ref={dialog} className="aw-original-dialog" aria-labelledby={titleId} onClose={event => { event.stopPropagation(); trigger.current?.focus(); }}><div><h2 id={titleId}>Original advisory{original.kind === "sample" ? " · Sample" : ""}</h2><button type="button" autoFocus aria-label="Close original advisory" onClick={() => dialog.current?.close()}><X aria-hidden="true" /></button></div><p>{original.name}</p><div className="aw-original-full">{content}</div></dialog></section>;
}
