import { NextResponse } from "next/server";
import { hasGeminiKey } from "@/lib/gemini/client";
import { answerLandingQuestion } from "@/lib/gemini/agent";
import { clientAddress, parseChatRequest } from "@/lib/ai/chat-request";
import { createRateLimiter } from "@/lib/ai/rate-limit";
import { slowDown } from "@/lib/ai/session";
import { landingReply } from "@/features/assistant/replies";

export const dynamic = "force-dynamic";

// Public chat on the landing page: product questions only, no household data and no tools.
// Each visitor gets a few questions, and the page as a whole leaves most of the shared
// Gemini quota for signed-in people. Limits are per server instance (best effort).
const perVisitor = createRateLimiter({ limit: 8, windowMs: 10 * 60_000 });
const overall = createRateLimiter({ limit: 10, windowMs: 60_000 });

export async function POST(request: Request) {
  const parsed = parseChatRequest(await request.text(), { withContext: false });
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const { message, history } = parsed.value;

  if (!hasGeminiKey()) return NextResponse.json({ ok: true, source: "local-rules", reply: landingReply(message) });
  if (!perVisitor(clientAddress(request.headers))) return slowDown();
  if (!overall("all")) return NextResponse.json({ ok: true, source: "local-busy", reply: landingReply(message) });

  try {
    return NextResponse.json({ ok: true, source: "gemini", reply: await answerLandingQuestion({ message, history }) });
  } catch (error) {
    console.error("[wattsnap:ai] landing", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: true, source: "local-fallback", reply: landingReply(message) });
  }
}
