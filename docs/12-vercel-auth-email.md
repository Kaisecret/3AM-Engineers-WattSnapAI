# Vercel Authentication & Gmail Email Operations Guide

## Production Environment Overview

- **Live Production URL**: `https://www.wattsnapai.dev`
- **Vercel Project**: `kaisecrets-projects/wattsnapai`
- **Auth Provider**: Hosted Supabase (`@supabase/ssr` cookie sessions)
- **Email Delivery Provider**: Gmail SMTP via signed Supabase `send_email` Auth Hook (`/api/auth/send-email`)

---

## Authentication Architecture & Flows

1. **Session Management**:
   - Browser & Server Supabase clients use `@supabase/ssr` cookies.
   - Protected routes (`/dashboard`, `/appliances`, `/bills`, `/settings`, `/brownout-ready`, `/simulator`, `/advisories`) are guarded by Next.js middleware and server layout authentication checks.
   - Unauthenticated requests to protected routes receive HTTP `307` redirects to `/login?next=<path>` with `Cache-Control: private, no-store, max-age=0`.

2. **Email & Password Authentication**:
   - Supports sign in via email or unique username.
   - Passwords verified against Supabase Auth.
   - Failed credentials return user-friendly error banners without leaking user existence.

3. **Email Verification & Password Recovery**:
   - Supabase generates 6-digit one-time passcodes (OTP).
   - Supabase dispatches a signed webhook payload using `standardwebhooks` to `https://www.wattsnapai.dev/api/auth/send-email`.
   - The Next.js API route validates the timestamp and cryptographic signature against `SEND_EMAIL_HOOK_SECRET`.
   - Upon signature verification, Nodemailer delivers the OTP code to the recipient via Gmail SMTP (`smtp.gmail.com:465`).

---

## Environment Configuration

### Vercel Environment Variables (`Production` & `Preview`)
- `NEXT_PUBLIC_SITE_URL`: `https://www.wattsnapai.dev`
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Supabase anon/publishable key
- `SUPABASE_SECRET_KEY`: Supabase service role / secret key (server-only)
- `SEND_EMAIL_HOOK_SECRET`: Standard Webhooks signing secret for auth email hook
- `SMTP_HOST`: `smtp.gmail.com`
- `SMTP_PORT`: `465`
- `SMTP_USER`: Gmail address
- `SMTP_PASS`: Gmail App Password

---

## Verification Performed

| Verification Check | Target | Result | Evidence |
| :--- | :--- | :--- | :--- |
| **Unit & Isolation Tests** | Local Node runner | **Passed** | 167 tests passed, 0 failures (`npm test`) |
| **TypeScript Compilation** | Project types | **Passed** | 0 errors (`npx tsc --noEmit`) |
| **Production Build** | Next.js 15.5 | **Passed** | 17 routes compiled cleanly (`npm run build`) |
| **Gmail SMTP Authentication** | Gmail SMTP Server | **Verified** | TLS handshake and auth successful (`SMTP OK`) |
| **Vercel Production Deploy** | `wattsnapai.dev` | **Live** | Deployment aliased to `https://www.wattsnapai.dev` |
| **Unsigned Hook Rejection** | `/api/auth/send-email` | **Verified** | Returns HTTP `401 {"error":{"http_code":401,"message":"Invalid webhook signature."}}` |
| **Forged Hook Rejection** | `/api/auth/send-email` | **Verified** | Tampered / forged signature rejected with HTTP `401` |
| **Supabase Hook Configuration** | Supabase Project CLI | **Verified** | Site URL, redirect URLs (`/auth/callback`, `/auth/confirm`), 6-digit OTP, and signed hook enabled |
| **Protected Route Redirection** | `/dashboard`, `/settings` | **Verified** | Redirects unauthenticated requests to `/login?next=...` with `Cache-Control: private, no-store` |
| **Live Browser Verification** | `/login`, `/signup`, `/forgot-password` | **Verified** | Form rendered, invalid login displays `"Incorrect email, username, or password."`, navigation links functional |

---

## Maintenance & Management Commands

- **Inspect Supabase Auth & Email Configuration**:
  ```bash
  npm run setup:auth -- --inspect
  ```
- **Update / Re-enable Supabase Auth Settings & Email Hook**:
  ```bash
  node --env-file=.env.local scripts/configure-supabase-auth.mjs --enable-email
  ```
- **Re-verify Gmail SMTP Credentials**:
  ```bash
  npm run setup:email
  ```
- **Run Full Automated Test Suite**:
  ```bash
  npm test
  ```
