import assert from "node:assert/strict";
import test from "node:test";
const { normalizeEmail, parseIdentifier, passwordRules, safeNextPath, validateCode, validateEmail, validateFullName, validatePassword, validateUsername } = await import("./schemas.ts");

test("email is trimmed, lower-cased and checked", () => {
  assert.equal(normalizeEmail("  Maria@Gmail.com "), "maria@gmail.com");
  assert.equal(validateEmail(" Maria@Gmail.com "), null);
  for (const bad of ["", "maria", "maria@", "@gmail.com", "maria@gmail", "ma ria@gmail.com", `${"a".repeat(250)}@x.co`]) assert.equal(validateEmail(bad), "Please enter a valid email address.", bad);
});

test("password rules use the reset screen's wording", () => {
  assert.deepEqual(passwordRules("abc12345x").map(rule => rule.label), ["Be at least 8 characters long", "Include a letter and a number", "Not be commonly used"]);
  assert.equal(validatePassword("abc12345x"), null);
  assert.equal(validatePassword("abc1"), "Password must be at least 8 characters long.");
  assert.equal(validatePassword("abcdefghij"), "Password must include a letter and a number.");
  assert.equal(validatePassword("1234567890"), "Password must include a letter and a number.");
  assert.equal(validatePassword("Password123"), "Password must not be commonly used.");
  assert.equal(validatePassword(`a1${"x".repeat(71)}`), "Use a password of 72 characters or fewer.");
});

test("full name is required and at most 50 characters", () => {
  assert.equal(validateFullName(" Maria Santos "), null);
  assert.equal(validateFullName("   "), "Please enter your full name.");
  assert.equal(validateFullName("a".repeat(51)), "Use 50 characters or fewer for your name.");
});

test("usernames use 3 to 30 lowercase letters, numbers, dots or underscores", () => {
  for (const good of ["maria", "maria.santos_01", " Maria ", "abc", "a".repeat(30)]) assert.equal(validateUsername(good), null, good);
  for (const bad of ["", "ab", "a".repeat(31), "maria santos", "maria@home", "maría", "maria-santos"]) assert.equal(validateUsername(bad), "Usernames use 3 to 30 lowercase letters, numbers, dots or underscores.", bad);
});

test("a code is exactly six digits", () => {
  assert.equal(validateCode(" 123456 "), null);
  for (const bad of ["", "12345", "1234567", "12a456"]) assert.equal(validateCode(bad), "Enter the 6-digit code from your email.", bad);
});

test("an identifier with @ is an email; anything else is a username", () => {
  assert.deepEqual(parseIdentifier("  Maria@Gmail.com "), { kind: "email", email: "maria@gmail.com" });
  assert.deepEqual(parseIdentifier(" Maria.Santos "), { kind: "username", username: "maria.santos" });
  for (const bad of ["", "   ", "maria@", "ab", "maria santos"]) assert.equal(parseIdentifier(bad), null, bad);
});

test("only same-site paths may follow a sign-in", () => {
  assert.equal(safeNextPath("/bills"), "/bills");
  assert.equal(safeNextPath("/bills/new?from=setup"), "/bills/new?from=setup");
  for (const bad of ["", null, undefined, "bills", "//evil.example", "https://evil.example", "/\\evil.example", "/bills\nSet-Cookie: x"]) assert.equal(safeNextPath(bad), "/dashboard", String(bad));
  assert.equal(safeNextPath("//evil.example", "/setup"), "/setup");
});
