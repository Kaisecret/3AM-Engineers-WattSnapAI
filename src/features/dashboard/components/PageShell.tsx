import type { ReactNode } from "react";
import AppHeader from "./AppHeader";
import AppNavigation from "./AppNavigation";

export default function PageShell({ title, subtitle, active, children }: { title: string; subtitle: string; active: string; children: ReactNode }) {
  return <div className="ws-home ui-page"><div className="ws-shell">
    <AppHeader title={title} subtitle={subtitle} />
    <main className="ui-main"><div className="ui-mobile-heading"><h1>{title}</h1><p>{subtitle}</p></div>{children}<p className="ui-page-note">Preview • Changes are saved in this browser</p></main>
    <AppNavigation active={active} />
  </div></div>;
}
