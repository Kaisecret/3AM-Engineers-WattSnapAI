import { NextResponse } from "next/server";
import { getServerSupabase } from "../../../lib/supabase/server";
import { safeNextPath } from "../../../features/auth/schemas";
import { getAccount } from "../../../features/auth/service";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const url = new URL(request.url), code = url.searchParams.get("code");
  let destination = "/login?error=callback";
  try {
    if (code && !url.searchParams.has("error")) {
      const client = await getServerSupabase();
      const { error } = await client.auth.exchangeCodeForSession(code);
      const next = safeNextPath(url.searchParams.get("next"));
      // The phone's Back button can reopen this link after its code was used. A session that
      // is already open then simply continues. Only a fresh code may open the password reset.
      if (!error || next !== "/reset-password") {
        const account = await getAccount(client);
        if (account.ok && account.value) destination = (!error && next === "/reset-password") || account.value.profile.onboardedAt ? next : "/complete-profile";
      }
    }
  } catch { /* Provider details stay out of the redirect and visible error. */ }
  const response = NextResponse.redirect(new URL(destination, url.origin));
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}
