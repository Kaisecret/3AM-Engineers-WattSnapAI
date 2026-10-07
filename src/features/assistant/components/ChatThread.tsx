"use client";
import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ChatMessage } from "../use-chat";

export function BotAvatar({ size = "sm" }: { size?: "sm" | "md" | "lg" }) {
  return <span className={`chat-avatar is-${size}`} aria-hidden="true"><Image src="/assets/branding/Cheerful Bee Robot Thumbs-Up.png" alt="" width={120} height={120} sizes="64px" /></span>;
}

function Text({ value }: { value: string }) {
  // Lines that start with "• " become a list; blank lines separate paragraphs.
  return <>{value.split("\n\n").map((block, index) => {
    const lines = block.split("\n");
    return lines.every(line => line.startsWith("• "))
      ? <ul key={index}>{lines.map(line => <li key={line}>{line.slice(2)}</li>)}</ul>
      : <p key={index}>{lines.map((line, i) => <span key={i}>{i > 0 && <br />}{line}</span>)}</p>;
  })}</>;
}

/** Message list shared by the in-app assistant and the landing page widget. */
export default function ChatThread({ messages, typing, onSuggest, intro }: { messages: ChatMessage[]; typing: boolean; onSuggest: (text: string) => void; intro?: React.ReactNode }) {
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
      return message.role === "user"
        ? <div key={message.id} className="chat-row is-user"><div className="chat-bubble">{message.text}</div></div>
        : <div key={message.id} className="chat-row is-bot">
          <BotAvatar />
          <div className="chat-bot-body">
            <div className="chat-bubble"><Text value={message.text} /></div>
            {!!message.reply?.links?.length && <div className="chat-links">{message.reply.links.map(link => <Link key={link.href + link.label} href={link.href}>{link.label}<ChevronRight aria-hidden="true" /></Link>)}</div>}
            {last && !typing && !!message.reply?.suggestions?.length && <div className="chat-suggestions">{message.reply.suggestions.map(suggestion => <button type="button" key={suggestion} onClick={() => onSuggest(suggestion)}>{suggestion}</button>)}</div>}
          </div>
        </div>;
    })}
    {typing && <div className="chat-row is-bot"><BotAvatar /><div className="chat-bubble chat-typing" aria-label="WattSnap AI is typing"><i /><i /><i /></div></div>}
  </div>;
}
