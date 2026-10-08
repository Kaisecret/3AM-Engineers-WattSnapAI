"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { AtSign, Calendar, ChevronRight, Mail, User } from "lucide-react";
import {
  AuthAlert,
  AuthField,
  EMAIL_PATTERN,
  GoogleIcon,
  OtpInput,
  PrimaryButton,
  fakeDelay,
  useCountdown,
} from "./AuthUi";

const emptyCode = () => Array<string>(6).fill("");
const formatSeconds = (s: number) => `00:${String(s).padStart(2, "0")}`;

/* -------------------------------------------------------------------------- */
/* Verify code (sign up email verification + password reset code)             */
/* -------------------------------------------------------------------------- */
export function VerifyCodeStep({
  email,
  title = "Verify Your Email",
  onVerified,
}: {
  email: string;
  title?: string;
  onVerified: () => void;
}) {
  const [code, setCode] = useState<string[]>(emptyCode);
  const [loading, setLoading] = useState(false);
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
    await fakeDelay();
    if (!mounted.current) return;
    setLoading(false);
    onVerified();
  };

  const handleResend = () => {
    setCode(emptyCode());
    restart();
  };

  return (
    <>
      <h1 className="auth-title">{title}</h1>
      <p className="auth-subtitle">
        We sent a 6-digit code to
        <br />
        <strong className="auth-strong">{email}</strong>
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <OtpInput value={code} onChange={setCode} />
        <p className="auth-resend">
          Didn&apos;t receive the code?{" "}
          <button type="button" className="auth-link-btn" disabled={remaining > 0} onClick={handleResend}>
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
/* Google account chooser (UI mock of the Google sign-in sheet)               */
/* -------------------------------------------------------------------------- */
export type GoogleAccount = { name: string; email: string };

/** Demo account shown in the UI-only Google chooser. */
export const DEMO_GOOGLE_ACCOUNT: GoogleAccount = { name: "Maria Santos", email: "maria@gmail.com" };

const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export function GoogleChooserStep({
  onSelect,
  onUseAnother,
}: {
  onSelect: (account: GoogleAccount) => void;
  onUseAnother: () => void;
}) {
  const account = DEMO_GOOGLE_ACCOUNT;
  const [useAnother, setUseAnother] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (useAnother) {
    return (
      <>
        <h1 className="auth-title">Sign in with Google</h1>
        <p className="auth-subtitle">Choose your Google account to continue to WattSnap</p>
        <div className="auth-gcard">
          <div className="auth-gcard-head">
            <GoogleIcon size={28} />
            <span className="auth-gcard-title">Use another account</span>
          </div>
          {error && <AuthAlert>{error}</AuthAlert>}
          <form className="auth-form" noValidate onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim() || !EMAIL_PATTERN.test(email.trim())) {
              setError("Enter your name and a valid email address.");
              return;
            }
            onSelect({ name: name.trim(), email: email.trim() });
          }}>
            <AuthField id="google-other-name" placeholder="Full Name" icon={<User size={18} />} value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" />
            <AuthField id="google-other-email" placeholder="Email Address" type="email" icon={<Mail size={18} />} value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
            <PrimaryButton type="submit" id="google-other-continue">Continue</PrimaryButton>
          </form>
          <button type="button" className="auth-link auth-center-link" onClick={onUseAnother}>Cancel</button>
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="auth-title">Sign in with Google</h1>
      <p className="auth-subtitle">Choose your Google account to continue to WattSnap</p>

      <div className="auth-gcard">
        <div className="auth-gcard-head">
          <GoogleIcon size={28} />
          <span className="auth-gcard-title">Choose an account</span>
          <span className="auth-gcard-sub">to continue to WattSnap</span>
        </div>

        <button type="button" className="auth-gaccount is-primary" onClick={() => onSelect(account)} id="google-account-primary">
          <span className="auth-gavatar">{initials(account.name)}</span>
          <span className="auth-gmeta">
            <span className="auth-gname">{account.name}</span>
            <span className="auth-gemail">{account.email}</span>
          </span>
          <ChevronRight size={20} className="auth-gchevron" />
        </button>

        <button type="button" className="auth-gaccount" onClick={() => setUseAnother(true)} id="google-account-other">
          <span className="auth-gavatar is-neutral">
            <User size={20} />
          </span>
          <span className="auth-gname">Use another account</span>
        </button>
      </div>

      <p className="auth-legal">
        By continuing, you agree to WattSnap&apos;s
        <br />
        <Link href="#" className="auth-link">Terms of Service</Link> and{" "}
        <Link href="#" className="auth-link">Privacy Policy</Link>.
      </p>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Profile setup                                                              */
/* -------------------------------------------------------------------------- */
export function ProfileSetupStep({ defaultName = "", onContinue }: { defaultName?: string; onContinue: (profile: { name: string; username: string }) => void }) {
  const [fullName, setFullName] = useState(defaultName);
  const [birthDate, setBirthDate] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!fullName.trim() || !birthDate || !username.trim()) {
      setError("Please complete all fields to continue.");
      return;
    }
    setLoading(true);
    await fakeDelay();
    setLoading(false);
    onContinue({ name: fullName.trim(), username: username.trim() });
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
          id="profile-birthdate"
          label="Birth Date"
          type="date"
          icon={<Calendar size={18} />}
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
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
