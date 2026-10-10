import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { authCookie, hasAuthCookie, isServerBounce, redirectGuardKey, signedInGateScript, signedOutPages } from "./signed-in-gate.ts";

test("finds the Supabase session cookie, including chunked ones, and nothing else", () => {
  assert.equal(hasAuthCookie("theme=dark; sb-abcd1234-auth-token=base64-eyJ"), true);
  assert.equal(hasAuthCookie("sb-abcd1234-auth-token.0=base64-eyJ; sb-abcd1234-auth-token.1=xyz"), true);
  assert.equal(hasAuthCookie("sb-abcd1234-auth-token-code-verifier=abc"), false, "the Google sign-in verifier is not a session");
  assert.equal(hasAuthCookie("other=sb-abcd1234-auth-token"), false);
  assert.equal(hasAuthCookie(""), false);
  assert.ok(authCookie instanceof RegExp);
});

test("only the login page reached by a server redirect is treated as a possible loop", () => {
  assert.equal(isServerBounce("/login", "?next=%2Fdashboard"), true);
  assert.equal(isServerBounce("/login", ""), false);
  assert.equal(isServerBounce("/", "?next=%2Fdashboard"), false);
  assert.deepEqual(signedOutPages, ["/", "/login", "/signup"]);
});

function runGate({ path = "/", search = "", cookie = "sb-ref-auth-token=x", guard = null }) {
  const classes = new Set();
  const storage = new Map(guard === null ? [] : [[redirectGuardKey, String(guard)]]);
  vm.runInNewContext(signedInGateScript, {
    location: { pathname: path, search },
    document: { cookie, documentElement: { classList: { add: name => classes.add(name), remove: name => classes.delete(name) } } },
    sessionStorage: { getItem: key => storage.get(key) ?? null },
    setTimeout: () => 0, Date,
  });
  return classes.has("ws-auth-check");
}

test("the layout script hides signed-out pages before they paint only while a session cookie exists", () => {
  assert.equal(runGate({}), true);
  assert.equal(runGate({ path: "/login" }), true);
  assert.equal(runGate({ path: "/signup" }), true);
  assert.equal(runGate({ path: "/dashboard" }), false, "app pages are untouched");
  assert.equal(runGate({ cookie: "" }), false, "signed-out visitors see the page at once");
  assert.equal(runGate({ path: "/login", search: "?error=session" }), false, "a session problem shows the form");
  assert.equal(runGate({ path: "/login", search: "?next=%2Fbills", guard: Date.now() }), false, "no loop after a server redirect");
  assert.equal(runGate({ path: "/login", search: "?next=%2Fbills", guard: Date.now() - 60_000 }), true);
  assert.equal(runGate({ path: "/", guard: Date.now() }), true, "Back to the landing page always goes into the app");
});
