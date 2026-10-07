"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bell, ChevronDown, ChevronRight, LogOut, MapPin, Settings, X } from "lucide-react";
import UserAvatar from "./UserAvatar";
import LogoutDialog from "./LogoutDialog";
import { usePreviewHousehold } from "../use-preview-household";

export default function AppHeader({ title, subtitle }: { title?: string; subtitle?: string }) {
  const { household } = usePreviewHousehold();
  const [panel, setPanel] = useState<"notifications" | "profile" | null>(null);
  const [logout, setLogout] = useState(false);
  const header = useRef<HTMLElement>(null);
  const triggers = useRef<Partial<Record<"notifications" | "profile", HTMLButtonElement | null>>>({});

  useEffect(() => {
    if (!panel) return;
    function dismiss(event: PointerEvent) {
      if (!header.current?.contains(event.target as Node)) setPanel(null);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape" && panel) { triggers.current[panel]?.focus(); setPanel(null); }
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", dismiss); document.removeEventListener("keydown", escape); };
  }, [panel]);

  return (<>
    <header ref={header} className="ws-header">
      <Link href="/dashboard" className="ws-brand" aria-label="WattSnap home"><Image src="/assets/branding/wattsnap-logo.png" alt="WattSnap" width={420} height={132} sizes="(min-width: 900px) 215px, 160px" priority /></Link>
      {title && <div className="ws-desktop-heading"><h1>{title}</h1><p>{subtitle}</p></div>}
      <div className="ws-header-actions">
        <button ref={element => { triggers.current.notifications = element; }} className="ws-notification-button" aria-label="Notifications" aria-expanded={panel === "notifications"} onClick={() => setPanel(value => value === "notifications" ? null : "notifications")}><Bell aria-hidden="true" /><span className="ws-notification-dot" /></button>
        <button ref={element => { triggers.current.profile = element; }} className="ws-profile-button" aria-label={`${household.name}'s account`} aria-expanded={panel === "profile"} onClick={() => setPanel(value => value === "profile" ? null : "profile")}><span className="ws-avatar"><UserAvatar photo={household.photo} /></span><ChevronDown size={18} aria-hidden="true" /></button>
      </div>
      {panel && <div className="ws-header-panel" role="region" aria-label={panel === "profile" ? "Account" : "Notifications"}>
        <button className="ws-panel-close" aria-label="Close panel" onClick={() => { triggers.current[panel]?.focus(); setPanel(null); }}><X size={17} /></button>
        {panel === "profile" ? <>
          <div className="ws-panel-user"><span className="ws-avatar"><UserAvatar photo={household.photo} /></span><div><strong>{household.name}</strong><p>{household.email ?? `${household.name.split(/\s+/)[0]}'s home`}</p></div></div>
          <Link href="/settings" onClick={() => setPanel(null)}><Settings size={17} /> Account settings</Link>
          <Link href="/onboarding" onClick={() => setPanel(null)}><MapPin size={17} /> Household setup</Link>
          <button type="button" className="ws-panel-logout" onClick={() => { setPanel(null); setLogout(true); }}><LogOut size={17} /> Log out</button>
        </> : <><strong>Household advisories</strong><p>Check Active for interruptions and notices. Your previous advisories are in History.</p><Link href="/advisories" onClick={() => setPanel(null)}>View advisories <ChevronRight size={16} /></Link></>}
      </div>}
    </header>
    <LogoutDialog open={logout} onClose={() => setLogout(false)} name={household.name} />
  </>);
}
