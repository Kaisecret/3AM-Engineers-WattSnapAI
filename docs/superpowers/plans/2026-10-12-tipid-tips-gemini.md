# Tipid Tips improvement plan

**Goal:** Simplify the existing Tipid Tips page and connect its generation button to the existing authenticated Gemini endpoint.

**Design:** Keep the app's blue accent and calm surfaces. A compact header combines saved input counts and one generate/refresh action. Tips lead with a short title and action; evidence, assumptions, and guidance expand on demand. Filters, stale status, offline access, and home setup remain available. Gentle loading and disclosure transitions respect reduced motion.

**Architecture:** Build the existing deterministic snapshot first, then let Gemini rewrite only its known tip IDs. Keep facts, limitations, links, input signatures, and sample labels under application control. Use structured output and validate requests and responses. Persist a source label alongside the existing version-compatible snapshot. Cancellation, account switches, record changes, and failed refreshes must preserve saved advice.

**Alternatives considered:** A static copy-only cleanup would leave the existing Gemini route unused. A free-form AI feed would weaken record attribution. Improving the existing evidence-backed feed meets both requirements with a small integration.

## Tasks

- [x] Add behavioral tests for concise, record-bound Gemini output, malformed requests/replies, and saved snapshot compatibility.
- [x] Add validated request preparation, structured Gemini generation, and safe snapshot merging.
- [x] Connect generation to the page with loading, cancellation, retry, offline suggestions, and stale-input protection.
- [x] Simplify page composition, tip disclosure, and responsive/dark styling.
- [x] Verify unit tests, TypeScript, production build, and browser layouts at desktop and narrow mobile sizes; exercise Gemini success and fallback.

**Scope:** Existing Next.js/React app only. Keep the API key server-side and existing authentication/rate limits. No database migration or deployment. Preserve unrelated work already in the workspace.

## Verification

- `npm test`: 415 passed.
- `npx tsc --noEmit` and `npm run build`: passed. Existing project warnings concern absent ESLint configuration and Node module inference.
- Live Gemini generation using the configured server key returned validated bill setup and appliance tips.
- `node tests/e2e/tipid-tips.cjs`: desktop (1440px), mobile (390px), narrow mobile (320px), and dark mode passed. The harness renders real components/styles with framework adapters and controlled AI responses; it verifies disclosures, filters, save/reload, failure preservation, cancellation, offline reads, fallback, cross-tab updates, record edits, and account switches.
- Review findings corrected: registered appliance periods from 1–366 days are accepted; pending requests cannot overwrite newer cross-tab snapshots.
