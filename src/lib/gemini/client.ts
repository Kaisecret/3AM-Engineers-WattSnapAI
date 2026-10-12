import type {
  BillExtractionResult,
  ApplianceLabelExtractionResult,
  TipRecommendation,
} from "@/contracts/extraction";
import type {
  GeminiModel,
  GeminiRequestBody,
  GeminiResponseBody,
  TipsGenerationRequest,
  AssistantChatRequest,
} from "./types";
import type { Reply } from "@/features/assistant/replies";
import { billReadingInstruction, billResponseSchema, readBillReading } from "./bill-reading";
import { advisoryReadingInstruction, advisoryResponseSchema } from "./advisory-reading";
import type { BillImage } from "../ai/bill-images-request";
import { tipsReadingInstruction, tipsResponseSchema, readTipRecommendations } from "./tips-reading";
import { tipsRequestHousehold } from "../ai/tips-request";
import { generatePreviewTips } from "../../features/tipid-tips/preview-tips";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL: GeminiModel = "gemini-3.5-flash-lite";

/** The model to call: GEMINI_MODEL if set, otherwise Gemini 3.5 Flash-Lite. */
export function geminiModel(): GeminiModel {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
}

/** Bill photos use a stronger reader (same API key): GEMINI_SCAN_MODEL if set, otherwise Gemini 3.5 Flash. */
export function scanModel(): GeminiModel {
  return process.env.GEMINI_SCAN_MODEL?.trim() || "gemini-3.5-flash";
}

export function getGeminiApiKey(): string | null {
  const key = process.env.GEMINI_API_KEY?.trim();
  return key && key.length > 5 ? key : null;
}

export function hasGeminiKey(): boolean {
  return Boolean(getGeminiApiKey());
}

interface CallGeminiOptions {
  model?: GeminiModel;
  tools?: GeminiRequestBody["tools"];
  systemInstruction?: string;
  parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;
  jsonMode?: boolean;
  /** Fixed JSON shape for the answer (Gemini responseSchema). */
  responseSchema?: unknown;
  mediaResolution?: "MEDIA_RESOLUTION_HIGH" | "MEDIA_RESOLUTION_MEDIUM";
  /** null leaves the model's own default, which newer models recommend. */
  temperature?: number | null;
  maxOutputTokens?: number;
  timeoutMs?: number;
}

export type GeminiCallResult = { text: string; functionCalls: Array<{ name: string; args: unknown }>; finishReason?: string };

/** Why Gemini did not answer, in a form that is safe to show (never includes the key). */
export type GeminiProblem = "no-key" | "key" | "model" | "busy" | "request" | "unavailable" | "empty";

export class GeminiError extends Error {
  readonly problem: GeminiProblem;
  readonly status?: number;
  constructor(message: string, problem: GeminiProblem, status?: number) {
    super(message);
    this.name = "GeminiError";
    this.problem = problem;
    this.status = status;
  }
}

function problemFor(status: number, message: string): GeminiProblem {
  if (status === 401 || status === 403 || /api key/i.test(message)) return "key";
  if (status === 404) return "model";
  if (status === 429) return "busy";
  if (status === 400) return "request";
  return "unavailable";
}

/** The problem behind any error thrown while calling Gemini. */
export function geminiProblem(error: unknown): GeminiProblem {
  return error instanceof GeminiError ? error.problem : "unavailable";
}

/** Joins the visible text parts and collects any function calls; internal thought parts are skipped. */
export function readGeminiResponse(data: GeminiResponseBody): GeminiCallResult {
  const candidate = data.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];
  return {
    text: parts.filter(part => !part.thought && typeof part.text === "string").map(part => part.text).join("").trim(),
    functionCalls: parts.flatMap(part => part.functionCall?.name ? [{ name: part.functionCall.name, args: part.functionCall.args ?? {} }] : []),
    finishReason: candidate?.finishReason,
  };
}

export async function callGeminiApi(options: CallGeminiOptions): Promise<string> {
  const result = await callGemini(options);
  if (!result.text) throw new GeminiError("Gemini returned an empty response candidate.", "empty");
  return result.text;
}

