import type { ReactNode } from "react";
import AppHeader from "./AppHeader";
import AppNavigation from "./AppNavigation";
import SetupResumeLink from "@/features/onboarding/components/SetupResumeLink";

export default function PageShell({ title, subtitle, active, className = "", children }: { title: string; subtitle: string; active?: string; className?: string; children: ReactNode }) {
  return <div className={`ws-home ui-page ${className}`}><div className="ws-shell">
    <AppHeader title={title} subtitle={subtitle} />
    <main className="ui-main"><div className="ui-mobile-heading"><h1>{title}</h1><p>{subtitle}</p></div><SetupResumeLink />{children}<p className="ui-page-note">Saved on this device. Clearing browser data can remove your records.</p></main>
    <AppNavigation active={active} />
  </div></div>;
}
