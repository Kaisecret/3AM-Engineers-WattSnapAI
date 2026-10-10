"use client";
import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "../../../lib/supabase/browser";
import { rememberAccount, forgetAccount } from "../session";
import type { Account } from "../types";
/** Children mount only after the server-verified identity is installed in memory. */
export function AccountSynchronizer({ account, children }: { account: Account; children: ReactNode }) {
  const [readyId, setReadyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();
  useEffect(() => {
    setReadyId(null);
    try {
      rememberAccount(account);
      const { data: { subscription } } = getBrowserSupabase().auth.onAuthStateChange((event, session) => {
        // Only a real sign-out (here, in another tab, or a revoked session) ends the session.
        // A missing session on start-up is usually a weak connection while the token refreshes
        // (for example after returning to the app); the server already verified this account.
        const signedOut = event === "SIGNED_OUT";
        const otherAccount = !!session && session.user.id !== account.id;
        if (!signedOut && !otherAccount) return;
        setReadyId(null);
        try { forgetAccount(); } catch { /* In-memory identity has already been cleared. */ }
        // A full page load drops every signed-in page held in memory.
        if (signedOut) window.location.replace("/login"); else router.refresh();
      });
      setReadyId(account.id); setError("");
      return () => { subscription.unsubscribe(); };
    } catch {
      try { forgetAccount(); } catch { /* Clear in-memory scope even if storage is unavailable. */ }
      setError("Your account's saved data could not be opened in this browser. Enable browser storage and reload.");
    }
  }, [account, router]);
  if (error) return <main><p role="alert">{error}</p><button onClick={() => window.location.reload()}>Reload</button></main>;
  return readyId === account.id ? <>{children}</> : null;
}
