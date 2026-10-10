export const billDraftStorageKey = "wattsnap-bill-draft-v1";
export type LocalBillDraft = { month: string; amount: string; kwh: string; dueDate: string; periodStart: string; periodEnd: string; provider?: string; billingDate?: string; notes?: string;
  /** Typed subsidy. Undefined means it follows the household’s monthly subsidy automatically. */
  subsidy?: string };
const fields = ["month", "amount", "kwh", "dueDate", "periodStart", "periodEnd", "provider", "billingDate", "notes"] as const;
/** Recover entered fields only. Photos, confirmation and extracted results are never persisted here. */
export function normalizeBillDraft(value: unknown): LocalBillDraft {
  if (!value || typeof value !== "object" || (value as { version?: number }).version !== 1) throw new Error("Unreadable bill draft");
  const source = (value as { draft?: unknown }).draft;
  if (!source || typeof source !== "object") throw new Error("Unreadable bill draft");
  const draft = source as Record<string, unknown>;
  const result = {} as LocalBillDraft;
  for (const field of fields) { const item = draft[field] ?? ""; if (typeof item !== "string" || item.length > (field === "notes" ? 500 : field === "provider" ? 300 : 40)) throw new Error("Unreadable bill draft"); result[field] = item; }
  if (draft.subsidy !== undefined) { if (typeof draft.subsidy !== "string" || draft.subsidy.length > 40) throw new Error("Unreadable bill draft"); result.subsidy = draft.subsidy; }
  return result;
}
