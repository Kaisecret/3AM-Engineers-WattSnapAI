"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { forgetAccount } from "@/features/auth/session";
import { browserHasSession } from "@/features/auth/signed-in";
import "../onboarding.css";

export default function AppEntry() {
  const router = useRouter();
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    async function open() {
      try {
        try { forgetAccount(); } catch { /* Display cache is optional here. */ }
        // Opening the installed app goes straight in while this phone holds a session.
        // The server checks the account (and an unfinished profile) on the next page.
        const signedIn = await browserHasSession();
        if (!active) return;
        router.replace(signedIn ? "/dashboard" : "/login");
      } catch { if (active) setError(true); }
    }
    void open();
    return () => { active = false; };
  }, [router]);
  return <main className="intro-page intro-entry"><Image src="/assets/branding/wattsnap-logo.png" alt="WattSnap" width={1983} height={793} sizes="240px" priority />{error && <div><p>Your session could not be checked. Reconnect and try signing in.</p><Link href="/intro" className="intro-primary">Get Started</Link><Link href="/login">Sign in</Link></div>}<noscript><a href="/intro">Get Started</a><a href="/login">Sign in</a></noscript></main>;
}
