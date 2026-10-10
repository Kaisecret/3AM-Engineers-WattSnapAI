import assert from "node:assert/strict";
import test from "node:test";
const { readSmtpEnv } = await import("./config.ts");
const valid = { SMTP_USER: "sender@gmail.com", SMTP_PASS: "abcd efgh ijkl mnop" };
test("Gmail defaults use TLS and accept the spaced App Password", () => {
  const settings = readSmtpEnv(valid);
  assert.equal(settings.host, "smtp.gmail.com");
  assert.equal(settings.port, 465);
  assert.equal(settings.secure, true);
  assert.equal(settings.user, valid.SMTP_USER);
  assert.equal(settings.password, "abcdefghijklmnop");
});
test("SMTP configuration fails clearly without disclosing credential values", () => {
  for (const config of [{}, { ...valid, SMTP_PORT: "25.5" }, { ...valid, SMTP_USER: "Sender <sender@gmail.com>" }, { ...valid, SMTP_PORT: "0" }]) {
    assert.throws(() => readSmtpEnv(config), error => !error.message.includes(valid.SMTP_PASS));
  }
});
