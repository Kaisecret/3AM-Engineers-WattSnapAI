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
        if (event === "SIGNED_OUT" || session?.user.id !== account.id) {
          setReadyId(null);
          try { forgetAccount(); } catch { /* In-memory identity has already been cleared. */ }
          // A full page load drops every signed-in page held in memory.
          if (!session) window.location.replace("/login"); else router.refresh();
        }
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