export async function callGemini({
  model = geminiModel(),
  systemInstruction,
  parts,
  tools,
  jsonMode = false,
  responseSchema,
  mediaResolution,
  temperature = 0.2,
  maxOutputTokens = 2048,
  timeoutMs = 25000,
}: CallGeminiOptions): Promise<GeminiCallResult> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new GeminiError("GEMINI_API_KEY is not configured in server environment.", "no-key");
  }

  const url = `${GEMINI_API_URL}/${encodeURIComponent(model)}:generateContent`;

  const requestBody: GeminiRequestBody = {
    contents: [
      {
        role: "user",
        parts,
      },
    ],
    generationConfig: {
      ...(temperature === null ? {} : { temperature }),
      maxOutputTokens,
      ...(jsonMode || responseSchema ? { responseMimeType: "application/json" } : {}),
      ...(responseSchema ? { responseSchema } : {}),
      ...(mediaResolution ? { mediaResolution } : {}),
    },
    ...(tools ? { tools } : {}),
    ...(systemInstruction
      ? {
          systemInstruction: {
            parts: [{ text: systemInstruction }],
          },
        }
      : {}),
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      // The key travels in a header, not the URL, so it cannot end up in request logs.
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData: GeminiResponseBody | null = null;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        // Fall back to raw text
      }
      const message = errorData?.error?.message || `Gemini API returned status ${response.status}`;
      throw new GeminiError(`Gemini error (${response.status}) for ${model}: ${message}`, problemFor(response.status, message), response.status);
    }

    const result = readGeminiResponse(await response.json());
    if (!result.text && !result.functionCalls.length) {
      throw new GeminiError(`Gemini returned an empty response${result.finishReason ? ` (${result.finishReason})` : ""}.`, "empty");
    }
    return result;
  } catch (error) {
    if (error instanceof GeminiError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new GeminiError("Gemini API request timed out. Please try again.", "unavailable");
    }
    throw new GeminiError(`Gemini could not be reached: ${error instanceof Error ? error.message : "network error"}`, "unavailable");
  } finally {
    clearTimeout(timer);
  }
}

function parseJsonOutput<T>(text: string, fallback: T): T {
  try {
    const clean = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    return JSON.parse(clean) as T;
  } catch {
    return fallback;
  }
}

// -------------------------------------------------------------
// 1. BILL EXTRACTION
// -------------------------------------------------------------
export async function extractBillWithGemini(
  imageBase64: string,
  mimeType = "image/jpeg",
  providerHint?: string,
): Promise<BillExtractionResult> {
  return extractBillSectionsWithGemini([{imageBase64,mimeType}],providerHint);
}

