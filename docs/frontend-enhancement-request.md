# WATTSNAP AI — FINAL FRONTEND ENHANCEMENT & COMPLETION PROMPT

**Project:** WattSnap AI
**Team:** 3AM Engineers
**Technology:** React + TypeScript
**Development Scope:** Frontend Only
**Objective:** Hackathon-Ready Application

---

# 1. MAIN OBJECTIVE

Improve and complete the existing WattSnap AI frontend to make it polished, reliable, accessible, responsive, and ready for a hackathon demonstration.

WattSnap AI is an offline-first household electricity assistant designed to help users understand their electricity bills, monitor consumption, estimate appliance usage, receive personalized energy-saving recommendations, and interpret electricity-provider advisories.

The application supports location-assisted electricity-provider selection, with ANTECO serving as the initial validation provider.

**IMPORTANT: THIS IS AN ENHANCEMENT TASK, NOT A REDESIGN.**

Preserve the current design and functional architecture.

Focus on:

- Fixing existing bugs and inconsistencies.
- Completing missing frontend functionality.
- Improving usability and accessibility.
- Removing unnecessary prototype and sample elements.
- Correcting misleading and duplicated content.
- Improving mobile responsiveness.
- Making existing components more reliable.
- Implementing functional local data management.
- Strengthening offline-first behavior.
- Preparing frontend structures for future Gemini API integration.

Do not implement or modify the backend during this task.

---

# 2. CRITICAL DEVELOPMENT SAFETY RULES

Before making changes:

1. Inspect the existing repository, dependencies, routes, components, styling, storage, and frontend architecture.
2. Check the Git working tree and preserve all existing uncommitted changes.
3. Create a separate Git branch for frontend improvements without overwriting ongoing work.
4. Identify which features already work before modifying them.
5. Preserve working components, routes, data, and existing interfaces.
6. Do not modify the Node.js backend, API endpoints, server configuration, authentication services, or database infrastructure.
7. Do not implement the Gemini API yet.
8. Do not expose, create, or modify API keys or secrets.
9. Do not automatically deploy, merge, or push to production.
10. Do not perform destructive migrations or clear user data.

**Prioritize stability and existing functionality over visual polish.**

If an improvement could break a working feature, use the safer implementation or report the limitation.

Avoid unnecessary refactoring and large architectural rewrites.

---

# 3. PRESERVE THE EXISTING DESIGN

Do not redesign WattSnap AI.

Maintain its existing:

- Branding and logo.
- Color palette.
- Typography and visual personality.
- Navigation structure.
- Sidebar and existing navigation components.
- Card styles.
- Button designs.
- Icon style.
- Page structure.
- Layout arrangements.
- Mascot and illustrations.
- Existing animations that work correctly.
- Overall appearance.

Do not introduce a completely different design system, dashboard layout, or visual theme.

Only make targeted improvements where necessary.

## UI Refinements

Improve:

- Spacing and alignment.
- Component consistency.
- Text readability.
- Button sizing.
- Form layouts.
- Responsive behavior.
- Visual hierarchy.
- Interaction feedback.
- Error messages.
- Loading indicators.
- Empty states.
- Accessibility.

The completed application should look like a more polished version of the existing WattSnap AI, not an entirely new website.

---

# 4. REMOVE PROTOTYPE AND SAMPLE ELEMENTS

Audit all pages for unnecessary development or prototype content.

Examples include:

- UI Preview
- Prototype
- Demo Mode
- Sample Design
- Feature Preview
- Demonstration Only
- AI Generation Not Connected
- Sign-in Is Demonstrated Locally
- Account Verification Is Not Connected
- Backend Integration Pending
- Placeholder Feature
- Similar development-oriented labels

Remove these from normal user-facing pages where the experience can be made genuinely functional.

## Important Rule

Do not simply remove warnings while leaving simulated functionality behind.

If an action cannot work without backend or Gemini integration:

- Provide a functional frontend-only alternative where possible.
- Otherwise disable or hide the unavailable action.
- Keep necessary, concise explanations of actual limitations.
- Never present simulated results as genuine AI processing.

## Remove Fake User Data

Remove fabricated household information presented as real data, including:

- Sample bills.
- Fake consumption statistics.
- Invented appliances.
- Simulated current advisories.
- Artificial account balances.
- Fake customer testimonials.
- Fake AI-generated results.

Replace them with actual local records or meaningful empty states.

