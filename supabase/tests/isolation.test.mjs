// Proves, through the hosted project's real API, that one household cannot reach another's data.
// It creates two throwaway accounts and deletes them again. Run: npm run test:isolation
import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { registerHooks } from "node:module";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

registerHooks({ resolve(specifier, context, nextResolve) {
  try { return nextResolve(specifier, context); }
  catch (error) {
    if (error.code === "ERR_MODULE_NOT_FOUND" && specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) return nextResolve(`${specifier}.ts`, context);
    throw error;
  }
} });
const { readPublicSupabaseEnv, readSupabaseSecretKey } = await import("../../src/lib/config/env.ts");
const service = await import("../../src/features/auth/service.ts");
const repository = await import("../../src/features/auth/repository.ts");

let config = null;
let skip = false;
try { config = { ...readPublicSupabaseEnv(), secretKey: readSupabaseSecretKey() }; }
catch (error) { skip = `Supabase is not configured. ${error.message}`; }
// This test creates accounts and fills tables to their limits. It must never touch production,
// so it runs only when .env.local names this exact project as the test project.
const projectRef = config ? new URL(config.url).hostname.split(".")[0] : "";
if (config && process.env.WATTSNAP_TEST_PROJECT_REF !== projectRef) {
  skip = `Refusing to run against project ${projectRef}. If it is the test project, and never production, add WATTSNAP_TEST_PROJECT_REF=${projectRef} to .env.local.`;
}
const options = { skip, timeout: 240_000 };

// A reserved domain: no mail is ever delivered to it. Accounts are created already confirmed.
const DOMAIN = process.env.WATTSNAP_TEST_EMAIL_DOMAIN || "example.com";
const PREFIX = "wattsnap-isolation-";
const run = randomUUID().slice(0, 8);
const password = `Iso1-${randomUUID()}`;
const limiterName = `wattsnap-isolation-${run}`;
const connect = key => createClient(config.url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const OWNED = ["bills", "appliances", "advisories", "advisory_preparation", "brownout_plans", "tips_snapshots", "scenarios", "setup_progress"];
const CAPS = { bills: 240, appliances: 150, advisories: 200, advisory_preparation: 500, brownout_plans: 100, scenarios: 50 };
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
const JPEG = Buffer.from("/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=", "base64");
const stamp = () => new Date().toISOString();

/** A valid row for each household table. `n` keeps rows distinct where the table requires it. */
function row(table, householdId, n = 0) {
  const month = new Date(Date.UTC(2000, n, 1)).toISOString().slice(0, 10);
  return {
    bills: { household_id: householdId, id: randomUUID(), billing_month: month, kwh: 120.5, amount_centavos: 137950, source: "manual" },
    appliances: { household_id: householdId, id: randomUUID(), name: `Electric fan ${n}`, kind: "fan", watts: 55, hours_per_day: 8, quantity: 2 },
    advisories: { household_id: householdId, id: randomUUID(), revision: 1, details: { type: "scheduled", title: "Scheduled Power Interruption" }, match: { status: "affected", rationale: [] }, original_kind: "text", original_name: "Pasted advisory", original_text: `Line maintenance in Payao ${n}`, original_captured_at: stamp(), reviewed_at: stamp() },
    advisory_preparation: { household_id: householdId, advisory_id: randomUUID(), revision: 1, household_signature: "[\"anteco\",\"Payao\"]", checked: ["charge"] },
    brownout_plans: { household_id: householdId, advisory_id: randomUUID(), advisory_snapshot: { revision: 1 }, relevance_confirmed: true, source_confirmed: true, checked: ["charge", "work"] },
    tips_snapshots: { household_id: householdId, snapshot: { version: "tips-ui-v1", tips: [] }, generated_at: stamp(), input_signature: "[]" },
    scenarios: { household_id: householdId, id: randomUUID(), title: `Scenario ${n}`, payload: { days: "30", entries: [] } },
    setup_progress: { household_id: householdId, reviewed_tips: "[]" },
  }[table];
}

const world = { admin: null, anon: null, a: null, b: null };

async function emptyFolder(bucket, prefix) {
  const { data } = await world.admin.storage.from(bucket).list(prefix, { limit: 1000 });
  for (const entry of data ?? []) {
    const path = `${prefix}/${entry.name}`;
    if (entry.id === null) await emptyFolder(bucket, path);
    else await world.admin.storage.from(bucket).remove([path]);
  }
}
/** Removes every account this test has ever created, including ones left by an interrupted run. */
async function removeTestAccounts() {
  for (let page = 1; ; page += 1) {
    const { data, error } = await world.admin.auth.admin.listUsers({ page, perPage: 200 });
    assert.equal(error, null, "listing accounts needs a valid secret key");
    const mine = data.users.filter(user => user.email?.startsWith(PREFIX) && user.email.endsWith(`@${DOMAIN}`));
    for (const user of mine) {
      await emptyFolder("avatars", user.id);
      await emptyFolder("advisory-originals", user.id);
      const { error: removeError } = await world.admin.auth.admin.deleteUser(user.id);
      assert.equal(removeError, null, `could not remove test account ${user.id}`);
    }
    if (data.users.length < 200) break;
  }
  await world.admin.from("auth_login_attempts").delete().like("username", `${PREFIX}%`);
}
async function createAccount(label) {
  const email = `${PREFIX}${label}-${run}@${DOMAIN}`;
  const { data, error } = await world.admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: `Isolation ${label.toUpperCase()}` } });
  assert.equal(error, null, `creating a test account failed (${error?.code}). If the address was refused, set WATTSNAP_TEST_EMAIL_DOMAIN in .env.local to a domain you control.`);
  const client = connect(config.publishableKey);
  const signedIn = await service.signInWithEmail(client, { email, password });
  assert.deepEqual(signedIn, { ok: true, value: undefined });
  const { data: households } = await client.from("households").select("id, owner_id");
  assert.equal(households.length, 1);
  return { id: data.user.id, email, client, householdId: households[0].id };
}
const count = async (client, table, householdId) => {
  const { count: total, error } = await client.from(table).select("*", { count: "exact", head: true }).eq("household_id", householdId);
  assert.equal(error, null);
  return total;
};

