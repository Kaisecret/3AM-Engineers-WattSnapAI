"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentAction } from "./agent-actions";
import type { ChatContext, Reply } from "./replies";
import type { LocalAgentResult, LocalPending } from "./local-agent";
import type { HybridResult } from "./hybrid-reply";
import { isNetworkOffline } from "../offline-access/connectivity";

export type ActionState = "pending" | "done" | "cancelled" | "failed";
/** A change WattSnap AI proposed, waiting for the person to confirm or cancel it. */
export interface ChatAction { id: number; action: AgentAction; label: string; state: ActionState; note?: string; }
/** Set when a built-in answer was used because WattSnap AI (Gemini) could not answer. */
export interface ChatMessage { id: number; role: "user" | "bot"; text: string; reply?: Reply; actions?: ChatAction[]; notice?: string; source?: "gemini" | "tinybert" | "keywords"; }

interface ChatOptions {
  /** Server route that answers with Gemini. Rule-based `respond` answers when it cannot. */
  endpoint: string;
  context?: ChatContext;
  /** Plain words for a proposed change, shown on its Confirm card. */
  describe?: (action: AgentAction) => string;
  /** Say under an answer when it is a built-in answer and why. */
  explainFallback?: boolean;
  localAgent?: (text: string, context: ChatContext, pending?: LocalPending) => LocalAgentResult;
  asyncLocalAgent?: (text: string, context: ChatContext, pending?: LocalPending) => Promise<HybridResult>;
}

function noticeFor(source: ChatMessage["source"], problem?: string) {
  if (source === "gemini") return "Gemini · online";
  const local = source === "tinybert" ? "TinyBERT" : "local reply";
  if (problem === "offline") return `${source === "tinybert" ? "TinyBERT · offline" : "Offline"} · saved data`;
  return `Gemini ${problem === "busy" ? "is busy" : "is unavailable"} · ${local} · saved data`;
}

const stateWords: Record<ActionState, string> = { pending: "waiting for confirmation", done: "confirmed and saved", cancelled: "cancelled", failed: "could not be saved" };
// Earlier turns as plain text, including what happened to each proposed change.
const toTurn = (message: ChatMessage) => ({
  role: message.role,
  text: message.actions?.length ? `${message.text}\n(${message.actions.map(item => `${item.label}: ${stateWords[item.state]}`).join("; ")})` : message.text,
});