Do not delete reusable components, legitimate test fixtures, or development-only sample assets merely because they contain example data.

## Empty State Example

**No electricity bills yet**

"Add your first electricity bill to start monitoring your household consumption."

Button: **Add Electricity Bill**

Apply similar meaningful empty states throughout the application.

---

# 5. AUTHENTICATION AND HOUSEHOLD PROFILE

Inspect the existing authentication implementation before changing anything.

Determine whether authentication is:

- Fully functional.
- Partially connected.
- Locally simulated.
- Entirely frontend-only.

Preserve real working authentication.

Do not introduce fake authentication, verification, or account security.

If the current sign-in page is purely simulated, replace that simulated workflow with a functional local household setup where appropriate, without removing unrelated working infrastructure.

The application should support:

- One household profile per account or local installation.
- Household name or nickname.
- Province.
- Municipality or city.
- Barangay.
- Selected electricity provider.
- Editing existing household information.
- Persistent local household information.

Do not introduce administrator accounts or multi-household management.

## Location-Aware Provider Selection

Allow users to:

- Grant or decline location permission.
- Enter their location manually.
- Review suggested electricity providers when reliable mapping data is available.
- Confirm the suggested provider.
- Select a provider manually.

Do not claim that GPS alone can accurately identify every electricity provider.

If reliable provider-location mapping is unavailable, prefer manual selection rather than invented recommendations.

Keep ANTECO as the initial testing and validation provider without restricting the application to ANTECO.

---

# 6. ELECTRICITY BILL SCANNER

Improve the existing electricity bill scanning page.

## Required Frontend Capabilities

- Upload electricity bill image.
- Capture photo using a supported device camera.
- Preview uploaded image.
- Replace or remove uploaded image.
- Validate uploaded file type and size.
- Enter bill information manually.
- Review bill information.
- Correct extracted or entered values.
- Confirm and save the record locally.

## Supported Bill Fields

- Electricity provider.
- Billing period.
- Billing date, when available.
- Amount due.
- Due date.
- Total kWh consumption.
- Optional relevant billing details.

## Important

Actual Gemini-powered extraction is NOT included in this phase.

Do not display unrelated sample values as though they came from an uploaded bill.

Use functional manual entry until Gemini is integrated.

Prepare typed interfaces for future AI extraction while maintaining accurate frontend behavior.

## Validation

Handle:

- Missing required fields.
- Invalid dates.
- Negative consumption.
- Invalid bill amounts.
- Duplicate billing periods.
- Invalid image formats.
- Oversized uploads.
- Interrupted form sessions.

Preserve confirmed bill records after refresh.

---

# 7. BILL HISTORY AND CONSUMPTION DASHBOARD

Improve existing dashboard components without redesigning their layouts.

Use actual stored household information instead of fabricated statistics.

## Dashboard Information

Display:

- Latest saved electricity bill.
- Latest monthly kWh consumption.
- Latest bill amount.
- Previous billing period.
- Monthly consumption history.
- Historical consumption graphs.
- Monthly bill comparisons.
- Registered appliance overview.
- Estimated appliance consumption.
- Relevant Tipid Tips.
- Previously saved electricity advisories.

## Consumption Graphs

Ensure charts:

- Use genuine stored data.
- Display readable dates and values.
- Handle missing months.
- Handle incomplete billing records.
- Work on mobile devices.
- Display suitable empty states.
- Remain accessible.

## Consumption Change Detection

Distinguish dashboard visualization from change detection.

Dashboard: Shows consumption history.

Change detection: Identifies notable increases or decreases.

Implement local calculations for:

- kWh difference.
- Percentage difference.
- Notable consumption increases.
- Notable consumption decreases.

Use understandable labels and defensible thresholds.

Do not invent causes for consumption changes.

---

# 8. APPLIANCE REGISTRATION AND WATTAGE SCANNER

Improve appliance registration while preserving the existing visual style.

Make the feature easy for seniors and nontechnical users.

## Appliance Icon Selection

Allow users to select common appliance types through large, recognizable icon buttons.

Examples:

- Refrigerator.
- Electric fan.
- Air conditioner.
- Television.
- Rice cooker.
- Washing machine.
- Computer.
- Lighting.
- Other appliance.

Each option should have a clear icon and text label.

## Manual Entry

Allow entry of:

- Appliance name.
- Appliance type.
- Wattage.
- Quantity.
- Estimated daily operating hours.
- Optional usage days.

