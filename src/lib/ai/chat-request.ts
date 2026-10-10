import type { ChatContext } from "../../features/assistant/replies";

export type ChatTurn = { role: "user" | "bot"; text: string };
export type ChatRequest = { message: string; history: ChatTurn[]; context: ChatContext };
export type ParsedChatRequest = { ok: true; value: ChatRequest } | { ok: false; status: number; error: string };

/** Limits that keep one request small, so it cannot drain the shared Gemini quota. */
export const chatLimits = { body: 32_000, message: 500, turns: 6, turnText: 600, context: 16_000 };

const fail = (status: number, error: string): ParsedChatRequest => ({ ok: false, status, error });
const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);

/** Reads a chat request body. `withContext: false` drops household data (the public landing chat). */
export function parseChatRequest(raw: string, { withContext = true } = {}): ParsedChatRequest {
  if (raw.length > chatLimits.body) return fail(413, "That message is too long.");
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return fail(400, "Invalid request."); }
  if (!isObject(body)) return fail(400, "Invalid request.");

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) return fail(400, "Message cannot be empty.");
  if (message.length > chatLimits.message) return fail(413, `Please keep messages under ${chatLimits.message} characters.`);

  const history = (Array.isArray(body.history) ? body.history : [])
    .filter((turn): turn is ChatTurn => isObject(turn) && (turn.role === "user" || turn.role === "bot") && typeof turn.text === "string" && !!turn.text.trim())
    .slice(-chatLimits.turns)
    .map(turn => ({ role: turn.role, text: turn.text.trim().slice(0, chatLimits.turnText) }));

  let context: ChatContext = {};
  if (withContext && isObject(body.context)) {
    if (JSON.stringify(body.context).length > chatLimits.context) return fail(413, "Your household data is too large to send.");
    context = body.context as ChatContext;
  }
  return { ok: true, value: { message, history, context } };
}

/** The visitor's address as reported by Vercel's proxy, for per-visitor limits. */
export function clientAddress(headers: Headers) {
  return headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
    || headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || headers.get("x-real-ip")?.trim()
    || "unknown";
}
