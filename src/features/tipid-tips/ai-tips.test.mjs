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
const { appOwnedTipIds, figuresSupported, rewritableTips } = await import("../../lib/gemini/tips-reading.ts");
const household = { name: "Private name", email: "private@example.com", photo: "private-photo", budget: 1800,
  appliances: [{ id: "fan", name: "Bedroom fan", kind: "fan", watts: 55, hours: 8, quantity: 1, source: "manual", wattageBasis: "nameplate" }],
  bills: [{ id: "sep", month: "2026-09", amount: 1200, kwh: 100, periodStart: "2026-09-01", periodEnd: "2026-09-30", source: "manual" }] };
const basis = generatePreviewTips(household);
const copyFor = snapshot => rewritableTips(snapshot).map(tip => ({ id: tip.id, title: "A small change", action: "Switch off the fan when the room is empty.", explanation: "Based on your saved usage.", assumptions: ["Usage hours are estimates."] }));
const reply = copyFor(basis);

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
// A fully covered bill is paid ₱0 and so is on track: budget-gap and subsidy-covered need separate households.
const fan = household.appliances[0], fridge = { id: "fridge", name: "Kitchen refrigerator", kind: "fridge", watts: 100, hours: 16, quantity: 1, source: "manual" };
const overBudget = { ...household, appliances: [fan, fridge], bills: [{ ...household.bills[0], amount: 2500, kwh: 200, subsidy: 500 }] };
const covered = { ...household, appliances: [fan, fridge], bills: [{ ...household.bills[0], amount: 400, kwh: 32, subsidy: 400 }] };
for (const [name, home, expected] of [["over budget", overBudget, ["budget-gap", "switch-off-plan"]], ["covered by subsidy", covered, ["subsidy-covered", "switch-off-plan"]]]) test(`app-owned tips stay out of Gemini and are never rewritten (${name})`, () => {
  const local = generatePreviewTips(home), owned = local.tips.filter(tip => appOwnedTipIds.has(tip.id));
  assert.deepEqual(owned.map(tip => tip.id), expected);
  const request = createTipsRequest(home);
  assert.doesNotMatch(JSON.stringify(request), /subsidy/);
  assert.deepEqual(rewritableTips(generatePreviewTips(tipsRequestHousehold(request))).map(tip => tip.id), rewritableTips(local).map(tip => tip.id), "The server expects the same rewritable tips without the subsidy");
  const next = mergeGeminiTips(local, copyFor(local));
  assert.deepEqual(next.tips.filter(tip => appOwnedTipIds.has(tip.id)), owned);
  assert.ok(rewritableTips(next).every(tip => tip.title === "A small change"));
  assert.deepEqual(normalizeTipsSnapshot(next), next);
  const unsafe = { id: "switch-off-plan", title: "Switch off your refrigerator", action: "Switch off your refrigerator an hour earlier each day.", explanation: "It runs all day.", assumptions: [] };
  assert.throws(() => mergeGeminiTips(local, [...copyFor(local), unsafe]));
  assert.throws(() => mergeGeminiTips(local, [...copyFor(local).slice(1), unsafe]));
});
test("AI copy keeps a figure only when the app supplied it in the same unit", () => {
  const aircon = { id: "ac", name: "Sala aircon", kind: "aircon", watts: 900, hours: 6, quantity: 1, source: "manual" };
  const say = (snapshot, action) => mergeGeminiTips(snapshot, copyFor(snapshot).map(tip => tip.id === "appliance-ac" ? { ...tip, action } : tip)).tips.find(tip => tip.id === "appliance-ac");
  const noBills = generatePreviewTips({ ...household, bills: [], appliances: [aircon] }), appCopy = noBills.tips.find(tip => tip.id === "appliance-ac");
  assert.deepEqual(say(noBills, "Close the door and save ₱162.00 a month."), appCopy, "162.00 is a kWh estimate; no peso basis exists");
  assert.equal(say(noBills, "Your aircon uses about 162 kWh in 30 days.").title, "A small change");
  const billed = generatePreviewTips({ ...household, budget: 0, appliances: [aircon] }), billedCopy = billed.tips.find(tip => tip.id === "appliance-ac");
  assert.equal(say(billed, "This aircon costs about ₱1,944 in 30 days at ₱12.00 per kWh.").title, "A small change");
  for (const action of ["Save about ₱1,900 a month.", "Save 1,944 kWh a month.", "Cut your bill by 12%.", "Save 500 pesos monthly.", "Save PHP 300 monthly."]) assert.deepEqual(say(billed, action), billedCopy, action);
  assert.equal(figuresSupported({ title: "Close the door", action: "Cool only occupied rooms.", explanation: "It runs 6 hours a day.", assumptions: [] }, billedCopy), true);
});
test("leading decimals, glued numbers, and P-prefixed amounts cannot slip past the figure check", () => {
  const aircon = { id: "ac", name: "Sala aircon", kind: "aircon", watts: 900, hours: 6, quantity: 1, source: "manual" };
  const noBills = generatePreviewTips({ ...household, bills: [], appliances: [aircon] }), appCopy = noBills.tips.find(tip => tip.id === "appliance-ac");
  const say = action => mergeGeminiTips(noBills, copyFor(noBills).map(tip => tip.id === "appliance-ac" ? { ...tip, action } : tip)).tips.find(tip => tip.id === "appliance-ac");
  for (const action of ["Save ₱.50 per day.", "It uses only .162 kWh.", "Save P50 a week.", "Save ₱1.2.3 daily.", "Use 5.162 kWh less."]) assert.deepEqual(say(action), appCopy, action);
  assert.equal(say("It uses about 162.00 kWh in 30 days.").title, "A small change");
  const subsidised = { ...household, appliances: [aircon], bills: [{ ...household.bills[0], subsidy: 500 }] };
  const local = generatePreviewTips(subsidised), merged = mergeGeminiTips(local, copyFor(local));
  assert.match(merged.tips.find(tip => tip.id === "appliance-ac").assumptions.join(" "), /Savings lower what you pay only while the bill is above the subsidy/, "The app's subsidy note survives AI rewriting");
});
test("both ends of a range must be figures the app supplied", () => {
  const aircon = { id: "ac", name: "Sala aircon", kind: "aircon", watts: 900, hours: 6, quantity: 1, source: "manual" };
  const billed = generatePreviewTips({ ...household, budget: 0, appliances: [aircon] }), appCopy = billed.tips.find(tip => tip.id === "appliance-ac");
  const say = action => mergeGeminiTips(billed, copyFor(billed).map(tip => tip.id === "appliance-ac" ? { ...tip, action } : tip)).tips.find(tip => tip.id === "appliance-ac");
  for (const action of ["Save 100–162 kWh each month.", "Save ₱12–500 monthly.", "Save ₱12 to ₱500 monthly.", "Save between 100 and 162 kWh.", "Cut 5-10% of your bill.", "Save 12 or 500 pesos."]) assert.deepEqual(say(action), appCopy, action);
  assert.equal(say("About 162 kWh, or ₱1,944 at ₱12.00 per kWh.").title, "A small change");
});
