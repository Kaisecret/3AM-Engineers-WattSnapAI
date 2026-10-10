import type { ApplianceKind } from "@/features/dashboard/preview-data";
import type { BillExtractionResult, ApplianceLabelExtractionResult, TipRecommendation } from "@/contracts/extraction";
import type { ChatContext, Reply } from "@/features/assistant/replies";

export type GeminiModel = "gemini-2.5-flash" | "gemini-1.5-flash";

export interface GeminiPart {
  text?: string;
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
}

export interface GeminiCandidate {
  content?: {
    parts?: Array<{ text?: string }>;
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
