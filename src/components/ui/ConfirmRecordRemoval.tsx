"use client";
import { useEffect, useRef } from "react";

export default function ConfirmRecordRemoval({ name, error, onKeep, onRemove }: { name: string | null; error?: string; onKeep: () => void; onRemove: () => boolean }) {
  const dialog = useRef<HTMLDialogElement>(null), trigger = useRef<HTMLElement | null>(null);
  useEffect(() => { if (name && !dialog.current?.open) { trigger.current = document.activeElement as HTMLElement; dialog.current?.showModal(); } else if (!name && dialog.current?.open) dialog.current.close(); }, [name]);
  return <dialog ref={dialog} className="ui-confirm-dialog" aria-labelledby="remove-record-title" onClose={() => { onKeep(); trigger.current?.focus(); }} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}><h2 id="remove-record-title">Remove {name}?</h2><p>This removes the selected record from this device. Your other records stay unchanged.</p>{error && <p className="ui-error" role="alert">{error}</p>}<div><button type="button" className="ui-secondary" autoFocus onClick={() => dialog.current?.close()}>Keep record</button><button type="button" className="ui-primary" onClick={() => { if (onRemove()) dialog.current?.close(); }}>Remove record</button></div></dialog>;
}
