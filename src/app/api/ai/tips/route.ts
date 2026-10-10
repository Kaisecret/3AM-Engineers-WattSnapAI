import { NextResponse } from "next/server";
import { generateTipsWithGemini, hasGeminiKey } from "@/lib/gemini/client";
import { createRateLimiter } from "@/lib/ai/rate-limit";
import { signedInUserId, signInRequired, slowDown } from "@/lib/ai/session";
import type { TipsGenerationRequest } from "@/lib/gemini/types";

export const dynamic = "force-dynamic";

const perAccount = createRateLimiter({ limit: 10, windowMs: 10 * 60_000 });
const maxBody = 32_000;

export async function GET() {
  return NextResponse.json({ status: "ok", geminiConfigured: hasGeminiKey() });
}

export async function POST(request: Request) {
  const userId = await signedInUserId();
  if (!userId) return signInRequired();
  if (!hasGeminiKey()) return NextResponse.json({ error: "AI tips are not available right now.", configured: false }, { status: 503 });

  const raw = await request.text();
  if (raw.length > maxBody) return NextResponse.json({ error: "Your household data is too large to send." }, { status: 413 });
  let body: TipsGenerationRequest | null = null;
  try { body = JSON.parse(raw); } catch { /* handled below */ }
  if (!body || typeof body !== "object" || !body.household) return NextResponse.json({ error: "Household context is required to generate tips." }, { status: 400 });
  if (!perAccount(userId)) return slowDown();

  try {
    return NextResponse.json({ ok: true, data: await generateTipsWithGemini(body) });
  } catch (error) {
    console.error("[wattsnap:ai] tips", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "We couldn’t make tips right now. Please try again later." }, { status: 502 });
  }
}
