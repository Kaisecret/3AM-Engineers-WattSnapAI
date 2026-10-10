import assert from "node:assert/strict";
import test from "node:test";
import net from "node:net";
import { registerHooks } from "node:module";
registerHooks({ resolve(specifier, context, nextResolve) {
  try { return nextResolve(specifier, context); }
  catch (error) {
    if (error.code === "ERR_MODULE_NOT_FOUND" && specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) return nextResolve(`${specifier}.ts`, context);
    throw error;
  }
} });
const { sendAuthEmail } = await import("./smtp.ts");
test("the total send deadline closes the real SMTP socket even if the server never greets", async () => {
  let socket;
  let closed = false;
  const server = net.createServer(client => { socket = client; client.on("close", () => { closed = true; }); });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const config = { SMTP_HOST: "127.0.0.1", SMTP_PORT: String(server.address().port), SMTP_USER: "sender@example.com", SMTP_PASS: "test-password" };
  try {
    await assert.rejects(sendAuthEmail({ to: "person@example.com", subject: "test", text: "test", html: "test" }, config, 100), /timed out/i);
    assert.ok(socket, "sender opened a real SMTP socket");
    for (let attempt = 0; attempt < 10 && !closed; attempt++) await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(closed, true, "deadline must destroy the SMTP socket");
  } finally { socket?.destroy(); await new Promise(resolve => server.close(resolve)); }
});
