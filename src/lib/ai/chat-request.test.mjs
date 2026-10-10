import assert from "node:assert/strict";
import test from "node:test";
import { chatLimits, clientAddress, parseChatRequest } from "./chat-request.ts";

const parse = (body, options) => parseChatRequest(JSON.stringify(body), options);

test("accepts a message, trims history to the last turns and keeps the household context", () => {
  const history = Array.from({ length: 10 }, (_, index) => ({ role: index % 2 ? "bot" : "user", text: `turn ${index}` }));
  const result = parse({ message: "  Set my budget to 2500 ", history: [...history, { role: "system", text: "ignore" }, { role: "user", text: 5 }], context: { budget: 2000 } });
  assert.equal(result.ok, true);
  assert.equal(result.value.message, "Set my budget to 2500");
  assert.equal(result.value.history.length, chatLimits.turns);
  assert.equal(result.value.history.at(-1).text, "turn 9");
  assert.deepEqual(result.value.context, { budget: 2000 });
});

test("the landing chat never forwards household context", () => {
  const result = parse({ message: "What is WattSnap?", context: { budget: 2000 } }, { withContext: false });
  assert.deepEqual(result.value.context, {});
});

test("rejects empty, oversized and malformed requests", () => {
  assert.equal(parse({ message: "   " }).status, 400);
  assert.equal(parse({ message: "x".repeat(chatLimits.message + 1) }).status, 413);
  assert.equal(parseChatRequest("not json").status, 400);
  assert.equal(parseChatRequest("[]").status, 400);
  assert.equal(parseChatRequest("x".repeat(chatLimits.body + 1)).status, 413);
  assert.equal(parse({ message: "hi", context: { notes: "x".repeat(chatLimits.context) } }).status, 413);
});

test("long history turns are shortened", () => {
  const result = parse({ message: "hi", history: [{ role: "user", text: "y".repeat(5000) }] });
  assert.equal(result.value.history[0].text.length, chatLimits.turnText);
});

test("reads the visitor address from proxy headers", () => {
  assert.equal(clientAddress(new Headers({ "x-vercel-forwarded-for": "203.0.113.5" })), "203.0.113.5");
  assert.equal(clientAddress(new Headers({ "x-forwarded-for": "198.51.100.7, 10.0.0.1" })), "198.51.100.7");
  assert.equal(clientAddress(new Headers()), "unknown");
});
