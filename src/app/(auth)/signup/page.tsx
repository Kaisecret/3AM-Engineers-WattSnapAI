import type { Metadata } from "next";
import { SignupFlow } from "@/features/auth/components/SignupFlow";
import { SignedInRedirect } from "@/features/auth/components/SignedInRedirect";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create your WattSnap account to understand your bills, save energy, and be ready for brownouts.",
};

export default function SignupPage() {
  return <><SignedInRedirect /><SignupFlow /></>;
}
