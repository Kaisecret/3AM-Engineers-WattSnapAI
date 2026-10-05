# Advisories Reference Implementation Plan

**Goal:** Build `/advisories` from the supplied Active and History phone references, with a responsive PC layout.

**Visual thesis:** Pale blue WattSnap surfaces, compact white advisory cards, colorful interruption icons, and cyan selected controls.

**Content plan:** Existing branding header; Advisories title and subtitle; Active/History tabs; household location with Edit; list title with type filter; reference advisory cards; persistent navigation highlighting Advisories.

**Interaction thesis:** Tab and filter feedback, subtle card hover, and native detail/location dialogs. Respect reduced motion.

**Scope:** UI with sample records. Use the reference dates with their actual calendar weekdays. Location edits are local to the current page session; no database, provider feed, or geolocation integration.

- [x] Add sample advisory records and verify tab/type filtering with Node tests before implementation. Three tests pass.
- [x] Build both tab views, reusable navigation, location editing, and advisory detail dialogs.
- [x] Add phone-first styling and PC layout; verify production build and running routes. `/advisories` and `/dashboard` respond with HTTP 200.

**Build correction:** The generated dashboard chunk received concatenated module ID `0`, which the installed Next.js client manifest plugin incorrectly omits. A clean build reproduced the failure. Disable module concatenation for the production browser build in `next.config.ts`; the manifest now includes `HomeScreen` and the production build succeeds. Upstream report: https://github.com/vercel/next.js/issues/97937. Existing minification and tree shaking remain enabled.

**Verification limit:** Browser runtime reported no available browsers earlier in this session. Use production compilation, filtering tests, asset checks, and HTTP checks; do not claim screenshot comparison.
