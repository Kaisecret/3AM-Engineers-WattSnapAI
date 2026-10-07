import type { Metadata } from "next";
import { LoginForm } from "@/features/auth/components/LoginForm";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to your WattSnap account to monitor power consumption, manage appliances, and save on your electricity bills.",
};

export default function LoginPage() {
  return <LoginForm />;
}
