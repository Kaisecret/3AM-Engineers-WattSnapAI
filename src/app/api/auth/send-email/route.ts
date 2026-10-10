import { handleSendEmailHook } from "@/lib/email/send-email-hook";
import { sendAuthEmail } from "@/lib/email/smtp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 10;

export async function POST(request: Request) {
  return handleSendEmailHook(request, {
    secret: process.env.SEND_EMAIL_HOOK_SECRET || "",
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    send: sendAuthEmail,
  });
}
