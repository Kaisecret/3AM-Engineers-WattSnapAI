import assert from "node:assert/strict";
import test, { before } from "node:test";
import { readdir, readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

// The parts of the Supabase platform the migration relies on, reduced to what it touches.
// Like a classic Supabase project, new public tables are granted to every API role by default,
// so the migration has to take those privileges away itself.
const PLATFORM = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;

  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb not null default '{}');
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;

  create schema storage;
  create table storage.buckets (id text primary key, name text not null, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets (id), name text not null, owner_id text, unique (bucket_id, name));
  alter table storage.objects enable row level security;
  grant usage on schema storage to anon, authenticated, service_role;
  grant all on storage.objects to anon, authenticated, service_role;
`;

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const C = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const db = new PGlite();
const household = {};

const sql = async (text, params = []) => (await db.query(text, params)).rows;
async function rejects(promise, code, label = "") {
  await assert.rejects(promise, error => { assert.equal(error.code, code, `${label}: ${error.message}`); return true; }, label);
}

before(async () => {
  await db.exec(PLATFORM);
  const folder = new URL("../migrations/", import.meta.url);
  for (const name of (await readdir(folder)).filter(file => file.endsWith(".sql")).sort()) await db.exec(await readFile(new URL(name, folder), "utf8"));
  // JSON travels as text and is cast in SQL, so it arrives the same way whatever the driver does with objects.
  await db.query("insert into auth.users (id, email, raw_user_meta_data) values ($1, 'a@example.com', $2::text::jsonb), ($3, 'b@example.com', $4::text::jsonb), ($5, 'c@example.com', '{}')",
    [A, JSON.stringify({ full_name: "  Ana Santos  " }), B, JSON.stringify({ name: "B".repeat(80) }), C]);
  for (const [key, id] of [["a", A], ["b", B], ["c", C]]) household[key] = (await sql("select id from public.households where owner_id = $1", [id]))[0].id;
});

test("signing up creates exactly one profile and one household", async () => {
  assert.deepEqual(await sql("select full_name, username, onboarded_at from public.profiles where id = $1", [A]), [{ full_name: "Ana Santos", username: null, onboarded_at: null }]);
  assert.equal((await sql("select full_name from public.profiles where id = $1", [B]))[0].full_name, "B".repeat(50));
  assert.equal((await sql("select full_name from public.profiles where id = $1", [C]))[0].full_name, "");
  assert.equal((await sql("select count(*)::int as n from public.households where owner_id = $1", [A]))[0].n, 1);
  await rejects(db.query("insert into public.households (owner_id) values ($1)", [A]), "23505", "second household");
});

test("the seven providers are seeded and unverified", async () => {
  assert.deepEqual((await sql("select id from public.providers order by id")).map(row => row.id), ["akelco", "anteco", "capelco", "ileco-1", "ileco-2", "ileco-3", "more-power"]);
  assert.equal((await sql("select count(*)::int as n from public.providers where is_coverage_verified"))[0].n, 0);
});

test("synced bills retain subsidies, charge groups and meter readings", async () => {
  const id = "99999999-9999-4999-8999-999999999999";
  await db.query("insert into public.bills (household_id, id, billing_month, kwh, amount_centavos, source, subsidy_centavos, charges, readings) values ($1, $2, '2040-01-01', 100, 120000, 'scan', 50000, $3::jsonb, $4::jsonb)", [household.a, id, JSON.stringify([{ label: "Distribution", amount: 300 }]), JSON.stringify({ previous: 10, present: 110 })]);
  const row = (await sql("select subsidy_centavos, charges, readings from public.bills where household_id = $1 and id = $2", [household.a, id]))[0];
  assert.equal(row.subsidy_centavos, 50000); assert.equal(row.charges[0].amount, 300); assert.equal(row.readings.present, 110);
  await rejects(db.query("update public.bills set subsidy_centavos = 120001 where household_id = $1 and id = $2", [household.a, id]), "23514");
  await db.query("delete from public.bills where household_id = $1 and id = $2", [household.a, id]);
});

test("offline settings columns are writable only for their account owner", async () => {
  try {
    await db.exec(`set role authenticated; set request.jwt.claim.sub = '${A}';`);
    await db.query("update public.households set monthly_subsidy_centavos = 50000, dismissed_provider_advisories = '[\"post-one\"]'::jsonb where id = $1", [household.a]);
    await db.query("update public.profiles set contact_email = 'contact@example.com' where id = $1", [A]);
    assert.equal((await sql("select monthly_subsidy_centavos from public.households where id = $1", [household.a]))[0].monthly_subsidy_centavos, 50000);
    assert.equal((await sql("select contact_email from public.profiles where id = $1", [A]))[0].contact_email, 'contact@example.com');
    assert.equal((await sql("update public.households set monthly_subsidy_centavos = 0 where id = $1 returning id", [household.b])).length, 0);
    assert.equal((await sql("select id from public.profiles where id = $1", [B])).length, 0);
  } finally { await db.exec("reset role; reset request.jwt.claim.sub;"); }
});

test("out-of-range values are refused", async () => {
  const h = household.a;
  const bill = "insert into public.bills (household_id, billing_month, kwh, amount_centavos, source";
  const appliance = "insert into public.appliances (household_id, name, kind, watts, hours_per_day, quantity";
  const advisory = "insert into public.advisories (household_id, id, revision, details, match, original_kind, original_name, original_text, original_captured_at, reviewed_at) values ($1, gen_random_uuid(), 1,";
  const cases = [
    ["bill amount zero", `${bill}) values ($1, '2030-01-01', 100, 0, 'manual')`, "23514"],
    ["bill kwh zero", `${bill}) values ($1, '2030-01-01', 0, 100, 'manual')`, "23514"],
    ["bill month not first day", `${bill}) values ($1, '2030-01-15', 100, 100, 'manual')`, "23514"],
    ["bill sample source", `${bill}) values ($1, '2030-01-01', 100, 100, 'sample')`, "23514"],
    ["bill due before billing", `${bill}, billing_date, due_date) values ($1, '2030-01-01', 100, 100, 'manual', '2030-01-20', '2030-01-10')`, "23514"],
    ["bill half a period", `${bill}, period_start) values ($1, '2030-01-01', 100, 100, 'manual', '2030-01-01')`, "23514"],
    ["bill period reversed", `${bill}, period_start, period_end) values ($1, '2030-01-01', 100, 100, 'manual', '2030-01-31', '2030-01-01')`, "23514"],
    ["bill two providers", `${bill}, provider_id, provider_custom_name) values ($1, '2030-01-01', 100, 100, 'manual', 'anteco', 'Other Coop')`, "23514"],
    ["bill unknown provider", `${bill}, provider_id) values ($1, '2030-01-01', 100, 100, 'manual', 'nowhere')`, "23503"],
    ["bill long notes", `${bill}, notes) values ($1, '2030-01-01', 100, 100, 'manual', repeat('n', 501))`, "23514"],
    ["appliance hours over 24", `${appliance}) values ($1, 'Fan', 'fan', 55, 24.5, 1)`, "23514"],
    ["appliance negative hours", `${appliance}) values ($1, 'Fan', 'fan', 55, -1, 1)`, "23514"],
    ["appliance quantity zero", `${appliance}) values ($1, 'Fan', 'fan', 55, 8, 0)`, "23514"],
    ["appliance quantity 51", `${appliance}) values ($1, 'Fan', 'fan', 55, 8, 51)`, "23514"],
    ["appliance watts zero", `${appliance}) values ($1, 'Fan', 'fan', 0, 8, 1)`, "23514"],
    ["appliance unknown kind", `${appliance}) values ($1, 'Toaster', 'toaster', 800, 1, 1)`, "23514"],
    ["appliance blank name", `${appliance}) values ($1, '   ', 'fan', 55, 8, 1)`, "23514"],
    ["appliance days 367", `${appliance}, days_in_period) values ($1, 'Fan', 'fan', 55, 8, 1, 367)`, "23514"],
    ["appliance unknown basis", `${appliance}, wattage_basis) values ($1, 'Fan', 'fan', 55, 8, 1, 'guess')`, "23514"],
    ["household budget zero", "update public.households set monthly_budget_centavos = 0 where id = $1", "23514"],
    ["household budget over cap", "update public.households set monthly_budget_centavos = 10000001 where id = $1", "23514"],
    ["household long name", "update public.households set name = repeat('n', 51) where id = $1", "23514"],
    ["household two providers", "update public.households set provider_id = 'anteco', provider_custom_name = 'Other Coop' where id = $1", "23514"],
    ["advisory unknown type", `${advisory} '{"type":"party"}', '{"status":"affected"}', 'text', 'Pasted', 'words', now(), now())`, "23514"],
    ["advisory missing status", `${advisory} '{"type":"notice"}', '{}', 'text', 'Pasted', 'words', now(), now())`, "23502"],
    ["advisory details not an object", `${advisory} '[]', '{"status":"affected"}', 'text', 'Pasted', 'words', now(), now())`, "23502"],
    ["advisory text original empty", `${advisory} '{"type":"notice"}', '{"status":"affected"}', 'text', 'Pasted', '  ', now(), now())`, "23514"],
    ["advisory image original without a path", `${advisory} '{"type":"notice"}', '{"status":"affected"}', 'image', 'photo.png', '', now(), now())`, "23514"],
    ["advisory oversize details", `${advisory} jsonb_build_object('type', 'notice', 'reason', repeat('r', 33000)), '{"status":"affected"}', 'text', 'Pasted', 'words', now(), now())`, "23514"],
    ["preparation repeated item", "insert into public.advisory_preparation (household_id, advisory_id, revision, household_signature, checked) values ($1, gen_random_uuid(), 1, '[]', '{charge,charge}')", "23514"],
    ["preparation unknown item", "insert into public.advisory_preparation (household_id, advisory_id, revision, household_signature, checked) values ($1, gen_random_uuid(), 1, '[]', '{dance}')", "23514"],
    ["plan source not confirmed", "insert into public.brownout_plans (household_id, advisory_id, advisory_snapshot, relevance_confirmed, source_confirmed) values ($1, gen_random_uuid(), '{}', true, false)", "23514"],
    ["plan item from the other checklist", "insert into public.brownout_plans (household_id, advisory_id, advisory_snapshot, relevance_confirmed, source_confirmed, checked) values ($1, gen_random_uuid(), '{}', true, true, '{water}')", "23514"],
    ["plan updates not a list", "insert into public.brownout_plans (household_id, advisory_id, advisory_snapshot, relevance_confirmed, source_confirmed, acknowledged_updates) values ($1, gen_random_uuid(), '{}', true, true, '{}')", "23514"],
    ["scenario blank title", "insert into public.scenarios (household_id, title, payload) values ($1, '  ', '{}')", "23514"],
    ["scenario long title", "insert into public.scenarios (household_id, title, payload) values ($1, repeat('t', 61), '{}')", "23514"],
    ["tips snapshot not an object", "insert into public.tips_snapshots (household_id, snapshot, generated_at, input_signature) values ($1, '[]', now(), '[]')", "23514"],
  ];
  for (const [label, statement, code] of cases) await rejects(db.query(statement, [h]), code, label);

  await rejects(db.query("update public.profiles set username = 'AB' where id = $1", [A]), "23514", "short username");
  await rejects(db.query("update public.profiles set username = 'Maria' where id = $1", [A]), "23514", "uppercase username");
  await rejects(db.query("update public.profiles set avatar_path = 'someone-else/avatar.jpg' where id = $1", [A]), "23514", "foreign avatar path");
  await db.query("update public.profiles set username = 'ana.santos' where id = $1", [A]);
  await rejects(db.query("update public.profiles set username = 'ana.santos' where id = $1", [B]), "23505", "taken username");
});

test("one bill per month, and preparation progress keyed by its full basis", async () => {
  const h = household.a;
  await db.query("insert into public.bills (household_id, billing_month, kwh, amount_centavos, source) values ($1, '2031-03-01', 120.5, 137950, 'manual')", [h]);
  await rejects(db.query("insert into public.bills (household_id, billing_month, kwh, amount_centavos, source) values ($1, '2031-03-01', 99, 100000, 'scan')", [h]), "23505", "second bill for a month");
  const advisory = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
  const add = (revision, signature) => db.query("insert into public.advisory_preparation (household_id, advisory_id, revision, household_signature, checked) values ($1, $2, $3, $4, '{charge}')", [h, advisory, revision, signature]);
  await add(1, "[\"anteco\",\"Payao\"]");
  await rejects(add(1, "[\"anteco\",\"Payao\"]"), "23505", "same basis twice");
  await add(2, "[\"anteco\",\"Payao\"]");
  await add(1, "[\"anteco\",\"Atabay\"]");
  await db.query("delete from public.bills where household_id = $1", [h]);
  await db.query("delete from public.advisory_preparation where household_id = $1", [h]);
});

test("advisory type and match status are derived from the documents", async () => {
  const id = (await sql(`insert into public.advisories (household_id, id, revision, details, match, original_kind, original_name, original_text, original_captured_at, reviewed_at)
    values ($1, gen_random_uuid(), 1, '{"type":"scheduled","title":"Scheduled Power Interruption"}', '{"status":"possibly-affected","rationale":[]}', 'text', 'Pasted advisory', 'Line maintenance in Payao', now(), now()) returning id`, [household.a]))[0].id;
  assert.deepEqual(await sql("select type, match_status from public.advisories where id = $1", [id]), [{ type: "scheduled", match_status: "possibly-affected" }]);
  await db.query(`update public.advisories set revision = 2, match = '{"status":"not-listed"}' where id = $1`, [id]);
  assert.equal((await sql("select match_status from public.advisories where id = $1", [id]))[0].match_status, "not-listed");
  await rejects(db.query("update public.advisories set type = 'notice' where id = $1", [id]), "428C9", "writing a derived column");
  await db.query("delete from public.advisories where id = $1", [id]);
});

test("updated_at moves when a row changes", async () => {
  const before = (await sql("select updated_at from public.households where id = $1", [household.a]))[0].updated_at;
  await new Promise(resolve => setTimeout(resolve, 20));
  await db.query("update public.households set name = 'Santos household' where id = $1", [household.a]);
  const after = (await sql("select updated_at from public.households where id = $1", [household.a]))[0].updated_at;
  assert.ok(new Date(after) > new Date(before));
});

test("each capped table accepts its cap and refuses the next row", async () => {
  const h = household.c;
  const caps = [
    ["bills", 240, "insert into public.bills (household_id, billing_month, kwh, amount_centavos, source) select $1, (date '2000-01-01' + make_interval(months => n))::date, 100, 100000, 'manual' from generate_series($2::int, $3::int) n"],
    ["appliances", 150, "insert into public.appliances (household_id, name, kind, watts, hours_per_day, quantity) select $1, 'Fan ' || n, 'fan', 55, 8, 1 from generate_series($2::int, $3::int) n"],
    ["advisories", 200, `insert into public.advisories (household_id, id, revision, details, match, original_kind, original_name, original_text, original_captured_at, reviewed_at) select $1, gen_random_uuid(), 1, '{"type":"notice"}', '{"status":"not-listed"}', 'text', 'Pasted', 'words ' || n, now(), now() from generate_series($2::int, $3::int) n`],
    ["advisory_preparation", 500, "insert into public.advisory_preparation (household_id, advisory_id, revision, household_signature) select $1, gen_random_uuid(), 1, '[]' from generate_series($2::int, $3::int) n"],
    ["brownout_plans", 100, "insert into public.brownout_plans (household_id, advisory_id, advisory_snapshot, relevance_confirmed, source_confirmed) select $1, gen_random_uuid(), '{}', true, true from generate_series($2::int, $3::int) n"],
    ["scenarios", 50, "insert into public.scenarios (household_id, title, payload) select $1, 'Scenario ' || n, '{}' from generate_series($2::int, $3::int) n"],
  ];
  for (const [table, cap, statement] of caps) {
    await db.query(statement, [h, 1, cap]);
    assert.equal((await sql(`select count(*)::int as n from public.${table} where household_id = $1`, [h]))[0].n, cap, table);
    await assert.rejects(db.query(statement, [h, cap + 1, cap + 1]), error => { assert.equal(error.code, "P0001", table); assert.match(error.message, new RegExp(`household row limit reached for ${table}`)); return true; });
    // Replacing a row that already exists is not a new row, so it is still allowed at the cap.
    await db.query(`update public.${table} set updated_at = now() where household_id = $1`, [h]);
    await db.query(`delete from public.${table} where household_id = $1`, [h]);
  }
});

test("deleting an account removes everything it owned", async () => {
  const id = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
  await db.query("insert into auth.users (id, email) values ($1, 'e@example.com')", [id]);
  const h = (await sql("select id from public.households where owner_id = $1", [id]))[0].id;
  await db.query("insert into public.scenarios (household_id, title, payload) values ($1, 'Temporary', '{}')", [h]);
  await db.query("insert into public.setup_progress (household_id, reviewed_tips) values ($1, '[]')", [h]);
  await db.query("delete from auth.users where id = $1", [id]);
  for (const [table, column, value] of [["profiles", "id", id], ["households", "id", h], ["scenarios", "household_id", h], ["setup_progress", "household_id", h]]) {
    assert.equal((await sql(`select count(*)::int as n from public.${table} where ${column} = $1`, [value]))[0].n, 0, table);
  }
});

// ---------------------------------------------------------------------
// Security rules. These run as the API roles, the way requests arrive.
// ---------------------------------------------------------------------
async function as(role, userId, run) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId ?? ""]);
  await db.exec(`set role ${role}`);
  try { return await run(); }
  finally { await db.exec("reset role"); }
}
const asUser = (userId, run) => as("authenticated", userId, run);
const affected = async (text, params = []) => (await db.query(text, params)).affectedRows;

const OWNED = {
  bills: "insert into public.bills (household_id, billing_month, kwh, amount_centavos, source) values ($1, '2026-01-01', 120.5, 137950, 'manual')",
  appliances: "insert into public.appliances (household_id, name, kind, watts, hours_per_day, quantity) values ($1, 'Electric fan', 'fan', 55, 8, 2)",
  advisories: `insert into public.advisories (household_id, revision, details, match, original_kind, original_name, original_text, original_captured_at, reviewed_at) values ($1, 1, '{"type":"scheduled"}', '{"status":"affected"}', 'text', 'Pasted advisory', 'Line maintenance in Payao', now(), now())`,
  advisory_preparation: "insert into public.advisory_preparation (household_id, advisory_id, revision, household_signature, checked) values ($1, gen_random_uuid(), 1, '[]', '{charge}')",
  brownout_plans: "insert into public.brownout_plans (household_id, advisory_id, advisory_snapshot, relevance_confirmed, source_confirmed, checked) values ($1, gen_random_uuid(), '{}', true, true, '{charge,work}')",
  tips_snapshots: "insert into public.tips_snapshots (household_id, snapshot, generated_at, input_signature) values ($1, '{}', now(), '[]')",
  scenarios: "insert into public.scenarios (household_id, title, payload) values ($1, 'My Watt-If scenario', '{}')",
  setup_progress: "insert into public.setup_progress (household_id, reviewed_tips) values ($1, '[]')",
};
const ALL_TABLES = ["providers", "profiles", "households", ...Object.keys(OWNED), "auth_login_attempts", "provider_advisories", "provider_advisory_runs", "provider_advisory_state"];

test("every table has row-level security and anon holds no privilege", async () => {
  assert.deepEqual((await sql("select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' order by 1")).map(row => row.relname), [...ALL_TABLES].sort());
  assert.deepEqual(await sql("select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity"), []);
  assert.deepEqual(await sql("select table_name, privilege_type from information_schema.role_table_grants where table_schema = 'public' and grantee = 'anon'"), []);
  assert.deepEqual(await sql("select table_name, column_name from information_schema.column_privileges where table_schema = 'public' and grantee = 'anon'"), []);
  for (const table of ALL_TABLES) await rejects(as("anon", null, () => db.query(`select 1 from public.${table} limit 1`)), "42501", `anon reads ${table}`);
});

test("an account reads and writes only its own household", async () => {
  for (const [table, insert] of Object.entries(OWNED)) {
    await asUser(A, () => db.query(insert, [household.a]));
    await asUser(B, () => db.query(insert, [household.b]));
    assert.equal((await asUser(A, () => sql(`select household_id from public.${table}`))).every(row => row.household_id === household.a), true, `${table}: A sees only its own`);
    assert.equal((await asUser(A, () => sql(`select 1 from public.${table} where household_id = $1`, [household.b]))).length, 0, `${table}: A cannot read B`);
    await rejects(asUser(A, () => db.query(insert, [household.b])), "42501", `${table}: A inserts into B`);
    assert.equal(await asUser(A, () => affected(`update public.${table} set updated_at = now() where household_id = $1`, [household.b])), 0, `${table}: A updates B`);
    assert.equal(await asUser(A, () => affected(`delete from public.${table} where household_id = $1`, [household.b])), 0, `${table}: A deletes B`);
    await rejects(asUser(A, () => db.query(`update public.${table} set household_id = $1 where household_id = $2`, [household.b, household.a])), "42501", `${table}: A moves a row to B`);
    assert.equal((await sql(`select count(*)::int as n from public.${table} where household_id = $1`, [household.b]))[0].n, 1, `${table}: B's row survives`);
    assert.equal(await asUser(A, () => affected(`update public.${table} set updated_at = now() where household_id = $1`, [household.a])), 1, `${table}: A updates its own`);
    assert.equal(await asUser(A, () => affected(`delete from public.${table} where household_id = $1`, [household.a])), 1, `${table}: A deletes its own`);
  }
});

