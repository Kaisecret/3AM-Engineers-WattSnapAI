export interface AuthEmail { to: string; subject: string; text: string; html: string }
interface EmailLinks { siteUrl: string; supabaseUrl?: string }
const copy: Record<string, { subject: string; title: string; instruction: string; next: string }> = {
  signup: { subject: "Verify your WattSnap email", title: "Welcome to WattSnap", instruction: "Enter this code in WattSnap to verify your email address.", next: "/complete-profile" },
  recovery: { subject: "Reset your WattSnap password", title: "Reset your password", instruction: "Enter this code on the password reset screen in WattSnap.", next: "/reset-password" },
  invite: { subject: "Your WattSnap invitation", title: "You’re invited to WattSnap", instruction: "Confirm your email to finish setting up your account.", next: "/complete-profile" },
  magiclink: { subject: "Sign in to WattSnap", title: "Your sign-in code", instruction: "Use this code or the confirmation link to sign in to WattSnap.", next: "/dashboard" },
  reauthentication: { subject: "Confirm your WattSnap account", title: "Confirm it’s you", instruction: "Enter this code in WattSnap to confirm this account action.", next: "/settings" },
  email_change: { subject: "Confirm your WattSnap email change", title: "Confirm your email change", instruction: "Use this code or the confirmation link to confirm your email change.", next: "/settings" },
};
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid email payload.");
  return value as Record<string, unknown>;
}
function email(value: unknown) {
  if (typeof value !== "string" || value.length > 254 || !/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(value)) throw new Error("Invalid email recipient.");
  return value;
}
function token(value: unknown) {
  if (typeof value !== "string" || !/^\d{6,10}$/.test(value)) throw new Error("Invalid verification code.");
  return value;
}
const escapeHtml = (text: string) => text.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]!));

/** Render only Supabase-supported actions, never arbitrary subjects or HTML. */
export function authEmails(payload: unknown, links?: EmailLinks): AuthEmail[] {
  const data = record(payload);
  const user = record(data.user);
  const details = record(data.email_data);
  const action = details.email_action_type;
  if (typeof action !== "string" || !Object.hasOwn(copy, action)) throw new Error("Unsupported email action.");
  const content = copy[action];
  const make = (recipient: unknown, code: unknown, hash?: unknown): AuthEmail => {
    const to = email(recipient);
    const otp = token(code);
    let link = "";
    if (links && typeof hash === "string" && hash.length > 0 && hash.length <= 512 && /^[a-z0-9_-]+$/i.test(hash)) {
      const origin = new URL(links.siteUrl);
      if (origin.protocol !== "https:" && !(origin.protocol === "http:" && ["localhost", "127.0.0.1"].includes(origin.hostname))) throw new Error("Invalid app origin.");
      const confirm = new URL("/auth/confirm", origin.origin);
      confirm.searchParams.set("token_hash", hash);
      confirm.searchParams.set("type", action === "signup" ? "email" : action);
      confirm.searchParams.set("next", content.next);
      link = confirm.toString();
    }
    const text = `${content.title}\n\n${content.instruction}\n\n${otp}\n${link ? `\nOr confirm here: ${link}\n` : ""}\nThis code expires according to your account security settings. Never share it with anyone.\nIf you did not request this email, you can ignore it.\n\nWattSnap`;
    const html = `<html><body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:40px 20px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;background:#fff;border-radius:20px"><tr><td style="padding:36px"><div style="font-size:24px;font-weight:bold;color:#0284c7">WattSnap</div><h1 style="font-size:24px;margin:28px 0 12px">${escapeHtml(content.title)}</h1><p style="font-size:16px;line-height:1.6;color:#475569">${escapeHtml(content.instruction)}</p><div style="padding:22px;background:#f0f9ff;border-radius:12px;text-align:center;font-size:34px;letter-spacing:8px;font-weight:bold;color:#0369a1">${otp}</div>${link ? `<p style="margin:24px 0"><a href="${escapeHtml(link)}" style="color:#0284c7">Confirm in WattSnap</a></p>` : ""}<p style="font-size:13px;line-height:1.6;color:#64748b">This code expires according to your account security settings. Never share it with anyone.</p><p style="font-size:13px;line-height:1.6;color:#64748b">If you did not request this email, you can ignore it.</p></td></tr></table></td></tr></table></body></html>`;
    return { to, subject: content.subject, text, html };
  };
  if (action === "email_change") {
    // Supabase's hash suffixes are reversed: current email uses token_hash_new.
    if (details.token_hash_new && details.token_hash && details.token_new) {
      return [make(user.email, details.token, details.token_hash_new), make(user.new_email, details.token_new, details.token_hash)];
    }
    return [make(user.new_email, details.token_new || details.token, details.token_hash)];
  }
  return [make(user.email, details.token, details.token_hash)];
}
