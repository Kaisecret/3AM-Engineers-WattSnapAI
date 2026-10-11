/**
 * Reads a public Facebook page's posts through Apify's facebook-posts-scraper actor.
 * This file is the only place that knows the actor's input and output field names.
 */
const ACTOR_URL = "https://api.apify.com/v2/acts/apify~facebook-posts-scraper/run-sync-get-dataset-items";

export interface FetchedPost {
  id: string;
  url: string;
  /** ISO time the post was published. */
  postedAt: string;
  text: string;
  imageUrls: string[];
  /** How many images the post has, including ones whose link is not usable. */
  imageCount: number;
  /** Text the actor extracted from the images. It can be a description, so it is only ever a hint. */
  imageText: string;
}
export interface PostQuery { pageUrl: string; newerThan: string; olderThan?: string; limit: number; timeoutMs: number }
export interface PostPage { posts: FetchedPost[]; /** The actor returned as many items as were asked for, so older posts may have been cut off. */ full: boolean }

/** Why a fetch failed, in a form that is safe to store (never includes the token). */
export class ApifyError extends Error {
  constructor(message: string) { super(message); this.name = "ApifyError"; }
}

const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

function httpsUrl(value: unknown, host: RegExp): string | null {
  if (typeof value !== "string" || value.length > 2000) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && host.test(url.hostname) ? url.href : null;
  } catch { return null; }
}
const facebookHost = /^([a-z0-9-]+\.)*facebook\.com$/, imageHost = /^([a-z0-9-]+\.)*fbcdn\.net$/;

/** Facebook images are served from fbcdn.net; nothing else is ever downloaded. */
export const facebookImageUrl = (value: unknown) => httpsUrl(value, imageHost);

function postedAt(item: Record<string, unknown>): string | null {
  const stamp = typeof item.time === "string" ? Date.parse(item.time)
    : typeof item.timestamp === "number" ? item.timestamp * (item.timestamp < 1e12 ? 1000 : 1)
    : typeof item.timestamp === "string" ? Date.parse(item.timestamp) : NaN;
  return Number.isFinite(stamp) && stamp > 0 ? new Date(stamp).toISOString() : null;
}

/** The actor's dataset items as posts, newest first. Items without an id, a facebook.com link or a time are dropped. */
export function readFacebookPosts(items: unknown): FetchedPost[] {
  if (!Array.isArray(items)) return [];
  const posts = new Map<string, FetchedPost>();
  for (const entry of items) {
    if (!entry || typeof entry !== "object") continue;
    const item = entry as Record<string, unknown>;
    const id = text(item.postId ?? item.facebookId, 200);
    const url = [item.url, item.topLevelUrl, item.facebookUrl].map(link => httpsUrl(link, facebookHost)).find(link => link && link.length <= 500);
    const time = postedAt(item);
    if (!id || !url || !time || posts.has(id)) continue;
    const media = Array.isArray(item.media) ? item.media.filter((part): part is Record<string, unknown> => !!part && typeof part === "object") : [];
    const imageUrls = media
      .map(part => facebookImageUrl((part.photo_image as { uri?: unknown } | undefined)?.uri) ?? facebookImageUrl(part.thumbnail))
      .filter((link): link is string => !!link);
    posts.set(id, {
      id, url, postedAt: time,
      text: text(item.text, 8000),
      imageUrls: [...new Set(imageUrls)].slice(0, 6),
      imageCount: media.length,
      imageText: media.map(part => text(part.ocrText, 2000)).filter(Boolean).join("\n").slice(0, 4000),
    });
  }
  return [...posts.values()].sort((a, b) => b.postedAt.localeCompare(a.postedAt));
}

export interface PostImage { mimeType: string; data: string }
const imageTypes = ["image/jpeg", "image/png", "image/webp"], maxImageBytes = 4 * 1024 * 1024;

/**
 * Downloads post images as base64 for the model. Only fbcdn.net links are followed, redirects are
 * refused, and anything that is not a JPEG, PNG or WebP of at most 4 MB is left out. Images that
 * cannot be loaded are skipped, so the result can be empty.
 */
export async function downloadFacebookImages(urls: string[], timeoutMs = 10_000): Promise<PostImage[]> {
  const loaded = await Promise.all(urls.map(async (link): Promise<PostImage | null> => {
    const url = facebookImageUrl(link);
    if (!url) return null;
    try {
      const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(timeoutMs) });
      const mimeType = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
      if (!response.ok || !imageTypes.includes(mimeType) || Number(response.headers.get("content-length") ?? 0) > maxImageBytes) return null;
      // Read in pieces and stop as soon as the limit is passed: the declared length can be missing or wrong.
      const chunks: Uint8Array[] = [], reader = response.body?.getReader();
      let size = 0;
      for (let part = await reader?.read(); part && !part.done; part = await reader!.read()) {
        size += part.value.byteLength;
        if (size > maxImageBytes) { await reader!.cancel(); return null; }
        chunks.push(part.value);
      }
      return size > 0 ? { mimeType, data: Buffer.concat(chunks).toString("base64") } : null;
    } catch { return null; }
  }));
  return loaded.filter((image): image is PostImage => image !== null);
}

export function hasApifyToken() {
  return Boolean(process.env.APIFY_API_TOKEN?.trim());
}

/** One synchronous actor run. The token travels in a header, not the URL, so it cannot end up in request logs. */
export async function fetchFacebookPosts({ pageUrl, newerThan, olderThan, limit, timeoutMs }: PostQuery): Promise<PostPage> {
  const token = process.env.APIFY_API_TOKEN?.trim();
  if (!token) throw new ApifyError("APIFY_API_TOKEN is not configured in server environment.");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${ACTOR_URL}?timeout=${Math.max(1, Math.floor(timeoutMs / 1000) - 5)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ startUrls: [{ url: pageUrl }], resultsLimit: limit, onlyPostsNewerThan: newerThan, ...(olderThan ? { onlyPostsOlderThan: olderThan } : {}) }),
      signal: controller.signal,
    });
    if (!response.ok) throw new ApifyError(`Apify returned status ${response.status}.`);
    const items: unknown = await response.json();
    return { posts: readFacebookPosts(items), full: Array.isArray(items) && items.length >= limit };
  } catch (error) {
    if (error instanceof ApifyError) throw error;
    if (error instanceof Error && error.name === "AbortError") throw new ApifyError("Apify did not answer in time.");
    throw new ApifyError(`Apify could not be reached: ${error instanceof Error ? error.message : "network error"}`);
  } finally {
    clearTimeout(timer);
  }
}
