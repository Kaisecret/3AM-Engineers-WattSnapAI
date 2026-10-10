import assert from "node:assert/strict";
import test from "node:test";
const { readPublicSupabaseEnv, readSupabaseSecretKey } = await import("./env.ts");

const url = "https://abcdefgh.supabase.co";
const publishableKey = "sb_publishable_example";
const jwt = role => `header.${Buffer.from(JSON.stringify({ role })).toString("base64url")}.signature`;

test("public settings are returned trimmed", () => {
  assert.deepEqual(readPublicSupabaseEnv({ url: ` ${url} `, publishableKey: ` ${publishableKey} ` }), { url, publishableKey });
});

test("every missing variable is named", () => {
  assert.throws(() => readPublicSupabaseEnv({}), /NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  assert.throws(() => readPublicSupabaseEnv({ url }), error => /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/.test(error.message) && !/NEXT_PUBLIC_SUPABASE_URL/.test(error.message));
  assert.throws(() => readPublicSupabaseEnv({ url: "   ", publishableKey }), /NEXT_PUBLIC_SUPABASE_URL/);
});

test("the project URL must be https, except on this machine", () => {
  assert.throws(() => readPublicSupabaseEnv({ url: "http://abcdefgh.supabase.co", publishableKey }), /https/);
  assert.throws(() => readPublicSupabaseEnv({ url: "abcdefgh.supabase.co", publishableKey }), /https/);
  assert.equal(readPublicSupabaseEnv({ url: "http://localhost:54321", publishableKey }).url, "http://localhost:54321");
});

test("a secret key is refused under the public name", () => {
  assert.throws(() => readPublicSupabaseEnv({ url, publishableKey: "sb_secret_example" }), /secret key/);
  assert.throws(() => readPublicSupabaseEnv({ url, publishableKey: jwt("service_role") }), /secret key/);
  assert.equal(readPublicSupabaseEnv({ url, publishableKey: jwt("anon") }).publishableKey, jwt("anon"));
});

test("the secret key is named when missing and returned when present", () => {
  assert.throws(() => readSupabaseSecretKey(""), /SUPABASE_SECRET_KEY/);
  assert.throws(() => readSupabaseSecretKey("   "), /SUPABASE_SECRET_KEY/);
  assert.equal(readSupabaseSecretKey(" sb_secret_example "), "sb_secret_example");
});
