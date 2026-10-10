import assert from "node:assert/strict";
import test from "node:test";
import { randomBytes, randomUUID } from "node:crypto";
import { registerHooks } from "node:module";
import { Webhook } from "standardwebhooks";
registerHooks({ resolve(specifier, context, nextResolve) {
  try { return nextResolve(specifier, context); }
  catch (error) {
    if (error.code === "ERR_MODULE_NOT_FOUND" && specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) return nextResolve(`${specifier}.ts`, context);
    throw error;
  }
} });
const { handleSendEmailHook } = await import("./send-email-hook.ts");
const secret = randomBytes(32).toString("base64");
const body = JSON.stringify({ user: { email: "person@example.com" }, email_data: { email_action_type: "signup", token: "123456" } });
function signed(raw = body, timestamp = new Date()) {
  const id = randomUUID();
  return new Request("https://example.com/api/auth/send-email", { method: "POST", body: raw, headers: {
    "content-type": "application/json", "webhook-id": id, "webhook-timestamp": String(Math.floor(timestamp.getTime() / 1000)),
    "webhook-signature": new Webhook(secret).sign(id, timestamp, raw),
  } });
}
function deps(send = async () => {}) { return { secret: `v1,whsec_${secret}`, send }; }

test("a genuine signed request delivers its Supabase token and returns success", async () => {
  const sent = [];
  const response = await handleSendEmailHook(signed(), deps(async mail => { sent.push(mail); }));
  assert.equal(response.status, 200);
  assert.equal(sent.length, 1);
  assert.match(sent[0].text, /123456/);
  assert.equal(response.headers.get("cache-control"), "no-store");
});
test("missing signatures, tampering, stale timestamps, and future timestamps send nothing", async () => {
  const request = signed();
  const tampered = new Request(request.url, { method: "POST", headers: request.headers, body: body.replace("123456", "999999") });
  for (const req of [new Request(request.url, { method: "POST", body }), tampered, signed(body, new Date(Date.now() - 600_000)), signed(body, new Date(Date.now() + 600_000))]) {
    let calls = 0;
    const response = await handleSendEmailHook(req, deps(async () => { calls++; }));
    assert.equal(response.status, 401);
    assert.equal(calls, 0);
  }
});
test("a signed malformed payload is rejected before sending", async () => {
  let calls = 0;
  const response = await handleSendEmailHook(signed(JSON.stringify({ user: {} })), deps(async () => { calls++; }));
  assert.equal(response.status, 400);
  assert.equal(calls, 0);
});
test("non-POST and oversized bodies are rejected without SMTP access", async () => {
  const deny = async () => { assert.fail("must not send"); };
  assert.equal((await handleSendEmailHook(new Request("https://example.com"), deps(deny))).status, 405);
  assert.equal((await handleSendEmailHook(signed("x".repeat(70_000)), deps(deny))).status, 413);
});
test("SMTP failures return a safe error with no credentials or token", async () => {
  const response = await handleSendEmailHook(signed(), deps(async () => { throw new Error("password secret SMTP failure 123456"); }));
  assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /secret|123456|password/);
});
test("an unconfigured signing secret cannot authorize a request", async () => {
  const response = await handleSendEmailHook(signed(), { secret: "", send: async () => assert.fail("must not send") });
  assert.equal(response.status, 503);
});
