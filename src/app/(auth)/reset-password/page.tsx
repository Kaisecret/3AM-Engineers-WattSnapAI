import type { Metadata } from "next";
import LocalHouseholdEntry from "@/features/household-profile/components/LocalHouseholdEntry";

export const metadata: Metadata = {
  title: "Open household",
  description: "Local households do not require a password.",
};

export default function ResetPasswordPage() {
  return <LocalHouseholdEntry />;
}
