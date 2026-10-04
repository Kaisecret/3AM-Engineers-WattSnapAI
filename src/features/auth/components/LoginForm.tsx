"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lightbulb, Lock, Mail } from "lucide-react";
import { AUTH_ART, AuthShell } from "./AuthShell";
import { GoogleChooserStep } from "./AuthSteps";
import {
  AuthAlert,
  AuthDivider,
  AuthField,
  GoogleButton,
  PasswordField,
  PrimaryButton,
  fakeDelay,
} from "./AuthUi";

type LoginStep = "form" | "google";

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

/** Login screen (UI only — no backend calls yet). */
export function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<LoginStep>("form");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!identifier.trim() || !password) {
      setError("Please enter your email or username and password.");
      return;
    }
    setLoading(true);
    await fakeDelay();
    router.push("/dashboard");
  };

  if (step === "google") {
    return (
      <AuthShell stepKey="google" art={{ src: AUTH_ART.thumbsUp }} onBack={() => setStep("form")}>
        <GoogleChooserStep onSelect={() => router.push("/dashboard")} onUseAnother={() => setStep("form")} />
      </AuthShell>
    );
  }

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
        <GoogleButton onClick={() => setStep("google")} disabled={loading} />
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