if (!skip) {
  before(async () => {
    world.admin = connect(config.secretKey);
    world.anon = connect(config.publishableKey);
    await removeTestAccounts();
    world.a = await createAccount("a");
    world.b = await createAccount("b");
  }, { timeout: 120_000 });
  after(async () => { await removeTestAccounts(); }, { timeout: 120_000 });
}

test("a new account has exactly one profile and one household", options, async () => {
  const { a, admin } = world;
  const { data: profiles } = await a.client.from("profiles").select("id, full_name, username, onboarded_at");
  assert.deepEqual(profiles, [{ id: a.id, full_name: "Isolation A", username: null, onboarded_at: null }]);
  const { data: households } = await a.client.from("households").select("owner_id");
  assert.deepEqual(households, [{ owner_id: a.id }]);
  assert.equal((await a.client.from("households").insert({ owner_id: a.id })).error?.code, "42501");
  assert.equal((await admin.from("households").insert({ owner_id: a.id })).error?.code, "23505");
  const { data: providers } = await a.client.from("providers").select("id");
  assert.equal(providers.length, 7);
});

test("each account writes and reads back a row in every table", options, async () => {
  for (const account of [world.a, world.b]) {
    for (const table of OWNED) {
      const { error } = await account.client.from(table).insert(row(table, account.householdId));
      assert.equal(error, null, `${table}: ${error?.code}`);
      assert.equal(await count(account.client, table, account.householdId), 1, table);
    }
  }
});

test("account A cannot read, add to, change or remove account B's rows", options, async () => {
  const { a, b, admin } = world;
  for (const table of OWNED) {
    const read = await a.client.from(table).select("household_id").eq("household_id", b.householdId);
    assert.deepEqual(read.data, [], `${table}: read`);
    assert.equal((await a.client.from(table).insert(row(table, b.householdId, 1))).error?.code, "42501", `${table}: insert`);
    const changed = await a.client.from(table).update({ updated_at: stamp() }).eq("household_id", b.householdId).select("household_id");
    assert.deepEqual(changed.data, [], `${table}: update`);
    const removed = await a.client.from(table).delete().eq("household_id", b.householdId).select("household_id");
    assert.deepEqual(removed.data, [], `${table}: delete`);
    assert.equal((await a.client.from(table).update({ household_id: b.householdId }).eq("household_id", a.householdId)).error?.code, "42501", `${table}: move a row`);
    assert.equal(await count(admin, table, b.householdId), 1, `${table}: B's row survives`);
    assert.equal(await count(admin, table, a.householdId), 1, `${table}: A's row stays`);
  }
  assert.deepEqual((await a.client.from("profiles").select("id").eq("id", b.id)).data, []);
  assert.deepEqual((await a.client.from("households").select("id").eq("id", b.householdId)).data, []);
  assert.deepEqual((await a.client.from("profiles").update({ full_name: "Hacked" }).eq("id", b.id).select("id")).data, []);
  assert.deepEqual((await a.client.from("households").update({ name: "Hacked" }).eq("id", b.householdId).select("id")).data, []);
  assert.equal((await a.client.from("households").update({ owner_id: b.id }).eq("id", a.householdId)).error?.code, "42501");
  assert.equal((await a.client.from("profiles").delete().eq("id", a.id)).error?.code, "42501");
});

