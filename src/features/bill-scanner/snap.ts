"use client";
import type { BillExtractionResult } from "@/contracts/extraction";

/** A photo taken from the Snap AI button, waiting for the scan page to read it (memory only). */
let pending: File | null = null;
export const pendingBillPhotoEvent = "wattsnap-bill-photo";
export function setPendingBillPhoto(file: File) { pending = file; }
export function takePendingBillPhoto() { const file = pending; pending = null; return file; }

/** Phones and tablets open their own camera app, which takes sharper photos than a page preview. */
export const prefersNativeCamera = () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

const longestSide = 2400;
const maxUpload = 3_500_000;

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]*,/, ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** A photo shrunk to a size Gemini reads well and Vercel accepts; PDFs are sent as they are. */
export async function prepareBillUpload(input: Blob | string): Promise<{ base64: string; mimeType: string }> {
  const blob = typeof input === "string" ? await (await fetch(input)).blob() : input;
  if (blob.type === "application/pdf") {
    if (blob.size > maxUpload) throw new Error("too-large");
    return { base64: await blobToBase64(blob), mimeType: blob.type };
  }
  try {
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, longestSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const jpeg = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (jpeg && jpeg.size <= maxUpload) return { base64: await blobToBase64(jpeg), mimeType: "image/jpeg" };
  } catch { /* Not decodable here (e.g. HEIC on Android); send the original if it fits. */ }
  if (blob.size > maxUpload) throw new Error("too-large");
  return { base64: await blobToBase64(blob), mimeType: blob.type || "image/jpeg" };
}

export type BillReadingOutcome = { ok: true; data: BillExtractionResult } | { ok: false; reason: string };

const reasons: Record<string, string> = {
  "no-key": "AI reading isn’t set up on the server yet.",
  key: "AI reading isn’t working right now (API key).",
  busy: "WattSnap AI is busy. Try again in a minute.",
  model: "AI reading isn’t available right now.",
};

/** Sends the photo to Snap AI (Gemini). Every value comes back for review; nothing is saved here. */
export async function readBillPhoto(input: Blob | string, providerHint: string, signal: AbortSignal): Promise<BillReadingOutcome> {
  let upload;
  try { upload = await prepareBillUpload(input); }
  catch { return { ok: false, reason: "That file is too large to read. Try a photo instead." }; }
  const response = await fetch("/api/ai/bills", {
    method: "POST", signal, headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64: upload.base64, mimeType: upload.mimeType, providerHint }),
  });
  const body = await response.json().catch(() => null);
  if (response.ok && body?.data) return { ok: true, data: body.data as BillExtractionResult };
  if (response.status === 401) return { ok: false, reason: "Your session ended. Log in again to use AI reading." };
  if (typeof body?.problem === "string" && reasons[body.problem]) return { ok: false, reason: reasons[body.problem] };
  if ((response.status === 413 || response.status === 415 || response.status === 429) && typeof body?.error === "string") return { ok: false, reason: body.error };
  return { ok: false, reason: "We couldn’t read this photo." };
}
