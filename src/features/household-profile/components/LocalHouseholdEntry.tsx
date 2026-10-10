"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, House } from "lucide-react";
import { AuthShell, AUTH_ART } from "@/features/auth/components/AuthShell";
import { hasLocalHousehold, openLocalHousehold } from "../local-household";

export default function LocalHouseholdEntry() {
  const router = useRouter();
  const [ready, setReady] = useState(false), [existing, setExisting] = useState(false), [error, setError] = useState("");
  useEffect(() => { try { setExisting(hasLocalHousehold()); } catch { setError("Your household could not be opened from browser storage. Your records are unchanged."); } setReady(true); }, []);
  function continueHome() {
    try { openLocalHousehold(); router.push(existing ? "/dashboard" : "/setup"); }
    catch { setError("This browser cannot save your household selection. Enable browser storage and try again. Existing records are unchanged."); }
  }
  return <AuthShell art={{ src: AUTH_ART.profileCard }} stepKey="local-home"><div className="auth-heading"><span className="auth-eyebrow">ONE HOME, ONE WATTSNAP</span><h1 className="auth-title">{existing ? "Welcome home." : "Let’s set up your home."}</h1><p className="auth-subtitle">Keep your household, bills and appliances together on this device.</p></div><p className="auth-preview-note"><House size={18} aria-hidden="true" />No account or password is needed. This household is stored in this browser; it is not a secured online account.</p>{error && <p className="auth-hint-error" role="alert">{error}</p>}<button className="auth-btn auth-btn-primary" type="button" disabled={!ready} onClick={continueHome}>{existing ? "Continue to my household" : "Set up my household"}<ArrowRight size={20} aria-hidden="true" /></button><p className="auth-switch">Clearing browser data can remove your records. Use the same browser to return to your household.</p></AuthShell>;
}
