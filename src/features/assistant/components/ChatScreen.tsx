"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUp, ChevronLeft, PlugZap, Plus, ReceiptText, RotateCcw, Sparkles, Wallet } from "lucide-react";
import AppHeader from "@/features/dashboard/components/AppHeader";
import AppNavigation from "@/features/dashboard/components/AppNavigation";
import { usePreviewHousehold } from "@/features/dashboard/use-preview-household";
import { amountPaid, compareWithPrevious, dailyApplianceKwh, effectiveRate, monthlySubsidyFor, pesos, shortMonth, sortBillsByMonth, type PreviewHousehold } from "@/features/dashboard/preview-data";
import { advisoryTypeLabels, formatAdvisoryDate } from "@/features/advisory-intelligence/advisory-preview";
import { advisoryTab, matchIsStale, matchPreviewAdvisory, scheduleLabel } from "@/features/advisory-intelligence/review-preview";
import { usePreviewAdvisories } from "@/features/advisory-intelligence/use-preview-advisories";
import type { ReviewedAdvisory } from "@/features/advisory-intelligence/types";
import { householdReply, type ChatContext } from "../replies";
import { applyAgentActions, describeAgentAction, type AgentAction } from "../agent-actions";
import { useChat, type ChatAction, type ChatMessage } from "../use-chat";
import ChatThread, { BotAvatar } from "./ChatThread";

const starters = [
  { label: "Add my appliances", text: "Help me add my appliances", icon: Plus },
  { label: "Set my budget", text: "Suggest a monthly budget for me and set it", icon: Wallet },
  { label: "Why did my bill change?", text: "Why did my bill change?", icon: ReceiptText },
  { label: "What uses the most?", text: "Which appliance uses the most?", icon: PlugZap },
];
const prompts = ["Set my budget to ₱2,000", "Add an electric fan, 8 hours a day", "Add my bill for this month", "Tips to save energy"];

function buildContext(household: PreviewHousehold, records: ReviewedAdvisory[]): ChatContext {
  const bills = sortBillsByMonth(household.bills);
  const top = [...household.appliances].sort((a, b) => dailyApplianceKwh(b) - dailyApplianceKwh(a))[0];
  const advisory = records.find(item => advisoryTab(item) === "active" && !matchIsStale(item, household) && matchPreviewAdvisory(item.details, household).status === "affected" && ["scheduled", "unscheduled"].includes(item.details.type));
  return {
    name: household.name,
    latest: bills[bills.length - 1],
    previous: bills[bills.length - 2],
    budget: household.budget,
    rate: effectiveRate(household.bills),
    topAppliance: top ? { name: top.name, monthlyKwh: dailyApplianceKwh(top) * 30 } : undefined,
    applianceCount: household.appliances.length,
    location: household.location,
    provider: household.provider,
    monthlySubsidy: monthlySubsidyFor(household),
    bills: bills.slice(-12).map(({ month, kwh, amount, subsidy, dueDate }) => ({ month, kwh, amount, ...(subsidy ? { subsidy } : {}), ...(dueDate ? { dueDate } : {}) })),
    appliances: household.appliances.slice(0, 40).map(({ name, watts, hours, quantity, days }) => ({ name, watts, hours, quantity, ...(days && days !== 30 ? { days } : {}) })),
    advisory: advisory ? { title: `${advisory.original.kind === "sample" ? "Sample · " : ""}${advisory.details.title || advisoryTypeLabels[advisory.details.type]}`, when: `${advisory.details.date ? formatAdvisoryDate(advisory.details.date) : "Date unknown"} · ${scheduleLabel(advisory.details)}`, area: advisory.details.areaText, reason: advisory.details.reason || "Not provided" } : undefined,
  };
}

