import type { ReactNode } from "react";
import AppHeader from "./AppHeader";
import AppNavigation from "./AppNavigation";
import SetupResumeLink from "@/features/onboarding/components/SetupResumeLink";

export default function PageShell({ title = "", subtitle = "", active, className = "", children }: { title?: string; subtitle?: string; active?: string; className?: string; children: ReactNode }) {
  return <div className={`ws-home ui-page ${className}`}><div className="ws-shell">
    <AppHeader title={title} subtitle={subtitle} />
    <main className="ui-main">{title ? <div className="ui-mobile-heading"><h1>{title}</h1>{subtitle ? <p>{subtitle}</p> : null}</div> : null}<SetupResumeLink />{children}</main>
    <AppNavigation active={active} />
  </div></div>;
}
