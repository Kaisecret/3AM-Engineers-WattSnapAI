"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ButtonHTMLAttributes,
  type ClipboardEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { AlertCircle, CheckCircle2, ChevronDown, ChevronRight, Eye, EyeOff } from "lucide-react";

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const subscribeReady = () => () => {};
const clientReady = () => true;
const serverReady = () => false;
function useAuthReady() { return useSyncExternalStore(subscribeReady, clientReady, serverReady); }

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  icon?: ReactNode;
  mobileIcon?: ReactNode;
  label?: string;
};

export function AuthField({ icon, mobileIcon, label, id, className = "", ...rest }: FieldProps) {
  const ready = useAuthReady();
  return (
    <div className="auth-field">
      <label htmlFor={id} className={label ? "auth-label" : "auth-sr-only auth-mobile-label"}>
        {label ?? rest.placeholder}
      </label>
      <div className="auth-input-wrap">
        {icon && <span className="auth-input-icon">{icon}</span>}
        {!icon && mobileIcon && <span className="auth-input-icon mobile-only">{mobileIcon}</span>}
        <input id={id} className={`auth-input${icon ? "" : " no-icon"}${mobileIcon ? " has-mobile-icon" : ""} ${className}`} {...rest} disabled={!ready || rest.disabled} />
        {rest.type === "date" && <ChevronDown className="auth-date-chevron mobile-only" size={22} aria-hidden="true" />}
      </div>
    </div>
  );
}

export function PasswordField({ icon, mobileIcon, label, id, className = "", ...rest }: Omit<FieldProps, "type">) {
  const ready = useAuthReady();
  const [visible, setVisible] = useState(false);

  return (
    <div className="auth-field">
      <label htmlFor={id} className={label ? "auth-label" : "auth-sr-only auth-mobile-label"}>
        {label ?? rest.placeholder}
      </label>
      <div className="auth-input-wrap">
        {icon && <span className="auth-input-icon">{icon}</span>}
        {!icon && mobileIcon && <span className="auth-input-icon mobile-only">{mobileIcon}</span>}
        <input
          id={id}
          type={visible ? "text" : "password"}
          className={`auth-input has-toggle${icon ? "" : " no-icon"}${mobileIcon ? " has-mobile-icon" : ""} ${className}`}
          {...rest}
          disabled={!ready || rest.disabled}
        />
        <button
          type="button"
          className="auth-eye"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          title={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}

type PrimaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean };

export function PrimaryButton({ loading = false, disabled, children, className = "", ...rest }: PrimaryButtonProps) {
  const ready = useAuthReady();
  return (
    <button
      className={`auth-btn auth-btn-primary ${className}`}
      disabled={!ready || disabled || loading}
      aria-busy={loading}
      {...rest}
    >
      {loading ? <><span className="auth-spinner" aria-hidden="true" /><span className="auth-sr-only">{children}</span></> : <>{children}<ChevronRight className="auth-button-chevron mobile-only" size={24} aria-hidden="true" /></>}
    </button>
  );
}

export function GoogleIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
    </svg>
  );
}

export function GoogleButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" className="auth-btn auth-btn-google" onClick={onClick} disabled={disabled}>
      <GoogleIcon />
      <span>Continue with Google</span>
    </button>
  );
}

export function AuthDivider() {
  return <div className="auth-divider">or</div>;
}

export function AuthAlert({ type = "error", children }: { type?: "error" | "success"; children: ReactNode }) {
  return (
    <div className={`auth-alert auth-alert-${type}`} role={type === "error" ? "alert" : "status"}>
      {type === "error" ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
      <span>{children}</span>
    </div>
  );
}

/** Six-box one-time-code input with auto-advance, backspace and paste support. */
export function OtpInput({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const length = value.length;

  const focusAt = (index: number) => refs.current[Math.max(0, Math.min(length - 1, index))]?.focus();

  const update = (index: number, digit: string) => {
    const next = [...value];
    next[index] = digit;
    onChange(next);
  };

  const handleChange = (index: number, raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (digits.length > 1) {
      const next = [...value];
      digits.slice(0, length - index).split("").forEach((digit, offset) => {
        next[index + offset] = digit;
      });
      onChange(next);
      focusAt(Math.min(length - 1, index + digits.length));
      return;
    }
    const digit = raw.replace(/\D/g, "").slice(-1);
    update(index, digit);
    if (digit && index < length - 1) focusAt(index + 1);
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      e.preventDefault();
      update(index - 1, "");
      focusAt(index - 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusAt(index - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focusAt(index + 1);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length).split("");
    if (!digits.length) return;
    e.preventDefault();
    const next = Array.from({ length }, (_, i) => digits[i] ?? "");
    onChange(next);
    focusAt(digits.length - 1);
  };

  return (
    <div className="auth-otp" role="group" aria-label="Verification code">
      {value.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className={`auth-otp-input${digit ? " is-filled" : ""}`}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={length}
          pattern="[0-9]*"
          value={digit}
          aria-label={`Digit ${i + 1}`}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
        />
      ))}
    </div>
  );
}

/** Simple seconds countdown used for the "Resend code" timer. */
export function useCountdown(seconds: number) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);

  return { remaining, restart: () => setRemaining(seconds) };
}
