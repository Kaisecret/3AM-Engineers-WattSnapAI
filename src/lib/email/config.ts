export interface SmtpEnv { host: string; port: number; secure: boolean; user: string; password: string }

/** Server settings are read only when sending, never at build time. */
export function readSmtpEnv(source: Record<string, string | undefined> = process.env): SmtpEnv {
  if (typeof window !== "undefined") throw new Error("SMTP settings are server-only.");
  const user = source.SMTP_USER?.trim() ?? "";
  const password = source.SMTP_PASS?.replace(/\s/g, "") ?? "";
  if (!user || !password) throw new Error("Set SMTP_USER and SMTP_PASS to enable Gmail email delivery.");
  if (!/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(user)) throw new Error("SMTP_USER must be a single email address.");
  const host = source.SMTP_HOST?.trim() || "smtp.gmail.com";
  if (!/^[a-z0-9.-]+$/i.test(host)) throw new Error("SMTP_HOST must be a hostname.");
  const rawPort = source.SMTP_PORT?.trim() || "465";
  const port = Number(rawPort);
  if (!/^\d+$/.test(rawPort) || !Number.isInteger(port) || port < 1 || port > 65535) throw new Error("SMTP_PORT must be an integer between 1 and 65535.");
  return { host, port, secure: port === 465, user, password };
}
