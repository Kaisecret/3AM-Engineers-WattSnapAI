import type { Metadata } from "next";
import { ForgotPasswordFlow } from "@/features/auth/components/ForgotPasswordFlow";

export const metadata: Metadata = {
  title: "Reset Password | WattSnap",
  description: "Get a 6-digit code to reset your WattSnap account password.",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordFlow />;
}
