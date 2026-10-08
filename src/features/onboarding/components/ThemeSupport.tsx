"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Sun } from "lucide-react";
import { saveAppTheme, useAppTheme, type AppTheme } from "../theme";
const subscribeReady = () => () => {};

export function ThemeSupport() {
  const theme = useAppTheme();
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  return null;
}
export function ThemeSettings() {
  const theme = useAppTheme();
  const ready = useSyncExternalStore(subscribeReady, () => true, () => false);
  const [error, setError] = useState("");
  function choose(next: AppTheme) { setError(saveAppTheme(next) ? "" : "Your browser could not save this appearance. Try again."); }
  return <section className="ui-panel st-card" aria-labelledby="st-theme-title">
    <div className="st-card-head"><span className="st-card-icon"><Sun aria-hidden="true" /></span><div><h2 id="st-theme-title">Appearance</h2><p>Light is the default. Choose what feels comfortable.</p></div></div>
    <fieldset className="setup-theme-options" disabled={!ready}><legend className="ws-sr-only">Color theme</legend>{(["light", "dark"] as const).map(option => <label key={option} className={theme === option ? "is-selected" : ""}><input type="radio" name="theme" checked={theme === option} onChange={() => choose(option)} /><span>{option === "light" ? "Light mode" : "Dark mode"}</span></label>)}</fieldset>
    {error && <p className="ui-error" role="alert">{error}</p>}
  </section>;
}
