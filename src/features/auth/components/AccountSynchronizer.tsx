"use client";
import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "../../../lib/supabase/browser";
import { rememberAccount, forgetAccount, readDisplayIdentity, clearDisplayIdentityMemory, displayIdentityKey, displayIdentityEvent } from "../session";
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
      let leaving = false;
      const closeLocalScope = () => {
        if (leaving) return;
        leaving = true;
        setReadyId(null);
        clearDisplayIdentityMemory();
        window.location.replace("/login");
      };
      const identityChanged = () => {
        if (readDisplayIdentity()?.id !== account.id) closeLocalScope();
      };
      const storageChanged = (event: StorageEvent) => {
        if (event.key !== null && event.key !== displayIdentityKey) return;
        try {
          if (JSON.parse(localStorage.getItem(displayIdentityKey) ?? "null")?.identity?.id !== account.id) closeLocalScope();
        } catch { closeLocalScope(); }
      };
      const { data: { subscription } } = getBrowserSupabase().auth.onAuthStateChange((event, session) => {
        // Only a real sign-out (here, in another tab, or a revoked session) ends the session.
        // A missing session on start-up is usually a weak connection while the token refreshes
        // (for example after returning to the app); the server already verified this account.
        const signedOut = event === "SIGNED_OUT";
        const otherAccount = !!session && session.user.id !== account.id;
        if (!signedOut && !otherAccount) return;
        setReadyId(null);
        if (signedOut) {
          try { forgetAccount(); } catch { /* In-memory identity has already been cleared. */ }
        } else clearDisplayIdentityMemory();
        // A full page load drops every signed-in page held in memory.
        if (signedOut) window.location.replace("/login"); else router.refresh();
      });
      window.addEventListener(displayIdentityEvent, identityChanged);
      window.addEventListener("storage", storageChanged);
      setReadyId(account.id); setError("");
      return () => {
        subscription.unsubscribe();
        window.removeEventListener(displayIdentityEvent, identityChanged);
        window.removeEventListener("storage", storageChanged);
      };
    } catch {
      try { forgetAccount(); } catch { /* Clear in-memory scope even if storage is unavailable. */ }
      setError("Your account's saved data could not be opened in this browser. Enable browser storage and reload.");
    }
  }, [account, router]);
  if (error) return <main><p role="alert">{error}</p><button onClick={() => window.location.reload()}>Reload</button></main>;
  return readyId === account.id ? <>{children}</> : null;
}
