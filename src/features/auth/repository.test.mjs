import assert from "node:assert/strict";
import test from "node:test";
const { ATTEMPT_RETENTION_MS, ATTEMPT_WINDOW_MS, attemptAllowed, countRecentFailures, findEmailByUsername, hashIp, recordFailure } = await import("./repository.ts");

/** A stand-in secret-key client that records every query it is asked to run. */
function fakeAdmin({ profile = null, user = null, counts = {}, error = null } = {}) {
  const log = [];
  return {
    log,
    from(table) {
      const query = { table, filters: [] };
      const chain = {
        select: (...args) => { query.select = args; return chain; },
        insert: row => { query.insert = row; return chain; },
        delete: () => { query.delete = true; return chain; },
        eq: (column, value) => { query.filters.push(["eq", column, value]); return chain; },
        gte: (column, value) => { query.filters.push(["gte", column, value]); return chain; },
        lt: (column, value) => { query.filters.push(["lt", column, value]); return chain; },
        maybeSingle: async () => { log.push(query); return { data: profile, error }; },
        then: (resolve, reject) => {
          log.push(query);
          const column = query.filters.find(filter => filter[0] === "eq")?.[1];
          return Promise.resolve(query.select ? { count: counts[column] ?? 0, error } : { error }).then(resolve, reject);
        },
      };
      return chain;
    },
    auth: { admin: { getUserById: async id => { log.push({ getUserById: id }); return { data: { user }, error: null }; } } },
  };
}
const now = new Date("2026-10-10T08:00:00.000Z");

test("the fifth failure is allowed and the sixth is refused", () => {
  assert.equal(attemptAllowed({ username: 0, ip: 0 }), true);
  assert.equal(attemptAllowed({ username: 4, ip: 0 }), true);
  assert.equal(attemptAllowed({ username: 5, ip: 0 }), false);
  assert.equal(attemptAllowed({ username: 0, ip: 19 }), true);
  assert.equal(attemptAllowed({ username: 0, ip: 20 }), false);
});

test("an address is stored only as a keyed hash", () => {
  const hash = hashIp(" 203.0.113.9 ", "secret-one");
  assert.match(hash, /^[0-9a-f]{64}$/);
  assert.equal(hash.includes("203"), false);
  assert.equal(hash, hashIp("203.0.113.9", "secret-one"));
  assert.notEqual(hash, hashIp("203.0.113.9", "secret-two"));
  assert.notEqual(hash, hashIp("203.0.113.10", "secret-one"));
});

test("a username resolves to its account email, or to nothing", async () => {
  const found = fakeAdmin({ profile: { id: "user-1" }, user: { email: "maria@gmail.com" } });
  assert.equal(await findEmailByUsername(found, "maria"), "maria@gmail.com");
  assert.deepEqual(found.log[0].filters, [["eq", "username", "maria"]]);
  assert.deepEqual(found.log[1], { getUserById: "user-1" });
  const missing = fakeAdmin();
  assert.equal(await findEmailByUsername(missing, "nobody"), null);
  assert.equal(missing.log.length, 1);
});

test("only failures inside the last 15 minutes are counted", async () => {
  const admin = fakeAdmin({ counts: { username: 3, ip_hash: 7 } });
  assert.deepEqual(await countRecentFailures(admin, { username: "maria", ipHash: "abc", now }), { username: 3, ip: 7 });
  const since = new Date(now.getTime() - ATTEMPT_WINDOW_MS).toISOString();
  assert.equal(since, "2026-10-10T07:45:00.000Z");
  assert.deepEqual(admin.log.map(query => query.filters), [
    [["eq", "username", "maria"], ["gte", "attempted_at", since]],
    [["eq", "ip_hash", "abc"], ["gte", "attempted_at", since]],
  ]);
  assert.deepEqual(admin.log[0].select, ["id", { count: "exact", head: true }]);
});

test("recording a failure also removes records older than 24 hours", async () => {
  const admin = fakeAdmin();
  await recordFailure(admin, { username: "maria", ipHash: "abc", now });
  assert.deepEqual(admin.log[0].insert, { username: "maria", ip_hash: "abc", attempted_at: "2026-10-10T08:00:00.000Z" });
  assert.equal(admin.log[1].delete, true);
  assert.deepEqual(admin.log[1].filters, [["lt", "attempted_at", new Date(now.getTime() - ATTEMPT_RETENTION_MS).toISOString()]]);
});

test("a database failure throws its code and never the raw text", async () => {
  const admin = fakeAdmin({ error: { code: "57014", message: "canceling statement for maria@gmail.com" } });
  for (const run of [() => findEmailByUsername(admin, "maria"), () => countRecentFailures(admin, { username: "maria", ipHash: "abc", now }), () => recordFailure(admin, { username: "maria", ipHash: "abc", now })]) {
    await assert.rejects(run(), error => /57014/.test(error.message) && !/maria@gmail/.test(error.message));
  }
});
