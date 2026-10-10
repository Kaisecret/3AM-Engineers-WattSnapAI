// Run with Node 24+: node --env-file=.env.local scripts/configure-supabase-auth.mjs
// Add --enable-email only after Gmail SMTP is configured and the hook is deployed.
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { Webhook } from "standardwebhooks";

const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "");
const ref = url.hostname.split(".")[0];
if (!/^[a-z]{20}$/.test(ref)) throw new Error("Expected a hosted Supabase project URL.");
const site = new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://www.wattsnapai.dev").origin;
if (!site.startsWith("https://")) throw new Error("The live site must use HTTPS.");
const directory = mkdtempSync(join(tmpdir(), "wattsnap-auth-config-"));
mkdirSync(join(directory, "supabase"));
const configPath = join(directory, "supabase", "config.toml");
writeFileSync(configPath, 'project_id = "wattsnap"\n');
function cli(args) {
  const result = spawnSync("npx", ["supabase", ...args, "--project-ref", ref, "--workdir", directory, "--yes"], { shell: process.platform === "win32", encoding: "utf8" });
  if (result.status !== 0) {
    let message = (result.stderr || result.stdout || "Supabase CLI failed.");
    for (const [name, value] of Object.entries(process.env)) if (value && /SECRET|TOKEN|PASS|KEY/.test(name)) message = message.replaceAll(value, "[redacted]");
    throw new Error(message);
  }
  return result.stdout;
}
cli(["config", "pull"]);
const current = readFileSync(configPath, "utf8");
const redirectBlock = current.match(/^additional_redirect_urls\s*=\s*\[([^\]]*)\]/m)?.[1] || "";
const redirects = [...redirectBlock.matchAll(/["']([^"']+)["']/g)].map(match => match[1]);
const allowed = [...new Set([...redirects, `${site}/auth/callback`, `${site}/auth/confirm`, "http://localhost:3000/auth/callback", "http://localhost:3000/auth/confirm"] )];
if (process.argv.includes("--inspect")) {
  console.log(JSON.stringify({
    site_url: current.match(/^site_url\s*=\s*["']([^"']+)["']/m)?.[1],
    redirect_urls: redirects,
    otp_length: Number(current.match(/^otp_length\s*=\s*(\d+)/m)?.[1] || 6),
    email_confirmations: current.match(/^enable_confirmations\s*=\s*(true|false)/m)?.[1],
    gmail_configured: Boolean(process.env.SMTP_USER && process.env.SMTP_PASS),
  }, null, 2));
  process.exit(0);
}
const config = [
  'project_id = "wattsnap"', "", "[auth]", `site_url = ${JSON.stringify(site)}`,
  `additional_redirect_urls = ${JSON.stringify(allowed)}`, "", "[auth.email]",
  "enable_signup = true", "enable_confirmations = true", "otp_length = 6",
];
if (process.argv.includes("--enable-email")) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.SEND_EMAIL_HOOK_SECRET) throw new Error("Fill SMTP_USER, SMTP_PASS, and SEND_EMAIL_HOOK_SECRET before enabling Gmail delivery.");
  const response = await fetch(`${site}/api/auth/send-email`, { method: "POST", body: "{}", signal: AbortSignal.timeout(10_000) });
  if (response.status !== 401) throw new Error("The deployed signed email hook is not ready.");
  // Verify the deployed endpoint accepts this exact secret without sending an
  // email: a correctly signed but incomplete payload must fail validation (400).
  const timestamp = new Date(), id = randomUUID(), raw = "{}";
  const signed = await fetch(`${site}/api/auth/send-email`, { method: "POST", body: raw, signal: AbortSignal.timeout(10_000), headers: {
    "content-type": "application/json", "webhook-id": id,
    "webhook-timestamp": String(Math.floor(timestamp.getTime() / 1000)),
    "webhook-signature": new Webhook(process.env.SEND_EMAIL_HOOK_SECRET.replace(/^v1,/, "")).sign(id, timestamp, raw),
  } });
  if (signed.status !== 400) throw new Error("The live email hook signing secret does not match .env.local.");
  config.push("", "[auth.hook.send_email]", "enabled = true", `uri = ${JSON.stringify(`${site}/api/auth/send-email`)}`, `secrets = ${JSON.stringify(process.env.SEND_EMAIL_HOOK_SECRET)}`);
}
writeFileSync(configPath, config.join("\n") + "\n");
cli(["config", "diff"]);
cli(["config", "push"]);
console.log("Supabase live site, redirect URLs, and six-digit email verification configured.");
console.log(process.argv.includes("--enable-email") ? "Signed Gmail email hook enabled." : "Existing email delivery preserved; Gmail hook not enabled yet.");
