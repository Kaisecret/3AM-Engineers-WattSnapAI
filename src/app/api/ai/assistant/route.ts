import { NextResponse } from "next/server";
import { hasGeminiKey } from "@/lib/gemini/client";
import { runHouseholdAgent } from "@/lib/gemini/agent";
import { parseChatRequest } from "@/lib/ai/chat-request";
import { createRateLimiter } from "@/lib/ai/rate-limit";
import { signedInUserId, signInRequired, slowDown } from "@/lib/ai/session";
import { householdReply } from "@/features/assistant/replies";

export const dynamic = "force-dynamic";

// Gemini's free tier is shared by everyone, so one account cannot use all of it.
const perAccount = createRateLimiter({ limit: 20, windowMs: 5 * 60_000 });

export async function GET() {
  return NextResponse.json({ status: "ok", geminiConfigured: hasGeminiKey() });
}

/** In-app WattSnap AI. Answers questions and proposes changes that the person confirms in the app. */
export async function POST(request: Request) {
  const userId = await signedInUserId();
  if (!userId) return signInRequired();

  const parsed = parseChatRequest(await request.text());
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const { message, history, context } = parsed.value;

  if (!hasGeminiKey()) return NextResponse.json({ ok: true, source: "local-rules", reply: householdReply(message, context), actions: [] });
  if (!perAccount(userId)) return slowDown();

  try {
    const { reply, actions } = await runHouseholdAgent({ message, context, history });
    return NextResponse.json({ ok: true, source: "gemini", reply, actions });
  } catch (error) {
    console.error("[wattsnap:ai] assistant", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: true, source: "local-fallback", reply: householdReply(message, context), actions: [] });
  }
}
