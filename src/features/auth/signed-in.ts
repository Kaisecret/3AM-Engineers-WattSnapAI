import { getBrowserSupabase } from "../../lib/supabase/browser";
import { hasAuthCookie, isServerBounce, redirectGuardKey, redirectGuardMs } from "./signed-in-gate";

export { hasAuthCookie, isServerBounce };

/** True right after a redirect from here, so a server that disagrees cannot cause a loop. */
export function recentlyRedirected(now = Date.now()) {
  try { return now - Number(sessionStorage.getItem(redirectGuardKey) || 0) < redirectGuardMs; } catch { return false; }
}
export function markRedirected(now = Date.now()) {
  try { sessionStorage.setItem(redirectGuardKey, String(now)); } catch { /* The guard is optional. */ }
}

/** Whether this browser still holds a session. A network failure keeps it; a revoked one is removed. */
export async function browserHasSession(): Promise<boolean> {
  if (!hasAuthCookie(document.cookie)) return false;
  try {
    const { data: { session }, error } = await getBrowserSupabase().auth.getSession();
    if (session) return !session.user.is_anonymous;
    return !!error && hasAuthCookie(document.cookie);
  } catch {
    return hasAuthCookie(document.cookie);
  }
}
