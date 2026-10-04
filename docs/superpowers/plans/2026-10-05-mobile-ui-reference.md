# WattSnap mobile reference implementation

**Goal:** Apply the supplied profile reference to all existing mobile account screens and carry its palette into the existing mobile dashboard.

**Design:** A pale cyan canvas surrounds a white rounded panel. The WattSnap logo sits above a mascot with layered clouds. Centered navy headings introduce the form; blue labels, rounded inputs, and cyan-to-blue pill buttons keep the primary action clear. Mobile profile setup omits the supporting sentence and optional photo action at the user's request. Artwork and spacing adapt to phone height so account actions remain visible. Desktop layout and required form behavior stay unchanged.

**Architecture:** Reuse AuthShell, AuthField, PasswordField, and PrimaryButton. Keep visual changes inside the existing 699px mobile breakpoint. Add a separate mobile cloud SVG so the desktop cloud artwork stays intact. Add explicit dashboard classes and mobile-only stylesheet rules rather than changing its desktop inline styling. Empty household routes remain outside this visual update.

**Visual thesis:** Friendly glossy mascot art, airy clouds, and clean white surfaces with strong navy text.
**Content plan:** Brand, mascot, heading and supporting sentence, labeled fields, primary action, secondary account links.
**Interaction thesis:** Preserve short step entrances, clear input focus, and button press feedback; respect reduced motion.

- [x] Update shared mobile account styling and mobile-only field labels/icons.
- [x] Match the profile composition and preserve the native date control. Remove the optional photo picker and mobile profile subtitle as requested in the follow-up.
- [x] Apply the mobile palette and responsive layout to the existing dashboard.
- [x] Run the existing account flow checks at desktop, 390px, and 320px, inspect screenshots, compare desktop geometry, and run the production build.

Implementation runs in the existing workspace to retain the user's uncommitted account UI and assets.

## Verification

- `node tests/e2e/auth-ui-preview.cjs`: passed signup, validation, OTP paste, verification cancellation, profile fields, welcome, login, Google account selection, and password reset at 1440x900, 390x844, and 320x740. The obsolete photo picker check now verifies its removal and the hidden mobile profile subtitle.
- Additional browser checks passed at 320px, 390px, 430px, 699px, and 700px for viewport overflow, mobile input sizes, visible labels, and mascot/heading separation.
- Desktop heading, field, button, logo, and art dimensions and positions match the saved baseline on login, signup, forgot-password, reset-password, and dashboard.
- `npm run build`, `npx tsc --noEmit`, and `git diff --check` passed. Build reports the existing absence of ESLint configuration.
- The follow-up removes the unused photo state, file input, and avatar CSS with the optional action.
- Mobile art uses an explicit shared height to keep the grid image within its illustration row. Dashboard reuses the profile mascot asset already loaded by the account screens.
- Screenshots are saved in `%TEMP%/wattsnap-auth-preview` and `%TEMP%/wattsnap-mobile-reference`. Local preview remains at `http://127.0.0.1:3000/signup`.

## Phone fit follow-up

The 360x640 baseline placed the login button at y=672 and signup action at y=779, both below the viewport. Mobile rules now adapt mascot height and cloud coverage to `dvh`, reduce excess gaps, and keep inputs at 48–50px with 16px text. At heights of 740px or less, account forms retain accessible labels while relying on their existing visible placeholders; login/signup supporting copy is omitted. Extra compact rules handle 568px phones. Normal scrolling remains available when keyboards, validation messages, or accessibility text sizing need additional room.

Phone layout checks cover 320x568, 360x640, 375x667, 320x740, 390x844, and 430x932 for complete initial login/signup/password/profile screens, visible primary and Google actions, and removed profile items. Updated screenshots are in `%TEMP%/wattsnap-mobile-fit`.

## Centered signup and login follow-up

Mobile signup and login panels now use a column flex layout below the existing header. Their artwork and form occupy a centered grid within the available height, with an increased 20px artwork-to-heading gap on phones at least 800px tall. Content retains its natural height so validation and keyboard use can scroll when necessary. Primary button styling is unchanged.

Browser checks passed at the six phone dimensions above plus 390x1000: empty space before the mascot and after the account links is balanced, actions are visible, and initial pages do not scroll. Desktop signup/login geometry still matches the baseline; mobile validation and login navigation passed. Screenshots are in `%TEMP%/wattsnap-auth-centered`.
