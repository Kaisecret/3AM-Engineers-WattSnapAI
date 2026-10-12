import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
registerHooks({ resolve(specifier, context, nextResolve) {
  try { return nextResolve(specifier, context); }
  catch (error) { if (error.code === "ERR_MODULE_NOT_FOUND" && specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) return nextResolve(`${specifier}.ts`, context); throw error; }
} });
const { generateTipsWithGemini } = await import("./client.ts");
const request = { household: { name: "Your home", budget: 1800 }, bills: [], appliances: [{ id: "fan", name: "Bedroom fan", type: "fan", watts: 55, hours: 8, quantity: 1 }] };
const answer = [
  { id: "first-bill", title: "Add your first bill", action: "Save a bill to compare your usage.", explanation: "You have no saved bills yet.", assumptions: [] },
  { id: "appliance-fan", title: "Switch off in empty rooms", action: "Turn off the bedroom fan when nobody is there.", explanation: "Your fan is recorded for 8 hours a day.", assumptions: ["Your saved hours are approximate."] },
];
function setup(t, value) {
  const oldKey = process.env.GEMINI_API_KEY, oldFetch = globalThis.fetch;
  process.env.GEMINI_API_KEY = "test-only-key";
  t.after(() => { globalThis.fetch = oldFetch; if (oldKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = oldKey; });
  globalThis.fetch = async (_, options) => {
    const body = JSON.parse(options.body);
    assert.equal(body.generationConfig.responseMimeType, "application/json");
    assert.equal(body.generationConfig.responseSchema.type, "ARRAY");
    assert.match(body.systemInstruction.parts[0].text, /Keep refrigerators powered/);
    assert.match(body.systemInstruction.parts[0].text, /220 characters/);
    const context = JSON.parse(body.contents[0].parts[0].text);
    assert.deepEqual(context.tips.map(tip => tip.id), ["first-bill", "appliance-fan"]); // The fan also yields an app-owned switch-off-plan, which is never sent.
    return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify(value) }] } }] });
  };
}
test("Gemini generation requests structured, concise advice for the supplied record IDs", async t => {
  setup(t, answer);
  const tips = await generateTipsWithGemini(request);
  assert.equal(tips.length, 2); assert.equal(tips[1].id, "appliance-fan");
});
test("an invalid Gemini reply is a failure rather than a successful empty refresh", async t => {
  setup(t, []);
  await assert.rejects(generateTipsWithGemini(request), /Incomplete/);
});