/** Ordered close-up sections of one receipt; retain original pixels instead of stitching text. */
export async function extractBillSectionsWithGemini(images: BillImage[], providerHint?: string): Promise<BillExtractionResult> {
  if (!images.length || images.length > 4) throw new GeminiError("Use 1 to 4 bill images.","request");
  const multiple = images.length > 1;
  const parts = [
    { text: `Read this electricity bill.${multiple ? " These are overlapping sections of the same receipt, ordered from top to bottom. Reconstruct one bill from all sections. Overlap repeats the same printed lines: never count a charge or subtotal twice. If captures disagree or omit required text, mark the field unreadable and explain the conflict; do not guess." : ""}${providerHint ? ` The household's provider is probably ${providerHint}.` : ""}` },
    ...images.flatMap((image,index) => [...(multiple ? [{text:`Receipt section ${index+1} of ${images.length}, top to bottom.`}] : []), {inlineData:{mimeType:image.mimeType,data:image.imageBase64.replace(/^data:[^,]*,/,"")}}]),
  ];
  const read = (model: GeminiModel, schema: boolean, timeoutMs: number) => callGemini({
    model, systemInstruction: billReadingInstruction, parts, responseSchema: schema ? billResponseSchema : undefined, jsonMode: true,
    temperature: null, maxOutputTokens: 8192, timeoutMs,
    mediaResolution: images[0].mimeType === "application/pdf" ? "MEDIA_RESOLUTION_MEDIUM" : "MEDIA_RESOLUTION_HIGH",
  });

  const primary = scanModel(), fallback = geminiModel();
  let result: GeminiCallResult;
  try {
    result = await read(primary, true, 32000);
  } catch (error) {
    const problem = geminiProblem(error);
    // Schema not accepted: same model, plain JSON. Missing, busy or overloaded: the configured fallback.
    if (problem === "request") result = await read(primary, false, 24000);
    else if ((problem === "model" || problem === "busy" || (error instanceof GeminiError && error.status === 503)) && fallback !== primary) {
      console.error(`[wattsnap:ai] bills: ${primary} unavailable (${problem}), using ${fallback}`);
      result = await read(fallback, true, 24000);
    } else throw error;
  }
  if (!result.text) throw new GeminiError("Gemini returned no bill values.", "empty");
  return readBillReading(parseJsonOutput<Record<string, unknown>>(result.text, {}));
}

// -------------------------------------------------------------
// 2. APPLIANCE NAMEPLATE EXTRACTION
// -------------------------------------------------------------
export async function extractApplianceWithGemini(
  imageBase64: string,
  mimeType = "image/jpeg",
  nameHint?: string,
): Promise<ApplianceLabelExtractionResult> {
  const cleanData = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, "");

  const systemInstruction = `You are an expert nameplate reader and appliance energy rating analyst (DOE Yellow Energy Guide labels, manufacturer specification plates).
Extract electrical specifications from the appliance rating sticker/photo into a JSON object.
Fields:
- "applianceName": Descriptive appliance name (e.g., "Inverter Refrigerator", "Split-Type Aircon", "Stand Fan").
- "applianceType": One of ["aircon", "refrigerator", "fan", "lighting", "tv", "laundry", "cooking", "water_heater", "other"].
- "model": Model number/code printed on label. Use null if unreadable.
- "ratedPower": Number representing rated power in Watts (W) or kilowatts (kW). E.g. 120 or 0.75. If only Amps (A) and Volts (V) are shown (e.g. 220V, 0.5A), calculate W = V * A. Use null if unknown.
- "powerUnit": "W" or "kW". Default to "W".
Never invent numbers. If wattage cannot be determined, set ratedPower to null.`;

  const promptText = `Extract appliance wattage and nameplate details from this photo.${nameHint ? ` Hint: ${nameHint}.` : ""}`;

  const responseText = await callGeminiApi({
    systemInstruction,
    parts: [
      { text: promptText },
      { inlineData: { mimeType, data: cleanData } },
    ],
    jsonMode: true,
    temperature: 0.1,
  });

  const parsed = parseJsonOutput<Partial<ApplianceLabelExtractionResult>>(responseText, {});
  const unknownFields: string[] = [];
  if (!parsed.ratedPower) unknownFields.push("ratedPower");

  return {
    reviewRequired: true,
    unknownFields,
    applianceName: parsed.applianceName ?? nameHint ?? null,
    applianceType: parsed.applianceType ?? "other",
    model: parsed.model ?? null,
    ratedPower: typeof parsed.ratedPower === "number" ? parsed.ratedPower : null,
    powerUnit: parsed.powerUnit ?? "W",
  };
}

// -------------------------------------------------------------
// 3. PERSONALIZED TIPID TIPS
// -------------------------------------------------------------
export async function generateTipsWithGemini(
  request: TipsGenerationRequest,
): Promise<TipRecommendation[]> {
  const basis = generatePreviewTips(tipsRequestHousehold(request));
  const promptText = JSON.stringify({ household: request, forecast: basis.forecast, limitations: basis.context.limitations, tips: basis.tips.map(({ id, title, action, reason, facts, assumptions }) => ({ id, title, action, reason, facts, assumptions })) });

  const responseText = await callGeminiApi({
    systemInstruction: tipsReadingInstruction,
    parts: [{ text: promptText }],
    responseSchema: tipsResponseSchema,
    temperature: 0.3,
    maxOutputTokens: 4096,
  });

  return readTipRecommendations(parseJsonOutput<unknown>(responseText, null), basis);
}

