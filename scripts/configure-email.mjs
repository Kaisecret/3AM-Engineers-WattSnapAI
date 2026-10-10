// Gmail delivery activation: npm run setup:email
// Values are loaded by Node from .env.local and never passed on the command line.
import { spawnSync } from "node:child_process";
import nodemailer from "nodemailer";
import { readSmtpEnv } from "../src/lib/email/config.ts";

const settings = readSmtpEnv();
if (!process.env.SEND_EMAIL_HOOK_SECRET || !process.env.NEXT_PUBLIC_SITE_URL) throw new Error("Set SEND_EMAIL_HOOK_SECRET and NEXT_PUBLIC_SITE_URL first.");
const transport = nodemailer.createTransport({ host: settings.host, port: settings.port, secure: settings.secure, requireTLS: !settings.secure,
  auth: { user: settings.user, pass: settings.password }, connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 10_000 });
try { await transport.verify(); console.log("Gmail SMTP authentication verified."); }
catch { throw new Error("Gmail SMTP verification failed. Check your Gmail address and App Password."); }
finally { transport.close(); }

function run(command, args, input) {
  const result = spawnSync(command, args, { shell: process.platform === "win32" && command !== process.execPath, encoding: "utf8", input });
  if (result.status !== 0) {
    let message = result.stderr || "Setup command failed.";
    for (const [name, value] of Object.entries(process.env)) if (value && /SECRET|TOKEN|PASS|KEY/.test(name)) message = message.replaceAll(value, "[redacted]");
    throw new Error(message);
  }
  return result.stdout;
}
for (const key of ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SEND_EMAIL_HOOK_SECRET", "NEXT_PUBLIC_SITE_URL"]) {
  const value = process.env[key] || ({ SMTP_HOST: settings.host, SMTP_PORT: String(settings.port) }[key]);
  if (!value) throw new Error(`Missing ${key}.`);
  run("vercel", ["env", "add", key, "production,preview", "--force", "--yes"], `${value}\n`);
  console.log(`${key}: configured in Vercel.`);
}
console.log("Deploying the configured email sender to Vercel…");
console.log(run("vercel", ["--prod", "--yes"]));
console.log(run(process.execPath, ["--env-file=.env.local", "scripts/configure-supabase-auth.mjs", "--enable-email"]));
console.log("Gmail delivery is ready. Use signup or password recovery to test an actual verification email.");