## Appliance Nameplate Capture

Allow users to photograph or upload an appliance specification label or nameplate.

Provide:

- Camera capture.
- Image upload.
- Image preview.
- Editable appliance information.
- User confirmation.
- Save action.

Prepare frontend interfaces for future Gemini-powered recognition of appliance model and wattage.

Do not fake OCR extraction.

If recognition is unavailable, allow the user to manually enter the details while viewing the captured image.

## Appliance Management

Allow users to:

- Add appliances.
- Edit appliance information.
- Delete appliances with confirmation.
- View registered appliances.
- Review estimated consumption.
- Search or filter appliances where useful.

Avoid unnecessarily complex interactions.

---

# 9. APPLIANCE CONSUMPTION ESTIMATOR

Implement real local calculations.

Use:

**Estimated kWh = (Watts × Hours per Day × Quantity × Days) / 1000**

Display:

- Estimated daily consumption.
- Estimated monthly consumption.
- Consumption per registered appliance.
- Highest estimated consuming appliances.
- Appliance comparison charts.

Validate wattage, quantity, operating hours, and usage days.

The total estimated appliance consumption must not be automatically forced to equal the official bill's recorded kWh.

Show a concise explanation:

"Appliance consumption is estimated based on the information you provide and may differ from actual meter readings."

Do not present these estimates as sensor measurements or AI-detected actual usage.

---

# 10. PERSONALIZED TIPID TIPS

Improve the existing Tipid Tips page while keeping its current layout and styling.

Since Gemini integration is excluded from this phase, use transparent, deterministic local recommendations where appropriate.

## Tip Categories

- Appliance operating hours.
- Cooling and ventilation.
- Lighting efficiency.
- Standby electricity usage.
- Household energy habits.
- Unusual consumption awareness.

Each Tipid Tip should contain:

- Clear title.
- Short explanation.
- Related appliance or consumption pattern where applicable.
- Practical recommended action.

Generate applicable tips using existing verified household information.

Do not claim these recommendations are Gemini-generated until the integration exists.

Avoid invented savings percentages or guaranteed cost reductions.

Prevent repetitive, irrelevant recommendations.

---

# 11. ELECTRICITY ADVISORY INTELLIGENCE

Complete the frontend experience for processing electricity-provider advisories.

This combines advisory reading, information review, simplified explanations, and location matching into one feature.

## Advisory Input Methods

Support three methods:

**Upload Screenshot**

Users upload an official provider advisory screenshot.

**Share to WattSnap**

Support sharing an advisory screenshot from another application when the platform and PWA capabilities permit it.

Use a supported share-target implementation where feasible without backend changes.

If unsupported, provide screenshot upload as a fallback.

**Paste Advisory Text**

Users copy and paste electricity-provider advisory text.

## Advisory Information

Prepare a structured review interface containing:

- Electricity provider.
- Advisory type.
- Affected areas.
- Interruption date.
- Starting time.
- Expected restoration time.
- Reason, when stated.
- Simplified explanation.
- Original advisory screenshot or text.

Actual AI extraction is reserved for later Gemini integration.

Until then, provide editable fields and manual review rather than fabricated extraction.

## Household Location Matching

Compare structured affected-area information with the saved household location.

Provide three possible statuses:

**Affected** — The household location explicitly matches the advisory information.

**Possibly Affected** — The advisory is broad, incomplete, or ambiguous.

**Not Listed** — The household location is not explicitly identified.

"Not Listed" must not be presented as proof that electricity service is uninterrupted.

Do not claim live power-outage detection.

## Advisory History

Allow users to:

- Save processed advisories locally.
- View previous advisories.
- Reopen advisory details.
- Delete saved advisories.
- Review manually entered updates.

Keep the original advisory accessible.

Do not claim the app automatically receives new utility announcements.

---

# 12. OFFLINE-FIRST FUNCTIONALITY

Preserve and strengthen WattSnap AI's offline-first capabilities.

Use the existing suitable frontend storage system wherever possible.

Avoid unnecessary storage replacements.

## Available Offline

The following should remain accessible after being saved:

- Household profile.
- Selected electricity provider.
- Electricity bill records.
- Bill history.
- Appliance records.
- Appliance calculations.
- Consumption history.
- Consumption graphs.
- Locally generated recommendations.
- Previously saved advisories.
- Previously saved AI results when future integration makes these available.

