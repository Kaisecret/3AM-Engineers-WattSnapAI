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
      if (!error) {
        const account = await getAccount(client);
        if (account.ok && account.value) {
          const next = safeNextPath(url.searchParams.get("next"));
          destination = next === "/reset-password" || account.value.profile.onboardedAt ? next : "/complete-profile";
        }
      }
    }
  } catch { /* Provider details stay out of the redirect and visible error. */ }
  const response = NextResponse.redirect(new URL(destination, url.origin));
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}
