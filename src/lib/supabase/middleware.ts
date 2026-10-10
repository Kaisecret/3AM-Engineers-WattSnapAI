import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "../../generated/database.types";
import { readPublicSupabaseEnv } from "../config/env";
import { hasVerifiedClaims, isProtectedPath } from "./authorization";
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  let verified = false;
  try {
    const { url, publishableKey } = readPublicSupabaseEnv();
    const client = createServerClient<Database>(url, publishableKey, { cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values, headers) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        if (headers) Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
      },
    } });
    verified = await hasVerifiedClaims(client);
  } catch { /* Configuration or network failure must deny protected access. */ }
  if (!verified && isProtectedPath(request.nextUrl.pathname)) {
    const login = request.nextUrl.clone();
    login.pathname = "/login"; login.search = "";
    login.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    const redirected = NextResponse.redirect(login);
    response.cookies.getAll().forEach(cookie => redirected.cookies.set(cookie));
    response = redirected;
  }
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Pragma", "no-cache"); response.headers.set("Expires", "0");
  return response;
}
