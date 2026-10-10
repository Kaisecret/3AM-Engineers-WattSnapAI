import type { Metadata } from "next";
import LocalHouseholdEntry from "@/features/household-profile/components/LocalHouseholdEntry";

export const metadata: Metadata = {
  title: "Set up household",
  description: "Set up a household on this device to understand bills and appliance estimates.",
};

export default function SignupPage() {
  return <LocalHouseholdEntry />;
}
