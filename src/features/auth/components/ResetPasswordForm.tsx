"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Check, Lock } from "lucide-react";
import { AUTH_ART, AuthShell } from "./AuthShell";
import { AuthAlert, PasswordField, PrimaryButton } from "./AuthUi";

import { getBrowserSupabase } from "../../../lib/supabase/browser";
import { updatePassword } from "../service";
import { passwordRules } from "../schemas";
import { forgetAccount } from "../session";

export function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const rules = passwordRules(password);
  const mismatch = confirm.length > 0 && confirm !== password;
  const canSubmit = rules.every((r) => r.met) && confirm === password;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const result = await updatePassword(getBrowserSupabase(), { password });
      if (!result.ok) setError(result.message);
      else { try { forgetAccount(); } catch { /* Session is already ended. */ } setDone(true); }
    } catch { setError("Your password could not be updated. Please try again."); }
    finally { setLoading(false); }
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

      {error && <AuthAlert>{error}</AuthAlert>}
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
