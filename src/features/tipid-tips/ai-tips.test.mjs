import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
registerHooks({ resolve(specifier, context, nextResolve) {
  try { return nextResolve(specifier, context); }
  catch (error) {
    if (error.code === "ERR_MODULE_NOT_FOUND" && specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) return nextResolve(`${specifier}.ts`, context);
    throw error;
  }
} });
const { createTipsRequest, mergeGeminiTips, requestGeminiTips } = await import("./ai-tips.ts");
const { readTipsRequest, tipsRequestHousehold } = await import("../../lib/ai/tips-request.ts");
const { generatePreviewTips, normalizeTipsSnapshot } = await import("./preview-tips.ts");
const household = { name: "Private name", email: "private@example.com", photo: "private-photo", budget: 1800,
  appliances: [{ id: "fan", name: "Bedroom fan", kind: "fan", watts: 55, hours: 8, quantity: 1, source: "manual", wattageBasis: "nameplate" }],
  bills: [{ id: "sep", month: "2026-09", amount: 1200, kwh: 100, periodStart: "2026-09-01", periodEnd: "2026-09-30", source: "manual" }] };
const basis = generatePreviewTips(household);
const reply = basis.tips.map(tip => ({ id: tip.id, title: "A small change", action: "Switch off the fan when the room is empty.", explanation: "Based on your saved usage.", assumptions: ["Usage hours are estimates."] }));

test("AI requests preserve reviewed inputs and billing dates without private profile fields", () => {
  const request = createTipsRequest(household);
  assert.doesNotMatch(JSON.stringify(request), /Private name|private@example|private-photo/);
  assert.equal(request.bills[0].periodStart, household.bills[0].periodStart);
  assert.equal(request.appliances[0].id, "fan");
  assert.deepEqual(readTipsRequest(request), request);
  assert.deepEqual(generatePreviewTips(tipsRequestHousehold(request)).tips, basis.tips);
});
test("malformed, oversized, duplicate, and nonfinite inputs cannot reach Gemini", () => {
  const good = createTipsRequest(household);
  for (const value of [null, {}, { ...good, appliances: {} }, { ...good, bills: [null] }, { ...good, appliances: [{ ...good.appliances[0], hours: 25 }] }, { ...good, appliances: [{ ...good.appliances[0], watts: Infinity }] }, { ...good, appliances: [good.appliances[0], good.appliances[0]] }, { ...good, bills: [{ ...good.bills[0], periodEnd: "not-a-date" }] }]) assert.equal(readTipsRequest(value), null);
});
test("AI accepts the same usage-day range as appliance registration", () => {
  const good = createTipsRequest(household);
  for (const days of [1, 60, 366]) assert.equal(readTipsRequest({ ...good, appliances: [{ ...good.appliances[0], days }] }).appliances[0].days, days);
  for (const days of [0, 1.5, 367]) assert.equal(readTipsRequest({ ...good, appliances: [{ ...good.appliances[0], days }] }), null);
});
test("Gemini can rewrite concise copy but cannot change facts, navigation, or record attribution", () => {
  const next = mergeGeminiTips(basis, [...reply].reverse());
  assert.equal(next.source, "gemini");
  assert.equal(next.inputSignature, basis.inputSignature);
  assert.deepEqual(next.context, basis.context);
  assert.deepEqual(next.tips.map(t => t.facts), basis.tips.map(t => t.facts));
  assert.deepEqual(next.tips.map(t => t.link), basis.tips.map(t => t.link));
  assert.equal(next.tips[0].title, "A small change");
  assert.deepEqual(normalizeTipsSnapshot(next), next);
  assert.deepEqual(normalizeTipsSnapshot(basis), basis, "Old snapshots remain readable");
});
test("unknown IDs, missing tips, blank copy, duplicates, and long output are rejected", () => {
  for (const value of [[], {}, [null], reply.slice(1), [reply[0], reply[0]], reply.map(t => ({ ...t, id: "invented" })), reply.map(t => ({ ...t, action: " " })), reply.map(t => ({ ...t, action: "x".repeat(221) }))]) assert.throws(() => mergeGeminiTips(basis, value));
});
test("generation sends the real request and validates the result before saving", async () => {
  let sent;
  const next = await requestGeminiTips(household, basis, undefined, async (url, options) => {
    assert.equal(url, "/api/ai/tips"); sent = JSON.parse(options.body);
    return Response.json({ ok: true, data: reply });
  });
  assert.deepEqual(sent, createTipsRequest(household));
  assert.equal(next.source, "gemini");
});
test("failed or malformed generation leaves the caller's saved snapshot intact", async () => {
  const before = structuredClone(basis);
  for (const response of [Response.json({ error: "Try again" }, { status: 429 }), Response.json({ ok: true, data: [] })]) await assert.rejects(requestGeminiTips(household, basis, undefined, async () => response));
  assert.deepEqual(basis, before);
});
