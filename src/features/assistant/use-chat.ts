"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentAction } from "./agent-actions";
import type { ChatContext, Reply } from "./replies";

export type ActionState = "pending" | "done" | "cancelled" | "failed";
/** A change WattSnap AI proposed, waiting for the person to confirm or cancel it. */
export interface ChatAction { id: number; action: AgentAction; label: string; state: ActionState; note?: string; }
export interface ChatMessage { id: number; role: "user" | "bot"; text: string; reply?: Reply; actions?: ChatAction[]; }

interface ChatOptions {
  /** Server route that answers with Gemini. Rule-based `respond` answers when it cannot. */
  endpoint: string;
  context?: ChatContext;
  /** Plain words for a proposed change, shown on its Confirm card. */
  describe?: (action: AgentAction) => string;
}

const stateWords: Record<ActionState, string> = { pending: "waiting for confirmation", done: "confirmed and saved", cancelled: "cancelled", failed: "could not be saved" };
// Earlier turns as plain text, including what happened to each proposed change.
const toTurn = (message: ChatMessage) => ({
  role: message.role,
  text: message.actions?.length ? `${message.text}\n(${message.actions.map(item => `${item.label}: ${stateWords[item.state]}`).join("; ")})` : message.text,
});

export function useChat(respond: (text: string) => Reply, { endpoint, context, describe }: ChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typing, setTyping] = useState(false);
  const nextId = useRef(0);
  const busy = useRef(false);
  const session = useRef(0);
  const respondRef = useRef(respond);
  const contextRef = useRef(context);
  const describeRef = useRef(describe);
  const messagesRef = useRef(messages);

  useEffect(() => { respondRef.current = respond; }, [respond]);
  useEffect(() => { contextRef.current = context; }, [context]);
  useEffect(() => { describeRef.current = describe; }, [describe]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const send = useCallback((raw: string): boolean => {
    const text = raw.trim();
    if (!text || busy.current) return false;

    const history = messagesRef.current.slice(-6).map(toTurn);
    const chat = session.current;
    setMessages(current => [...current, { id: nextId.current++, role: "user", text }]);

    const answer = (reply: Reply, actions: AgentAction[] = []) => {
      if (chat !== session.current) return;
      const proposed = actions.map(action => ({ id: nextId.current++, action, label: describeRef.current?.(action) ?? "", state: "pending" as const }));
      setMessages(current => [...current, { id: nextId.current++, role: "bot", text: reply.text, reply, ...(proposed.length ? { actions: proposed } : {}) }]);
    };
    const local = () => answer(respondRef.current(text));

    if (typeof navigator !== "undefined" && !navigator.onLine) { local(); return true; }

    busy.current = true;
    setTyping(true);
    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, context: contextRef.current, history }),
    })
      .then(async response => {
        const data = await response.json().catch(() => null);
        if (response.status === 401) return answer({ text: "Your session ended. Please log in again.", links: [{ label: "Log in", href: "/login" }] });
        if ((response.status === 429 || response.status === 413) && typeof data?.error === "string") return answer({ text: data.error });
        if (!response.ok || typeof data?.reply?.text !== "string") throw new Error("No reply");
        answer(data.reply, Array.isArray(data.actions) ? data.actions : []);
      })
      .catch(local)
      .finally(() => { if (chat === session.current) { busy.current = false; setTyping(false); } });

    return true;
  }, [endpoint]);

  const setActionState = useCallback((messageId: number, actionId: number, state: ActionState, note?: string) => {
    setMessages(current => current.map(message => message.id !== messageId ? message : {
      ...message, actions: message.actions?.map(item => item.id === actionId ? { ...item, state, note } : item),
    }));
  }, []);

  const reset = useCallback(() => { session.current++; busy.current = false; setTyping(false); setMessages([]); }, []);

  return { messages, typing, send, reset, setActionState };
}
