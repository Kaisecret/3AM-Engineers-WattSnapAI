import { NextResponse } from "next/server";
import { generateTipsWithGemini, hasGeminiKey } from "@/lib/gemini/client";
import type { TipsGenerationRequest } from "@/lib/gemini/types";

export async function GET() {
  return NextResponse.json({ status: "ok", geminiConfigured: hasGeminiKey() });
}

export async function POST(request: Request) {
  try {
    if (!hasGeminiKey()) {
      return NextResponse.json(
        {
          error: "Gemini API key is not configured on the server. Please add GEMINI_API_KEY to your environment variables.",
          configured: false,
        },
        { status: 503 }
      );
    }

    const body: TipsGenerationRequest = await request.json();
    if (!body || !body.household) {
      return NextResponse.json(
        { error: "Household context is required to generate tips." },
        { status: 400 }
      );
    }

    const tips = await generateTipsWithGemini(body);
    return NextResponse.json({ ok: true, data: tips });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate tips.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
