import Link from "next/link";
import Image from "next/image";
import { ChartNoAxesColumnIncreasing, House, Plug, ReceiptText, ScanLine } from "lucide-react";

const navigation = [
  { label: "Home", href: "/dashboard", icon: House },
  { label: "Energy", href: "/bills", icon: ChartNoAxesColumnIncreasing },
  { label: "Snap AI", href: "/bills/new", icon: ScanLine },
  { label: "Appliances", href: "/appliances", icon: Plug },
  { label: "Advisories", href: "/advisories", icon: ReceiptText },
];

export default function AppNavigation({ active }: { active: string }) {
  return (
    <nav className="ws-bottom-nav" aria-label="Main navigation">
      <Link href="/dashboard" className="ws-sidebar-brand" aria-label="WattSnap home"><Image src="/assets/branding/wattsnap-logo.png" alt="WattSnap" width={420} height={132} sizes="(min-width: 900px) 240px, 1px" priority /></Link>
      {navigation.map(({ label, href, icon: Icon }) => (
        <Link key={label} href={href} className={`ws-nav-item${label === active ? " is-active" : ""}${label === "Snap AI" ? " ws-nav-scan" : ""}`} aria-current={label === active ? "page" : undefined}>
          <span className="ws-nav-icon"><Icon aria-hidden="true" /></span><span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
