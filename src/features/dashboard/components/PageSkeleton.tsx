"use client";

import { usePathname } from "next/navigation";
import PageShell from "./PageShell";
import { activeTab } from "../active-tab";

/** Shown while a signed-in page loads: the real header and navigation stay put, content shimmers. */
export default function PageSkeleton() {
  const pathname = usePathname();
  const active = activeTab(pathname);
  const home = pathname === "/dashboard";
  return <PageShell active={active}>
    <div className={`ws-skeleton${home ? " is-home" : ""}`} aria-busy="true">
      <p className="ws-sr-only" role="status">Loading{active ? ` ${active}` : ""}…</p>
      {home ? <>
        <div className="ws-skel ws-skel-hero" aria-hidden="true" />
        <div className="ws-skel ws-skel-card" aria-hidden="true" />
        <div className="ws-skel-pair" aria-hidden="true"><div className="ws-skel" /><div className="ws-skel" /></div>
      </> : <>
        <div className="ws-skel ws-skel-title" aria-hidden="true" />
        <div className="ws-skel ws-skel-card" aria-hidden="true" />
        {[0, 1, 2].map(row => <div key={row} className="ws-skel ws-skel-row" aria-hidden="true" />)}
      </>}
    </div>
  </PageShell>;
}
