import type { Identifier } from "./types";

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const USERNAME_PATTERN = /^[a-z0-9_.]{3,30}$/;
const COMMON_PASSWORDS = new Set(["password", "password1", "password123", "12345678", "123456789", "1234567890", "qwerty123", "11111111", "iloveyou", "abc12345", "wattsnap123"]);

export const normalizeEmail = (value: string) => value.trim().toLowerCase();
export const normalizeUsername = (value: string) => value.trim().toLowerCase();

export function validateEmail(value: string) {
  const email = normalizeEmail(value);
  return email.length <= 254 && EMAIL_PATTERN.test(email) ? null : "Please enter a valid email address.";
}

/** The same three rules, in the same words, as the reset-password screen. */
export function passwordRules(password: string) {
  return [
    { label: "Be at least 8 characters long", met: password.length >= 8 },
    { label: "Include a letter and a number", met: /[a-z]/i.test(password) && /\d/.test(password) },
    { label: "Not be commonly used", met: password.length > 0 && !COMMON_PASSWORDS.has(password.toLowerCase()) },
  ];
}
export function validatePassword(password: string) {
  // Supabase hashes with bcrypt, which ignores everything after 72 characters.
  if (password.length > 72) return "Use a password of 72 characters or fewer.";
  const failed = passwordRules(password).find(rule => !rule.met);
  return failed ? `Password must ${failed.label.charAt(0).toLowerCase()}${failed.label.slice(1)}.` : null;
}

export function validateFullName(value: string) {
  const name = value.trim();
  if (!name) return "Please enter your full name.";
  return name.length > 50 ? "Use 50 characters or fewer for your name." : null;
}
export function validateUsername(value: string) {
  return USERNAME_PATTERN.test(normalizeUsername(value)) ? null : "Usernames use 3 to 30 lowercase letters, numbers, dots or underscores.";
}
export function validateCode(value: string) {
  return /^\d{6}$/.test(value.trim()) ? null : "Enter the 6-digit code from your email.";
}

/** One login field serves both: a value containing @ is an email, anything else a username. */
export function parseIdentifier(value: string): Identifier | null {
  const text = value.trim().toLowerCase();
  if (!text) return null;
  if (text.includes("@")) return EMAIL_PATTERN.test(text) ? { kind: "email", email: text } : null;
  return USERNAME_PATTERN.test(text) ? { kind: "username", username: text } : null;
}

/** Only a path on this site may follow a sign-in. Browsers read a backslash as a slash. */
export function safeNextPath(value: string | null | undefined, fallback = "/dashboard") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\u0000-\u001f]/.test(value)) return fallback;
  return value;
}
