# WattSnap Auth UI Implementation Plan

**Goal:** Match the user's reference across the login, signup, email verification, Google chooser, profile, welcome, and password reset screens.

**Architecture:** Retain the existing client-side flow components and shared AuthShell. Scope all styling to auth classes. Reuse the existing transparent mascot artwork and add the missing laptop illustration.

**Tech Stack:** Next.js, React, TypeScript, CSS, lucide-react.

## Constraints

- Keep the existing landing page intact.
- UI only: no authentication services, outgoing email, or backend integration.
- Signup: account details -> six-digit code -> profile -> welcome.
- Password reset: email -> six-digit code -> new password -> confirmation.
- Accept any six numeric digits for the UI preview.
- Open the local signup preview in the user's installed Chrome.

## Tasks

- [x] Update `src/features/auth/components/AuthShell.tsx` and `auth.css` to match the reference: white and pale cyan clouds, navy headings, compact outlined fields, cyan-to-blue buttons, logo at upper left, mascot alongside the form, and artwork on the left for verification.
- [x] Polish `AuthUi.tsx`, `AuthSteps.tsx`, and the flow components: accessible field names, visible password button tooltips, code autofill and paste, alternate Google account UI, preserved account details, and welcome wordmark in brand colors.
- [x] Verify with `npx tsc --noEmit`, `npm run build`, and headless Playwright on desktop and mobile. Check signup, Google, login, reset, validation, image loading, and horizontal overflow. Leave the dev server running.
- [ ] Open Chrome at `http://127.0.0.1:3000/signup`. Blocked by automatic approval review; preview link provided to the user.

## Artwork

The built-in imagegen tool generated `public/assets/branding/auth-login-laptop.png`. The existing clipboard mascot was the identity reference. Final prompt: a matching glossy blue and white WattSnap robot with a navy face, cyan winking eye, glowing golden bulb antennae, using a blue laptop at a cyan desk with a small green plant and pale clouds, transparent background, no text or UI.

## Review

Restored the existing mobile profile photo control as a keyboard-accessible button. Added a verification unmount check so navigating back cancels its pending simulated completion. The UI makes no authentication or email API calls.

## Preview

The dev server runs at `http://127.0.0.1:3000/signup`. Automatic approval review rejected launching the installed Chrome with this URL, reporting `blocked by policy`. The user can open the preview link in Chrome. Headless Playwright checks use installed Chrome for verification.

Final build passed. Playwright passed at 1440x900, 390x844, and 320x740, including signup, OTP autofill, verification cancellation on back, profile photo selection, login, both Google options, password reset validation, loaded artwork, and viewport bounds. Screenshots are in `%TEMP%/wattsnap-auth-preview`. No browser runtime errors were recorded. The repository has no ESLint configuration, which the successful build reports as a warning.
