import { Webhook } from "standardwebhooks";
import { authEmails, type AuthEmail } from "./auth-email";

interface Dependencies {
  secret: string;
  send: (mail: AuthEmail) => Promise<unknown>;
  siteUrl?: string;
}
function errorResponse(status: number, message: string) {
  return Response.json({ error: { http_code: status, message } }, { status, headers: { "cache-control": "no-store" } });
}
/** Only Supabase-authenticated signed webhook requests may reach the SMTP sender. */
export async function handleSendEmailHook(request: Request, deps: Dependencies): Promise<Response> {
  if (request.method !== "POST") return errorResponse(405, "Method not allowed.");
  if (!deps.secret.trim()) return errorResponse(503, "Email delivery is not configured.");
  const size = Number(request.headers.get("content-length") || 0);
  if (size > 65536) return errorResponse(413, "Request too large.");
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > 65536) return errorResponse(413, "Request too large.");
  let verifier: Webhook;
  try { verifier = new Webhook(deps.secret.trim().replace(/^v1,/, "")); }
  catch { return errorResponse(503, "Email delivery is not configured."); }
  let payload: unknown;
  try { payload = verifier.verify(raw, Object.fromEntries(request.headers)); }
  catch { return errorResponse(401, "Invalid webhook signature."); }
  let messages: AuthEmail[];
  try { messages = authEmails(payload, deps.siteUrl ? { siteUrl: deps.siteUrl } : undefined); }
  catch { return errorResponse(400, "Invalid authentication email payload."); }
  try { await Promise.all(messages.map(mail => deps.send(mail))); }
  catch { return errorResponse(503, "Email delivery is temporarily unavailable. Please try again."); }
  return Response.json({}, { headers: { "cache-control": "no-store" } });
}
