# Desktop Home and Simple Tabs

**Goal:** Match the supplied PC home reference and give every main navigation destination a usable phone/PC interface.

**Visual thesis:** A white branded sidebar beside a pale blue workspace, strong navy headings, cyan actions, and soft white surfaces.

**Content plan:** PC Home title, wide existing mascot banner, consumption chart, bill/budget setup cards; Energy bill history; Snap AI upload and manual review; Appliances list/add form; existing Advisories; supporting Budget and Account settings.

**Interaction thesis:** Existing chart and menu interactions; clear form validation and saved feedback; restrained hover and dialog transitions respecting reduced motion.

**Architecture:** Shared navigation and page shell. Browser-local preview records for bills, appliances, budget and household name. Upload previews an image or PDF; scanning is a UI preview and the user enters bill details manually. Do not claim AI extraction or live provider data. Existing mobile Home and Advisories designs remain responsive.

- [x] Update shared desktop branding/navigation and PC Home composition. Phone Home keeps its original cards and bottom navigation.
- [x] Test appliance calculations and record validation, then implement browser preview storage with synchronization and malformed-record handling.
- [x] Implement simple Energy, Snap AI, Appliances, Budget and Account screens. Saved profile names update the greeting; saved bills update the PC latest-bill card.
- [x] Production build and TypeScript checks passed. Seven calculation, validation, and advisory filtering tests passed. `/dashboard`, `/bills`, `/bills/new`, `/appliances`, `/advisories`, `/budget`, and `/settings` returned HTTP 200 with their expected screen content.

**Visual verification limit:** Browser discovery returned an empty list. Screenshot comparison and browser interaction checks could not run in this session.

**Verification:** Browser runtime was unavailable earlier. Run production build, meaningful domain tests and HTTP/rendered-content checks; report that screenshot comparison is unverified if the browser stays unavailable.
