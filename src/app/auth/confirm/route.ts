import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { getServerSupabase } from "../../../lib/supabase/server";
import { safeNextPath } from "../../../features/auth/schemas";
import { getAccount } from "../../../features/auth/service";
export const dynamic = "force-dynamic";
const types = new Set<EmailOtpType>(["signup", "invite", "magiclink", "recovery", "email_change", "email"]);
export async function GET(request: Request) {
  const url = new URL(request.url), token_hash = url.searchParams.get("token_hash"), type = url.searchParams.get("type") as EmailOtpType | null;
  let destination = "/login?error=verification";
  try {
    if (token_hash && type && types.has(type)) {
      const client = await getServerSupabase();
      const { error } = await client.auth.verifyOtp({ token_hash, type });
      if (!error) destination = type === "recovery" ? "/reset-password" : type === "signup" || type === "invite" ? "/complete-profile" : safeNextPath(url.searchParams.get("next"));
      // Reopened from history after the link was used: continue an open session (never a reset).
      else if (type !== "recovery") { const account = await getAccount(client); if (account.ok && account.value) destination = account.value.profile.onboardedAt ? "/dashboard" : "/complete-profile"; }
    }
  } catch { /* Invalid and expired links share visible feedback. */ }
  const response = NextResponse.redirect(new URL(destination, url.origin));
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}
