"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatContext, Reply } from "./replies";

export interface ChatMessage { id: number; role: "user" | "bot"; text: string; reply?: Reply; }

export function useChat(respond: (text: string) => Reply, context?: ChatContext) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typing, setTyping] = useState(false);
  const nextId = useRef(0);
  const respondRef = useRef(respond);
  const contextRef = useRef(context);

  useEffect(() => { respondRef.current = respond; }, [respond]);
  useEffect(() => { contextRef.current = context; }, [context]);

  const send = useCallback((raw: string): boolean => {
    const text = raw.trim();
    if (!text) return false;

    const question: ChatMessage = { id: nextId.current++, role: "user", text };
    setMessages(current => [...current, question]);

    if (typeof navigator !== "undefined" && navigator.onLine) {
      setTyping(true);
      fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          context: contextRef.current,
          history: messages.slice(-4).map(m => ({ role: m.role, text: m.text })),
        }),
      })
        .then(response => {
          if (!response.ok) throw new Error("Network response not ok");
          return response.json();
        })
        .then(data => {
          if (data?.reply) {
            const answer: ChatMessage = { id: nextId.current++, role: "bot", text: data.reply.text, reply: data.reply };
            setMessages(current => [...current, answer]);
          } else {
            throw new Error("No reply payload");
          }
        })
        .catch(() => {
          const fallback = respondRef.current(text);
          const answer: ChatMessage = { id: nextId.current++, role: "bot", text: fallback.text, reply: fallback };
          setMessages(current => [...current, answer]);
        })
        .finally(() => {
          setTyping(false);
        });
    } else {
      const fallback = respondRef.current(text);
      const answer: ChatMessage = { id: nextId.current++, role: "bot", text: fallback.text, reply: fallback };
      setMessages(current => [...current, answer]);
    }

    return true;
  }, [messages]);

  const reset = useCallback(() => setMessages([]), []);

  return { messages, typing, send, reset };
}
