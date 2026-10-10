import type { ApplianceKind } from "@/features/dashboard/preview-data";
import type { BillExtractionResult, ApplianceLabelExtractionResult, TipRecommendation } from "@/contracts/extraction";
import type { ChatContext, Reply } from "@/features/assistant/replies";

/** Any Gemini model ID, e.g. "gemini-3.5-flash-lite". */
export type GeminiModel = string;

export interface GeminiPart {
  text?: string;
  thought?: boolean;
  functionCall?: { name: string; args?: Record<string, unknown>; id?: string };
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

export interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

export interface GeminiGenerationConfig {
  temperature?: number;
  topP?: number;
  maxOutputTokens?: number;
  responseMimeType?: string;
}

export interface GeminiRequestBody {
  contents: GeminiContent[];
  systemInstruction?: {
    parts: Array<{ text: string }>;
  };
  generationConfig?: GeminiGenerationConfig;
  tools?: ReadonlyArray<{ functionDeclarations: ReadonlyArray<unknown> }>;
}

export interface GeminiCandidate {
  content?: {
    parts?: GeminiPart[];
    role?: string;
  };
  finishReason?: string;
}

export interface GeminiResponseBody {
  candidates?: GeminiCandidate[];
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

export interface BillExtractionRequest {
  imageBase64: string;
  mimeType?: string;
  providerHint?: string;
}

export interface ApplianceExtractionRequest {
  imageBase64: string;
  mimeType?: string;
  nameHint?: string;
}

export interface TipsGenerationRequest {
  household: {
    name: string;
    location?: string;
    provider?: string;
    budget?: number;
  };
  bills?: Array<{
    month: string;
    amount: number;
    kwh: number;
  }>;
  appliances?: Array<{
    name: string;
    type?: string;
    watts: number;
    hours: number;
    quantity: number;
    days?: number;
  }>;
}

export interface AssistantChatRequest {
  message: string;
  context?: ChatContext;
  history?: Array<{
    role: "user" | "bot";
    text: string;
  }>;
}
