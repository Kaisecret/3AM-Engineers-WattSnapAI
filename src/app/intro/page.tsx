import type { Metadata } from "next";
import IntroScreen from "@/features/onboarding/components/IntroScreen";

export const metadata: Metadata = { title: "Welcome", robots: { index: false, follow: false } };
export default function Page() { return <IntroScreen />; }