test("profiles and households are private, and cannot be created, removed or re-owned", async () => {
  assert.deepEqual((await asUser(A, () => sql("select id from public.profiles"))).map(row => row.id), [A]);
  assert.deepEqual((await asUser(A, () => sql("select owner_id from public.households"))).map(row => row.owner_id), [A]);
  assert.equal(await asUser(A, () => affected("update public.profiles set full_name = 'Hacked' where id = $1", [B])), 0);
  assert.equal(await asUser(A, () => affected("update public.households set name = 'Hacked' where id = $1", [household.b])), 0);
  assert.equal(await asUser(A, () => affected("update public.profiles set full_name = 'Ana S.', notify_tips = true where id = $1", [A])), 1);
  assert.equal(await asUser(A, () => affected("update public.households set location = 'Payao, San Jose de Buenavista, Antique', provider_id = 'anteco', monthly_budget_centavos = 160000 where id = $1", [household.a])), 1);
  const denied = [
    ["insert a profile", "insert into public.profiles (id) values (gen_random_uuid())"],
    ["delete own profile", `delete from public.profiles where id = '${A}'`],
    ["change a profile id", `update public.profiles set id = gen_random_uuid() where id = '${A}'`],
    ["insert a household", `insert into public.households (owner_id) values ('${A}')`],
    ["delete own household", `delete from public.households where owner_id = '${A}'`],
    ["re-own a household", `update public.households set owner_id = '${B}' where owner_id = '${A}'`],
    ["edit a provider", "update public.providers set name = 'Mine' where id = 'anteco'"],
  ];
  for (const [label, statement] of denied) await rejects(asUser(A, () => db.query(statement)), "42501", label);
  assert.equal((await asUser(A, () => sql("select id from public.providers"))).length, 7);
});

