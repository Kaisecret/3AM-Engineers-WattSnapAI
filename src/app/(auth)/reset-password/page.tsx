import type { Metadata } from "next";
import { ResetPasswordForm } from "@/features/auth/components/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Create new password",
  description: "Create a new password for your WattSnap account.",
};

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
