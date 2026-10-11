"use client";
import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { displayIdentityEvent, displayIdentityKey, readDisplayIdentity, restoreOfflineAccount } from "@/features/auth/session";
import { isDeviceOffline } from "../connectivity";
import HomeScreen from "@/features/dashboard/components/HomeScreen";
import EnergyScreen from "@/features/dashboard/components/EnergyScreen";
import BudgetScreen from "@/features/dashboard/components/BudgetScreen";
import AppliancesScreen from "@/features/dashboard/components/AppliancesScreen";
import ScanScreen from "@/features/dashboard/components/ScanScreen";
import SettingsScreen from "@/features/dashboard/components/SettingsScreen";
import ChatScreen from "@/features/assistant/components/ChatScreen";
import TipsScreen from "@/features/tipid-tips/components/TipsScreen";
import SimulatorScreen from "@/features/watt-if-simulator/components/SimulatorScreen";
import BrownoutReadyScreen from "@/features/brownout-ready/components/BrownoutReadyScreen";
import AdvisoriesScreen from "@/features/advisory-intelligence/components/AdvisoriesScreen";
import AdvisoryIntakeScreen from "@/features/advisory-intelligence/components/AdvisoryIntakeScreen";
import HouseholdSetupScreen from "@/features/household-profile/components/HouseholdSetupScreen";
import SetupChecklist from "@/features/onboarding/components/SetupChecklist";

function screen(path: string) {
  switch (path.replace(/\/$/, "")) {
    case "/bills": return <EnergyScreen />;
    case "/bills/new": return <ScanScreen />;
    case "/budget": return <BudgetScreen />;
    case "/appliances": return <AppliancesScreen />;
    case "/appliances/new": return <AppliancesScreen startAdding />;
    case "/assistant": return <ChatScreen />;
    case "/settings": return <SettingsScreen />;
    case "/tips": return <TipsScreen />;
    case "/simulator": return <SimulatorScreen />;
    case "/brownout-ready": return <BrownoutReadyScreen />;
    case "/advisories": return <AdvisoriesScreen />;
    case "/advisories/new": return <AdvisoryIntakeScreen />;
    case "/onboarding": return <HouseholdSetupScreen />;
    case "/setup": return <SetupChecklist />;
    default: return <HomeScreen />;
  }
}

export default function OfflineApp() {
  const [scope, setScope] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [path, setPath] = useState("/dashboard");
  useEffect(() => {
    const pathname = location.pathname;
    setPath(pathname);
    const openProtectedPage = () => location.replace(pathname === "/offline-app" || pathname === "/welcome" || pathname === "/" ? "/dashboard" : pathname + location.search);
    if (!isDeviceOffline()) { openProtectedPage(); return; }
    let active = true, leaving = false;
    let probe: AbortController | null = null;
    const beforeUnload = () => { leaving = true; probe?.abort(); };
    const reconnect = async () => {
      // Browsers can report a brief online event while unloading an offline document.
      if (!active || leaving || probe) return;
      const controller = new AbortController(); probe = controller;
      const timer = setTimeout(() => controller.abort(), 5000);
      try {
        // This ordinary fetch bypasses the worker's navigation fallback and verifies reachability.
        const response = await fetch("/offline-app", {cache:"no-store",credentials:"omit",signal:controller.signal});
        if (active && !leaving && !controller.signal.aborted && response.ok && !response.redirected && navigator.onLine) openProtectedPage();
      } catch { /* Keep the saved app open while the server is unreachable. */ }
      finally { clearTimeout(timer); probe = null; }
    };
    const identity = restoreOfflineAccount();
    setScope(identity?.id ?? null); setLoaded(true);
    const checkScope = () => {
      try {
        const saved = JSON.parse(localStorage.getItem(displayIdentityKey) ?? "null");
        if (saved?.identity?.id !== identity?.id || readDisplayIdentity()?.id !== identity?.id) setScope(null);
      } catch { setScope(null); }
    };
    const storage = (event: StorageEvent) => { if (event.key === displayIdentityKey || event.key === null) checkScope(); };
    const restored = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      leaving = false; checkScope();
      if (navigator.onLine) return reconnect();
    };
    window.addEventListener("online", reconnect);
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("pageshow", restored);
    window.addEventListener("storage", storage);
    window.addEventListener(displayIdentityEvent, checkScope);
    return () => {
      active = false; probe?.abort();
      window.removeEventListener("online", reconnect);
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("pageshow", restored);
      window.removeEventListener("storage", storage);
      window.removeEventListener(displayIdentityEvent, checkScope);
    };
  }, []);
  if (scope) return <div key={scope} data-offline-app="true">{screen(path)}</div>;
  return <main className="offline-entry"><WifiOff size={32} aria-hidden="true" /><h1>{loaded ? "Reconnect to open your home" : "Opening saved app…"}</h1><p>{loaded ? "Sign in online once on this device to prepare your household for offline use." : "Loading the household saved on this device."}</p>{loaded && <a href="/login">Try reconnecting</a>}</main>;
}
