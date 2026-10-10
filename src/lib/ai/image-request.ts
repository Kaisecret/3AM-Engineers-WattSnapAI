/** Photo types Gemini reads, and the largest photo accepted (Vercel caps request bodies at 4.5 MB). */
export const imageTypes = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
export const maxImageBytes = 4 * 1024 * 1024;

export type ImageRequest = { imageBase64: string; mimeType: string; hint: string };
export type ParsedImageRequest = { ok: true; value: ImageRequest } | { ok: false; status: number; error: string };

const fail = (status: number, error: string): ParsedImageRequest => ({ ok: false, status, error });
const text = (value: unknown) => typeof value === "string" ? value.trim().slice(0, 80) : "";

/** Reads a photo sent as JSON ({ imageBase64, mimeType }) or as form data (image). */
export async function readImageRequest(request: Request, hintField: string, missing: string): Promise<ParsedImageRequest> {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > maxImageBytes * 1.4) return fail(413, "That photo is too large. Please use one under 4 MB.");
  const contentType = request.headers.get("content-type") || "";
  let imageBase64 = "", mimeType = "image/jpeg", hint = "";

  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    imageBase64 = typeof body?.imageBase64 === "string" ? body.imageBase64.replace(/^data:[^,]*,/, "") : "";
    mimeType = typeof body?.mimeType === "string" ? body.mimeType : mimeType;
    hint = text(body?.[hintField]);
  } else if (contentType.includes("multipart/form-data")) {
    const form = await request.formData().catch(() => null);
    const file = form?.get("image");
    hint = text(form?.get(hintField));
    if (file instanceof File) {
      if (file.size > maxImageBytes) return fail(413, "That photo is too large. Please use one under 4 MB.");
      mimeType = file.type || mimeType;
      imageBase64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    }
  }

  if (!imageBase64) return fail(400, missing);
  if (imageBase64.length > Math.ceil(maxImageBytes / 3) * 4) return fail(413, "That photo is too large. Please use one under 4 MB.");
  if (!imageTypes.includes(mimeType)) return fail(415, "Please use a JPG, PNG, WebP or HEIC photo.");
  return { ok: true, value: { imageBase64, mimeType, hint } };
}