export function useChat(respond: (text: string) => Reply, { endpoint, context, describe, explainFallback = false, localAgent, asyncLocalAgent }: ChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typing, setTyping] = useState(false);
  const nextId = useRef(0);
  const busy = useRef(false);
  const session = useRef(0);
  const respondRef = useRef(respond);
  const contextRef = useRef(context);
  const describeRef = useRef(describe);
  const messagesRef = useRef(messages);
  const localAgentRef = useRef(localAgent);
  const asyncLocalAgentRef = useRef(asyncLocalAgent);
  const pending = useRef<LocalPending | undefined>(undefined);
  const request = useRef<AbortController | null>(null);

  useEffect(() => { respondRef.current = respond; }, [respond]);
  useEffect(() => { contextRef.current = context; }, [context]);
  useEffect(() => { describeRef.current = describe; }, [describe]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { localAgentRef.current = localAgent; }, [localAgent]);
  useEffect(() => { asyncLocalAgentRef.current = asyncLocalAgent; }, [asyncLocalAgent]);
  useEffect(() => () => { session.current++; request.current?.abort(); }, []);

  const send = useCallback((raw: string): boolean => {
    const text = raw.trim();
    if (!text || busy.current) return false;

    const history = messagesRef.current.slice(-6).map(toTurn);
    const chat = session.current;
    setMessages(current => [...current, { id: nextId.current++, role: "user", text }]);

    const answer = (reply: Reply, actions: AgentAction[] = [], problem?: string, source?: ChatMessage["source"]) => {
      if (chat !== session.current) return;
      const proposed = actions.map(action => ({ id: nextId.current++, action, label: describeRef.current?.(action) ?? "", state: "pending" as const }));
      const notice = explainFallback && (source || problem) ? noticeFor(source, problem) : undefined;
      setMessages(current => [...current, { id: nextId.current++, role: "bot", text: reply.text, reply, ...(proposed.length ? { actions: proposed } : {}), ...(notice ? { notice } : {}), ...(source ? { source } : {}) }]);
    };
    const local = async (problem: string) => {
      if (chat !== session.current) return;
      let result: LocalAgentResult | HybridResult | undefined;
      let clarification = pending.current;
      // If the connection drops after Gemini asks for a missing field, recover
      // only validated grammar state from previous turns. Never replay actions.
      if (!clarification && localAgentRef.current) {
        for (const turn of history) {
          if (turn.role === "bot" && /\([^\n]*(?:confirmed and saved|cancelled)\)/.test(turn.text)) clarification = undefined;
          else if (turn.role === "user") clarification = localAgentRef.current(turn.text, contextRef.current ?? {}, clarification).pending;
        }
      }
      try {
        result = asyncLocalAgentRef.current ? await asyncLocalAgentRef.current(text,contextRef.current??{},clarification) : localAgentRef.current?.(text, contextRef.current ?? {}, clarification);
      } catch { result = localAgentRef.current?.(text,contextRef.current??{},clarification); }
      if (chat !== session.current) return;
      pending.current = result?.pending;
      const source = result && "source" in result && result.source === "tinybert" ? "tinybert" : "keywords";
      answer(result?.reply ?? respondRef.current(text), result?.actions ?? [], isNetworkOffline() ? "offline" : problem, source);
    };

    // Cached documents can remain open after reconnecting. Check the current
    // network for every turn and let the POST establish actual reachability.
    if (isNetworkOffline()) {
      busy.current = true; setTyping(true);
      void local("offline").finally(() => { if (chat === session.current) { busy.current=false; setTyping(false); } });
      return true;
    }

    busy.current = true;
    setTyping(true);
    const controller = new AbortController();
    request.current = controller;
    const timer = setTimeout(() => controller.abort(), 28000);
    fetch(endpoint, {
      method: "POST", signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, context: contextRef.current ? {...contextRef.current,bills:contextRef.current.bills?.slice(-12),appliances:contextRef.current.appliances?.slice(0,40),savedAdvisories:contextRef.current.savedAdvisories?.slice(-5),savedScenarios:contextRef.current.savedScenarios?.slice(-5),readinessPlans:contextRef.current.readinessPlans?.slice(-5)} : undefined, history }),
    })
      .then(async response => {
        const data = await response.json().catch(() => null);
        if (chat !== session.current) return;
        if (response.status === 401) return answer({ text: "Your session ended. Please log in again.", links: [{ label: "Log in", href: "/login" }] });
        if (response.status === 429) return local("busy");
        if (response.status === 413 && typeof data?.error === "string") return answer({ text: data.error });
        if (!response.ok || typeof data?.reply?.text !== "string") throw new Error("No reply");
        if (data.source !== "gemini" && localAgentRef.current) return local(typeof data.problem === "string" ? data.problem : "unavailable");
        pending.current = undefined;
        answer(data.reply, Array.isArray(data.actions) ? data.actions : [], data.source === "gemini" ? undefined : typeof data.problem === "string" ? data.problem : "unavailable", data.source === "gemini" ? "gemini" : "keywords");
      })
      .catch(() => local("server"))
      .finally(() => { clearTimeout(timer); if (chat === session.current) { request.current = null; busy.current = false; setTyping(false); } });

    return true;
  }, [endpoint, explainFallback]);

  const setActionState = useCallback((messageId: number, actionId: number, state: ActionState, note?: string) => {
    setMessages(current => current.map(message => message.id !== messageId ? message : {
      ...message, actions: message.actions?.map(item => item.id === actionId ? { ...item, state, note } : item),
    }));
  }, []);

  const reset = useCallback(() => { session.current++; request.current?.abort(); request.current = null; pending.current = undefined; busy.current = false; setTyping(false); messagesRef.current = []; setMessages([]); }, []);

  return { messages, typing, send, reset, setActionState };
}