## Offline Improvements

- Improve local data persistence.
- Preserve stored records after refresh.
- Support application navigation offline where feasible.
- Provide meaningful offline indicators.
- Prevent unexpected loss of form input.
- Provide clear feedback when connectivity is unavailable.
- Improve PWA service worker behavior if already present.
- Verify offline application-shell availability.

Avoid claiming that new Gemini analysis works offline.

Do not implement backend synchronization or fake synchronization behavior.

## Data Protection

- Do not clear existing browser data during updates.
- Preserve backward compatibility when changing local storage structures.
- Test storage migration behavior.
- Avoid caching sensitive data indiscriminately.
- Do not permanently save uploaded photos without a deliberate user-facing decision.
- Explain that browser-stored data may be lost if browser data is cleared.

---

# 13. SENIOR-FRIENDLY ACCESSIBILITY

Improve accessibility using the existing design.

Focus on:

- Large readable text.
- Clear labels.
- Comfortable touch targets.
- Recognizable appliance icons.
- High text contrast.
- Reduced typing.
- Clear form instructions.
- Keyboard navigation.
- Screen-reader support.
- Visible focus indicators.
- Understandable error messages.
- Predictable navigation.
- Simple confirmation actions.

Prefer touch targets of at least 44 × 44 pixels where practical.

Do not rely exclusively on color or icons to communicate important information.

Avoid visually overwhelming screens.

---

# 14. MOBILE RESPONSIVENESS

Review and improve existing responsive behavior.

Test:

- Small mobile screens.
- Standard smartphones.
- Tablets.
- Laptops.
- Desktop layouts.

Fix:

- Horizontal overflow.
- Overlapping content.
- Inaccessible controls.
- Excessively small buttons.
- Misaligned cards.
- Broken charts.
- Unreadable tables.
- Poorly positioned dialogs.
- Forms that are difficult to complete on mobile.

Keep the current navigation structure wherever practical.

Do not introduce an entirely new navigation system unless necessary to fix a genuine usability issue.

---

# 15. WEBSITE CONTENT CORRECTIONS

Review the existing landing page and application pages.

Fix:

- Duplicate descriptions.
- Repeated feature explanations.
- Grammar problems.
- Inconsistent capitalization.
- Confusing terminology.
- Misleading capability claims.
- Inaccurate provider coverage descriptions.
- Inaccurate storage descriptions.
- Unnecessary developer-oriented text.
- Nonfunctional marketing buttons.

Keep the existing layout and sections unless a section is redundant or misleading.

## Recommended Product Positioning

**WattSnap AI — Your Smart Household Electricity Assistant**

"Snap your bill. Understand your usage. Save smarter."

The website should communicate:

- Electricity bill understanding.
- Household consumption monitoring.
- Appliance wattage scanning and estimation.
- Practical energy-saving guidance.
- Electricity-provider advisory interpretation.
- Offline access to saved household information.

Do not falsely advertise real-time outage monitoring or completed Gemini integration.

---

# 16. FRONTEND CODE QUALITY

Follow existing React and TypeScript conventions.

Prioritize:

- Reusable components.
- Maintainable code.
- Strong TypeScript typing.
- Proper state management.
- Separation of UI, storage, and calculation logic.
- Centralized validation where appropriate.
- Consistent error handling.
- Minimal new dependencies.
- Elimination of unnecessary duplication.
- Preservation of existing APIs and component contracts.

Prepare TypeScript interfaces for future Gemini integration:

- BillExtractionResult
- ApplianceLabelExtractionResult
- AdvisoryAnalysisResult
- TipRecommendation

These should be data contracts only.

Do not implement backend requests or simulated AI success responses.

Avoid unnecessary project-wide refactoring.

---

# 17. TESTING AND VERIFICATION

Before completing the task, verify the application.

## Functional Testing

Check that:

- Household information can be saved and edited.
- Provider selection works.
- Bill information can be entered and saved.
- Bill history updates correctly.
- Dashboard values use genuine local records.
- Appliances can be registered.
- Appliance information can be edited and deleted.
- Appliance electricity calculations are correct.
- Consumption changes are calculated correctly.
- Rule-based Tipid Tips display appropriately.
- Advisory screenshots can be uploaded.
- Advisory text can be pasted.
- Advisory information can be reviewed and saved.
- Location matching works for clear and ambiguous cases.
- Saved information persists after page refresh.
- Implemented offline features work without connectivity.
- All primary buttons and navigation links function correctly.

