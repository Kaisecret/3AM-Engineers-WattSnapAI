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
const { authEmails } = await import("./auth-email.ts");
const payload = (action = "signup") => ({ user: { email: "person@example.com" }, email_data: { email_action_type: action, token: "123456", token_hash: "hash" } });

test("signup and recovery keep the exact Supabase code and provide both email formats", () => {
  for (const action of ["signup", "recovery"]) {
    const [mail] = authEmails(payload(action));
    assert.equal(mail.to, "person@example.com");
    assert.match(mail.text, /123456/);
    assert.match(mail.html, /123456/);
    assert.match(mail.subject, action === "signup" ? /verify/i : /reset/i);
    assert.doesNotMatch(mail.text, /hash/);
  }
});
test("secure email change sends each code to the address it confirms", () => {
  const data = payload("email_change");
  data.user.new_email = "new@example.com";
  Object.assign(data.email_data, { token_new: "987654", token_hash_new: "second-hash" });
  const mails = authEmails(data, { siteUrl: "https://www.wattsnapai.dev" });
  assert.equal(mails.length, 2);
  assert.equal(mails[0].to, "person@example.com");
  assert.match(mails[0].text, /123456/);
  assert.match(mails[0].text, /token_hash=second-hash/);
  assert.doesNotMatch(mails[0].text, /token_hash=hash(?:&|\n)/);
  assert.equal(mails[1].to, "new@example.com");
  assert.match(mails[1].text, /987654/);
  assert.match(mails[1].text, /token_hash=hash/);
  assert.doesNotMatch(mails[1].text, /second-hash/);
});
test("single-code email change goes only to the new email", () => {
  const data = payload("email_change");
  data.user.new_email = "new@example.com";
  const mails = authEmails(data);
  assert.equal(mails.length, 1);
  assert.equal(mails[0].to, "new@example.com");
});
test("invalid recipients, action types, or tokens cannot produce mail", () => {
  for (const data of [null, {}, payload("arbitrary"), { ...payload(), user: { email: "a@example.com\r\nBcc: b@example.com" } }, { ...payload(), email_data: { email_action_type: "signup", token: "<script>" } }]) {
    assert.throws(() => authEmails(data));
  }
});
test("magic-link and invite actions provide a confirmation link built from trusted configuration", () => {
  const data = payload("magiclink");
  data.email_data.redirect_to = "https://attacker.example";
  const [mail] = authEmails(data, { supabaseUrl: "https://project.supabase.co", siteUrl: "https://www.wattsnapai.dev" });
  assert.match(mail.text, /https:\/\/www.wattsnapai.dev\/auth\/confirm/);
  assert.match(mail.text, /token_hash=hash/);
  assert.doesNotMatch(mail.text, /attacker/);
});