test("login attempts are closed to accounts and open to the service role", async () => {
  const hash = "a".repeat(64);
  await rejects(asUser(A, () => db.query("select 1 from public.auth_login_attempts")), "42501", "account reads attempts");
  await rejects(asUser(A, () => db.query("insert into public.auth_login_attempts (username, ip_hash) values ('maria', $1)", [hash])), "42501", "account writes attempts");
  await as("service_role", null, () => db.query("insert into public.auth_login_attempts (username, ip_hash) values ('maria', $1)", [hash]));
  assert.equal((await as("service_role", null, () => sql("select count(*)::int as n from public.auth_login_attempts where username = 'maria'")))[0].n, 1);
  assert.equal(await as("service_role", null, () => affected("delete from public.auth_login_attempts where username = 'maria'")), 1);
});

test("the service role reaches every table", async () => {
  for (const table of ALL_TABLES) await as("service_role", null, () => db.query(`select 1 from public.${table} limit 1`));
});

test("buckets are private and limited", async () => {
  const rows = await sql("select id, public, file_size_limit::int as file_size_limit, allowed_mime_types from storage.buckets order by id");
  assert.deepEqual(rows, [
    { id: "advisory-originals", public: false, file_size_limit: 2097152, allowed_mime_types: ["image/jpeg", "image/png", "image/webp"] },
    { id: "avatars", public: false, file_size_limit: 1048576, allowed_mime_types: ["image/jpeg"] },
  ]);
});

