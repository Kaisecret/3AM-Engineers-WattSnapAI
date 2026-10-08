"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Lock, Mail, User } from "lucide-react";
import { AUTH_ART, AuthShell } from "./AuthShell";
import { GoogleChooserStep, ProfileSetupStep, VerifyCodeStep, WelcomeStep } from "./AuthSteps";
import { beginPreviewSession } from "../preview-session";
import {
  AuthAlert,
  AuthDivider,
  AuthField,
  EMAIL_PATTERN,
  GoogleButton,
  PasswordField,
  PrimaryButton,
  fakeDelay,
} from "./AuthUi";

/**
 * Sign up sequence (UI only):
 *   Email flow:  account -> verify (6-digit code) -> profile -> welcome
 *   Google flow: account -> google (choose account) -> profile -> welcome
 */
type SignupStep = "account" | "verify" | "google" | "profile" | "welcome";

export function SignupFlow() {
  const [step, setStep] = useState<SignupStep>("account");
  const [viaGoogle, setViaGoogle] = useState(false);
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
    await fakeDelay();
    setLoading(false);
    setViaGoogle(false);
    setStep("verify");
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

    case "google":
      return (
        <AuthShell stepKey="google" art={{ src: AUTH_ART.thumbsUp }} onBack={() => setStep("account")}>
          <GoogleChooserStep
            onSelect={(account) => {
              setFullName(account.name);
              setEmail(account.email);
              setViaGoogle(true);
              setStep("profile");
            }}
            onUseAnother={() => setStep("account")}
          />
        </AuthShell>
      );

    case "profile":
      return (
        <AuthShell
          stepKey="profile"
          art={{ src: AUTH_ART.profileCard }}
          onBack={() => setStep(viaGoogle ? "google" : "verify")}
        >
          {error && <AuthAlert>{error}</AuthAlert>}
          <ProfileSetupStep defaultName={fullName} onContinue={profile => {
            try { beginPreviewSession(email, profile); setError(null); setStep("welcome"); }
            catch (issue) { setError(issue instanceof Error ? issue.message : "Your browser could not save your profile. Please try again."); }
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
          <p className="auth-preview-note">UI preview · Account creation and email verification are demonstrated locally.</p>

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
            <GoogleButton onClick={() => setStep("google")} disabled={loading} />
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