test("a client with no session reads nothing, and login attempts are closed to accounts", options, async () => {
  const { a, anon } = world;
  for (const table of ["providers", "profiles", "households", ...OWNED, "auth_login_attempts"]) {
    const { data, error } = await anon.from(table).select("*").limit(1);
    assert.ok(error || data.length === 0, `anon: ${table}`);
  }
  assert.ok((await anon.storage.from("avatars").download(`${a.id}/avatar.jpg`)).error);
  const read = await a.client.from("auth_login_attempts").select("id").limit(1);
  assert.ok(read.error || read.data.length === 0);
  assert.ok((await a.client.from("auth_login_attempts").insert({ username: limiterName, ip_hash: "a".repeat(64) })).error);
});

test("out-of-range values are refused", options, async () => {
  const { a } = world;
  const h = a.householdId;
  const bad = [
    ["money", "bills", { ...row("bills", h, 2), amount_centavos: 0 }],
    ["kWh", "bills", { ...row("bills", h, 2), kwh: 0 }],
    ["month", "bills", { ...row("bills", h, 2), billing_month: "2030-01-15" }],
    ["dates", "bills", { ...row("bills", h, 2), billing_date: "2030-01-20", due_date: "2030-01-10" }],
    ["period", "bills", { ...row("bills", h, 2), period_start: "2030-01-01" }],
    ["sample", "bills", { ...row("bills", h, 2), source: "sample" }],
    ["hours", "appliances", { ...row("appliances", h, 2), hours_per_day: 25 }],
    ["quantity", "appliances", { ...row("appliances", h, 2), quantity: 51 }],
    ["kind", "appliances", { ...row("appliances", h, 2), kind: "toaster" }],
    ["checklist", "advisory_preparation", { ...row("advisory_preparation", h), checked: ["charge", "charge"] }],
    ["plan checklist", "brownout_plans", { ...row("brownout_plans", h), checked: ["water"] }],
    ["plan source", "brownout_plans", { ...row("brownout_plans", h), source_confirmed: false }],
    ["advisory type", "advisories", { ...row("advisories", h, 2), details: { type: "party" } }],
    ["document size", "advisories", { ...row("advisories", h, 2), details: { type: "notice", reason: "r".repeat(33000) } }],
    ["title", "scenarios", { ...row("scenarios", h, 2), title: "t".repeat(61) }],
  ];
  for (const [label, table, value] of bad) assert.ok((await a.client.from(table).insert(value)).error, label);
  assert.ok((await a.client.from("households").update({ monthly_budget_centavos: 0 }).eq("id", h)).error, "budget zero");
  assert.ok((await a.client.from("households").update({ monthly_budget_centavos: 10000001 }).eq("id", h)).error, "budget over the cap");
  assert.ok((await a.client.from("households").update({ provider_id: "anteco", provider_custom_name: "Other Coop" }).eq("id", h)).error, "two providers");
  assert.equal((await a.client.from("households").update({ monthly_budget_centavos: 160000, provider_id: "anteco", province: "Antique", municipality: "San Jose de Buenavista", barangay: "Payao" }).eq("id", h)).error, null);
  assert.ok((await a.client.from("profiles").update({ username: "AB" }).eq("id", a.id)).error, "short username");
});

test("files are private to their owner and restricted to the accepted paths", options, async () => {
  const { a, b, admin } = world;
  const advisory = randomUUID();
  const avatar = `${a.id}/avatar.jpg`;
  const original = `${a.id}/${advisory}/r1.png`;
  const jpeg = { contentType: "image/jpeg" };
  const png = { contentType: "image/png" };

  assert.equal((await a.client.storage.from("avatars").upload(avatar, JPEG, jpeg)).error, null);
  assert.equal((await a.client.storage.from("advisory-originals").upload(original, PNG, png)).error, null);
  assert.equal((await a.client.storage.from("avatars").download(avatar)).error, null);

  assert.ok((await a.client.storage.from("avatars").upload(`${a.id}/other.jpg`, JPEG, jpeg)).error, "another avatar name");
  assert.ok((await a.client.storage.from("avatars").upload(`${a.id}/avatar.png`, PNG, png)).error, "an avatar that is not a JPEG");
  assert.ok((await a.client.storage.from("advisory-originals").upload(`${a.id}/notes.txt`, Buffer.from("hello"), { contentType: "text/plain" })).error, "a text file");
  assert.ok((await a.client.storage.from("advisory-originals").upload(`${a.id}/${advisory}/photo.png`, PNG, png)).error, "a free file name");

  assert.ok((await b.client.storage.from("avatars").download(avatar)).error, "B downloads A's avatar");
  assert.ok((await b.client.storage.from("advisory-originals").download(original)).error, "B downloads A's original");
  assert.ok((await b.client.storage.from("avatars").upload(avatar, JPEG, { ...jpeg, upsert: true })).error, "B overwrites A's avatar");
  assert.ok((await b.client.storage.from("advisory-originals").upload(`${a.id}/${advisory}/r2.png`, PNG, png)).error, "B writes into A's folder");
  await b.client.storage.from("avatars").remove([avatar]);
  await b.client.storage.from("advisory-originals").remove([original]);
  assert.equal((await admin.storage.from("avatars").download(avatar)).error, null, "A's avatar survives");
  assert.equal((await admin.storage.from("advisory-originals").download(original)).error, null, "A's original survives");
  assert.ok((await b.client.storage.from("avatars").createSignedUrl(avatar, 60)).error, "B signs a link to A's avatar");

  // 59 more files reach the limit of 60; the next one is refused.
  for (let start = 2; start <= 60; start += 10) {
    const batch = Array.from({ length: Math.min(10, 61 - start) }, (_, index) => start + index);
    const results = await Promise.all(batch.map(revision => a.client.storage.from("advisory-originals").upload(`${a.id}/${advisory}/r${revision}.png`, PNG, png)));
    for (const [index, result] of results.entries()) assert.equal(result.error, null, `file r${batch[index]}`);
  }
  assert.ok((await a.client.storage.from("advisory-originals").upload(`${a.id}/${advisory}/r61.png`, PNG, png)).error, "the 61st file");
});

