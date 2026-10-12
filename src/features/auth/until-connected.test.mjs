import assert from "node:assert/strict";
import test from "node:test";
import { untilConnected } from "./until-connected.ts";

const success = { ok: true, value: undefined };
const noSignal = { ok: false, kind: "network", message: "You're offline." };
const wrongPassword = { ok: false, kind: "authentication", message: "Incorrect email, username, or password." };
const options = (extra = {}) => ({ wait: async () => {}, cancelled: () => false, onWaiting() {}, ...extra });

test("a step that fails for lack of signal runs again until it answers", async () => {
  const answers = [noSignal, noSignal, success], waits = [];
  let runs = 0, notices = 0;
  const result = await untilConnected(async () => answers[runs++], options({ wait: async attempt => { waits.push(attempt); }, onWaiting: () => notices++ }));
  assert.deepEqual(result, success);
  assert.equal(runs, 3);
  assert.deepEqual(waits, [0, 1], "each pause is told how many attempts came before it");
  assert.equal(notices, 2);
});

test("a wrong password is returned at once and never retried", async () => {
  let runs = 0, notices = 0;
  const result = await untilConnected(async () => { runs++; return wrongPassword; }, options({ onWaiting: () => notices++ }));
  assert.deepEqual(result, wrongPassword);
  assert.equal(runs, 1);
  assert.equal(notices, 0);
});

test("cancelling while waiting for signal stops the retries", async () => {
  let runs = 0, cancelled = false;
  const result = await untilConnected(async () => { runs++; return noSignal; }, options({ wait: async () => { cancelled = true; }, cancelled: () => cancelled }));
  assert.equal(result, null);
  assert.equal(runs, 1);
});

test("an answer that arrives after cancelling is dropped", async () => {
  let cancelled = false;
  const result = await untilConnected(async () => { cancelled = true; return success; }, options({ cancelled: () => cancelled }));
  assert.equal(result, null);
});
