"use client";
import { Fragment, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, CheckCheck, ChevronRight, CircleAlert, HandCoins, PlugZap, ReceiptText, SlidersHorizontal, Trash2, Wallet, X } from "lucide-react";
import type { AgentAction } from "../agent-actions";
import type { ChatAction, ChatMessage } from "../use-chat";

export function BotAvatar({ size = "sm" }: { size?: "sm" | "md" | "lg" }) {
  return <span className={`chat-avatar is-${size}`} aria-hidden="true"><Image src="/assets/branding/Cheerful Bee Robot Thumbs-Up.png" alt="" width={120} height={120} sizes="64px" /></span>;
}

function Inline({ value }: { value: string }) {
  // **bold** from the AI becomes <strong>; everything else stays plain text.
  return <>{value.split(/\*\*(.+?)\*\*/g).map((part, index) => index % 2 ? <strong key={index}>{part}</strong> : <Fragment key={index}>{part}</Fragment>)}</>;
}

const bullet = /^\s*(?:[•*-]|\d+[.)])\s+/;
function Text({ value }: { value: string }) {
  // Runs of lines that start with "• ", "- " or "1. " become a list; other lines are paragraphs.
  const blocks: Array<{ list: boolean; lines: string[] }> = [];
  for (const line of value.trim().split("\n")) {
    if (!line.trim()) { blocks.push({ list: false, lines: [] }); continue; }
    const list = bullet.test(line), last = blocks[blocks.length - 1];
    if (last && last.list === list && last.lines.length) last.lines.push(list ? line.replace(bullet, "") : line);
    else blocks.push({ list, lines: [list ? line.replace(bullet, "") : line] });
  }
  return <>{blocks.filter(block => block.lines.length).map((block, index) => block.list
    ? <ul key={index}>{block.lines.map((line, i) => <li key={i}><Inline value={line} /></li>)}</ul>
    : <p key={index}>{block.lines.map((line, i) => <span key={i}>{i > 0 && <br />}<Inline value={line} /></span>)}</p>)}</>;
}

const actionIcons: Record<AgentAction["type"], typeof Wallet> = {
  set_budget: Wallet, set_monthly_subsidy: HandCoins, add_appliance: PlugZap, update_appliance: SlidersHorizontal, remove_appliance: Trash2, add_bill: ReceiptText,
};
const doneWords: Record<AgentAction["type"], string> = {
  set_budget: "Budget saved", set_monthly_subsidy: "Subsidy saved", add_appliance: "Added", update_appliance: "Updated", remove_appliance: "Removed", add_bill: "Bill saved",
};

function ActionCard({ item, compact, onConfirm, onCancel }: { item: ChatAction; compact: boolean; onConfirm: () => void; onCancel: () => void }) {
  const Icon = actionIcons[item.action.type];
  const [, title = item.label, detail] = item.label.match(/^(.*?)(?:: | · )(.*)$/) ?? [];
  return <li className={`chat-action is-${item.state}`}>
    <span className="chat-action-icon"><Icon aria-hidden="true" /></span>
    <div className="chat-action-copy"><strong>{title}</strong>{detail && <span>{detail}</span>}</div>
    {item.state === "pending"
      ? <div className="chat-action-buttons">
        <button type="button" className="chat-action-cancel" onClick={onCancel} aria-label={`Cancel: ${item.label}`}>{compact ? <X aria-hidden="true" /> : "Cancel"}</button>
        <button type="button" className="chat-action-confirm" onClick={onConfirm} aria-label={`Confirm: ${item.label}`}><Check aria-hidden="true" />{!compact && "Confirm"}</button>
      </div>
      : <span className="chat-action-status" role="status">
        {item.state === "done" ? <><Check aria-hidden="true" />{doneWords[item.action.type]}</> : item.state === "cancelled" ? <><X aria-hidden="true" />Cancelled</> : <><CircleAlert aria-hidden="true" />{item.note || "Not saved"}</>}
      </span>}
  </li>;
}

export interface ActionHandlers {
  onConfirm: (message: ChatMessage, items: ChatAction[]) => void;
  onCancel: (message: ChatMessage, item: ChatAction) => void;
}

/** Message list shared by the in-app assistant and the landing page widget. */
export default function ChatThread({ messages, typing, onSuggest, intro, actions }: { messages: ChatMessage[]; typing: boolean; onSuggest: (text: string) => void; intro?: React.ReactNode; actions?: ActionHandlers }) {
  const thread = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = thread.current;
    if (!element || (!messages.length && !typing)) return;
    element.scrollTo({ top: element.scrollHeight, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [messages, typing]);

  return <div ref={thread} className="chat-thread" role="log" aria-live="polite" aria-relevant="additions">
    {intro}
    {messages.map((message, index) => {
      const last = index === messages.length - 1;
      if (message.role === "user") return <div key={message.id} className="chat-row is-user"><div className="chat-bubble">{message.text}</div></div>;
      const pending = message.actions?.filter(item => item.state === "pending") ?? [];
      return <div key={message.id} className="chat-row is-bot">
        <BotAvatar />
        <div className={`chat-bot-body${message.actions?.length && actions ? " has-actions" : ""}`}>
          <div className="chat-bubble"><Text value={message.text} /></div>
          {message.notice && <p className="chat-notice"><CircleAlert aria-hidden="true" />{message.notice}</p>}
          {!!message.actions?.length && actions && <div className={`chat-actions${message.actions.length > 1 ? " is-multi" : ""}`}>
            <ul>{message.actions.map(item => <ActionCard key={item.id} item={item} compact={message.actions!.length > 1} onConfirm={() => actions.onConfirm(message, [item])} onCancel={() => actions.onCancel(message, item)} />)}</ul>
            {pending.length > 1 && <button type="button" className="chat-action-all" onClick={() => actions.onConfirm(message, pending)}><CheckCheck aria-hidden="true" />Confirm all {pending.length}</button>}
          </div>}
          {!!message.reply?.links?.length && <div className="chat-links">{message.reply.links.map(link => <Link key={link.href + link.label} href={link.href}>{link.label}<ChevronRight aria-hidden="true" /></Link>)}</div>}
          {last && !typing && !!message.reply?.suggestions?.length && <div className="chat-suggestions">{message.reply.suggestions.map(suggestion => <button type="button" key={suggestion} onClick={() => onSuggest(suggestion)}>{suggestion}</button>)}</div>}
        </div>
      </div>;
    })}
    {typing && <div className="chat-row is-bot"><BotAvatar /><div className="chat-bubble chat-typing" role="status" aria-label="WattSnap AI is typing"><i /><i /><i /></div></div>}
  </div>;
}
