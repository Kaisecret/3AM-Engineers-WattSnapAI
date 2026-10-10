import nodemailer from "nodemailer";
import { readSmtpEnv } from "./config";
import type { AuthEmail } from "./auth-email";

/** Node.js only. Short timeouts fit Supabase's five-second HTTP hook budget. */
export async function sendAuthEmail(mail: AuthEmail) {
  const settings = readSmtpEnv();
  const transport = nodemailer.createTransport({
    host: settings.host, port: settings.port, secure: settings.secure,
    requireTLS: !settings.secure,
    auth: { user: settings.user, pass: settings.password },
    connectionTimeout: 1500, greetingTimeout: 1500, socketTimeout: 3000,
    disableFileAccess: true, disableUrlAccess: true,
  });
  const deadline = setTimeout(() => transport.close(), 4200);
  try {
    const result = await transport.sendMail({ ...mail, from: { name: "WattSnap", address: settings.user } });
    if (result.rejected.length || !result.accepted.length) throw new Error("Email not accepted.");
  } finally { clearTimeout(deadline); transport.close(); }
}
