"use client";
import { useLayoutEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { safeNextPath } from "../schemas";
import { browserHasSession, hasAuthCookie, isServerBounce, markRedirected, recentlyRedirected } from "../signed-in";

const reveal = () => document.documentElement.classList.remove("ws-auth-check");

/** Sends a person who is still signed in from a signed-out page (landing, login, sign up) into the app. */
export function SignedInRedirect({ useNext = false }: { useNext?: boolean }) {
  const router = useRouter();
  const [checking, setChecking] = useState(false);

  // A layout effect runs before the page is painted, so Back never flashes the login screen.
  useLayoutEffect(() => {
    let active = true;
    function check() {
      const { pathname, search } = window.location;
      const params = new URLSearchParams(search);
      const bounce = isServerBounce(pathname, search);
      if (params.has("error") || (bounce && recentlyRedirected()) || !hasAuthCookie(document.cookie)) { setChecking(false); reveal(); return; }
      setChecking(true);
      void browserHasSession().then(signedIn => {
        if (!active) return;
        if (!signedIn) { setChecking(false); reveal(); return; }
        if (bounce) markRedirected();
        router.replace(useNext ? safeNextPath(params.get("next")) : "/dashboard");
      });
    }
    check();
    // A page restored from the browser's back-forward cache keeps its old state, so check again.
    const restored = (event: PageTransitionEvent) => { if (event.persisted) check(); };
    window.addEventListener("pageshow", restored);
    return () => { active = false; window.removeEventListener("pageshow", restored); reveal(); };
  }, [router, useNext]);

  return checking ? <div className="ws-auth-gate" role="status" aria-label="Opening WattSnap"><span aria-hidden="true" /></div> : null;
}
