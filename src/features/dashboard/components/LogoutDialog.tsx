"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle, LogOut } from "lucide-react";
import { previewStorageKey } from "../preview-data";

/** Confirms logging out; optionally removes this browser's saved preview data. */
export default function LogoutDialog({ open, onClose, name }: { open: boolean; onClose: () => void; name: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [clearData, setClearData] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) { setClearData(false); setLeaving(false); element.showModal(); }
    else if (!open && element.open) element.close();
  }, [open]);

  function confirm() {
    setLeaving(true);
    if (clearData) { try { localStorage.removeItem(previewStorageKey); } catch { /* Nothing to clear if storage is blocked. */ } }
    window.setTimeout(() => router.push("/login"), 700);
  }

  return <dialog ref={dialog} className="lo-dialog" aria-labelledby="lo-title" aria-describedby="lo-text" onClose={onClose} onCancel={event => { if (leaving) event.preventDefault(); }} onClick={event => { if (event.target === event.currentTarget && !leaving) dialog.current?.close(); }}>
    <div className="lo-body">
      <div className="lo-art" aria-hidden="true"><span /><Image src="/assets/branding/actions-1.png" alt="" width={240} height={240} sizes="130px" /></div>
      <h2 id="lo-title">Log out of WattSnap?</h2>
      <p id="lo-text">You&apos;ll need to log in again to see {name.split(/\s+/)[0]}&apos;s home.</p>
      <label className="lo-check">
        <input type="checkbox" checked={clearData} disabled={leaving} onChange={event => setClearData(event.target.checked)} />
        <span className="lo-box" aria-hidden="true"><Check /></span>
        <span><strong>Also remove my data from this device</strong><small>Bills, appliances and your photo saved in this browser</small></span>
      </label>
      <div className="lo-actions">
        <button type="button" className="ui-secondary" autoFocus disabled={leaving} onClick={() => dialog.current?.close()}>Stay logged in</button>
        <button type="button" className="lo-confirm" disabled={leaving} onClick={confirm}>{leaving ? <><LoaderCircle className="lo-spin" aria-hidden="true" /> Logging out…</> : <><LogOut aria-hidden="true" /> Log out</>}</button>
      </div>
    </div>
  </dialog>;
}
