/** Supabase settings. Read when a client is created, never when this file is imported. */
export interface PublicSupabaseEnv { url: string; publishableKey: string }

/** The role inside an older, JWT-style Supabase key, or null for any other value. */
function legacyKeyRole(value: string): string | null {
  const payload = value.split(".")[1];
  if (!payload) return null;
  try { return String(JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))).role ?? "") || null; }
  catch { return null; }
}
const isSecretKey = (value: string) => value.startsWith("sb_secret_") || legacyKeyRole(value) === "service_role";
const isPublishableKey = (value: string) => value.startsWith("sb_publishable_") || legacyKeyRole(value) === "anon";

function isProjectUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname));
  } catch { return false; }
}

// Next.js only places a NEXT_PUBLIC_ value in the browser bundle when it is written out in full.
export function readPublicSupabaseEnv(
  source: { url?: string; publishableKey?: string } = { url: process.env.NEXT_PUBLIC_SUPABASE_URL, publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY },
): PublicSupabaseEnv {
  const url = source.url?.trim() ?? "";
  const publishableKey = source.publishableKey?.trim() ?? "";
  const missing = [!url && "NEXT_PUBLIC_SUPABASE_URL", !publishableKey && "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"].filter(Boolean);
  if (missing.length) throw new Error(`Missing environment variable${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}. See .env.example.`);
  if (!isProjectUrl(url)) throw new Error("NEXT_PUBLIC_SUPABASE_URL must be an https URL, like https://abcdefgh.supabase.co.");
  if (isSecretKey(publishableKey)) throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY holds a secret key. Put the publishable key there; the secret key belongs in SUPABASE_SECRET_KEY only.");
  return { url, publishableKey };
}

export function readSupabaseSecretKey(value: string | undefined = process.env.SUPABASE_SECRET_KEY): string {
  if (typeof window !== "undefined") throw new Error("SUPABASE_SECRET_KEY must never be read in the browser.");
  const key = value?.trim() ?? "";
  if (!key) throw new Error("Missing environment variable: SUPABASE_SECRET_KEY. See .env.example.");
  if (isPublishableKey(key)) throw new Error("SUPABASE_SECRET_KEY holds a publishable key. Put the secret key there; it starts with sb_secret_.");
  return key;
}
