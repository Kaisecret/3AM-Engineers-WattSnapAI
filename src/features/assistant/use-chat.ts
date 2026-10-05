"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Reply } from "./replies";

export interface ChatMessage { id: number; role: "user" | "bot"; text: string; reply?: Reply; }

/** Conversation state with a short typing pause before each reply. */
export function useChat(respond: (text: string) => Reply) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typing, setTyping] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const nextId = useRef(0);
  const respondRef = useRef(respond);
  const busy = useRef(false);

  useEffect(() => { respondRef.current = respond; }, [respond]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const send = useCallback((raw: string) => {
    const text = raw.trim();
    // One question at a time, so a pending reply is never dropped.
    if (!text || busy.current) return false;
    busy.current = true;
    setMessages(current => [...current, { id: nextId.current++, role: "user", text }]);
    setTyping(true);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    timer.current = window.setTimeout(() => {
      // Answer with the latest context, which may have loaded while "typing".
      const reply = respondRef.current(text);
      setMessages(current => [...current, { id: nextId.current++, role: "bot", text: reply.text, reply }]);
      setTyping(false);
      busy.current = false;
    }, reduced ? 250 : 900 + Math.min(text.length * 12, 600));
    return true;
  }, []);

  const reset = useCallback(() => { window.clearTimeout(timer.current); busy.current = false; setMessages([]); setTyping(false); }, []);

  return { messages, typing, send, reset };
}
