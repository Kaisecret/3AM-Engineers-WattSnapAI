import type { Metadata } from "next";
import "./dashboard/dashboard.css";
import "@/features/dashboard/app-ui.css";
import "@/features/dashboard/navigation.css";
import "@/features/dashboard/account.css";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