test("an avatar lives at exactly one path, and only its owner can touch it", async () => {
  const put = (name, bucket = "avatars") => db.query("insert into storage.objects (bucket_id, name) values ($1, $2)", [bucket, name]);
  await asUser(A, () => put(`${A}/avatar.jpg`));
  await rejects(asUser(A, () => put(`${A}/other.jpg`)), "42501", "another file name");
  await rejects(asUser(A, () => put(`${A}/avatar.png`)), "42501", "another extension");
  await rejects(asUser(A, () => put(`${B}/avatar.jpg`)), "42501", "another account's folder");
  await rejects(as("anon", null, () => put(`${A}/avatar.jpg`)), "42501", "no session");
  assert.equal((await asUser(B, () => sql("select name from storage.objects where bucket_id = 'avatars'"))).length, 0);
  assert.equal(await asUser(B, () => affected("update storage.objects set name = $1 where bucket_id = 'avatars'", [`${B}/avatar.jpg`])), 0);
  assert.equal(await asUser(B, () => affected("delete from storage.objects where bucket_id = 'avatars'")), 0);
  assert.equal((await asUser(A, () => sql("select name from storage.objects where bucket_id = 'avatars'"))).length, 1);
  assert.equal(await asUser(A, () => affected("delete from storage.objects where bucket_id = 'avatars'")), 1);
});

