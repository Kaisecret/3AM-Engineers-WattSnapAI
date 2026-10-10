import type { Metadata } from "next";
import LocalHouseholdEntry from "@/features/household-profile/components/LocalHouseholdEntry";

export const metadata: Metadata = {
  title: "Open household",
  description: "Open your household records stored on this device.",
};

export default function LoginPage() {
  return <LocalHouseholdEntry />;
}
