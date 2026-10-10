"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import { useSetupProgress } from "../use-setup-progress";
import "../setup.css";

const colors = ["#ffc93c", "#06c0ee", "#29c56b", "#ff6b8a", "#7b6cf6", "#ff9a3c"];
function spread(index: number, salt: number) {
  let hash = Math.imul(index + 1, 374761393) ^ Math.imul(salt, 668265263);
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
  return ((hash ^ (hash >>> 16)) >>> 0) / 4294967296;
}
// Fixed layout so every celebration looks the same and nothing depends on Math.random.
const confetti = Array.from({ length: 44 }, (_, index) => ({
  "--x": `${(spread(index, 1) * 100).toFixed(1)}%`,
  "--y": `${(spread(index, 6) * 100).toFixed(1)}%`,
  "--c": colors[index % colors.length],
  "--d": `${(spread(index, 2) * 0.9).toFixed(2)}s`,
  "--t": `${(2.4 + spread(index, 3) * 1.6).toFixed(2)}s`,
  "--drift": `${Math.round((spread(index, 4) - 0.5) * 160)}px`,
  "--spin": `${Math.round(360 + spread(index, 5) * 720)}deg`,
}) as CSSProperties);

export default function SetupCelebration() {
  const progress = useSetupProgress();
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (progress.celebrate && !seen && dialog.current && !dialog.current.open) { dialog.current.showModal(); setOpen(true); }
  }, [progress.celebrate, seen]);
  function finish() { progress.acknowledge(); setSeen(true); setOpen(false); }
  return <dialog ref={dialog} className="setup-celebration" aria-labelledby="setup-celebration-title" aria-describedby="setup-celebration-text" onClose={finish} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
    {open && <div className="setup-confetti" aria-hidden="true">{confetti.map((style, index) => <i key={index} className={index % 3 === 0 ? "is-round" : undefined} style={style} />)}</div>}
    <div className="setup-celebration-card">
      <Image src="/assets/branding/all-set-bee.png" alt="" width={240} height={240} sizes="190px" />
      <h2 id="setup-celebration-title">Home setup complete!</h2>
      <p id="setup-celebration-text">All 5 steps are done. WattSnap is ready to help you save on every bill.</p>
      <button type="button" className="ui-primary" onClick={() => dialog.current?.close()}>Let’s go!</button>
    </div>
  </dialog>;
}
