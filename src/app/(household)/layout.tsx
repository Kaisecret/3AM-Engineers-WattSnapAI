import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAccount } from "@/features/auth/service";
import { AccountSynchronizer } from "@/features/auth/components/AccountSynchronizer";
import "./dashboard/dashboard.css";
import "@/features/dashboard/app-ui.css";
import "@/features/dashboard/navigation.css";
import "@/features/dashboard/account.css";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export const dynamic = "force-dynamic";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const account = await getAccount(await getServerSupabase());
  if (!account.ok || !account.value) redirect("/login?error=session");
  if (!account.value.profile.onboardedAt) redirect("/complete-profile");
  return <AccountSynchronizer account={account.value}>{children}</AccountSynchronizer>;
}
