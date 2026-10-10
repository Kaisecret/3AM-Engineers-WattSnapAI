import { NextResponse } from "next/server";
import { geminiModel, geminiProblem, hasGeminiKey } from "@/lib/gemini/client";
import { checkGemini, runHouseholdAgent } from "@/lib/gemini/agent";
import { parseChatRequest } from "@/lib/ai/chat-request";
import { createRateLimiter } from "@/lib/ai/rate-limit";
import { signedInUserId, signInRequired, slowDown } from "@/lib/ai/session";
import { householdReply } from "@/features/assistant/replies";

export const dynamic = "force-dynamic";

// Gemini's free tier is shared by everyone, so one account cannot use all of it.
const perAccount = createRateLimiter({ limit: 20, windowMs: 5 * 60_000 });

/**
 * Status for checking the deployment. Open /api/ai/assistant to see whether the key is set,
 * and, while logged in, /api/ai/assistant?check=1 to make one real call to Gemini.
 */
export async function GET(request: Request) {
  const status = { status: "ok", geminiConfigured: hasGeminiKey(), model: geminiModel() };
  if (!new URL(request.url).searchParams.has("check")) return NextResponse.json(status);
  const userId = await signedInUserId();
  if (!userId) return signInRequired();
  if (!status.geminiConfigured) return NextResponse.json({ ...status, reachable: false, problem: "no-key" });
  if (!perAccount(userId)) return slowDown();
  const check = await checkGemini();
  return NextResponse.json({ ...status, reachable: check.ok, ...(check.ok ? {} : { problem: check.problem }) });
}

/** In-app WattSnap AI. Answers questions and proposes changes that the person confirms in the app. */
export async function POST(request: Request) {
  const userId = await signedInUserId();
  if (!userId) return signInRequired();

  const parsed = parseChatRequest(await request.text());
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const { message, history, context } = parsed.value;

  if (!hasGeminiKey()) return NextResponse.json({ ok: true, source: "local-rules", problem: "no-key", reply: householdReply(message, context), actions: [] });
  if (!perAccount(userId)) return slowDown();

  try {
    const { reply, actions } = await runHouseholdAgent({ message, context, history });
    return NextResponse.json({ ok: true, source: "gemini", reply, actions });
  } catch (error) {
    console.error("[wattsnap:ai] assistant", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: true, source: "local-fallback", problem: geminiProblem(error), reply: householdReply(message, context), actions: [] });
  }
}
