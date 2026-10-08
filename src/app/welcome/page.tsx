import type { Metadata } from "next";
import AppEntry from "@/features/onboarding/components/AppEntry";

export const metadata: Metadata = { title: "Open WattSnap", robots: { index: false, follow: false } };
export default function Page() { return <AppEntry />; }
