"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUp, ChevronLeft, PlugZap, Plus, ReceiptText, RotateCcw, Sparkles, Wallet } from "lucide-react";
import AppHeader from "@/features/dashboard/components/AppHeader";
import AppNavigation from "@/features/dashboard/components/AppNavigation";
import { usePreviewStorageKey } from "@/features/auth/use-preview-storage-key";
import { usePreviewHousehold } from "@/features/dashboard/use-preview-household";
import { amountPaid, compareWithPrevious, pesos, previewStorageKey, shortMonth } from "@/features/dashboard/preview-data";
import { usePreviewAdvisories } from "@/features/advisory-intelligence/use-preview-advisories";
import { usePreviewTips } from "@/features/tipid-tips/use-preview-tips";
import { usePreparationProgress } from "@/features/advisory-intelligence/use-preparation-progress";
import { usePreviewScenarios } from "@/features/watt-if-simulator/use-preview-scenarios";
import { buildChatContext } from "../context";
import { isNetworkOffline } from "@/features/offline-access/connectivity";
import { householdReply } from "../replies";
import { applyAgentActions, describeAgentAction, type AgentAction } from "../agent-actions";
import { useChat, type ChatAction, type ChatMessage } from "../use-chat";
import { localAgentReply } from "../local-agent";
import { hybridLocalReply } from "../hybrid-reply";
import { inferTinyBert } from "../tinybert-client";
import type { LocalPending } from "../local-agent";
import type { ChatContext } from "../replies";
import OfflineLanguageStatus from "./OfflineLanguageStatus";
import ChatThread, { BotAvatar } from "./ChatThread";

const starters = [
  { label: "My appliances", text: "List my appliances and their cost", icon: Plus },
  { label: "My budget", text: "What is my current budget?", icon: Wallet },
  { label: "Bill history", text: "Show my bill history", icon: ReceiptText },
  { label: "What uses the most?", text: "Which appliance uses the most?", icon: PlugZap },
];
const prompts = ["My budget and bill history", "Magkano ang budget ko?", "My saved tips and checklist", "Set my budget to ₱2,000"];
const offlineAgent = (text:string,context:ChatContext,pending?:LocalPending) => hybridLocalReply(text,context,pending,inferTinyBert);

export default function ChatScreen() {
  const { household, update, ready: householdReady, storageError } = usePreviewHousehold(), advisories = usePreviewAdvisories();
  const tips=usePreviewTips(), progress=usePreparationProgress(), scenarios=usePreviewScenarios();
  const ready = householdReady && advisories.ready && tips.ready && progress.ready && scenarios.ready;
  const [draft, setDraft] = useState("");
  const input = useRef<HTMLTextAreaElement>(null);
  const asked = useRef(false);
  const confirmed = useRef(new Set<number>());
  const [offline, setOffline] = useState(false);
  const context = useMemo(() => buildChatContext(household, advisories.records, {tips:tips.snapshot,preparation:progress.entries,scenarios:scenarios.scenarios,unavailable:[storageError&&"household",advisories.error&&"advisories",tips.error&&"tips",progress.error&&"readiness",scenarios.error&&"scenarios"].filter((item):item is string=>!!item)}), [household,advisories.records,tips.snapshot,progress.entries,scenarios.scenarios,storageError,advisories.error,tips.error,progress.error,scenarios.error]);
  const respond = useCallback((text: string) => householdReply(text, context), [context]);
  const describe = useCallback((action: AgentAction) => describeAgentAction(action, household), [household]);
  const { messages, typing, send, reset, setActionState } = useChat(respond, { endpoint: "/api/ai/assistant", context, describe, explainFallback: true, localAgent: localAgentReply, asyncLocalAgent: offlineAgent });
  const householdKey = usePreviewStorageKey(previewStorageKey);
  useEffect(() => { reset(); confirmed.current.clear(); }, [householdKey, reset]);
  const first = household.name.split(/\s+/)[0];
  const latest = context.latest;
  const change = latest ? compareWithPrevious(household.bills, latest.month) : null;
  useEffect(() => {
    const sync = () => setOffline(isNetworkOffline());
    sync(); window.addEventListener("online", sync); window.addEventListener("offline", sync);
    return () => { window.removeEventListener("online", sync); window.removeEventListener("offline", sync); };
  }, []);

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
    if (typing || !ready) return;
    if (send(draft)) setDraft("");
    input.current?.focus();
  }
  function onKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); submit(); }
  }

  // Nothing the AI proposes is saved until the person taps Confirm.
  const actions = {
    onConfirm(message: ChatMessage, items: ChatAction[]) {
      if (!ready) return;
      items = items.filter(item => item.state === "pending" && !confirmed.current.has(item.id));
      if (!items.length) return;
      items.forEach(item => confirmed.current.add(item.id));
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
    <p>Ask about your saved home—even offline. Budget, history, appliances and more.</p>
    {!messages.length && <div className="chat-starters">{starters.map(({ label, text, icon: Icon }) => <button type="button" key={label} disabled={!ready || typing} onClick={() => send(text)}><span><Icon aria-hidden="true" /></span><strong>{label}</strong></button>)}</div>}
  </div>;

  return <div className="ws-home chat-page"><div className="ws-shell">
    <AppHeader title="WattSnap AI" subtitle="Your home energy assistant" />
    <main className="chat-main">
      <section className="chat-panel" aria-label="Chat with WattSnap AI">
        <header className="chat-head">
          <Link href="/dashboard" className="chat-icon-button chat-back" aria-label="Back to home"><ChevronLeft aria-hidden="true" /></Link>
          <span className={`chat-head-avatar${offline ? " is-offline" : ""}`}><BotAvatar size="md" /><i aria-hidden="true" /></span>
          <div className="chat-head-copy"><strong>WattSnap AI</strong><span>{offline ? "Offline · local assistant" : "Your energy assistant"}</span></div>
          <button type="button" className="chat-icon-button" onClick={() => { reset(); input.current?.focus(); }} disabled={!messages.length && !typing} aria-label="Start a new chat"><RotateCcw aria-hidden="true" /></button>
        </header>
        {offline && <p className="chat-offline-status" role="status">Offline · answers come from records saved on this device. New photos and provider updates need internet.</p>}
        <OfflineLanguageStatus offline={offline} />
        {storageError && <p className="chat-offline-status" role="alert">{storageError}</p>}
        <ChatThread messages={messages} typing={typing} onSuggest={send} intro={intro} actions={actions} />
        <form className="chat-composer" onSubmit={submit}>
          <div className="chat-input">
            <textarea ref={input} rows={1} maxLength={500} disabled={!ready} value={draft} placeholder="Ask about budget, bills, appliances…" aria-label="Message WattSnap AI" onChange={event => setDraft(event.target.value)} onKeyDown={onKey} />
            <button type="submit" className="chat-send" disabled={!ready || !draft.trim() || typing} aria-label="Send message"><ArrowUp aria-hidden="true" /></button>
          </div>
          <p className="chat-disclaimer"><Sparkles aria-hidden="true" />{offline ? "Offline mode · confirm each change before saving" : "Review the values before confirming a change"}</p>
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
          <div className="chat-side-prompts">{prompts.map(prompt => <button type="button" key={prompt} disabled={!ready || typing} onClick={() => send(prompt)}>{prompt}</button>)}</div>
        </div>
      </aside>
    </main>
    <AppNavigation active="Assistant" />
  </div></div>;
}
