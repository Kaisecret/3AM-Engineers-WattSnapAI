"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUp, Bell, ChartNoAxesColumnIncreasing, ChevronDown, ChevronRight, Info, LogOut, ReceiptText, ScanText, SendHorizontal, Settings, Sparkles, X, Zap } from "lucide-react";
import HomeAdvisoryCard from "@/features/advisory-intelligence/components/HomeAdvisoryCard";
import HomePreparationCard from "@/features/advisory-intelligence/components/HomePreparationCard";
import HomeTipCard from "@/features/tipid-tips/components/HomeTipCard";
import HomeSetupProgress from "@/features/onboarding/components/HomeSetupProgress";
import UserAvatar from "./UserAvatar";
import LogoutDialog from "./LogoutDialog";
import AppNavigation from "./AppNavigation";
import DesktopHomeCards from "./DesktopHomeCards";
import { usePreviewHousehold } from "../use-preview-household";
import { billMonth, chartMonths, compareWithPrevious, dueDateLabel, latestBill, monthName, pesos, shortMonth } from "../preview-data";

const assistantPrompts = ["Why did my bill change?", "How can I save on aircon?", "Any brownout today?"];
// Decorative outline shown before the first bill; it is not data and is hidden from assistive technology.
const placeholderBars = [38, 58, 46, 72, 54, 86];

