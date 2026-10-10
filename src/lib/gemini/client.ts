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
  const data = imageBase64.replace(/^data:[^,]*,/, "");
  const parts = [
    { text: `Read this electricity bill.${providerHint ? ` The household's provider is probably ${providerHint}.` : ""}` },
    { inlineData: { mimeType, data } },
  ];
  const read = (model: GeminiModel, schema: boolean, timeoutMs: number) => callGemini({
    model, systemInstruction: billReadingInstruction, parts, responseSchema: schema ? billResponseSchema : undefined, jsonMode: true,
    temperature: null, maxOutputTokens: 8192, timeoutMs,
  });

  const primary = scanModel(), fallback = geminiModel();
  let result: GeminiCallResult;
  try {
    result = await read(primary, true, 32000);
  } catch (error) {
    const problem = geminiProblem(error);
    // Schema not accepted: same model, plain JSON. Model missing or out of quota: the chat model.
    if (problem === "request") result = await read(primary, false, 24000);
    else if ((problem === "model" || problem === "busy") && fallback !== primary) {
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
  const systemInstruction = `You are WattSnap AI's Philippine Energy Conservation Specialist.
Generate 3 to 5 actionable, realistic, and safe electricity-saving recommendations ("Tipid Tips") tailored specifically to the user's registered appliances, billing trends, and household profile.
Rules:
- Give tips ONLY relevant to appliances they actually own or their documented bill trends.
- Use friendly, practical advice suited for the Philippine climate and lifestyle.
- Never guarantee exact peso savings without explicit assumptions.
- Return a JSON array of objects with:
  - "id": string unique identifier (e.g. "tip-aircon-temp")
  - "title": short snappy title (e.g. "Set aircon to 24°C–25°C")
  - "explanation": why this saves energy and what the impact is
  - "action": clear immediate action step
  - "assumptions": array of brief assumption strings (e.g. ["8 hours daily use", "₱12.50/kWh estimate"])
  - "origin": "future-model"`;

  const contextData = JSON.stringify(request, null, 2);
  const promptText = `Generate personalized energy-saving tips based on this household data:\n${contextData}`;

  const responseText = await callGeminiApi({
    systemInstruction,
    parts: [{ text: promptText }],
    jsonMode: true,
    temperature: 0.3,
  });

  const parsed = parseJsonOutput<TipRecommendation[]>(responseText, []);
  return Array.isArray(parsed) ? parsed : [];
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
