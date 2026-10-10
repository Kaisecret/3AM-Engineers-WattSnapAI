"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { getAccount } from "@/features/auth/service";
import { forgetAccount } from "@/features/auth/session";
import "../onboarding.css";

export default function AppEntry() {
  const router = useRouter();
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    async function open() {
      try {
        try { forgetAccount(); } catch { /* Display cache is optional here. */ }
        const account = await getAccount(getBrowserSupabase());
        if (!active) return;
        if (!account.ok) { setError(true); return; }
        const destination = account.value ? account.value.profile.onboardedAt ? "/dashboard" : "/complete-profile" : "/login";
        router.replace(destination);
      } catch { if (active) setError(true); }
    }
    void open();
    return () => { active = false; };
  }, [router]);
  return <main className="intro-page intro-entry"><Image src="/assets/branding/wattsnap-logo.png" alt="WattSnap" width={1983} height={793} sizes="240px" priority />{error && <div><p>Your session could not be checked. Reconnect and try signing in.</p><Link href="/intro" className="intro-primary">Get Started</Link><Link href="/login">Sign in</Link></div>}<noscript><a href="/intro">Get Started</a><a href="/login">Sign in</a></noscript></main>;
}
