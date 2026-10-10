import { NextResponse } from "next/server";
import { extractBillWithGemini, hasGeminiKey } from "@/lib/gemini/client";
import { readImageRequest } from "@/lib/ai/image-request";
import { createRateLimiter } from "@/lib/ai/rate-limit";
import { signedInUserId, signInRequired, slowDown } from "@/lib/ai/session";

export const dynamic = "force-dynamic";

const perAccount = createRateLimiter({ limit: 10, windowMs: 10 * 60_000 });

export async function GET() {
  return NextResponse.json({ status: "ok", geminiConfigured: hasGeminiKey() });
}

export async function POST(request: Request) {
  const userId = await signedInUserId();
  if (!userId) return signInRequired();
  if (!hasGeminiKey()) return NextResponse.json({ error: "Bill reading is not available right now. Please type the values instead.", configured: false }, { status: 503 });

  const parsed = await readImageRequest(request, "providerHint", "No bill image was provided for analysis.");
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  if (!perAccount(userId)) return slowDown();

  try {
    const { imageBase64, mimeType, hint } = parsed.value;
    return NextResponse.json({ ok: true, data: await extractBillWithGemini(imageBase64, mimeType, hint) });
  } catch (error) {
    console.error("[wattsnap:ai] bills", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "We couldn’t read that bill. Please try another photo or type the values." }, { status: 502 });
  }
}
