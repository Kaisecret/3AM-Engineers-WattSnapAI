"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { readPreviewIdentity } from "@/features/auth/preview-session";
import { readIntro } from "../intro-state";
import "../onboarding.css";

export default function AppEntry() {
  const router = useRouter();
  const [error, setError] = useState(false);
  useEffect(() => {
    try {
      const destination = readPreviewIdentity() ? "/dashboard" : readIntro().status === "in-progress" ? "/intro" : "/login";
      // Start navigation immediately; the logo fades only while the route opens.
      router.replace(destination);
    } catch { setError(true); }
  }, [router]);
  return <main className="intro-page intro-entry"><Image src="/assets/branding/wattsnap-logo.png" alt="WattSnap" width={1983} height={793} sizes="240px" priority />{error && <div><p>Your browser cannot remember this visit. You can still get started.</p><Link href="/intro" className="intro-primary">Get Started</Link><Link href="/login">Sign in</Link></div>}<noscript><a href="/intro">Get Started</a><a href="/login">Sign in</a></noscript></main>;
}
