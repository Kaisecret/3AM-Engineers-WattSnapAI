import Link from "next/link";
import { ChevronRight, LogOut, MapPin, Settings } from "lucide-react";
import UserAvatar from "./UserAvatar";
import type { PreviewHousehold } from "../preview-data";

/** Profile and notification panels shared by every page header, Home included, so they cannot drift apart. */
export default function HeaderMenu({ panel, household, onNavigate, onLogout }: { panel: "profile" | "notifications"; household: Pick<PreviewHousehold, "name" | "email" | "photo">; onNavigate: () => void; onLogout: () => void }) {
  if (panel === "notifications") return <><strong>Household advisories</strong><p>Saved reviews do not confirm live power status. Check your provider for current announcements.</p><Link href="/advisories" onClick={onNavigate}>View advisories <ChevronRight size={16} /></Link></>;
  return <>
    <div className="ws-panel-user"><span className="ws-avatar"><UserAvatar photo={household.photo} /></span><div><strong>{household.name}</strong><p>{household.email ?? `${household.name.split(/\s+/)[0]}'s home`}</p></div></div>
    <Link href="/settings" onClick={onNavigate}><Settings size={17} /> Household settings</Link>
    <Link href="/onboarding" onClick={onNavigate}><MapPin size={17} /> Household setup</Link>
    <button type="button" className="ws-panel-logout" onClick={onLogout}><LogOut size={17} /> Log out</button>
  </>;
}
