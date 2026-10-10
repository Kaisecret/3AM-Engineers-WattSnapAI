import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAccount } from "@/features/auth/service";
import { CompleteProfileForm } from "@/features/auth/components/CompleteProfileForm";
export const dynamic = "force-dynamic";
export default async function CompleteProfilePage() {
  const account = await getAccount(await getServerSupabase());
  if (!account.ok || !account.value) redirect("/login?error=session");
  if (account.value.profile.onboardedAt) redirect("/dashboard");
  return <CompleteProfileForm defaultName={account.value.profile.fullName} />;
}
