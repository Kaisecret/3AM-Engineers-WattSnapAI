"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Reply } from "./replies";

export interface ChatMessage { id: number; role: "user" | "bot"; text: string; reply?: Reply; }

/** Immediate local guidance; no simulated network or model-processing delay. */
export function useChat(respond: (text: string) => Reply) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const nextId = useRef(0);
  const respondRef = useRef(respond);

  useEffect(() => { respondRef.current = respond; }, [respond]);

  const send = useCallback((raw: string) => {
    const text = raw.trim();
    if (!text) return false;
    const reply = respondRef.current(text);
    const question: ChatMessage = { id: nextId.current++, role: "user", text };
    const answer: ChatMessage = { id: nextId.current++, role: "bot", text: reply.text, reply };
    setMessages(current => [...current, question, answer]);
    return true;
  }, []);

  const reset = useCallback(() => setMessages([]), []);

  return { messages, typing: false, send, reset };
}
