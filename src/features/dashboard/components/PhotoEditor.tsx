"use client";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Check, Move, X, ZoomIn, ZoomOut } from "lucide-react";

const frame = 240;
const output = 320;
const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value));

/** Circular crop with drag-to-move and zoom; saves a small square JPEG. */
export default function PhotoEditor({ file, onCancel, onSave }: { file: File | null; onCancel: () => void; onSave: (dataUrl: string) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const image = useRef<HTMLImageElement>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [src, setSrc] = useState("");
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [error, setError] = useState("");

  useEffect(() => {
    const element = dialog.current;
    if (!file) { if (element?.open) element.close(); return; }
    const url = URL.createObjectURL(file);
    setSrc(url); setSize({ w: 0, h: 0 }); setZoom(1); setOffset({ x: 0, y: 0 }); setError("");
    if (element && !element.open) element.showModal();
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const base = size.w ? frame / Math.min(size.w, size.h) : 1;
  const width = size.w * base * zoom;
  const height = size.h * base * zoom;
  const x = clamp(offset.x, Math.max(0, (width - frame) / 2));
  const y = clamp(offset.y, Math.max(0, (height - frame) / 2));
  const left = (frame - width) / 2 + x;
  const top = (frame - height) / 2 + y;

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, ox: x, oy: y };
  }
  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    setOffset({ x: drag.current.ox + event.clientX - drag.current.x, y: drag.current.oy + event.clientY - drag.current.y });
  }
  function onKey(event: KeyboardEvent<HTMLDivElement>) {
    const moves: Record<string, [number, number]> = { ArrowLeft: [8, 0], ArrowRight: [-8, 0], ArrowUp: [0, 8], ArrowDown: [0, -8] };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    setOffset({ x: x + move[0], y: y + move[1] });
  }
  function save() {
    const element = image.current;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!element || !size.w || !context) return;
    canvas.width = canvas.height = output;
    const scale = output / frame;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, output, output);
    context.drawImage(element, left * scale, top * scale, width * scale, height * scale);
    onSave(canvas.toDataURL("image/jpeg", 0.86));
  }

  return <dialog ref={dialog} className="pe-dialog" aria-labelledby="pe-title" onClose={onCancel} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
    <div className="pe-body">
      <div className="pe-head"><div><h2 id="pe-title">Adjust your photo</h2><p>Drag to reposition, then zoom to fit.</p></div><button type="button" className="pe-close" aria-label="Close" onClick={() => dialog.current?.close()}><X aria-hidden="true" /></button></div>
      <div className="pe-stage">
        <div className="pe-frame" role="img" aria-label="Photo preview. Use the arrow keys to move the photo." tabIndex={0} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onKeyDown={onKey}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {src && <img ref={image} src={src} alt="" draggable={false} style={{ width, height, transform: `translate(${left}px, ${top}px)`, opacity: size.w ? 1 : 0 }} onLoad={event => setSize({ w: event.currentTarget.naturalWidth, h: event.currentTarget.naturalHeight })} onError={() => setError("This photo can’t be opened here. Try a JPG or PNG.")} />}
          <span className="pe-hint" aria-hidden="true"><Move /> Drag</span>
        </div>
      </div>
      <div className="pe-zoom">
        <button type="button" aria-label="Zoom out" onClick={() => setZoom(value => Math.max(1, +(value - 0.25).toFixed(2)))}><ZoomOut aria-hidden="true" /></button>
        <input type="range" min="1" max="3" step="0.01" value={zoom} aria-label="Zoom" onChange={event => setZoom(Number(event.target.value))} style={{ ["--pe-fill" as string]: `${(zoom - 1) / 2 * 100}%` }} />
        <button type="button" aria-label="Zoom in" onClick={() => setZoom(value => Math.min(3, +(value + 0.25).toFixed(2)))}><ZoomIn aria-hidden="true" /></button>
      </div>
      {error && <p className="ui-error" role="alert">{error}</p>}
      <div className="pe-actions"><button type="button" className="ui-secondary" onClick={() => dialog.current?.close()}>Cancel</button><button type="button" className="ui-primary" disabled={!size.w || !!error} onClick={save}><Check size={18} aria-hidden="true" /> Save photo</button></div>
    </div>
  </dialog>;
}
