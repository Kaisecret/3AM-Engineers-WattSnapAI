# Snap AI Scanner, WattSnap AI Assistant, and Monthly Energy UI

**Goal:** Make navigation consistent on phone and PC, turn Snap AI into a camera-first scanner, compare bills month by month, and add a WattSnap AI chat assistant in the app and on the landing page.

**Visual thesis:** The existing pale blue workspace, cyan-to-blue actions, navy accents, and the glossy mascot as a guide. Active navigation turns blue by colouring the icon's container, never by filling outline icons.

**Interaction thesis:** Phones open Snap AI straight into the rear camera. The mascot floats over the bill frame and rides the scan line with a light cone while values appear, then a review sheet slides up. Chat replies show a typing indicator. All motion respects reduced-motion settings.

**Architecture:** UI preview only; no backend or AI calls. Bills and appliances stay in browser storage. A first visit starts with clearly labelled sample history so comparisons have data; anything saved replaces it. Scans produce sample values that continue the saved history, and people review every value before it is saved. Assistant replies are rule-based and use the household's saved records.

- [x] Navigation: one outline icon set (House, ChartColumnBig, ScanText, PlugZap, Megaphone). Phone active items get a blue pill; Snap AI keeps its raised button with a ring when active. PC active rows become a blue gradient. The PC sidebar links to the assistant.
- [x] Snap AI: phones auto-start the camera with upload, shutter, and manual entry; without a camera a sample bill can still be scanned. PCs get a drop zone, optional webcam, a step tracker, tips, and recent bills. Saving adds the bill to history; a bill for an existing month replaces it after a warning.
- [x] Energy: latest bill hero, this month versus last month, six-month average/lowest/highest, a monthly chart (kWh or pesos) with an average line, and a bill history with month-over-month changes and source labels. Home's consumption card is monthly too.
- [x] Appliances: an Add appliance button opens a dialog (bottom sheet on phones) with type presets, steppers, and a live estimate. Entries can be edited and are ranked by estimated monthly use.
- [x] Advisories: status hero with location, tabs with counts, filter chips, date-tile cards, and a detail sheet with a Brownout Ready checklist.
- [x] WattSnap AI: a Home card opens the separate `/assistant` screen (full screen on phones, with a snapshot column on wide PCs). The landing page has a floating chat that answers questions about the app.

**Verification:** Node tests cover monthly comparison, sample scan readings, appliance kind guessing, and assistant replies. Typecheck and production build pass. Browser checks at 320, 375, 768, 1024, and 1920 px found no horizontal overflow on app routes, confirmed active navigation per route, and exercised the scan (fake camera and no camera), appliance dialog, advisory checklist, assistant, and landing chat flows.
