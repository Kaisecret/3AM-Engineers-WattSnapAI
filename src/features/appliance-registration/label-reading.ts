"use client";
import type { ApplianceLabelExtractionResult } from "@/contracts/extraction";
import { prepareBillUpload } from "@/features/bill-scanner/snap";

/** Where the Add appliance form is with its label photo. */
export type LabelReading = { status: "reading" } | { status: "read"; data: ApplianceLabelExtractionResult } | { status: "failed"; reason: string };
export type LabelOutcome = { ok: true; data: ApplianceLabelExtractionResult } | { ok: false; reason: string };

const reasons: Record<string, string> = {
  "no-key": "Label reading isn’t set up on the server yet.",
  key: "Label reading isn’t working right now (API key).",
  busy: "WattSnap AI is busy. Try again in a minute.",
  model: "Label reading isn’t available right now.",
  unavailable: "Label reading is temporarily unavailable.",
};

/** Sends the label photo to WattSnap AI (Gemini). Every value comes back for review in the form; nothing is saved here. */
export async function readApplianceLabel(photo: Blob, signal: AbortSignal): Promise<LabelOutcome> {
  let upload;
  try { upload = await prepareBillUpload(photo); }
  catch { return { ok: false, reason: "That photo is too large to read." }; }
  const response = await fetch("/api/ai/appliances", { method: "POST", signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageBase64: upload.base64, mimeType: upload.mimeType }) });
  const body = await response.json().catch(() => null);
  if (response.ok && body?.data) return { ok: true, data: body.data as ApplianceLabelExtractionResult };
  if (response.status === 401) return { ok: false, reason: "Your session ended. Log in again to read labels." };
  if (typeof body?.problem === "string" && reasons[body.problem]) return { ok: false, reason: reasons[body.problem] };
  if ((response.status === 413 || response.status === 415 || response.status === 429) && typeof body?.error === "string") return { ok: false, reason: body.error };
  return { ok: false, reason: "We couldn’t read this label." };
}
