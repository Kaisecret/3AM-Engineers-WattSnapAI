"use client";
import { useRouter } from "next/navigation";
import { AUTH_ART, AuthShell } from "./AuthShell";
import { ProfileSetupStep } from "./AuthSteps";
export function CompleteProfileForm({ defaultName }: { defaultName: string }) {
  const router = useRouter();
  return <AuthShell stepKey="profile" art={{ src: AUTH_ART.profileCard }} backHref="/login">
    <ProfileSetupStep defaultName={defaultName} onContinue={() => { router.replace("/intro"); router.refresh(); }} />
  </AuthShell>;
}