test("advisory originals follow the path pattern and stop at 60 files", async () => {
  const advisory = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
  const put = name => db.query("insert into storage.objects (bucket_id, name) values ('advisory-originals', $1)", [name]);
  await asUser(A, () => put(`${A}/${advisory}/r1.png`));
  for (const bad of [`${A}/notes.txt`, `${A}/${advisory}/r0.png`, `${A}/${advisory}/r1.gif`, `${A}/${advisory}/r1.png/extra`, `${A}/not-a-uuid/r1.png`, `${B}/${advisory}/r1.png`]) {
    await rejects(asUser(A, () => put(bad)), "42501", bad);
  }
  assert.equal((await asUser(B, () => sql("select name from storage.objects where bucket_id = 'advisory-originals'"))).length, 0);
  assert.equal(await asUser(B, () => affected("delete from storage.objects where bucket_id = 'advisory-originals'")), 0);
  for (let revision = 2; revision <= 60; revision += 1) await asUser(A, () => put(`${A}/${advisory}/r${revision}.jpg`));
  assert.equal((await asUser(A, () => sql("select count(*)::int as n from storage.objects where bucket_id = 'advisory-originals'")))[0].n, 60);
  await rejects(asUser(A, () => put(`${A}/${advisory}/r61.webp`)), "42501", "the 61st file");
  // Another account's count is its own.
  await asUser(B, () => put(`${B}/${advisory}/r1.webp`));
  assert.equal(await asUser(A, () => affected("delete from storage.objects where bucket_id = 'advisory-originals'")), 60);
});

