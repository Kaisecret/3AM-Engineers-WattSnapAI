"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { AtSign, User } from "lucide-react";
import {
  AuthAlert,
  AuthField,
  OtpInput,
  PrimaryButton,
  useCountdown,
} from "./AuthUi";

import { getBrowserSupabase } from "../../../lib/supabase/browser";
import { completeProfile, verifySignupCode, verifyRecoveryCode, resendSignupCode, requestPasswordReset } from "../service";

const emptyCode = () => Array<string>(6).fill("");
const formatSeconds = (s: number) => `00:${String(s).padStart(2, "0")}`;

/* -------------------------------------------------------------------------- */
/* Verify code (sign up email verification + password reset code)             */
/* -------------------------------------------------------------------------- */
export function VerifyCodeStep({
  email,
  title = "Verify Your Email",
  onVerified,
  purpose = "signup",
}: {
  email: string;
  title?: string;
  onVerified: () => void;
  purpose?: "signup" | "recovery";
}) {
  const [code, setCode] = useState<string[]>(emptyCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { remaining, restart } = useCountdown(30);
  const mounted = useRef(true);
  const complete = code.every(Boolean);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!complete) return;
    setLoading(true);
    setError(null);
    try {
      const verify = purpose === "recovery" ? verifyRecoveryCode : verifySignupCode;
      const result = await verify(getBrowserSupabase(), { email, code: code.join("") });
      if (!mounted.current) return;
      if (!result.ok) setError(result.message); else onVerified();
    } catch { if (mounted.current) setError("Verification could not be completed. Please try again."); }
    finally { if (mounted.current) setLoading(false); }
  };

  const handleResend = async () => {
    if (loading) return;
    setLoading(true); setError(null);
    try {
      const send = purpose === "recovery" ? requestPasswordReset : resendSignupCode;
      const result = await send(getBrowserSupabase(), { email, origin: window.location.origin });
      if (!mounted.current) return;
      if (!result.ok) setError(result.message);
      else { setCode(emptyCode()); restart(); }
    } catch { if (mounted.current) setError("The code could not be sent. Please try again."); }
    finally { if (mounted.current) setLoading(false); }
  };

  return (
    <>
      <h1 className="auth-title">{title}</h1>
      <p className="auth-subtitle">
        Check your email for a 6-digit code or confirmation link at
        <br />
        <strong className="auth-strong">{email}</strong>
      </p>

      {error && <AuthAlert>{error}</AuthAlert>}
      <form onSubmit={handleSubmit} noValidate>
        <OtpInput value={code} onChange={setCode} />
        <p className="auth-resend">
          Didn&apos;t receive the code?{" "}
          <button type="button" className="auth-link-btn" disabled={remaining > 0 || loading} onClick={handleResend}>
            Resend{remaining > 0 ? ` (${formatSeconds(remaining)})` : ""}
          </button>
        </p>
        <PrimaryButton type="submit" disabled={!complete} loading={loading} id="verify-code-button">
          Verify
        </PrimaryButton>
      </form>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Profile setup                                                              */
/* -------------------------------------------------------------------------- */
export function ProfileSetupStep({ defaultName = "", onContinue }: { defaultName?: string; onContinue: (profile: { name: string; username: string }) => void }) {
  const [fullName, setFullName] = useState(defaultName);
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!fullName.trim() || !username.trim()) {
      setError("Please complete all fields to continue.");
      return;
    }
    setLoading(true);
    try {
      const result = await completeProfile(getBrowserSupabase(), { fullName, username });
      if (!result.ok) setError(result.message);
      else onContinue({ name: fullName.trim(), username: username.trim() });
    } catch { setError("Your profile could not be saved. Please try again."); }
    finally { setLoading(false); }
  };

  return (
    <>
      <div className="auth-profile-heading">
        <h1 className="auth-title">Let&apos;s Set Up Your Profile</h1>
        <p className="auth-subtitle">Just a few more details to personalize your experience.</p>
      </div>

      {error && <AuthAlert>{error}</AuthAlert>}

      <form onSubmit={handleSubmit} className="auth-form is-inline" noValidate>
        <AuthField
          id="profile-name"
          label="Full Name"
          placeholder="Enter your full name"
          autoComplete="name"
          mobileIcon={<User size={22} />}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <AuthField
          id="profile-username"
          label="Username"
          placeholder="Choose a username"
          icon={<AtSign size={18} />}
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value.replace(/\s/g, "").toLowerCase())}
        />
        <PrimaryButton type="submit" loading={loading} id="profile-continue-button">
          Continue
        </PrimaryButton>
      </form>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Welcome / success                                                          */
/* -------------------------------------------------------------------------- */
export function WelcomeStep() {
  return (
    <>
      <h1 className="auth-title auth-title-xl">
        Welcome to
        <br />
        <span className="auth-wordmark"><span>Watt</span><span>Snap!</span></span>
      </h1>
      <p className="auth-subtitle">
        Your account is ready!
        <br />
        Start exploring and take control of your electricity usage.
      </p>
      <Link href="/setup" className="auth-btn auth-btn-primary auth-btn-fit" id="welcome-get-started">
        Get Started
      </Link>
    </>
  );
}
