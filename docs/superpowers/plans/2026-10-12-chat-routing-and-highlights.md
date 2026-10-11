# Chat routing and highlights implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task by task.

**Goal:** Send online conversations to Gemini, improve offline bill clarification, and highlight important values within chat messages.

**Architecture:** Separate current network status from the cached-document state. Route every online turn through the existing authenticated API and remove its local clarification shortcut. Keep the asynchronous TinyBERT resolver for offline/failure, with explicit source labels. Extract safe message formatting from ChatThread into a focused component.

**Tech Stack:** Next.js, React, TypeScript, Node test runner, Chromium/Playwright.

## Constraints

- Limit visual changes to the conversation, retaining the existing app layout.
- Never write records without confirmation or invent missing bill consumption.
- Preserve current ANTECO changes, secrets, and account isolation.
- Keep locally hosted TinyBERT assets available offline.

## Tasks

1. Add failing regressions in `use-chat.test.mjs` for recognized first questions, cached-shell reconnect, online edits and clear Gemini failure notices. Change `connectivity.ts` to expose `isNetworkOffline()` and use it in `use-chat.ts` and the chat status. Remove the pre-network local parser. Remove `runHouseholdAgent`'s pending shortcut and update its regression to assert a real Gemini request with history. Run `node --test src/features/assistant/use-chat.test.mjs src/lib/gemini/agent.test.mjs`.
2. Add failing cases for the screenshot's natural bill-entry wording in `local-agent.test.mjs`. Normalize explicit bill changes into the existing validated entry grammar; retain month/year, requested amount and missing-kWh state. Keep informational/hypothetical questions read-only. Add named-period comparison coverage in `saved-queries.test.mjs`. Run both local resolver suites.
3. Add rendering regressions, then create `components/ChatMessageText.tsx`. Render paragraphs, ordered/unordered lists, bold and escaped text. Highlight currency and energy values without altering their text. Update `ChatThread.tsx` and scope visual refinements in `assistant.css` to the conversation. Add a browser check for online first-message requests, offline replies, source labels, mobile overflow and both themes.
4. Run `npm test`, `npm run test:offline-ai`, `npm run build`, and browser checks. Review the final diff, commit the specific changed files, push without overwriting remote updates, and verify production readiness and live offline behavior.
