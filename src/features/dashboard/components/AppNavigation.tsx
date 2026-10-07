import Link from "next/link";
import Image from "next/image";
import { ChartColumnBig, ChevronRight, House, Megaphone, PlugZap, ScanText } from "lucide-react";

const navigation = [
  { label: "Home", href: "/dashboard", icon: House },
  { label: "Energy", href: "/bills", icon: ChartColumnBig },
  { label: "Snap AI", href: "/bills/new", icon: ScanText },
  { label: "Appliances", href: "/appliances", icon: PlugZap },
  { label: "Advisories", href: "/advisories", icon: Megaphone },
];

export default function AppNavigation({ active }: { active?: string }) {
  return (
    <nav className="ws-bottom-nav" aria-label="Main navigation">
      <Link href="/dashboard" className="ws-sidebar-brand" aria-label="WattSnap home"><Image src="/assets/branding/wattsnap-logo.png" alt="WattSnap" width={420} height={132} sizes="(min-width: 900px) 240px, 1px" priority /></Link>
      {navigation.map(({ label, href, icon: Icon }) => (
        <Link key={label} href={href} className={`ws-nav-item${label === active ? " is-active" : ""}${label === "Snap AI" ? " ws-nav-scan" : ""}`} aria-current={label === active ? "page" : undefined}>
          <span className="ws-nav-icon"><Icon aria-hidden="true" /></span><span className="ws-nav-label">{label}</span>
        </Link>
      ))}
      <Link href="/assistant" className={`ws-sidebar-assistant${active === "Assistant" ? " is-active" : ""}`} aria-current={active === "Assistant" ? "page" : undefined}>
        <span className="ws-sidebar-assistant-art"><Image src="/assets/branding/Cheerful Bee Robot Thumbs-Up.png" alt="" width={120} height={120} sizes="64px" /></span>
        <span className="ws-sidebar-assistant-copy"><strong>WattSnap AI</strong><small>Ask me anything</small></span>
        <ChevronRight aria-hidden="true" />
      </Link>
    </nav>
  );
}
