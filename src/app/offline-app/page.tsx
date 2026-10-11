import type { Metadata } from "next";
import OfflineApp from "@/features/offline-access/components/OfflineApp";
import "../(household)/dashboard/dashboard.css";
import "@/features/dashboard/app-ui.css";
import "@/features/dashboard/navigation.css";
import "@/features/dashboard/account.css";
import "@/features/dashboard/energy.css";
import "@/features/dashboard/budget.css";
import "@/features/dashboard/appliances.css";
import "@/features/dashboard/settings.css";
import "@/features/dashboard/scan.css";
import "@/features/assistant/assistant.css";
import "@/features/tipid-tips/tips-preview.css";
import "@/features/watt-if-simulator/simulator-preview.css";
import "@/features/brownout-ready/brownout-preview.css";
import "../(household)/advisories/advisories.css";
import "@/features/advisory-intelligence/advisory-workflow.css";

export const metadata: Metadata = { title: "WattSnap · Saved on this device", robots: { index: false, follow: false } };
// Public, account-free HTML. Private records are read in the browser only while offline.
export default function Page() { return <OfflineApp />; }
