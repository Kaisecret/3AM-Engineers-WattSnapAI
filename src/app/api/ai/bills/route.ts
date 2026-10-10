import { NextResponse } from "next/server";
import { extractBillWithGemini, geminiProblem, hasGeminiKey, scanModel } from "@/lib/gemini/client";
import { imageTypes, readImageRequest } from "@/lib/ai/image-request";
import { createRateLimiter } from "@/lib/ai/rate-limit";
import { signedInUserId, signInRequired, slowDown } from "@/lib/ai/session";

export const dynamic = "force-dynamic";
// Reading a photo takes a few seconds; allow for a retry with the fallback model.
export const maxDuration = 60;

const perAccount = createRateLimiter({ limit: 10, windowMs: 10 * 60_000 });

export async function GET() {
  return NextResponse.json({ status: "ok", geminiConfigured: hasGeminiKey(), model: scanModel() });
}

/** Snap AI: reads a bill photo or PDF with Gemini. The values are shown for review before anything is saved. */
export async function POST(request: Request) {
  const userId = await signedInUserId();
  if (!userId) return signInRequired();
  if (!hasGeminiKey()) return NextResponse.json({ error: "Bill reading is not available right now. Please type the values instead.", problem: "no-key", configured: false }, { status: 503 });

  const parsed = await readImageRequest(request, "providerHint", "No bill image was provided for analysis.", [...imageTypes, "application/pdf"]);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  if (!perAccount(userId)) return slowDown();

  try {
    const { imageBase64, mimeType, hint } = parsed.value;
    return NextResponse.json({ ok: true, data: await extractBillWithGemini(imageBase64, mimeType, hint) });
  } catch (error) {
    console.error("[wattsnap:ai] bills", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "We couldn’t read that bill. Please try another photo or type the values.", problem: geminiProblem(error) }, { status: 502 });
  }
}