export default function HomeScreen() {
  const { household } = usePreviewHousehold();
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [logout, setLogout] = useState(false);
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
  const latest = latestBill(household.bills);
  const months = chartMonths(household.bills, 6);
  const hasExamples = months.some(bar => bar.example);
  const change = latest ? compareWithPrevious(household.bills, latest.month) : null;
  const selected = months.find(bar => bar.month === selectedMonth) ?? months[months.length - 1];
  const chartMax = Math.max(...months.map(bar => bar.kwh), 1) * 1.08;
  const budgetPercent = latest && household.budget > 0 ? Math.round(latest.amount / household.budget * 100) : 0;
  const firstName = household.name.split(/\s+/)[0];

  return (
    <div className="ws-home ws-home-screen">
      <div className="ws-shell">
        <header className="ws-header">
          <Link href="/dashboard" className="ws-brand" aria-label="WattSnap home"><Image src="/assets/branding/wattsnap-logo.png" alt="WattSnap" width={420} height={132} priority sizes="(min-width: 900px) 215px, 160px" /></Link>
          <div className="ws-desktop-heading"><h2>Home</h2><p>Your home energy overview</p></div>
          <div className="ws-header-actions">
            <button ref={element => { menuTriggers.current.notifications = element; }} className="ws-notification-button" aria-label="Notifications" aria-expanded={openMenu === "notifications"} aria-controls={openMenu === "notifications" ? "ws-header-panel" : undefined} onClick={() => toggleMenu("notifications")}><Bell aria-hidden="true" /></button>
            <button ref={element => { menuTriggers.current.profile = element; }} className="ws-profile-button" aria-label={`${household.name}'s household`} aria-expanded={openMenu === "profile"} aria-controls={openMenu === "profile" ? "ws-header-panel" : undefined} onClick={() => toggleMenu("profile")}><span className="ws-avatar"><UserAvatar photo={household.photo} /></span><ChevronDown size={18} aria-hidden="true" /></button>
          </div>
          {openMenu && (
            <div ref={menuRegion} id="ws-header-panel" className="ws-header-panel" role="region" aria-label={openMenu === "profile" ? "Household" : openMenu === "notifications" ? "Notifications" : "About consumption"}>
              <button className="ws-panel-close" aria-label="Close panel" onClick={() => { menuTriggers.current[openMenu]?.focus(); setOpenMenu(null); }}><X size={17} /></button>
              {openMenu === "profile" ? <><div className="ws-panel-user"><span className="ws-avatar"><UserAvatar photo={household.photo} /></span><div><strong>{household.name}</strong><p>{household.email ?? `${firstName}'s home`}</p></div></div><Link href="/settings"><Settings size={17} /> Household settings</Link><button type="button" className="ws-panel-logout" onClick={() => { setOpenMenu(null); setLogout(true); }}><LogOut size={17} /> Close household</button></> : openMenu === "notifications" ? <><strong>Household advisories</strong><p>Saved reviews do not confirm live power status. Check your provider for current announcements.</p><Link href="/advisories">View advisories <ChevronRight size={16} /></Link></> : <><strong>Your monthly energy use</strong><p>Each bar is one electricity bill from your history; missing months stay missing. Select a month to see its reading. Review a new bill with Snap AI to add the next month.</p><Link href="/bills">Compare all months <ChevronRight size={16} /></Link></>}
            </div>
          )}
        </header>
        <main className="ws-main">
          <section className="ws-greeting" aria-labelledby="ws-greeting-title">
            <Image className="ws-greeting-landscape" src="/assets/branding/sunny-eco-city-bg.png" alt="" fill sizes="(min-width: 900px) 1000px, 100vw" priority />
            <div className="ws-greeting-copy"><p>Welcome home,</p><h1 id="ws-greeting-title">{household.name === "Your home" ? "Let’s get started!" : `${firstName}!`}</h1><p className="ws-greeting-description">Let&apos;s keep your home<br />energy-smart today!</p></div>
            <span className="ws-hero-rays" aria-hidden="true"><i /><i /><i /></span>
            <Image className="ws-greeting-mascot" src="/assets/branding/Cheerful Bee Robot Thumbs-Up.png" alt="A cheerful WattSnap mascot" width={360} height={360} sizes="(min-width: 900px) 320px, 48vw" priority />
          </section>
          <HomeSetupProgress />
          <HomePreparationCard />
          <section className="ws-card ws-consumption" aria-labelledby="ws-consumption-title">
            <div className="ws-card-heading">
              <div className="ws-heading-label"><span className="ws-icon-tile ws-icon-yellow"><Zap aria-hidden="true" /></span><h2 id="ws-consumption-title">Monthly Consumption</h2></div>
              <div className="ws-updated"><span>{latest ? `Latest bill: ${shortMonth(latest.month)} ${latest.month.slice(0, 4)}` : "No bills yet"}</span><button ref={element => { menuTriggers.current.consumption = element; }} aria-label="About consumption data" aria-expanded={openMenu === "consumption"} onClick={() => toggleMenu("consumption")}><Info size={14} /></button></div>
            </div>
            <div className="ws-consumption-content">
              {latest ? <div className="ws-consumption-stat"><p className="ws-consumption-value">{latest.kwh} <span>kWh</span></p><p className="ws-muted">{monthName(latest.month)} bill</p>{change ? <><p className={`ws-savings${change.kwhPercent > 0 ? " is-higher" : ""}`}>{change.kwhPercent !== 0 && (change.kwhPercent > 0 ? <ArrowUp aria-hidden="true" /> : <ArrowDown aria-hidden="true" />)} {change.kwhPercent === 0 ? "No change" : `${Math.abs(change.kwhPercent).toFixed(0)}% ${change.kwhPercent > 0 ? "higher" : "lower"}`}</p><p className="ws-comparison ws-muted">vs. {monthName(change.previous.month)} bill</p></> : <p className="ws-comparison ws-muted">Add another bill to compare</p>}</div> : <div className="ws-consumption-stat ws-consumption-empty"><p className="ws-consumption-value">0 <span>bills</span></p><p className="ws-muted">Scan your first bill to compare months.</p><Link href="/bills/new" className="ui-primary"><ScanText size={17} aria-hidden="true" /> Scan bill</Link></div>}
              {months.length ? <div className="ws-chart" role="group" aria-label="Energy use for each month">
                {months.map(bill => <button key={bill.id} className={`ws-chart-day${selected?.month === bill.month ? " is-selected" : ""}${bill.example ? " is-example" : ""}`} aria-label={`${bill.example ? "Example month, " : ""}${billMonth(bill.month)}: ${bill.kwh} kilowatt hours`} aria-pressed={selected?.month === bill.month} onClick={() => setSelectedMonth(bill.month)}><span className="ws-bar-track"><span className="ws-bar" style={{ height: `${bill.kwh / chartMax * 100}%` }}>{selected?.month === bill.month && <span className="ws-bar-value">{bill.kwh}</span>}</span></span><span className="ws-day-label">{shortMonth(bill.month)}</span></button>)}
                {selected && <span className="ws-sr-only" aria-live="polite">{billMonth(selected.month)}: {selected.kwh} kilowatt hours</span>}
              </div> : <div className="ws-chart-placeholder"><span className="ws-bar-track" aria-hidden="true">{placeholderBars.map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</span><p><ChartNoAxesColumnIncreasing size={14} aria-hidden="true" /> Your monthly chart appears here</p></div>}
            </div>
            {hasExamples && <p className="ws-chart-note"><i aria-hidden="true" /> Striped bars are example months. <Link href="/bills/new">Scan more bills</Link> to see your real history.</p>}
          </section>
          <div className="ws-financial-row">
            <Link href="/bills" className="ws-card ws-bill" aria-label={latest ? `Latest bill: ${pesos(latest.amount)} for ${billMonth(latest.month)}. View bills.` : "No bills yet. View bills."}><div className="ws-heading-label"><span className="ws-icon-tile ws-icon-blue"><ReceiptText aria-hidden="true" /></span><h2>Latest Bill</h2></div><div className="ws-bill-amount">{latest ? pesos(latest.amount) : "—"}</div><p className="ws-muted">{latest?.dueDate ? `Due on ${dueDateLabel(latest.dueDate)}` : latest ? billMonth(latest.month) : "Scan your first bill"}</p><span className="ws-bill-arrow"><ChevronRight aria-hidden="true" /></span></Link>
            <Link href="/budget" className="ws-card ws-budget" aria-label={`Smart Energy Budget: ${budgetPercent} percent used of ${household.budget > 0 ? `${pesos(household.budget)} monthly budget` : "No budget set yet"}. View budget.`}><div className="ws-heading-label"><span className="ws-icon-tile ws-icon-green"><ChartNoAxesColumnIncreasing aria-hidden="true" /></span><h2>Smart Energy Budget</h2></div><div className="ws-budget-summary"><strong>{household.budget > 0 ? `${budgetPercent}% used` : "Set a monthly budget"}</strong><ChevronRight aria-hidden="true" /></div><div className="ws-progress" role="progressbar" aria-label="Monthly energy budget used" aria-valuenow={budgetPercent} aria-valuemin={0} aria-valuemax={Math.max(100, budgetPercent)}><span style={{ width: `${Math.min(budgetPercent, 100)}%`, background: budgetPercent > 100 ? "#f2a238" : undefined }} /></div><p className="ws-muted">{household.budget > 0 ? `${pesos(household.budget)} monthly budget` : "No budget set yet"}</p></Link>
          </div>
          <DesktopHomeCards />
          <section className="ws-assistant-card" aria-labelledby="ws-assistant-title">
            <div className="ws-assistant-copy">
              <span className="ws-assistant-tag"><Sparkles aria-hidden="true" /> WattSnap AI</span>
              <h2 id="ws-assistant-title"><Link href="/assistant" className="ws-assistant-link">Hi {firstName}! Got an energy question?</Link></h2>
              <p>Ask about your bill, appliances, savings, or brownouts.</p>
              <span className="ws-assistant-input" aria-hidden="true">Ask me anything…<span><SendHorizontal /></span></span>
              <div className="ws-assistant-prompts">{assistantPrompts.map(prompt => <Link key={prompt} href={`/assistant?q=${encodeURIComponent(prompt)}`}>{prompt}</Link>)}</div>
            </div>
            <Image className="ws-assistant-mascot" src="/assets/branding/Cheerful Bee Robot Thumbs-Up.png" alt="" width={300} height={300} sizes="(min-width: 900px) 200px, 130px" />
          </section>
          <HomeAdvisoryCard />
          <HomeTipCard />
        </main>
        <p className="ws-desktop-preview">Saved on this device</p>
        <AppNavigation active="Home" />
        <LogoutDialog open={logout} onClose={() => setLogout(false)} name={household.name} />
      </div>
    </div>
  );
}
