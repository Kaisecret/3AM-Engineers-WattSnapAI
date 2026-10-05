# Home Screen Reference Implementation Plan

**Goal:** Reproduce the supplied WattSnap home screen on phones, then provide a responsive PC layout.

**Design:** Pale blue app background, the existing full-color logo, a cyan greeting banner with the existing mascot, rounded white consumption/bill/budget panels, yellow advisory strip, illustrated Tipid Tip, and a fixed five-item navigation. Preserve the reference text and example values. Use real page elements rather than a screenshot. Do not include the reference image's physical phone frame or operating system status bar.

**Architecture:** Keep `/dashboard` as the home destination used by the existing authentication flow. A scoped client component provides chart selection and header menus. Existing feature routes supply navigation destinations. No backend or database changes.

**Visual thesis:** A friendly, bright household energy assistant with soft blue surfaces and the supplied playful WattSnap branding.

**Content plan:** Greeting; today's consumption and weekly comparison; bill and monthly budget; brownout status; today's savings tip; persistent app navigation.

**Interaction thesis:** Brief staggered content entrance, chart selection feedback, and subtle hover/press feedback; respect reduced motion.

- [x] Replace the dashboard with the reference content and existing logo/mascot assets.
- [x] Add mobile-first styling and a wider PC arrangement with persistent navigation.
- [x] Verify artwork paths and reference sections in the generated production HTML. The final production build and TypeScript checks passed after removing CSS compatibility warnings.

**Verification limit:** The browser runtime reported no available browsers. Mobile/desktop screenshots and browser interaction checks could not run in this session.

**Validation:** Confirm images resolve, all requested sections appear, narrow phones do not overflow, bottom navigation does not cover the tip, links target existing routes, and header menus open and dismiss.
