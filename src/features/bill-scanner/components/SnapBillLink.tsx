"use client";
import { useRef, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { pendingBillPhotoEvent, prefersNativeCamera, setPendingBillPhoto } from "../snap";

/**
 * Snap AI entry. On a phone it opens the camera straight away, then the scan page reads the
 * photo. On a computer it is a normal link to the scan page (upload, drop or webcam).
 */
export default function SnapBillLink({ className, children, ariaLabel, ariaCurrent }: { className?: string; children: ReactNode; ariaLabel?: string; ariaCurrent?: "page" }) {
  const router = useRouter();
  const pathname = usePathname();
  const camera = useRef<HTMLInputElement>(null);

  function chosen(file?: File) {
    if (camera.current) camera.current.value = "";
    if (!file) return;
    setPendingBillPhoto(file);
    if (pathname === "/bills/new") window.dispatchEvent(new Event(pendingBillPhotoEvent));
    else router.push("/bills/new");
  }

  return <>
    <Link href="/bills/new" className={className} aria-label={ariaLabel} aria-current={ariaCurrent} onClick={event => { if (!prefersNativeCamera()) return; event.preventDefault(); camera.current?.click(); }}>{children}</Link>
    <input ref={camera} type="file" accept="image/*" capture="environment" className="ws-sr-only" tabIndex={-1} aria-hidden="true" onChange={event => chosen(event.target.files?.[0])} />
  </>;
}
