"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Lock, Mail, User } from "lucide-react";
import { AUTH_ART, AuthShell } from "./AuthShell";
import { ProfileSetupStep, VerifyCodeStep, WelcomeStep } from "./AuthSteps";
import { getBrowserSupabase } from "../../../lib/supabase/browser";
import { signUpWithEmail, signInWithGoogle } from "../service";
import { checkGoogleProvider } from "../actions";
import {
  AuthAlert,
  AuthDivider,
  AuthField,
  EMAIL_PATTERN,
  GoogleButton,
  PasswordField,
  PrimaryButton,
} from "./AuthUi";

/**
 * Sign up sequence:
 *   Email flow:  account -> verify (6-digit code) -> profile -> welcome
 *   Google flow: provider OAuth -> callback -> profile
 */
type SignupStep = "account" | "verify" | "profile" | "welcome";

export function SignupFlow() {
  const [step, setStep] = useState<SignupStep>("account");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreateAccount = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!fullName.trim()) return setError("Please enter your full name.");
    if (!EMAIL_PATTERN.test(email)) return setError("Please enter a valid email address.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (!agreed) return setError("Please agree to the Terms of Service and Privacy Policy.");

    setLoading(true);
    try {
      const result = await signUpWithEmail(getBrowserSupabase(), { fullName, email, password, origin: window.location.origin });
      if (!result.ok) setError(result.message);
      else { setEmail(result.value.email); setPassword(""); setStep("verify"); }
    } catch { setError("Your account could not be created. Please try again."); }
    finally { setLoading(false); }
  };

  switch (step) {
    case "verify":
      return (
        <AuthShell
          stepKey="verify"
          art={{ src: AUTH_ART.envelope }}
          artPosition="left"
          showArtOnMobile
          onBack={() => setStep("account")}
        >
          <VerifyCodeStep email={email} onVerified={() => setStep("profile")} />
        </AuthShell>
      );

    case "profile":
      return (
        <AuthShell
          stepKey="profile"
          art={{ src: AUTH_ART.profileCard }}
          onBack={() => setStep("verify")}
        >
          {error && <AuthAlert>{error}</AuthAlert>}
          <ProfileSetupStep defaultName={fullName} onContinue={() => {
            setError(null); setStep("welcome");
          }} />
        </AuthShell>
      );

    case "welcome":
      return (
        <AuthShell stepKey="welcome" art={{ src: AUTH_ART.celebrate }} showArtOnMobile backHref="/">
          <WelcomeStep />
        </AuthShell>
      );

    default:
      return (
        <AuthShell stepKey="account" art={{ src: AUTH_ART.clipboard }} backHref="/">
          <h1 className="auth-title">Create Your Account</h1>
          <p className="auth-subtitle">Start managing your electricity in a smarter and easier way.</p>

          {error && <AuthAlert>{error}</AuthAlert>}

          <form onSubmit={handleCreateAccount} className="auth-form" noValidate>
            <AuthField
              id="signup-name"
              placeholder="Full Name"
              autoComplete="name"
              icon={<User size={18} />}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <AuthField
              id="signup-email"
              type="email"
              placeholder="Email Address"
              autoComplete="email"
              icon={<Mail size={18} />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <PasswordField
              id="signup-password"
              placeholder="Password"
              autoComplete="new-password"
              icon={<Lock size={18} />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <label className="auth-check" htmlFor="signup-terms">
              <input
                id="signup-terms"
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <span>
                I agree to the <Link href="#" className="auth-link">Terms of Service</Link> and{" "}
                <Link href="#" className="auth-link">Privacy Policy</Link>
              </span>
            </label>

            <PrimaryButton type="submit" loading={loading} id="signup-submit-button">
              Create account
            </PrimaryButton>
            <AuthDivider />
            <GoogleButton onClick={async () => {
              setLoading(true); setError(null);
              try {
                const available = await checkGoogleProvider();
                if (!available.ok) { setError(available.message); return; }
                const result = await signInWithGoogle(getBrowserSupabase(), { origin: window.location.origin, next: "/complete-profile" });
                if (!result.ok) setError(result.message);
              } catch { setError("Google sign-in could not start. Please try again."); }
              finally { setLoading(false); }
            }} disabled={loading} />
          </form>

          <p className="auth-switch">
            Already have an account?{" "}
            <Link href="/login" className="auth-link">
              Log in
            </Link>
          </p>
        </AuthShell>
      );
  }
}
