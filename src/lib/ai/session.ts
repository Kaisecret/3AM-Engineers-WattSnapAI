import "server-only";
import { NextResponse } from "next/server";
import { getServerSupabase } from "../supabase/server";

/**
 * The signed-in account's id, or null. The in-app AI routes spend the shared Gemini
 * quota, so only people with a WattSnap account can call them.
 */
export async function signedInUserId(): Promise<string | null> {
  try {
    const { data: { user } } = await (await getServerSupabase()).auth.getUser();
    return user && !user.is_anonymous ? user.id : null;
  } catch {
    return null;
  }
}

export const signInRequired = () => NextResponse.json({ error: "Please log in to use WattSnap AI.", signIn: true }, { status: 401 });
export const slowDown = () => NextResponse.json({ error: "You’re sending messages quickly. Please wait a minute and try again." }, { status: 429 });
