"use client";
import { useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

/** Retain the existing dialog interface; local household access is not sign-in. */
export default function LogoutDialog({ open, onClose, name }: { open: boolean; onClose: () => void; name: string }) {
  const dialog = useRef<HTMLDialogElement>(null), router = useRouter();
  useEffect(() => { if (open && !dialog.current?.open) dialog.current?.showModal(); else if (!open && dialog.current?.open) dialog.current.close(); }, [open]);
  return <dialog ref={dialog} className="lo-dialog" aria-labelledby="lo-title" aria-describedby="lo-text" onClose={onClose} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}><div className="lo-body"><div className="lo-art" aria-hidden="true"><span />{open && <Image src="/assets/branding/actions-1.png" alt="" width={240} height={240} sizes="130px" />}</div><h2 id="lo-title">Close your household?</h2><p id="lo-text">{name}&apos;s records stay on this device. You can open them again anytime.</p><div className="lo-actions"><button type="button" className="ui-secondary" autoFocus onClick={() => dialog.current?.close()}>Keep household open</button><button type="button" className="lo-confirm" onClick={() => { dialog.current?.close(); router.push("/"); }}><LogOut aria-hidden="true" />Return to homepage</button></div></div></dialog>;
}