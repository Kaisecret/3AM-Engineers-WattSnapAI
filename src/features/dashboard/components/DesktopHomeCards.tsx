"use client";
import Link from "next/link";
import { ChartNoAxesColumnIncreasing, ReceiptText, ScanLine } from "lucide-react";
import { usePreviewHousehold } from "../use-preview-household";
import { billMonth, pesos } from "../preview-data";

function SetupArtwork({ budget = false }: { budget?: boolean }) {
  return <svg viewBox="0 0 150 125" aria-hidden="true">
    {budget ? <><rect x="8" y="12" width="112" height="100" rx="15" fill="#e8f8ff" /><path d="M22 44h84" stroke="#00bbeb" strokeWidth="2" strokeDasharray="5 6" /><g fill="#a4e6f7"><rect x="23" y="77" width="15" height="25" rx="3" /><rect x="48" y="65" width="15" height="37" rx="3" /><rect x="73" y="53" width="15" height="49" rx="3" /><rect x="96" y="28" width="15" height="74" rx="3" /></g><circle cx="118" cy="88" r="24" fill="#ffda54" /><text x="118" y="99" textAnchor="middle" fill="white" fontSize="34" fontWeight="700">$</text></> : <><path d="M25 12h64l20 20v70q0 11-11 11H25q-11 0-11-11V23q0-11 11-11" fill="#e9f8ff" /><path d="M89 12v13q0 7 7 7h13" fill="#bce8f5" /><g stroke="#c8dce6" strokeWidth="6" strokeLinecap="round"><path d="M33 38h51M33 55h51M33 72h39M33 89h14" /></g><circle cx="101" cy="91" r="20" fill="#00b9e7" stroke="white" strokeWidth="2" /><path d="M101 82v18m-9-9h18" stroke="white" strokeWidth="3" strokeLinecap="round" /></>}
  </svg>;
}
export default function DesktopHomeCards() {
  const { household } = usePreviewHousehold();
  const latest = [...household.bills].sort((a, b) => b.month.localeCompare(a.month))[0];
  return <div className="ws-desktop-setup">
    <section className="ws-card ws-setup-card"><div className="ws-heading-label"><span className="ws-icon-tile ws-icon-blue"><ReceiptText aria-hidden="true" /></span><h2>Latest Bill</h2></div><div className="ws-setup-content"><SetupArtwork /><div><h3>{latest ? pesos(latest.amount) : "Add your latest bill"}</h3><p>{latest ? `${billMonth(latest.month)} · ${latest.kwh} kWh` : "Scan your bill to track your monthly costs."}</p><Link href={latest ? "/bills" : "/bills/new"} className="ui-primary"><ScanLine size={20} aria-hidden="true" />{latest ? "View bills" : "Scan bill"}</Link></div></div></section>
    <section className="ws-card ws-setup-card"><div className="ws-heading-label"><span className="ws-icon-tile ws-icon-green"><ChartNoAxesColumnIncreasing aria-hidden="true" /></span><h2>Smart Energy Budget</h2></div><div className="ws-setup-content"><SetupArtwork budget /><div><h3>Set your monthly budget</h3><p>Keep your electricity spending on track.</p><Link href="/budget" className="ui-secondary">Set budget</Link></div></div></section>
  </div>;
}
