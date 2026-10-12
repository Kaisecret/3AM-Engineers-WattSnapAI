"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lightbulb, Lock, Mail } from "lucide-react";
import { AUTH_ART, AuthShell } from "./AuthShell";
import { getBrowserSupabase } from "../../../lib/supabase/browser";
import { checkGoogleProvider, loginWithIdentifier } from "../actions";
import { signInWithEmail, signInWithGoogle, getAccount, toFailure } from "../service";
import { parseIdentifier, safeNextPath } from "../schemas";
import { untilConnected, waitForSignal } from "../until-connected";
import type { AuthResult } from "../types";
import {
  AuthAlert,
  AuthDivider,
  AuthField,
  GoogleButton,
  PasswordField,
  PrimaryButton,
} from "./AuthUi";

const loginBubble = (
  <>
    <span className="auth-bubble-text">
      Smart Energy.
      <br />
      Brighter Homes.
    </span>
    <span className="auth-bubble-badge">
      <Lightbulb size={30} strokeWidth={1.6} />
    </span>
  </>
);

/** Cookie-backed password and Google login. */
export function LoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [waiting, setWaiting] = useState(false);
  // On a weak signal the next page takes a while to open. The button stays busy until it has.
  const [opening, startOpening] = useTransition();
  const attempt = useRef({ cancelled: false });
  const busy = loading || opening;

  useEffect(() => {
    const issue = new URL(window.location.href).searchParams.get("error");
    if (issue) setError(issue === "oauth" || issue === "callback" ? "Sign-in or email verification could not be completed. Please try again." : issue === "verification" ? "That email link is invalid or has expired. Request a new code." : "Your session has ended. Please log in again.");
    return () => { attempt.current.cancelled = true; };
  }, []);

  const cancel = () => { attempt.current.cancelled = true; setLoading(false); setWaiting(false); };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!identifier.trim() || !password) {
      setError("Please enter your email or username and password.");
      return;
    }
    const current = attempt.current = { cancelled: false };
    // One tap is enough: a step that fails for lack of signal waits, then runs again by itself.
    const patiently = <T,>(run: () => Promise<AuthResult<T>>) => untilConnected(run, { wait: waitForSignal, cancelled: () => current.cancelled, onWaiting: () => setWaiting(true) });
    // Only this device failing to reach the server is worth waiting for. A problem the server itself
    // reports is shown, so retries never use up the sign-in attempt limit.
    const onServer = async (): Promise<AuthResult> => {
      try {
        const answer = await loginWithIdentifier({ identifier, password });
        return !answer.ok && answer.kind === "network" ? { ...answer, kind: "unknown" } : answer;
      } catch (error) { return toFailure(error, "login"); }
    };
    setLoading(true);
    try {
      // An email signs in straight from the browser, so Supabase limits attempts per visitor.
      // Only a username needs the server, which looks up its email privately.
      const parsed = parseIdentifier(identifier);
      const result = await patiently(() => parsed?.kind === "email" ? signInWithEmail(getBrowserSupabase(), { email: parsed.email, password }) : onServer());
      if (!result) return;
      if (!result.ok) { setError(result.message); return; }
      const account = await patiently(() => getAccount(getBrowserSupabase()));
      if (!account) return;
      if (!account.ok) { setError(account.message); return; }
      if (!account.value) { setError("Your session could not be opened. Please log in again."); return; }
      const next = safeNextPath(new URL(window.location.href).searchParams.get("next"));
      const destination = account.value.profile.onboardedAt ? next : "/complete-profile";
      startOpening(() => { router.replace(destination); router.refresh(); });
    } catch { if (!current.cancelled) setError("Sign-in could not be completed. Please try again."); }
    // A cancelled attempt that answers late must not switch off the loading of a newer one.
    finally { if (attempt.current === current) { setLoading(false); setWaiting(false); } }
  };

  const handleGoogle = async () => {
    setLoading(true); setError(null);
    try {
      const available = await checkGoogleProvider();
      if (!available.ok) { setError(available.message); return; }
      const result = await signInWithGoogle(getBrowserSupabase(), { origin: window.location.origin, next: safeNextPath(new URL(window.location.href).searchParams.get("next")) });
      if (!result.ok) setError(result.message);
    } catch { setError("Google sign-in could not start. Please try again."); }
    finally { setLoading(false); }
  };

  return (
    <AuthShell stepKey="login" art={{ src: AUTH_ART.laptop, bubble: loginBubble }} backHref="/">
      <h1 className="auth-title">Welcome Back!</h1>
      <p className="auth-subtitle">Log in to continue managing your electricity smarter.</p>

      {waiting
        ? <AuthAlert>No signal. We&apos;ll log you in as soon as you&apos;re back online. <button type="button" className="auth-link-btn" onClick={cancel}>Cancel</button></AuthAlert>
        : error && <AuthAlert>{error}</AuthAlert>}

      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        <AuthField
          id="login-identifier"
          placeholder="Email or Username"
          autoComplete="username"
          icon={<Mail size={18} />}
          value={identifier}
          readOnly={busy}
          onChange={(e) => setIdentifier(e.target.value)}
        />
        <PasswordField
          id="login-password"
          placeholder="Password"
          autoComplete="current-password"
          icon={<Lock size={18} />}
          value={password}
          readOnly={busy}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="auth-row-end">
          <Link href="/forgot-password" className="auth-link auth-link-sm">
            Forgot password?
          </Link>
        </div>

        <PrimaryButton type="submit" loading={busy} id="login-submit-button">
          Log in
        </PrimaryButton>
        <AuthDivider />
        <GoogleButton onClick={handleGoogle} disabled={busy} />
      </form>

      <p className="auth-switch">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="auth-link">
          Sign up
        </Link>
      </p>
    </AuthShell>
  );
}