// ---------------------------------------------------------------------
// Provider advisories: shared announcements read from the provider's page
// ---------------------------------------------------------------------
const FEED_COLUMNS = "id, provider_id, post_url, posted_at, status, details, schedule_end, original_text, read_from_images";
const postUrl = id => `https://www.facebook.com/antecoPH/posts/${id}`;
const advisoryDetails = (fields = {}) => JSON.stringify({ type: "scheduled", date: "2026-10-20", endDate: "", ...fields });
const addPublished = (id, details, age = "0 days") => db.query(
  `insert into public.provider_advisories (provider_id, external_post_id, post_url, posted_at, status, attempts, details, original_text, source, model)
   values ('anteco', $1, $2, now() - $4::interval, 'published', 1, $3::text::jsonb, 'Line maintenance in Payao', '{"caption":"kept on the server"}', 'model-name')`,
  [id, postUrl(id), details, age]);

test("accounts read published provider advisories and nothing else about them", async () => {
  await addPublished("pub", advisoryDetails());
  await db.query("insert into public.provider_advisories (provider_id, external_post_id, post_url, posted_at, status, attempts) values ('anteco', 'ign', $1, now(), 'ignored', 1), ('anteco', 'que', $2, now(), 'queued', 0), ('anteco', 'bad', $3, now(), 'failed', 3)", [postUrl("ign"), postUrl("que"), postUrl("bad")]);
  for (const user of [A, B]) assert.deepEqual((await asUser(user, () => sql(`select ${FEED_COLUMNS} from public.provider_advisories`))).map(row => row.status), ["published"]);
  for (const hidden of ["source", "attempts", "failure", "model", "external_post_id", "*"]) await rejects(asUser(A, () => db.query(`select ${hidden} from public.provider_advisories`)), "42501", `an account reads ${hidden}`);
  await rejects(asUser(A, () => db.query("insert into public.provider_advisories (provider_id, external_post_id, post_url, posted_at) values ('anteco', 'mine', $1, now())", [postUrl("mine")])), "42501", "an account adds a post");
  await rejects(asUser(A, () => db.query("update public.provider_advisories set original_text = 'changed'")), "42501", "an account changes a post");
  await rejects(asUser(A, () => db.query("delete from public.provider_advisories")), "42501", "an account removes a post");
  for (const table of ["provider_advisory_runs", "provider_advisory_state"]) await rejects(asUser(A, () => db.query(`select 1 from public.${table}`)), "42501", `an account reads ${table}`);
  await rejects(as("anon", null, () => db.query(`select ${FEED_COLUMNS} from public.provider_advisories`)), "42501", "no session");
});