test("the auth services work against the real project", options, async () => {
  const { a, b } = world;
  const account = await service.getAccount(a.client);
  assert.equal(account.ok, true);
  assert.equal(account.value.id, a.id);
  assert.equal(account.value.email, a.email);
  assert.equal(account.value.profile.fullName, "Isolation A");
  assert.equal(account.value.profile.onboardedAt, null);

  const username = `iso_${run}`;
  assert.deepEqual(await service.completeProfile(a.client, { fullName: "Isolation A", username }), { ok: true, value: undefined });
  const completed = await service.getAccount(a.client);
  assert.equal(completed.value.profile.username, username);
  assert.ok(Number.isFinite(Date.parse(completed.value.profile.onboardedAt)));
  assert.deepEqual(await service.completeProfile(b.client, { fullName: "Isolation B", username }), { ok: false, kind: "conflict", message: "That username is taken." });

  const wrong = await service.signInWithEmail(connect(config.publishableKey), { email: a.email, password: `${password}-wrong` });
  assert.deepEqual(wrong, { ok: false, kind: "authentication", message: "Incorrect email, username, or password." });
  const unknown = await service.signInWithEmail(connect(config.publishableKey), { email: `${PREFIX}nobody-${run}@${DOMAIN}`, password });
  assert.deepEqual(unknown, wrong);

  const second = connect(config.publishableKey);
  assert.equal((await service.signInWithEmail(second, { email: a.email, password })).ok, true);
  assert.deepEqual(await service.signOut(second), { ok: true, value: undefined });
  assert.deepEqual(await service.getAccount(second), { ok: true, value: null });
  assert.equal((await service.getAccount(a.client)).value.id, a.id, "the first session is still signed in");

  assert.equal(await repository.findEmailByUsername(world.admin, username), a.email);
  assert.equal(await repository.findEmailByUsername(world.admin, `nobody_${run}`), null);
});

test("the limiter allows five failed attempts and refuses the sixth", options, async () => {
  const { admin } = world;
  const ipHash = repository.hashIp("203.0.113.9", config.secretKey);
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const counts = await repository.countRecentFailures(admin, { username: limiterName, ipHash });
    assert.equal(counts.username, attempt - 1);
    assert.equal(repository.attemptAllowed(counts), true, `attempt ${attempt}`);
    await repository.recordFailure(admin, { username: limiterName, ipHash });
  }
  const counts = await repository.countRecentFailures(admin, { username: limiterName, ipHash });
  assert.equal(counts.username, 5);
  assert.equal(repository.attemptAllowed(counts), false);
});

test("each capped table accepts its cap and refuses the next row", options, async () => {
  const { a } = world;
  for (const [table, cap] of Object.entries(CAPS)) {
    assert.equal((await a.client.from(table).delete().eq("household_id", a.householdId)).error, null, `${table}: clear`);
    const rows = Array.from({ length: cap }, (_, index) => row(table, a.householdId, index + 10));
    const filled = await a.client.from(table).insert(rows);
    assert.equal(filled.error, null, `${table}: ${cap} rows (${filled.error?.code})`);
    const over = await a.client.from(table).insert(row(table, a.householdId, cap + 10));
    assert.equal(over.error?.code, "P0001", `${table}: row ${cap + 1}`);
    assert.match(over.error.message, /household row limit reached/);
    assert.equal(await count(a.client, table, a.householdId), cap, `${table}: still at the cap`);
  }
});