// -------------------------------------------------------------
// 4. ASSISTANT CHAT
// -------------------------------------------------------------
export async function askAssistantWithGemini(
  request: AssistantChatRequest,
): Promise<Reply> {
  const systemInstruction = `You are WattSnap AI, a friendly, expert, and practical energy assistant for Philippine households.
You help families understand their electricity bills, spot power-hungry appliances, save money safely, and prepare for brownouts/outages.
Contextual guidelines:
- Currency is Philippine Pesos (₱).
- Common Philippine utilities include ANTECO (Antique), MORE Power (Iloilo City), ILECO, Meralco, etc.
- Always be encouraging, concise, and direct (2 to 4 sentences).
- If the user asks about an appliance or their bill, refer to their provided household context when available.
- Return a JSON object with:
  - "text": The conversational response to the user.
  - "suggestions": Array of 2 to 3 follow-up question ideas.
  - "links": Optional array of internal links (e.g. [{ label: "View bills", href: "/bills" }, { label: "Add appliance", href: "/appliances/new" }]).`;

  const contextString = request.context ? `Household Context:\n${JSON.stringify(request.context, null, 2)}\n` : "";
  const historyString = request.history && request.history.length > 0
    ? `Recent Conversation:\n${request.history.slice(-4).map(m => `${m.role === "user" ? "User" : "WattSnap"}: ${m.text}`).join("\n")}\n`
    : "";

  const promptText = `${contextString}${historyString}User: ${request.message}\nProvide your helpful answer in JSON:`;

  const responseText = await callGeminiApi({
    systemInstruction,
    parts: [{ text: promptText }],
    jsonMode: true,
    temperature: 0.4,
  });

  const parsed = parseJsonOutput<Reply>(responseText, {
    text: "I can help you monitor your appliances and reduce your monthly electricity bill. What would you like to check?",
    suggestions: ["Why did my bill change?", "How can I save on aircon?", "Which appliance uses the most?"],
  });

  return {
    text: parsed.text || "I'm here to help you manage your household energy use.",
    suggestions: parsed.suggestions?.slice(0, 3),
    links: parsed.links?.slice(0, 2),
  };
}

// -------------------------------------------------------------
// 5. PROVIDER ADVISORY POSTS
// -------------------------------------------------------------
/**
 * Reads one ANTECO Facebook post: its caption and up to a few images. Returns the model's raw
 * answer; readAdvisoryReading decides what is kept. The text a tool extracted from the images is
 * given only next to the images themselves, as a hint. When the reading model is missing, busy or
 * overloaded, the configured chat model reads the post instead, as for bills.
 */
export async function extractAdvisoryWithGemini(
  post: { caption: string; postedAt: string; imageText: string },
  images: Array<{ mimeType: string; data: string }>,
): Promise<{ raw: unknown; model: GeminiModel }> {
  const published = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(post.postedAt));
  const hint = images.length && post.imageText.trim()
    ? `

Text a tool extracted from the images. It may be incomplete or only a description; the images themselves decide:
<extracted>
${post.imageText.trim()}
</extracted>`
    : "";
  const read = (model: GeminiModel, timeoutMs: number) => callGemini({
    model, systemInstruction: advisoryReadingInstruction, responseSchema: advisoryResponseSchema,
    parts: [
      { text: `Read this ANTECO Facebook post, published on ${published} (Philippine time).

Caption:
<caption>
${post.caption.trim() || "(no caption)"}
</caption>${hint}` },
      ...images.map(image => ({ inlineData: { mimeType: image.mimeType, data: image.data } })),
    ],
    temperature: null, maxOutputTokens: 8192, timeoutMs,
    ...(images.length ? { mediaResolution: "MEDIA_RESOLUTION_HIGH" as const } : {}),
  });
  let model = scanModel(), result: GeminiCallResult;
  const fallback = geminiModel();
  try {
    result = await read(model, 30000);
  } catch (error) {
    const problem = geminiProblem(error);
    if (!(problem === "model" || problem === "busy" || (error instanceof GeminiError && error.status === 503)) || fallback === model) throw error;
    console.error(`[wattsnap:ai] advisories: ${model} unavailable (${problem}), using ${fallback}`);
    model = fallback;
    result = await read(model, 20000);
  }
  const raw = parseJsonOutput<unknown>(result.text, null);
  if (!raw || typeof raw !== "object") throw new GeminiError("Gemini returned an unreadable advisory answer.", "empty");
  return { raw, model };
}