test("provider advisory rows keep their rules, and the schedule decides what is current", async () => {
  await rejects(db.query("insert into public.provider_advisories (provider_id, external_post_id, post_url, posted_at) values ('anteco', 'pub', $1, now())", [postUrl("pub")]), "23505", "the same post twice");
  await rejects(db.query("update public.provider_advisories set attempts = 4 where external_post_id = 'que'"), "23514", "a fourth attempt");
  await rejects(db.query("update public.provider_advisories set status = 'published' where external_post_id = 'que'"), "23514", "published without details");
  await rejects(db.query("update public.provider_advisories set status = 'published', details = $1::text::jsonb where external_post_id = 'que'", [advisoryDetails()]), "23514", "published without its original text");
  await rejects(db.query("update public.provider_advisories set details = $1::text::jsonb where external_post_id = 'que'", [JSON.stringify({ type: "rumour" })]), "23514", "an unknown advisory type");
  for (const url of ["http://www.facebook.com/antecoPH/posts/1", "https://facebook.com.example.org/post", "https://example.org/facebook.com/"]) {
    await rejects(db.query("insert into public.provider_advisories (provider_id, external_post_id, post_url, posted_at) values ('anteco', 'elsewhere', $1, now())", [url]), "23514", url);
  }
  const day = offset => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
  await addPublished("announced-early", advisoryDetails({ date: day(1) }), "61 days");
  await addPublished("two-days", advisoryDetails({ date: day(-1), endDate: day(1) }));
  await addPublished("long-over", advisoryDetails({ date: day(-40) }), "41 days");
  await addPublished("undated", advisoryDetails({ date: "" }));
  const ends = Object.fromEntries((await sql("select external_post_id, schedule_end from public.provider_advisories where status = 'published'")).map(row => [row.external_post_id, row.schedule_end]));
  assert.deepEqual(ends, { pub: "2026-10-20", "announced-early": day(1), "two-days": day(1), "long-over": day(-40), undated: null });
  // Selected by schedule, not by how long ago it was announced.
  const current = (await asUser(A, () => sql("select post_url from public.provider_advisories where schedule_end >= $1 and schedule_end <> '2026-10-20'", [day(-3)]))).map(row => row.post_url).sort();
  assert.deepEqual(current, [postUrl("announced-early"), postUrl("two-days")]);
  await rejects(db.query("update public.provider_advisories set details = $1::text::jsonb where external_post_id = 'undated'", [JSON.stringify({ type: "notice", date: "next week" })]), "23514", "a date that is not a date");
});

test("one run at a time holds the crawl lease, and a page is stored with its ranges or not at all", async () => {
  const first = "11111111-1111-4111-8111-111111111111", second = "22222222-2222-4222-8222-222222222222";
  const claim = owner => as("service_role", null, () => sql("select * from public.claim_advisory_crawl('anteco', $1, 360)", [owner]));
  const store = (owner, posts, ranges, backlog = false, freshStartedAt = null) => as("service_role", null, () => sql("select public.store_advisory_batch('anteco', $1, $2::text::jsonb, $3::text::jsonb, $4, $5::timestamptz) as added", [owner, JSON.stringify(posts), JSON.stringify(ranges), backlog, freshStartedAt]));
  const fetched = (id, caption) => ({ id, url: postUrl(id), posted_at: "2026-10-10T01:00:00Z", source: { caption } });
  const state = async () => (await sql("select pending_ranges, last_backlog_call from public.provider_advisory_state where provider_id = 'anteco'"))[0];
  const captionOf = async id => (await sql("select source ->> 'caption' as caption from public.provider_advisories where external_post_id = $1", [id]))[0]?.caption;
  const ranges = [{ from: "2026-10-01T00:00:00.000Z", until: "2026-10-10T01:00:00.000Z" }];

  assert.deepEqual(await claim(first), [{ pending_ranges: [], last_backlog_call: false }]);
  assert.deepEqual(await claim(second), [], "the lease is held");

  // One new post; a post still waiting gets fresh links; a decided post is left alone.
  assert.equal((await store(first, [fetched("new-1", "new"), fetched("que", "fresh links"), fetched("pub", "must not change")], ranges, true))[0].added, 1);
  assert.equal(await captionOf("new-1"), "new");
  assert.equal(await captionOf("que"), "fresh links");
  assert.equal(await captionOf("pub"), "kept on the server");
  assert.deepEqual(await state(), { pending_ranges: ranges, last_backlog_call: true });

  await rejects(store(second, [fetched("new-2", "stolen")], []), "P0001", "a run that does not hold the lease");
  assert.equal(await captionOf("new-2"), undefined);
  assert.deepEqual(await state(), { pending_ranges: ranges, last_backlog_call: true });

  // A page with one bad post stores nothing, and the ranges stay as they were.
  await rejects(store(first, [fetched("new-3", "good"), { ...fetched("new-4", "bad"), url: "https://example.org/post" }], []), "23514", "a page with a bad post");
  assert.equal(await captionOf("new-3"), undefined);
  assert.deepEqual(await state(), { pending_ranges: ranges, last_backlog_call: true });
  await rejects(store(first, [], [1, 2, 3, 4, 5, 6]), "23514", "more than five ranges");

  // An expired lease can be taken, and the run that lost it can no longer store.
  await db.query("update public.provider_advisory_state set lease_until = now() - interval '1 second' where provider_id = 'anteco'");
  assert.deepEqual(await claim(second), [{ pending_ranges: ranges, last_backlog_call: true }]);
  await rejects(store(first, [fetched("new-5", "late")], []), "P0001", "a run whose lease expired");
  assert.equal((await store(second, [], [], false))[0].added, 0);
  assert.deepEqual(await state(), { pending_ranges: [], last_backlog_call: false });

  // A fresh page records when its fetch began; a backlog page leaves that time alone.
  const freshAt = async () => (await sql("select last_fresh_started_at from public.provider_advisory_state where provider_id = 'anteco'"))[0].last_fresh_started_at;
  assert.equal(await freshAt(), null);
  await store(second, [], [], false, "2026-10-11T01:00:00Z");
  assert.equal(new Date(await freshAt()).toISOString(), "2026-10-11T01:00:00.000Z");
  await store(second, [], [], true, null);
  assert.equal(new Date(await freshAt()).toISOString(), "2026-10-11T01:00:00.000Z");

  for (const [role, user] of [["anon", null], ["authenticated", A]]) {
    await rejects(as(role, user, () => db.query("select * from public.claim_advisory_crawl('anteco', $1, 60)", [first])), "42501", `${role} claims the lease`);
    await rejects(as(role, user, () => db.query("select public.store_advisory_batch('anteco', $1, '[]', '[]', false, null)", [first])), "42501", `${role} stores a page`);
    await rejects(as(role, user, () => db.query("select public.prune_provider_advisories('anteco')")), "42501", `${role} prunes`);
  }
});

