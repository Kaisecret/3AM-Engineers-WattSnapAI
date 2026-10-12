"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUp, MapPin, RotateCcw, ScanText, Sparkles, WifiOff, X } from "lucide-react";
import { landingReply, landingSuggestions } from "../replies";
import { useChat } from "../use-chat";
import ChatThread, { BotAvatar } from "./ChatThread";

// Feature, provider and status names a visitor should be able to spot in an answer.
const terms = ["Snap AI", "Tipid Tips", "Watt-If", "Smart Energy Budget", "ANTECO", "AKELCO", "CAPELCO", "ILECO", "MORE Power", "PEPS", "offline", "Offline", "Possibly Affected", "Affected", "Not Listed"];
// One icon for each starter question, in the order of landingSuggestions.
const topicIcons = [Sparkles, ScanText, WifiOff, MapPin];

/** Floating "ask about WattSnap" chat for visitors on the landing page. */
export function LandingChatWidget() {
  const [open, setOpen] = useState(false);
  const [teaser, setTeaser] = useState(false);
  const [draft, setDraft] = useState("");
  const { messages, typing, send, reset } = useChat(landingReply, { endpoint: "/api/ai/landing" });
  const launcher = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setTeaser(true), 2500);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!open) return;
    input.current?.focus({ preventScroll: true });
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [open]);

  function close() { setOpen(false); launcher.current?.focus(); }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (send(draft)) setDraft("");
  }

  const intro = <div className="chat-row is-bot lchat-welcome">
    <BotAvatar />
    <div className="chat-bot-body">
      <div className="chat-bubble"><p><strong>Hi! I&apos;m WattSnap AI.</strong></p><p>Ask me anything about the app, or start with one of these.</p></div>
      {!messages.length && <div className="lchat-topics">{landingSuggestions.map((suggestion, index) => { const Icon = topicIcons[index] ?? Sparkles; return <button type="button" key={suggestion} onClick={() => send(suggestion)}><span><Icon aria-hidden="true" /></span>{suggestion}</button>; })}</div>}
    </div>
  </div>;

  return <div className="lchat">
    {open && <section id="lchat-panel" className="lchat-panel" role="dialog" aria-modal="false" aria-labelledby="lchat-title">
      <header className="lchat-head">
        <span className="chat-head-avatar"><BotAvatar size="md" /><i aria-hidden="true" /></span>
        <div className="chat-head-copy"><strong id="lchat-title">WattSnap AI</strong><span>Online · replies in seconds</span></div>
        <button type="button" className="chat-icon-button" onClick={reset} disabled={!messages.length && !typing} aria-label="Start a new chat"><RotateCcw aria-hidden="true" /></button>
        <button type="button" className="chat-icon-button" onClick={close} aria-label="Close chat"><X aria-hidden="true" /></button>
      </header>
      <ChatThread messages={messages} typing={typing} onSuggest={send} intro={intro} terms={terms} />
      <form className="chat-composer" onSubmit={submit}>
        <div className="chat-input">
          <input ref={input} maxLength={300} value={draft} placeholder="Ask about WattSnap…" aria-label="Message WattSnap AI" onChange={event => setDraft(event.target.value)} />
          <button type="submit" className="chat-send" disabled={!draft.trim() || typing} aria-label="Send message"><ArrowUp aria-hidden="true" /></button>
        </div>
        <p className="chat-disclaimer"><Sparkles aria-hidden="true" /> AI answers can be imperfect · <Link href="/signup">Sign up free</Link></p>
      </form>
    </section>}
    {!open && teaser && <div className="lchat-teaser">
      <button type="button" className="lchat-teaser-open" onClick={() => setOpen(true)}><strong>Hi there!</strong> Questions? Ask me.</button>
      <button type="button" className="lchat-teaser-close" aria-label="Dismiss" onClick={() => setTeaser(false)}><X aria-hidden="true" /></button>
    </div>}
    <button ref={launcher} type="button" className={`lchat-launcher${open ? " is-open" : ""}`} aria-label={open ? "Close chat" : "Chat with WattSnap AI"} aria-expanded={open} aria-controls={open ? "lchat-panel" : undefined} onClick={() => { if (open) close(); else { setOpen(true); setTeaser(false); } }}>
      {open ? <X aria-hidden="true" /> : <Image src="/assets/branding/Cheerful Bee Robot Thumbs-Up.png" alt="" width={140} height={140} sizes="72px" />}
      {!open && <span className="lchat-ping" aria-hidden="true" />}
    </button>
  </div>;
}
