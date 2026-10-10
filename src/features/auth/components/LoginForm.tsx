"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lightbulb, Lock, Mail } from "lucide-react";
import { AUTH_ART, AuthShell } from "./AuthShell";
import { getBrowserSupabase } from "../../../lib/supabase/browser";
import { checkGoogleProvider, loginWithIdentifier } from "../actions";
import { signInWithGoogle, getAccount } from "../service";
import { safeNextPath } from "../schemas";
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

  useEffect(() => {
    const issue = new URL(window.location.href).searchParams.get("error");
    if (issue) setError(issue === "oauth" || issue === "callback" ? "Sign-in or email verification could not be completed. Please try again." : issue === "verification" ? "That email link is invalid or has expired. Request a new code." : "Your session has ended. Please log in again.");
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!identifier.trim() || !password) {
      setError("Please enter your email or username and password.");
      return;
    }
    setLoading(true);
    try {
      const result = await loginWithIdentifier({ identifier, password });
      if (!result.ok) { setError(result.message); return; }
      const account = await getAccount(getBrowserSupabase());
      if (!account.ok) { setError(account.message); return; }
      if (!account.value) { setError("Your session could not be opened. Please log in again."); return; }
      const next = safeNextPath(new URL(window.location.href).searchParams.get("next"));
      router.replace(account.value.profile.onboardedAt ? next : "/complete-profile"); router.refresh();
    } catch { setError("Sign-in could not be completed. Please try again."); }
    finally { setLoading(false); }
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

      {error && <AuthAlert>{error}</AuthAlert>}

      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        <AuthField
          id="login-identifier"
          placeholder="Email or Username"
          autoComplete="username"
          icon={<Mail size={18} />}
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
        />
        <PasswordField
          id="login-password"
          placeholder="Password"
          autoComplete="current-password"
          icon={<Lock size={18} />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="auth-row-end">
          <Link href="/forgot-password" className="auth-link auth-link-sm">
            Forgot password?
          </Link>
        </div>

        <PrimaryButton type="submit" loading={loading} id="login-submit-button">
          Log in
        </PrimaryButton>
        <AuthDivider />
        <GoogleButton onClick={handleGoogle} disabled={loading} />
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
