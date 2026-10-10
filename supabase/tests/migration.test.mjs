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
