"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { AirVent, ChevronLeft, Megaphone, PlugZap, ReceiptText, RotateCcw, SendHorizontal, Sparkles } from "lucide-react";
import AppHeader from "@/features/dashboard/components/AppHeader";
import AppNavigation from "@/features/dashboard/components/AppNavigation";
import { usePreviewHousehold } from "@/features/dashboard/use-preview-household";
import { compareWithPrevious, dailyApplianceKwh, effectiveRate, pesos, shortMonth, sortBillsByMonth, type PreviewHousehold } from "@/features/dashboard/preview-data";
import { advisoryPreview, advisoryTypeLabels, formatAdvisoryDate } from "@/features/advisory-intelligence/advisory-preview";
import { householdReply, householdSuggestions, type ChatContext } from "../replies";
import { useChat } from "../use-chat";
import ChatThread, { BotAvatar } from "./ChatThread";

const location = "San Jose de Buenavista, Antique";
const starters = [
  { text: householdSuggestions[0], hint: "Compare with last month", icon: ReceiptText },
  { text: householdSuggestions[1], hint: "Cooling without the cost", icon: AirVent },
  { text: householdSuggestions[2], hint: "Check your area", icon: Megaphone },
  { text: householdSuggestions[3], hint: "Find your biggest user", icon: PlugZap },
];

function buildContext(household: PreviewHousehold): ChatContext {
  const bills = sortBillsByMonth(household.bills);
  const top = [...household.appliances].sort((a, b) => dailyApplianceKwh(b) - dailyApplianceKwh(a))[0];
  const advisory = advisoryPreview.find(item => item.tab === "active" && item.status === "affected" && (item.type === "scheduled" || item.type === "unscheduled"));
  return {
    name: household.name,
    latest: bills[bills.length - 1],
    previous: bills[bills.length - 2],
    budget: household.budget,
    rate: effectiveRate(household.bills),
    topAppliance: top ? { name: top.name, monthlyKwh: dailyApplianceKwh(top) * 30 } : undefined,
    applianceCount: household.appliances.length,
    location,
    advisory: advisory ? { title: advisoryTypeLabels[advisory.type], when: `${formatAdvisoryDate(advisory.date)} · ${advisory.time}`, area: advisory.area, reason: advisory.reason } : undefined,
  };
}

export default function ChatScreen() {
  const { household, ready } = usePreviewHousehold();
  const [draft, setDraft] = useState("");
  const input = useRef<HTMLTextAreaElement>(null);
  const asked = useRef(false);
  const context = useMemo(() => buildContext(household), [household]);
  const respond = useCallback((text: string) => householdReply(text, context), [context]);
  const { messages, typing, send, reset } = useChat(respond);
  const first = household.name.split(/\s+/)[0];
  const latest = context.latest;
  const change = latest ? compareWithPrevious(household.bills, latest.month) : null;

  // Questions picked on the Home card arrive as ?q=…
  useEffect(() => {
    if (!ready || asked.current) return;
    asked.current = true;
    const question = new URLSearchParams(window.location.search).get("q");
    if (question) { send(question.slice(0, 300)); window.history.replaceState(null, "", "/assistant"); }
  }, [ready, send]);

  useEffect(() => {
    const element = input.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 120)}px`;
  }, [draft]);

  function submit(event?: FormEvent) {
    event?.preventDefault();
    if (typing) return;
    if (send(draft)) setDraft("");
    input.current?.focus();
  }
  function onKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); submit(); }
  }

  const intro = <div className={`chat-welcome${messages.length ? " is-compact" : ""}`}>
    <div className="chat-welcome-art" aria-hidden="true"><span /><Image src="/assets/branding/wattsnap-mascot.png" alt="" width={300} height={300} sizes="160px" priority /></div>
    <h2>Hi {first}! I&apos;m WattSnap AI</h2>
    <p>Ask me about your bills, appliances, savings, or brownouts. I answer using what you&apos;ve saved in WattSnap.</p>
    {!messages.length && <div className="chat-starters">{starters.map(({ text, hint, icon: Icon }) => <button type="button" key={text} onClick={() => send(text)}><span><Icon aria-hidden="true" /></span><strong>{text}</strong><small>{hint}</small></button>)}</div>}
  </div>;

  return <div className="ws-home chat-page"><div className="ws-shell">
    <AppHeader title="WattSnap AI" subtitle="Your home energy assistant" />
    <main className="chat-main">
      <section className="chat-panel" aria-label="Chat with WattSnap AI">
        <header className="chat-head">
          <Link href="/dashboard" className="chat-icon-button chat-back" aria-label="Back to home"><ChevronLeft aria-hidden="true" /></Link>
          <BotAvatar size="md" />
          <div className="chat-head-copy"><strong>WattSnap AI</strong><span><i aria-hidden="true" /> Online · your energy buddy</span></div>
          <button type="button" className="chat-icon-button" onClick={() => { reset(); input.current?.focus(); }} disabled={!messages.length && !typing} aria-label="Start a new chat"><RotateCcw aria-hidden="true" /></button>
        </header>
        <ChatThread messages={messages} typing={typing} onSuggest={send} intro={intro} />
        <form className="chat-composer" onSubmit={submit}>
          <div className="chat-input">
            <textarea ref={input} rows={1} maxLength={300} value={draft} placeholder="Ask me anything…" aria-label="Message WattSnap AI" onChange={event => setDraft(event.target.value)} onKeyDown={onKey} />
            <button type="submit" className="chat-send" disabled={!draft.trim() || typing} aria-label="Send message"><SendHorizontal aria-hidden="true" /></button>
          </div>
          <p className="chat-disclaimer"><Sparkles aria-hidden="true" /> Preview assistant · answers use your saved records and general energy tips</p>
        </form>
      </section>

      <aside className="chat-side" aria-label="Your energy snapshot">
        <div className="chat-side-hero">
          <Image src="/assets/branding/actions-5.png" alt="" width={240} height={240} sizes="120px" />
          <div><strong>Your energy buddy</strong><p>I read your saved bills and appliances, so my answers fit your home.</p></div>
        </div>
        <div className="chat-side-card">
          <h3>Your snapshot</h3>
          <dl>
            <div><dt>Latest bill</dt><dd>{latest ? `${shortMonth(latest.month)} ${latest.month.slice(0, 4)} · ${latest.kwh} kWh` : "No bills yet"}</dd></div>
            {latest && <div><dt>Amount</dt><dd>{pesos(latest.amount)}</dd></div>}
            {change && <div><dt>vs last month</dt><dd className={change.kwhPercent <= 0 ? "is-lower" : "is-higher"}>{change.kwhPercent <= 0 ? "↓" : "↑"} {Math.abs(change.kwhPercent).toFixed(0)}%</dd></div>}
            {latest && <div><dt>Budget used</dt><dd>{Math.round(latest.amount / household.budget * 100)}%</dd></div>}
            {context.topAppliance && <div><dt>Top appliance</dt><dd>{context.topAppliance.name}</dd></div>}
          </dl>
        </div>
        <div className="chat-side-card">
          <h3>Try asking</h3>
          <div className="chat-side-prompts">{["How much of my budget did I use?", "Tips to save energy", "What is a kWh?", "How do I scan my bill?"].map(prompt => <button type="button" key={prompt} disabled={typing} onClick={() => send(prompt)}>{prompt}</button>)}</div>
        </div>
      </aside>
    </main>
    <AppNavigation active="Assistant" />
  </div></div>;
}
