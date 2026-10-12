import type { PreviewHousehold } from "../dashboard/preview-data";
import type { TipsGenerationRequest } from "../../lib/gemini/types";
import { readTipRecommendations } from "../../lib/gemini/tips-reading";
import type { PreviewTipsSnapshot } from "./types";

export function createTipsRequest(household: PreviewHousehold): TipsGenerationRequest {
  return {
    household: { name: "Your home", budget: household.budget },
    bills: household.bills.map(({ id, month, amount, kwh, periodStart, periodEnd, source }) => ({ id, month, amount, kwh, ...(periodStart ? { periodStart } : {}), ...(periodEnd ? { periodEnd } : {}), ...(source ? { source } : {}) })),
    appliances: household.appliances.map(({ id, name, kind, watts, hours, quantity, days, source, wattageBasis }) => ({ id, name, watts, hours, quantity, ...(kind ? { type: kind } : {}), ...(days !== undefined ? { days } : {}), ...(source ? { source } : {}), ...(wattageBasis ? { wattageBasis } : {}) })),
  };
}
export function mergeGeminiTips(basis: PreviewTipsSnapshot, value: unknown): PreviewTipsSnapshot {
  const copy = new Map(readTipRecommendations(value, basis).map(tip => [tip.id, tip]));
  return { ...basis, source: "gemini", tips: basis.tips.map(tip => {
    const next = copy.get(tip.id)!;
    return { ...tip, title: next.title, action: next.action, reason: next.explanation, assumptions: [...new Set([...tip.assumptions, ...next.assumptions])] };
  }) };
}
export async function requestGeminiTips(household: PreviewHousehold, basis: PreviewTipsSnapshot, signal?: AbortSignal, fetcher: typeof fetch = fetch) {
  const response = await fetcher("/api/ai/tips", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(createTipsRequest(household)), signal });
  if (!response.ok) throw new Error(response.status === 429 ? "WattSnap AI is busy. Try again in a few minutes." : response.status === 401 ? "Sign in again to create AI tips." : "WattSnap AI is unavailable. Try again shortly.");
  const result = await response.json();
  if (!result.ok) throw new Error("WattSnap AI couldn’t create tips. Try again.");
  return mergeGeminiTips(basis, result.data);
}
