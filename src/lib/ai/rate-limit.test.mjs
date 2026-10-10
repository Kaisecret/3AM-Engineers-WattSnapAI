import assert from "node:assert/strict";
import test from "node:test";
const { createRateLimiter } = await import("./rate-limit.ts");

test("each visitor gets a few questions per window, then must wait", () => {
  const allow = createRateLimiter({ limit: 3, windowMs: 60_000 });
  assert.deepEqual([allow("a", 0), allow("a", 1), allow("a", 2), allow("a", 3)], [true, true, true, false]);
  assert.equal(allow("b", 3), true, "other visitors are unaffected");
  assert.equal(allow("a", 60_001), true, "the window slides");
});

test("memory stays bounded when many visitors arrive", () => {
  const allow = createRateLimiter({ limit: 1, windowMs: 60_000, maxKeys: 100 });
  for (let i = 0; i < 1000; i++) allow(`visitor-${i}`, i);
  assert.equal(allow("visitor-999", 1000), false);
});
