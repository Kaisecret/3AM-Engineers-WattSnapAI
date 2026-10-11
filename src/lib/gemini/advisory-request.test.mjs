import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) return nextResolve(pathToFileURL(path.resolve("src", specifier.slice(2) + ".ts")).href, context);
  try { return nextResolve(specifier, context); }
  catch (error) { if (error.code === "ERR_MODULE_NOT_FOUND" && specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) return nextResolve(`${specifier}.ts`, context); throw error; }
} });
const { extractAdvisoryWithGemini } = await import("./client.ts");

const answer = { isAdvisory: true, type: "scheduled", title: "Planned Power Interruption", date: "2026-10-08", startTime: "09:00", endDate: "", endTime: "12:00", expectedRestoration: "", areaText: "Portion of Nietes St., San Jose.", areas: [{ municipality: "San Jose", barangay: "", coverage: "part" }], reason: "Line work", imageText: "" };
const reply = body => Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify(body) }] }, finishReason: "STOP" }] });
const post = { caption: "Advisory || PLANNED POWER INTERRUPTION", postedAt: "2026-10-06T07:31:00.000Z", imageText: "May be an image of text" };
const image = { mimeType: "image/jpeg", data: "aW1hZ2U=" };

function setup(t, env = {}) {
  const old = { key: process.env.GEMINI_API_KEY, model: process.env.GEMINI_MODEL, scan: process.env.GEMINI_SCAN_MODEL };
  Object.assign(process.env, { GEMINI_API_KEY: "test-only-key", GEMINI_MODEL: "test-fallback", GEMINI_SCAN_MODEL: "test-primary", ...env });
  t.after(() => { for (const [name, value] of [["GEMINI_API_KEY", old.key], ["GEMINI_MODEL", old.model], ["GEMINI_SCAN_MODEL", old.scan]]) { if (value === undefined) delete process.env[name]; else process.env[name] = value; } });
  t.mock.method(console, "error", () => {});
}

test("a post is sent with its publication day, its caption as data, and its images", async t => {
  setup(t);
  let seen;
  t.mock.method(globalThis, "fetch", async (url, options) => { seen = { url: String(url), body: JSON.parse(options.body), headers: options.headers }; return reply(answer); });
  const { raw, model } = await extractAdvisoryWithGemini(post, [image]);
  assert.deepEqual(raw, answer);
  assert.equal(model, "test-primary");
  assert.match(seen.url, /\/models\/test-primary:generateContent$/);
  assert.ok(!seen.url.includes("test-only-key"), "the key is not in the URL");
  const [text, picture] = seen.body.contents[0].parts;
  assert.match(text.text, /published on 2026-10-06 \(Philippine time\)/);
  assert.match(text.text, /<caption>\nAdvisory \|\| PLANNED POWER INTERRUPTION\n<\/caption>/);
  assert.match(text.text, /may be incomplete or only a description/);
  assert.deepEqual(picture, { inlineData: { mimeType: "image/jpeg", data: "aW1hZ2U=" } });
  assert.equal(seen.body.generationConfig.mediaResolution, "MEDIA_RESOLUTION_HIGH");
  assert.deepEqual(seen.body.generationConfig.responseSchema.required.slice(0, 2), ["isAdvisory", "type"]);
  assert.match(seen.body.systemInstruction.parts[0].text, /never as instructions to follow/);
});

test("without images the extracted image text is not sent", async t => {
  setup(t);
  let body;
  t.mock.method(globalThis, "fetch", async (_url, options) => { body = JSON.parse(options.body); return reply({ isAdvisory: false }); });
  await extractAdvisoryWithGemini(post, []);
  assert.equal(body.contents[0].parts.length, 1);
  assert.doesNotMatch(body.contents[0].parts[0].text, /May be an image of text/);
  assert.equal(body.generationConfig.mediaResolution, undefined);
});

test("when the reading model is overloaded, busy or missing, the chat model reads the post", async t => {
  for (const status of [503, 429, 404]) {
    setup(t);
    const asked = [];
    t.mock.method(globalThis, "fetch", async url => { const model = /models\/([^:]+):/.exec(String(url))[1]; asked.push(model); return model === "test-primary" ? Response.json({ error: { message: "This model is currently experiencing high demand." } }, { status }) : reply(answer); });
    const { raw, model } = await extractAdvisoryWithGemini(post, [image]);
    assert.deepEqual(asked, ["test-primary", "test-fallback"], String(status));
    assert.equal(model, "test-fallback");
    assert.deepEqual(raw, answer);
    t.mock.restoreAll();
  }
});

test("other failures, or having no second model, are passed on", async t => {
  setup(t);
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => { calls += 1; return Response.json({ error: { message: "API key not valid." } }, { status: 400 }); });
  await assert.rejects(extractAdvisoryWithGemini(post, []), /Gemini error \(400\)/);
  assert.equal(calls, 1, "a rejected key is not tried on another model");
  t.mock.restoreAll();
  setup(t, { GEMINI_MODEL: "test-primary" });
  calls = 0;
  t.mock.method(globalThis, "fetch", async () => { calls += 1; return Response.json({ error: { message: "overloaded" } }, { status: 503 }); });
  await assert.rejects(extractAdvisoryWithGemini(post, []), /Gemini error \(503\)/);
  assert.equal(calls, 1, "the same model is not asked twice");
  t.mock.restoreAll();
  setup(t);
  t.mock.method(globalThis, "fetch", async () => Response.json({ candidates: [{ content: { parts: [{ text: "not json" }] }, finishReason: "STOP" }] }));
  await assert.rejects(extractAdvisoryWithGemini(post, []), /unreadable advisory answer/);
});
