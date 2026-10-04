"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { AUTH_ART, AuthShell } from "./AuthShell";
import { VerifyCodeStep } from "./AuthSteps";
import { AuthAlert, AuthField, EMAIL_PATTERN, PrimaryButton, fakeDelay } from "./AuthUi";

/** Forgot password sequence (UI only): email -> 6-digit code -> /reset-password */
type ForgotStep = "email" | "verify";

export function ForgotPasswordFlow() {
  const router = useRouter();
  const [step, setStep] = useState<ForgotStep>("email");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSendCode = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!EMAIL_PATTERN.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    await fakeDelay();
    setLoading(false);
    setStep("verify");
  };

  if (step === "verify") {
    return (
      <AuthShell
        stepKey="verify"
        art={{ src: AUTH_ART.envelope }}
        artPosition="left"
        showArtOnMobile
        onBack={() => setStep("email")}
      >
        <VerifyCodeStep email={email} title="Check Your Email" onVerified={() => router.push("/reset-password")} />
      </AuthShell>
    );
  }

  return (
    <AuthShell stepKey="email" art={{ src: AUTH_ART.envelope }} backHref="/login">
      <h1 className="auth-title">Reset Password</h1>
      <p className="auth-subtitle">
        Enter your email and we&apos;ll send you a 6-digit code to reset your password.
      </p>

      {error && <AuthAlert>{error}</AuthAlert>}

      <form onSubmit={handleSendCode} className="auth-form" noValidate>
        <AuthField
          id="forgot-email"
          type="email"
          placeholder="Email Address"
          autoComplete="email"
          icon={<Mail size={18} />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <PrimaryButton type="submit" loading={loading} id="forgot-send-code-button">
          Send Code
        </PrimaryButton>
      </form>

      <Link href="/login" className="auth-link auth-center-link">
        Back to Login
      </Link>
    </AuthShell>
  );
}