export default function ChatScreen() {
  const { household, update, ready: householdReady } = usePreviewHousehold(), advisories = usePreviewAdvisories();
  const ready = householdReady && advisories.ready;
  const [draft, setDraft] = useState("");
  const input = useRef<HTMLTextAreaElement>(null);
  const asked = useRef(false);
  const context = useMemo(() => buildContext(household, advisories.records), [household, advisories.records]);
  const respond = useCallback((text: string) => householdReply(text, context), [context]);
  const describe = useCallback((action: AgentAction) => describeAgentAction(action, household), [household]);
  const { messages, typing, send, reset, setActionState } = useChat(respond, { endpoint: "/api/ai/assistant", context, describe, explainFallback: true });
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

  // Nothing the AI proposes is saved until the person taps Confirm.
  const actions = {
    onConfirm(message: ChatMessage, items: ChatAction[]) {
      const { patch, results } = applyAgentActions(household, items.map(item => item.action));
      const saved = !Object.keys(patch).length || update(patch);
      items.forEach((item, index) => {
        const result = results[index];
        if ("error" in result) setActionState(message.id, item.id, "failed", result.error);
        else setActionState(message.id, item.id, saved ? "done" : "failed", saved ? undefined : "Couldn’t save. Try again.");
      });
    },
    onCancel: (message: ChatMessage, item: ChatAction) => setActionState(message.id, item.id, "cancelled"),
  };

  const intro = <div className={`chat-welcome${messages.length ? " is-compact" : ""}`}>
    <div className="chat-welcome-art" aria-hidden="true"><span /><Image src="/assets/branding/Cheerful Bee Robot Thumbs-Up.png" alt="" width={300} height={300} sizes="160px" priority /></div>
    <h2>Hi {first}!</h2>
    <p>Ask me anything, or tell me what to change.</p>
    {!messages.length && <div className="chat-starters">{starters.map(({ label, text, icon: Icon }) => <button type="button" key={label} onClick={() => send(text)}><span><Icon aria-hidden="true" /></span><strong>{label}</strong></button>)}</div>}
  </div>;

  return <div className="ws-home chat-page"><div className="ws-shell">
    <AppHeader title="WattSnap AI" subtitle="Your home energy assistant" />
    <main className="chat-main">
      <section className="chat-panel" aria-label="Chat with WattSnap AI">
        <header className="chat-head">
          <Link href="/dashboard" className="chat-icon-button chat-back" aria-label="Back to home"><ChevronLeft aria-hidden="true" /></Link>
          <span className="chat-head-avatar"><BotAvatar size="md" /><i aria-hidden="true" /></span>
          <div className="chat-head-copy"><strong>WattSnap AI</strong><span>Your energy assistant</span></div>
          <button type="button" className="chat-icon-button" onClick={() => { reset(); input.current?.focus(); }} disabled={!messages.length && !typing} aria-label="Start a new chat"><RotateCcw aria-hidden="true" /></button>
        </header>
        <ChatThread messages={messages} typing={typing} onSuggest={send} intro={intro} actions={actions} />
        <form className="chat-composer" onSubmit={submit}>
          <div className="chat-input">
            <textarea ref={input} rows={1} maxLength={500} value={draft} placeholder="Message WattSnap AI…" aria-label="Message WattSnap AI" onChange={event => setDraft(event.target.value)} onKeyDown={onKey} />
            <button type="submit" className="chat-send" disabled={!draft.trim() || typing} aria-label="Send message"><ArrowUp aria-hidden="true" /></button>
          </div>
          <p className="chat-disclaimer"><Sparkles aria-hidden="true" /> AI can make mistakes. You confirm every change.</p>
        </form>
      </section>

      <aside className="chat-side" aria-label="Your energy snapshot">
        <div className="chat-side-hero">
          <Image src="/assets/branding/actions-5.png" alt="" width={240} height={240} sizes="120px" />
          <div><strong>Your energy buddy</strong><p>I can set your budget, bills and appliances. You confirm first.</p></div>
        </div>
        <div className="chat-side-card">
          <h3>Your snapshot</h3>
          <dl>
            <div><dt>Latest bill</dt><dd>{latest ? `${shortMonth(latest.month)} ${latest.month.slice(0, 4)} · ${latest.kwh} kWh` : "No bills yet"}</dd></div>
            {latest && <div><dt>Amount</dt><dd>{pesos(amountPaid(latest))}</dd></div>}
            {change && <div><dt>vs previous bill</dt><dd className={change.kwhPercent <= 0 ? "is-lower" : "is-higher"}>{change.kwhPercent === 0 ? "No change" : `${change.kwhPercent < 0 ? "↓" : "↑"} ${Math.abs(change.kwhPercent).toFixed(0)}%`}</dd></div>}
            <div><dt>Budget</dt><dd>{household.budget > 0 ? pesos(household.budget) : "Not set"}</dd></div>
            <div><dt>Appliances</dt><dd>{household.appliances.length}</dd></div>
          </dl>
        </div>
        <div className="chat-side-card">
          <h3>Try saying</h3>
          <div className="chat-side-prompts">{prompts.map(prompt => <button type="button" key={prompt} disabled={typing} onClick={() => send(prompt)}>{prompt}</button>)}</div>
        </div>
      </aside>
    </main>
    <AppNavigation active="Assistant" />
  </div></div>;
}
