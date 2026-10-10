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

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL: GeminiModel = "gemini-2.5-flash";

export function getGeminiApiKey(): string | null {
  const key = process.env.GEMINI_API_KEY?.trim();
  return key && key.length > 5 ? key : null;
}

export function hasGeminiKey(): boolean {
  return Boolean(getGeminiApiKey());
}

interface CallGeminiOptions {
  model?: GeminiModel;
  systemInstruction?: string;
  parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;
  jsonMode?: boolean;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
}

export async function callGeminiApi({
  model = DEFAULT_MODEL,
  systemInstruction,
  parts,
  jsonMode = false,
  temperature = 0.2,
  maxOutputTokens = 2048,
  timeoutMs = 25000,
}: CallGeminiOptions): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in server environment.");
  }

  const url = `${GEMINI_API_URL}/${model}:generateContent?key=${apiKey}`;

  const requestBody: GeminiRequestBody = {
    contents: [
      {
        role: "user",
        parts,
      },
    ],
    generationConfig: {
      temperature,
      maxOutputTokens,
      ...(jsonMode ? { responseMimeType: "application/json" } : {}),
    },
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
      headers: { "Content-Type": "application/json" },
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
      throw new Error(`Gemini error (${response.status}): ${message}`);
    }

    const data: GeminiResponseBody = await response.json();
    const candidate = data.candidates?.[0];
    const textPart = candidate?.content?.parts?.[0]?.text;

    if (!textPart) {
      throw new Error("Gemini returned an empty response candidate.");
    }

    return textPart.trim();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Gemini API request timed out. Please try again.");
    }
    throw error;
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
  const cleanData = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, "");

  const systemInstruction = `You are an expert OCR and document analysis AI for Philippine electric bills (ANTECO, MORE Power, ILECO, Meralco, CENPELCO, etc.).
Analyze the provided electric bill image and extract billing details strictly into a valid JSON object.
Fields:
- "provider": Name of the electricity utility / electric cooperative (e.g., "ANTECO", "MORE Power", "ILECO I"). Use null if unreadable.
- "billingMonth": YYYY-MM format of the bill period or statement month (e.g., "2026-03"). Use null if unknown.
- "periodStart": Start date of billing period in YYYY-MM-DD. Use null if unknown.
- "periodEnd": End date of billing period in YYYY-MM-DD. Use null if unknown.
- "billingDate": Bill date/reading date in YYYY-MM-DD. Use null if unknown.
- "dueDate": Payment due date in YYYY-MM-DD. Use null if unknown.
- "amountDue": Total amount due in Philippine Pesos (PHP) as a number (e.g. 2450.50). Do not include currency symbols. Use null if unknown.
- "consumptionKwh": Total kilowatt-hours (kWh) consumed as a number (e.g. 185.0). Use null if unknown.
- "notes": Brief notes on any unreadable or ambiguous fields.
Never invent numbers. If a field is blurred, cut off, or not printed, set it to null.`;

  const promptText = `Extract the electric bill values from this document.${providerHint ? ` Known provider hint: ${providerHint}.` : ""}`;

  const responseText = await callGeminiApi({
    systemInstruction,
    parts: [
      { text: promptText },
      { inlineData: { mimeType, data: cleanData } },
    ],
    jsonMode: true,
    temperature: 0.1,
  });

  const parsed = parseJsonOutput<Partial<BillExtractionResult>>(responseText, {});
  const unknownFields: string[] = [];

  if (!parsed.amountDue) unknownFields.push("amountDue");
  if (!parsed.consumptionKwh) unknownFields.push("consumptionKwh");
  if (!parsed.billingMonth) unknownFields.push("billingMonth");
  if (!parsed.dueDate) unknownFields.push("dueDate");

  return {
    reviewRequired: true,
    unknownFields,
    provider: parsed.provider ?? null,
    billingMonth: parsed.billingMonth ?? null,
    periodStart: parsed.periodStart ?? null,
    periodEnd: parsed.periodEnd ?? null,
    billingDate: parsed.billingDate ?? null,
    amountDue: typeof parsed.amountDue === "number" ? parsed.amountDue : null,
    dueDate: parsed.dueDate ?? null,
    consumptionKwh: typeof parsed.consumptionKwh === "number" ? parsed.consumptionKwh : null,
    notes: parsed.notes ?? null,
  };
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
