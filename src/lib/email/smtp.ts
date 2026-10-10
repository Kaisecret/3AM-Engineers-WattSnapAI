import nodemailer from "nodemailer";
import net from "node:net";
import tls from "node:tls";
import { readSmtpEnv } from "./config";
import type { AuthEmail } from "./auth-email";

/** Node.js only. Short timeouts fit Supabase's five-second HTTP hook budget. */
export async function sendAuthEmail(mail: AuthEmail, source: Record<string, string | undefined> = process.env, deadlineMs = 4200) {
  const settings = readSmtpEnv(source);
  let socket: net.Socket | undefined;
  let timedOut = false;
  const transport = nodemailer.createTransport({
    host: settings.host, port: settings.port, secure: settings.secure,
    requireTLS: !settings.secure,
    auth: { user: settings.user, pass: settings.password },
    connectionTimeout: 1500, greetingTimeout: 1500, socketTimeout: 3000,
    disableFileAccess: true, disableUrlAccess: true,
    // Own the socket so the total deadline can cancel an active send, not just
    // close the transport's bookkeeping. TLS certificates remain verified.
    getSocket(_options, callback) {
      if (timedOut) { callback(new Error("SMTP delivery timed out.")); return; }
      let answered = false;
      const connected = () => {
        if (answered) return;
        answered = true;
        socket!.removeListener("error", failed);
        callback(null, { connection: socket!, secured: settings.secure });
      };
      const failed = (error: Error) => {
        if (answered) return;
        answered = true;
        callback(error);
      };
      socket = settings.secure
        ? tls.connect({ host: settings.host, port: settings.port, servername: settings.host, rejectUnauthorized: true }, connected)
        : net.connect({ host: settings.host, port: settings.port }, connected);
      socket.once("error", failed);
    },
  });
  let deadline: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    deadline = setTimeout(() => {
      timedOut = true;
      reject(new Error("SMTP delivery timed out."));
      socket?.destroy(new Error("SMTP delivery timed out."));
    }, deadlineMs);
  });
  try {
    const result = await Promise.race([transport.sendMail({ ...mail, from: { name: "WattSnap", address: settings.user } }), timeout]);
    if (result.rejected.length || !result.accepted.length) throw new Error("Email not accepted.");
  } finally { clearTimeout(deadline); socket?.destroy(); transport.close(); }
}
