"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ScanText, Undo2, X } from "lucide-react";

/** Captured originals stay separate so small receipt text remains legible. */
export default function ReceiptPanorama({ sections, disabled, onUndo, onRead }: {sections:string[];disabled:boolean;onUndo:()=>void;onRead:()=>void}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const [selected,setSelected]=useState(0);
  useEffect(()=>{if(!sections.length)dialog.current?.close();},[sections.length]);
  return <div className="scan-panorama">
    <div className="scan-panorama-heading"><ArrowDown aria-hidden="true"/><span role="status">{sections.length ? `${sections.length} of 4 sections captured` : "Start at the top of your receipt"}</span></div>
    {sections.length>0 && <div className="scan-section-list" aria-label="Captured receipt sections">{sections.map((src,index)=><button className="scan-section-preview" type="button" key={`${index}-${src.slice(-20)}`} aria-label={`Preview receipt section ${index+1}`} onClick={()=>{setSelected(index);dialog.current?.showModal();}}><img src={src} alt=""/><span>{index+1}</span></button>)}<button type="button" className="scan-section-undo" aria-label="Remove last section" disabled={disabled} onClick={onUndo}><Undo2 aria-hidden="true"/>Undo</button></div>}
    <button type="button" className="scan-read-receipt" disabled={disabled || !sections.length} onClick={onRead}><ScanText aria-hidden="true"/>Read receipt</button>
    <dialog ref={dialog} className="scan-section-dialog" aria-labelledby="receipt-section-title" onClick={event=>{if(event.target===event.currentTarget)dialog.current?.close();}}>
      <div><h2 id="receipt-section-title">Receipt section {selected+1}</h2><button type="button" aria-label="Close receipt section" onClick={()=>dialog.current?.close()}><X aria-hidden="true"/></button></div>
      {sections[selected] && <img src={sections[selected]} alt={`Captured receipt section ${selected+1}. Check that the printed text is sharp.`}/>}
      <p>Make sure the text is clear before reading your receipt.</p>
      <button type="button" className="scan-read-receipt" onClick={()=>dialog.current?.close()}>Back to camera</button>
    </dialog>
  </div>;
}
