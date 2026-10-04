"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Check, Lock } from "lucide-react";
import { AUTH_ART, AuthShell } from "./AuthShell";
import { PasswordField, PrimaryButton, fakeDelay } from "./AuthUi";

const COMMON_PASSWORDS = [
  "password",
  "password1",
  "password123",
  "12345678",
  "123456789",
  "1234567890",
  "qwerty123",
  "11111111",
  "iloveyou",
  "abc12345",
  "wattsnap123",
];

/** Create New Password screen (UI only). */
export function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const rules = [
    { label: "Be at least 8 characters long", met: password.length >= 8 },
    { label: "Include a letter and a number", met: /[a-z]/i.test(password) && /\d/.test(password) },
    {
      label: "Not be commonly used",
      met: password.length > 0 && !COMMON_PASSWORDS.includes(password.toLowerCase()),
    },
  ];
  const mismatch = confirm.length > 0 && confirm !== password;
  const canSubmit = rules.every((r) => r.met) && confirm === password;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    await fakeDelay();
    setLoading(false);
    setDone(true);
  };

  if (done) {
    return (
      <AuthShell stepKey="done" art={{ src: AUTH_ART.celebrate }} showArtOnMobile backHref="/login">
        <h1 className="auth-title">Password Updated!</h1>
        <p className="auth-subtitle">Your password has been reset. You can now log in with your new password.</p>
        <Link href="/login" className="auth-btn auth-btn-primary" id="reset-back-to-login">
          Back to Login
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell stepKey="form" art={{ src: AUTH_ART.shield }} backHref="/forgot-password">
      <h1 className="auth-title">Create New Password</h1>
      <p className="auth-subtitle">Enter a new password for your account.</p>

      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        <PasswordField
          id="reset-new-password"
          placeholder="New Password"
          autoComplete="new-password"
          icon={<Lock size={18} />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <PasswordField
          id="reset-confirm-password"
          placeholder="Confirm New Password"
          autoComplete="new-password"
          icon={<Lock size={18} />}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          aria-invalid={mismatch}
        />
        {mismatch && <span className="auth-hint-error">Passwords don&apos;t match.</span>}

        <div className="auth-rules">
          <p className="auth-rules-title">Password must:</p>
          <ul>
            {rules.map((rule) => (
              <li key={rule.label} className={rule.met ? "is-met" : ""}>
                <span className="auth-rule-icon">
                  <Check size={12} strokeWidth={3.5} />
                </span>
                {rule.label}
              </li>
            ))}
          </ul>
        </div>

        <PrimaryButton type="submit" disabled={!canSubmit} loading={loading} id="reset-password-button">
          Reset Password
        </PrimaryButton>
      </form>
    </AuthShell>
  );
}
