import type { Metadata } from "next";
import { SignupFlow } from "@/features/auth/components/SignupFlow";

export const metadata: Metadata = {
  title: "Create Account | WattSnap - Your Home Electricity Assistant",
  description: "Create your WattSnap account to understand your bills, save energy, and be ready for brownouts.",
};

export default function SignupPage() {
  return <SignupFlow />;
}
