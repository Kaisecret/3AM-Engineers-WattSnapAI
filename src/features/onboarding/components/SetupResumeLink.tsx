"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useSetupProgress } from "../use-setup-progress";
import "../setup.css";

function ResumeLink() {
  const { count, ready } = useSetupProgress();
  if (!ready) return null;
  return <nav className="setup-resume" aria-label="Home setup"><Link href="/setup"><ArrowLeft size={18} aria-hidden="true" /> Back to home setup <span>{count}/5 completed</span></Link></nav>;
}
export default function SetupResumeLink() {
  const pathname = usePathname();
  return ["/onboarding", "/bills/new", "/appliances/new", "/tips"].includes(pathname) ? <ResumeLink /> : null;
}
