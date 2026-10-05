"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, Bell, ChartNoAxesColumnIncreasing, ChevronDown, ChevronRight, Info, Lightbulb, LogOut, Megaphone, ReceiptText, Settings, X, Zap } from "lucide-react";
import { PlugArtwork, PowerLinesArtwork, ProfileAvatar } from "./DashboardArtwork";
import AppNavigation from "./AppNavigation";
import DesktopHomeCards from "./DesktopHomeCards";
import { usePreviewHousehold } from "../use-preview-household";

const week = [
  { day: "Mon", value: 9.1 }, { day: "Tue", value: 11.4 },
  { day: "Wed", value: 14.0 }, { day: "Thu", value: 12.6 },
  { day: "Fri", value: 10.7 }, { day: "Sat", value: 14.0 },
  { day: "Sun", value: 11.4 },
];

export default function HomeScreen() {
  const { household } = usePreviewHousehold();
  const [selectedDay, setSelectedDay] = useState(3);
  const [openMenu, setOpenMenu] = useState<"notifications" | "profile" | "consumption" | null>(null);
  const menuRegion = useRef<HTMLDivElement>(null);
  const menuTriggers = useRef<Partial<Record<"notifications" | "profile" | "consumption", HTMLButtonElement | null>>>({});

  useEffect(() => {
    if (!openMenu) return;
    const dismiss = (event: PointerEvent) => {
      if (!menuRegion.current?.contains(event.target as Node) && !menuTriggers.current[openMenu]?.contains(event.target as Node)) setOpenMenu(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { menuTriggers.current[openMenu]?.focus(); setOpenMenu(null); }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", dismiss); document.removeEventListener("keydown", escape); };
  }, [openMenu]);

  const toggleMenu = (menu: NonNullable<typeof openMenu>) => setOpenMenu(current => current === menu ? null : menu);

  return (
    <div className="ws-home ws-home-screen">
      <div className="ws-shell">
        <header className="ws-header">
          <Link href="/dashboard" className="ws-brand" aria-label="WattSnap home"><Image src="/assets/branding/wattsnap-logo.png" alt="WattSnap" width={420} height={132} priority sizes="(min-width: 900px) 215px, 160px" /></Link>
          <div className="ws-desktop-heading"><h2>Home</h2><p>Your home energy overview</p></div>
          <div className="ws-header-actions">
            <button ref={element => { menuTriggers.current.notifications = element; }} className="ws-notification-button" aria-label="Notifications" aria-expanded={openMenu === "notifications"} aria-controls={openMenu === "notifications" ? "ws-header-panel" : undefined} onClick={() => toggleMenu("notifications")}><Bell aria-hidden="true" /><span className="ws-notification-dot" /></button>
            <button ref={element => { menuTriggers.current.profile = element; }} className="ws-profile-button" aria-label={`${household.name}'s account`} aria-expanded={openMenu === "profile"} aria-controls={openMenu === "profile" ? "ws-header-panel" : undefined} onClick={() => toggleMenu("profile")}><span className="ws-avatar"><ProfileAvatar /></span><ChevronDown size={18} aria-hidden="true" /></button>
          </div>
        </header>
        {openMenu && (
          <div ref={menuRegion} id="ws-header-panel" className="ws-header-panel" role="region" aria-label={openMenu === "profile" ? "Account" : openMenu === "notifications" ? "Notifications" : "About consumption"}>
            <button className="ws-panel-close" aria-label="Close panel" onClick={() => { menuTriggers.current[openMenu]?.focus(); setOpenMenu(null); }}><X size={17} /></button>
            {openMenu === "profile" ? <><strong>{household.name}&apos;s home</strong><p>Your household energy assistant</p><Link href="/settings"><Settings size={17} /> Account settings</Link><Link href="/"><LogOut size={17} /> Back to WattSnap</Link></> : openMenu === "notifications" ? <><strong>You&apos;re all caught up!</strong><p>No brownout advisory in your area today.</p><Link href="/advisories">View advisories <ChevronRight size={16} /></Link></> : <><strong>Your daily energy use</strong><p>This home screen displays the example readings from the design. Select a day to explore the weekly chart. Live household readings are not connected yet.</p></>}
          </div>
        )}
        <main className="ws-main">
          <section className="ws-greeting" aria-labelledby="ws-greeting-title">
            <Image className="ws-greeting-landscape" src="/assets/branding/sunny-eco-city-bg.png" alt="" fill sizes="(min-width: 900px) 1000px, 100vw" priority />
            <div className="ws-greeting-copy"><p>Good morning,</p><h1 id="ws-greeting-title">{household.name.split(/\s+/)[0]}!</h1><p className="ws-greeting-description">Let&apos;s keep your home<br />energy-smart today!</p></div>
            <span className="ws-hero-rays" aria-hidden="true"><i /><i /><i /></span>
            <Image className="ws-greeting-mascot" src="/assets/branding/wattsnap-mascot.png" alt="A cheerful WattSnap mascot" width={360} height={360} sizes="(min-width: 900px) 320px, 48vw" priority />
          </section>
          <section className="ws-card ws-consumption" aria-labelledby="ws-consumption-title">
            <div className="ws-card-heading">
              <div className="ws-heading-label"><span className="ws-icon-tile ws-icon-yellow"><Zap aria-hidden="true" /></span><h2 id="ws-consumption-title">Current Consumption</h2></div>
              <div className="ws-updated"><span>Updated: Today, 9:41 AM</span><button ref={element => { menuTriggers.current.consumption = element; }} aria-label="About consumption data" aria-expanded={openMenu === "consumption"} onClick={() => toggleMenu("consumption")}><Info size={14} /></button></div>
            </div>
            <div className="ws-consumption-content">
              <div className="ws-consumption-stat"><p className="ws-consumption-value">12.6 <span>kWh</span></p><p className="ws-muted"><span className="ws-mobile-today">as of today</span><span className="ws-desktop-today">Today</span></p><p className="ws-savings"><ArrowDown aria-hidden="true" /> 8% lower</p><p className="ws-comparison ws-muted">vs. same period last week</p></div>
              <div className="ws-chart" role="group" aria-label="Daily energy consumption this week">
                {week.map((reading, index) => <button key={reading.day} className={`ws-chart-day${selectedDay === index ? " is-selected" : ""}`} aria-label={`${reading.day}: ${reading.value} kilowatt hours`} aria-pressed={selectedDay === index} onClick={() => setSelectedDay(index)}><span className="ws-bar-track"><span className="ws-bar" style={{ height: `${reading.value / 16 * 100}%` }}>{selectedDay === index && <span className="ws-bar-value">{reading.value}</span>}</span></span><span className="ws-day-label">{reading.day}</span></button>)}
                <span className="ws-sr-only" aria-live="polite">{week[selectedDay].day}: {week[selectedDay].value} kilowatt hours</span>
              </div>
            </div>
          </section>
          <div className="ws-financial-row">
            <Link href="/bills" className="ws-card ws-bill" aria-label="Latest bill: 1,248 pesos and 50 centavos. Due October 10, 2026. View bills."><div className="ws-heading-label"><span className="ws-icon-tile ws-icon-blue"><ReceiptText aria-hidden="true" /></span><h2>Latest Bill</h2></div><div className="ws-bill-amount">₱ 1,248.50</div><p className="ws-muted">Due on Oct 10, 2026</p><span className="ws-bill-arrow"><ChevronRight aria-hidden="true" /></span></Link>
            <Link href="/budget" className="ws-card ws-budget" aria-label="Smart Energy Budget: 78 percent used of 3,500 pesos monthly budget. View budget."><div className="ws-heading-label"><span className="ws-icon-tile ws-icon-green"><ChartNoAxesColumnIncreasing aria-hidden="true" /></span><h2>Smart Energy Budget</h2></div><div className="ws-budget-summary"><strong>78% used</strong><ChevronRight aria-hidden="true" /></div><div className="ws-progress" role="progressbar" aria-label="Monthly energy budget used" aria-valuenow={78} aria-valuemin={0} aria-valuemax={100}><span /></div><p className="ws-muted">₱3,500.00 monthly budget</p></Link>
          </div>
          <DesktopHomeCards />
          <section className="ws-advisory" aria-labelledby="ws-advisory-title"><span className="ws-megaphone"><Megaphone aria-hidden="true" /></span><div className="ws-advisory-copy"><h2 id="ws-advisory-title">No brownout advisory</h2><p>in your area today.</p></div><span className="ws-power-lines"><PowerLinesArtwork /></span><Link href="/advisories" className="ws-advisory-link">View Advisories <ChevronRight aria-hidden="true" /></Link></section>
          <section className="ws-card ws-tip" aria-labelledby="ws-tip-title"><span className="ws-lightbulb"><Lightbulb aria-hidden="true" /></span><div className="ws-tip-copy"><h2 id="ws-tip-title">Today&apos;s Tipid Tip</h2><p>Unplug appliances you&apos;re not using.<br />It can help reduce your electricity bill<br />by up to 5–10%!</p></div><span className="ws-plug-art"><PlugArtwork /></span></section>
        </main>
        <p className="ws-desktop-preview">Preview • Sample data</p>
        <AppNavigation active="Home" />
      </div>
    </div>
  );
}