test("housekeeping removes old posts and runs but keeps an advisory that has not ended", async () => {
  const day = offset => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
  await db.query("delete from public.provider_advisories");
  await addPublished("old-upcoming", advisoryDetails({ date: day(2) }), "200 days");
  await addPublished("old-ended-recently", advisoryDetails({ date: day(-10) }), "200 days");
  await addPublished("old-ended-long-ago", advisoryDetails({ date: day(-40) }), "200 days");
  await addPublished("old-undated", advisoryDetails({ date: "" }), "200 days");
  await addPublished("recent-ended-long-ago", advisoryDetails({ date: day(-40) }), "50 days");
  await db.query(`insert into public.provider_advisories (provider_id, external_post_id, post_url, posted_at, status, attempts) values
    ('anteco', 'old-ignored', $1, now() - interval '200 days', 'ignored', 1),
    ('anteco', 'new-ignored', $1, now() - interval '20 days', 'ignored', 1),
    ('anteco', 'old-queued', $1, now() - interval '200 days', 'queued', 0),
    ('anteco', 'old-retryable', $1, now() - interval '200 days', 'failed', 2),
    ('anteco', 'old-gave-up', $1, now() - interval '200 days', 'failed', 3),
    ('anteco', 'old-reading', $1, now() - interval '200 days', 'reading', 1),
    ('anteco', 'stuck', $1, now(), 'reading', 3),
    ('anteco', 'reading-now', $1, now(), 'reading', 3),
    ('anteco', 'stuck-early', $1, now(), 'reading', 2)`, [postUrl("x")]);
  // updated_at is set by a trigger, so these rows are aged with the trigger off.
  await db.exec("alter table public.provider_advisories disable trigger set_updated_at");
  await db.query("update public.provider_advisories set updated_at = now() - interval '11 minutes' where external_post_id in ('stuck', 'stuck-early')");
  await db.exec("alter table public.provider_advisories enable trigger set_updated_at");
  await db.query("insert into public.provider_advisory_runs (provider_id, trigger, started_at) values ('anteco', 'cron', now() - interval '31 days'), ('anteco', 'email', now() - interval '29 days')");

  await as("service_role", null, () => db.query("select public.prune_provider_advisories('anteco')"));
  const left = Object.fromEntries((await sql("select external_post_id, status from public.provider_advisories")).map(row => [row.external_post_id, row.status]));
  assert.deepEqual(left, {
    "old-upcoming": "published", "old-ended-recently": "published", "recent-ended-long-ago": "published",
    "new-ignored": "ignored", stuck: "failed", "reading-now": "reading", "stuck-early": "reading",
    // Still waiting to be read, so kept whatever their age. The one that used its three attempts is gone.
    "old-queued": "queued", "old-retryable": "failed", "old-reading": "reading",
  });
  assert.equal((await sql("select failure from public.provider_advisories where external_post_id = 'stuck'"))[0].failure, "interrupted");
  assert.deepEqual((await sql("select trigger from public.provider_advisory_runs")).map(row => row.trigger), ["email"]);
});
