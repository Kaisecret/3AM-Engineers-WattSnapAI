import { NextResponse } from "next/server";
import { extractBillWithGemini, hasGeminiKey } from "@/lib/gemini/client";

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

    const contentType = request.headers.get("content-type") || "";
    let imageBase64 = "";
    let mimeType = "image/jpeg";
    let providerHint = "";

    if (contentType.includes("application/json")) {
      const body = await request.json();
      imageBase64 = body.imageBase64 || "";
      mimeType = body.mimeType || "image/jpeg";
      providerHint = body.providerHint || "";
    } else if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("image") as File | null;
      providerHint = (formData.get("providerHint") as string) || "";
      if (file) {
        mimeType = file.type || "image/jpeg";
        const bytes = await file.arrayBuffer();
        imageBase64 = Buffer.from(bytes).toString("base64");
      }
    }

    if (!imageBase64) {
      return NextResponse.json(
        { error: "No bill image was provided for analysis." },
        { status: 400 }
      );
    }

    const extraction = await extractBillWithGemini(imageBase64, mimeType, providerHint);
    return NextResponse.json({ ok: true, data: extraction });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to analyze bill image.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
