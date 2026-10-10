import { NextResponse } from "next/server";
import { askAssistantWithGemini, hasGeminiKey } from "@/lib/gemini/client";
import { householdReply } from "@/features/assistant/replies";
import type { AssistantChatRequest } from "@/lib/gemini/types";

export async function GET() {
  return NextResponse.json({ status: "ok", geminiConfigured: hasGeminiKey() });
}

export async function POST(request: Request) {
  try {
    const body: AssistantChatRequest = await request.json();
    const message = body?.message?.trim() || "";

    if (!message) {
      return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });
    }

    if (hasGeminiKey()) {
      try {
        const reply = await askAssistantWithGemini(body);
        return NextResponse.json({ ok: true, source: "gemini", reply });
      } catch (geminiError) {
        console.error("Gemini assistant error, falling back to rule-based reply:", geminiError);
        const fallbackReply = householdReply(message, body.context);
        return NextResponse.json({ ok: true, source: "local-fallback", reply: fallbackReply });
      }
    }

    const ruleReply = householdReply(message, body.context);
    return NextResponse.json({ ok: true, source: "local-rules", reply: ruleReply });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process message.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