## UI Testing

Check:

- Mobile responsiveness.
- Desktop layout.
- Accessibility.
- Navigation consistency.
- Form readability.
- Loading states.
- Empty states.
- Error handling.
- Confirmation dialogs.

## Build Testing

Run the repository's existing:

- TypeScript checks.
- Lint checks.
- Relevant unit tests.
- Production build.

Fix newly introduced errors.

Do not modify unrelated backend code to make frontend checks pass.

---

# 18. IMPLEMENTATION PRIORITY

Execute improvements incrementally.

## Priority 1 — Stability and Accuracy

- Repository audit.
- Preserve working functionality.
- Fix broken interactions.
- Correct duplicated and misleading content.
- Remove unnecessary prototype UI.
- Protect existing local records.
- Resolve major TypeScript and frontend errors.

## Priority 2 — Core Frontend Completion

- Household profile.
- Provider selection.
- Bill entry and review.
- Bill history.
- Dashboard calculations.
- Appliance registration.
- Appliance estimation.
- Consumption change detection.
- Tipid Tips.
- Advisory upload, paste, and review.
- Household location matching.

## Priority 3 — Offline and Accessibility

- Persistent local records.
- Offline navigation.
- Senior-friendly controls.
- Responsive improvements.
- Error and empty states.
- PWA verification.

## Priority 4 — Final Polish

- Minor spacing refinements.
- Consistent component styling.
- Appropriate transitions.
- Readability improvements.
- Performance optimization.
- Final testing.

Do not prioritize decorative changes over working functionality.

---

# 19. DEFINITION OF DONE

The task is complete only when:

1. WattSnap AI retains its existing recognizable design.
2. No unnecessary redesign or architecture rewrite has occurred.
3. All existing working frontend functionality remains intact.
4. Prototype-only content has been removed or appropriately replaced.
5. No fabricated household data is presented as genuine.
6. Authentication behavior is accurate and not misleading.
7. Household profiles can be managed locally.
8. Bill entry, validation, and history work.
9. Dashboard values reflect locally saved records.
10. Appliance registration and consumption estimation work.
11. Consumption changes are calculated correctly.
12. Tipid Tips provide honest frontend functionality.
13. Advisory upload, paste, review, and location matching work within frontend limitations.
14. Supported local records remain accessible offline.
15. Mobile responsiveness is improved.
16. Senior-friendly accessibility is improved.
17. All available tests and production build checks pass, or any existing blockers are clearly documented.
18. No Node.js backend or Gemini API changes have been made.
19. No existing user data has been intentionally deleted.
20. No deployment or production modification has occurred without authorization.

---

# 20. FINAL IMPLEMENTATION INSTRUCTION

First, audit the existing WattSnap AI codebase and determine which features already work.

Then implement the necessary frontend improvements directly in the existing project.

**DO NOT:**

- Redesign the website.
- Replace its visual identity.
- Rewrite working components unnecessarily.
- Modify backend infrastructure.
- Integrate Gemini yet.
- Remove working authentication.
- Create fake authentication.
- Fabricate AI results.
- Delete existing user data.
- Hide critical safety or capability limitations.
- Deploy automatically.
- Push directly to production.
- Make unrelated changes.

**DO:**

- Preserve the existing design.
- Improve usability.
- Complete missing frontend workflows.
- Fix broken functionality.
- Remove prototype-only presentation.
- Use genuine locally stored data.
- Improve accessibility.
- Strengthen offline behavior.
- Maintain clean React and TypeScript code.
- Test modified functionality.
- Prepare for future Gemini integration.

When finished, provide a clear implementation report covering:

- Files modified.
- Features completed.
- Bugs fixed.
- Content corrections.
- Accessibility improvements.
- Offline functionality.
- Testing results.
- Remaining limitations.
- Features awaiting backend or Gemini integration.

## ULTIMATE GOAL

**Transform WattSnap AI into a polished, functional, senior-friendly, offline-first, hackathon-ready frontend while preserving its current appearance and existing functionality.**

The result should feel like a more complete and reliable version of the current WattSnap AI—not a redesigned product, not a collection of sample screens, and not an application that pretends unavailable AI features are already operational.

**Development Priority: Stability → Functional Completion → Accessibility → Content Accuracy → Offline Reliability → Visual Polish.**
