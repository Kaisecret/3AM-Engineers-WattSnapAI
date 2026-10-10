-- =====================================================================
-- WattSnap initial schema
-- Accounts, households, household records, row limits.
-- Security rules and storage follow in the second half of this file.
--
-- Never edit this file after it has run on the production project.
-- A correction is a new migration file with a later timestamp.
-- =====================================================================

-- Everything below is one transaction: if any statement fails, nothing is applied.
begin;

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------
create function public.set_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- True when every item is allowed and none is repeated. Used by checklist columns.
create function public.is_unique_subset(items text[], allowed text[]) returns boolean
language sql
immutable
set search_path = ''
as $$
  select items <@ allowed
     and cardinality(items) = (select count(distinct item) from unnest(items) as item);
$$;

-- ---------------------------------------------------------------------
-- providers: reference data
-- ---------------------------------------------------------------------
create table public.providers (
  id text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  name text not null check (char_length(name) between 1 and 80),
  area text not null default '' check (char_length(area) <= 80),
  detail text not null default '' check (char_length(detail) <= 160),
  is_coverage_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.providers (id, name, area, detail) values
  ('anteco', 'ANTECO', 'Antique', 'Antique Electric Cooperative'),
  ('akelco', 'AKELCO', 'Aklan', 'Aklan Electric Cooperative'),
  ('capelco', 'CAPELCO', 'Capiz', 'Capiz Electric Cooperative'),
  ('ileco-1', 'ILECO I', 'Iloilo', 'Iloilo I Electric Cooperative'),
  ('ileco-2', 'ILECO II', 'Iloilo', 'Iloilo II Electric Cooperative'),
  ('ileco-3', 'ILECO III', 'Iloilo', 'Iloilo III Electric Cooperative'),
  ('more-power', 'MORE Power', 'Iloilo', 'Distribution utility');

-- ---------------------------------------------------------------------
-- profiles: one per account
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 50),
  username text unique check (username ~ '^[a-z0-9_.]{3,30}$'),
  avatar_path text check (avatar_path = id::text || '/avatar.jpg'),
  notify_brownouts boolean not null default true,
  notify_bill_reminders boolean not null default true,
  notify_tips boolean not null default false,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- households: one per account
-- ---------------------------------------------------------------------
create table public.households (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users (id) on delete cascade,
  name text check (char_length(name) <= 50),
  location text check (char_length(location) <= 120),
  province text check (char_length(province) <= 100),
  municipality text check (char_length(municipality) <= 100),
  barangay text check (char_length(barangay) <= 100),
  provider_id text references public.providers (id),
  provider_custom_name text check (char_length(btrim(provider_custom_name)) between 1 and 80),
  monthly_budget_centavos integer check (monthly_budget_centavos between 1 and 10000000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint households_one_provider check (provider_id is null or provider_custom_name is null)
);

-- ---------------------------------------------------------------------
-- bills
-- ---------------------------------------------------------------------
create table public.bills (
  household_id uuid not null references public.households (id) on delete cascade,
  id uuid not null default gen_random_uuid(),
  billing_month date not null check (extract(day from billing_month) = 1),
  kwh numeric(10, 2) not null check (kwh > 0),
  amount_centavos integer not null check (amount_centavos > 0),
  due_date date,
  billing_date date,
  period_start date,
  period_end date,
  provider_id text references public.providers (id),
  provider_custom_name text check (char_length(btrim(provider_custom_name)) between 1 and 80),
  source text not null check (source in ('scan', 'manual')),
  source_name text check (char_length(source_name) <= 200),
  notes text check (char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (household_id, id),
  constraint bills_one_per_month unique (household_id, billing_month),
  constraint bills_one_provider check (provider_id is null or provider_custom_name is null),
  constraint bills_due_after_billing check (due_date is null or billing_date is null or due_date >= billing_date),
  constraint bills_period_complete check ((period_start is null) = (period_end is null)),
  constraint bills_period_order check (period_end is null or period_end >= period_start)
);

-- ---------------------------------------------------------------------
-- appliances
-- ---------------------------------------------------------------------
create table public.appliances (
  household_id uuid not null references public.households (id) on delete cascade,
  id uuid not null default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  model text check (char_length(model) <= 80),
  kind text not null default 'other' check (kind in ('fan', 'aircon', 'fridge', 'tv', 'rice-cooker', 'washer', 'lights', 'laptop', 'phone', 'microwave', 'iron', 'other')),
  watts numeric(9, 2) not null check (watts > 0),
  hours_per_day numeric(4, 2) not null check (hours_per_day between 0 and 24),
  quantity integer not null default 1 check (quantity between 1 and 50),
  days_in_period integer not null default 30 check (days_in_period between 1 and 366),
  wattage_basis text not null default 'approximate' check (wattage_basis in ('nameplate', 'approximate')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (household_id, id)
);

-- ---------------------------------------------------------------------
-- advisories: reviewed provider advisories
-- details and match are documents the interface already validates on read.
-- ---------------------------------------------------------------------
create table public.advisories (
  household_id uuid not null references public.households (id) on delete cascade,
  id uuid not null default gen_random_uuid(),
  revision integer not null check (revision >= 1),
  details jsonb not null check (octet_length(details::text) <= 32768),
  match jsonb not null check (octet_length(match::text) <= 16384),
  type text not null generated always as (details ->> 'type') stored
    check (type in ('scheduled', 'unscheduled', 'notice', 'restored')),
  match_status text not null generated always as (match ->> 'status') stored
    check (match_status in ('affected', 'possibly-affected', 'not-listed')),
  original_kind text not null check (original_kind in ('text', 'image')),
  original_name text not null check (char_length(original_name) between 1 and 200),
  original_text text not null default '' check (char_length(original_text) <= 12000),
  original_image_path text check (original_image_path ~ ('^[0-9a-f-]{36}/' || id::text || '/r[1-9][0-9]{0,5}\.(jpg|png|webp)$')),
  original_captured_at timestamptz not null,
  reviewed_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (household_id, id),
  constraint advisories_original_present check (
    (original_kind = 'text' and btrim(original_text) <> '' and original_image_path is null)
    or (original_kind = 'image' and original_image_path is not null)
  )
);

-- ---------------------------------------------------------------------
-- advisory_preparation: checklist progress for one advisory, revision and household basis
-- ---------------------------------------------------------------------
create table public.advisory_preparation (
  id bigint generated always as identity primary key,
  household_id uuid not null references public.households (id) on delete cascade,
  advisory_id uuid not null,
  revision integer not null check (revision >= 1),
  household_signature text not null check (char_length(household_signature) between 1 and 2000),
  -- The signature can be too long for an index entry, so uniqueness uses its hash.
  signature_hash text not null generated always as (md5(household_signature)) stored,
  checked text[] not null default '{}'
    check (public.is_unique_subset(checked, array['charge', 'lights', 'unplug', 'fridge', 'water'])),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint advisory_preparation_basis unique (household_id, advisory_id, revision, signature_hash)
);

-- ---------------------------------------------------------------------
-- brownout_plans: a plan keeps its own snapshot and outlives a deleted advisory
-- ---------------------------------------------------------------------
create table public.brownout_plans (
  household_id uuid not null references public.households (id) on delete cascade,
  advisory_id uuid not null,
  advisory_snapshot jsonb not null check (jsonb_typeof(advisory_snapshot) = 'object' and octet_length(advisory_snapshot::text) <= 65536),
  snapshot_image_path text check (snapshot_image_path ~ ('^[0-9a-f-]{36}/' || advisory_id::text || '/r[1-9][0-9]{0,5}\.(jpg|png|webp)$')),
  relevance_confirmed boolean not null,
  source_confirmed boolean not null check (source_confirmed),
  checked text[] not null default '{}'
    check (public.is_unique_subset(checked, array['charge', 'work', 'lights', 'unplug', 'fridge'])),
  acknowledged_updates jsonb not null default '[]'
    check (case when jsonb_typeof(acknowledged_updates) = 'array' then jsonb_array_length(acknowledged_updates) <= 100 else false end),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (household_id, advisory_id)
);

-- ---------------------------------------------------------------------
-- tips_snapshots: one saved set of tips per household
-- ---------------------------------------------------------------------
create table public.tips_snapshots (
  household_id uuid primary key references public.households (id) on delete cascade,
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object' and octet_length(snapshot::text) <= 131072),
  generated_at timestamptz not null,
  input_signature text not null check (octet_length(input_signature) <= 262144),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- scenarios: saved Watt-If scenarios
-- ---------------------------------------------------------------------
create table public.scenarios (
  household_id uuid not null references public.households (id) on delete cascade,
  id uuid not null default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 60 and char_length(title) <= 60),
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 131072),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (household_id, id)
);

-- ---------------------------------------------------------------------
-- setup_progress: home setup checklist acknowledgements
-- ---------------------------------------------------------------------
create table public.setup_progress (
  household_id uuid primary key references public.households (id) on delete cascade,
  reviewed_tips text check (octet_length(reviewed_tips) <= 262144),
  acknowledged text check (octet_length(acknowledged) <= 262144),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- auth_login_attempts: failed username sign-ins, for the limiter
-- ---------------------------------------------------------------------
create table public.auth_login_attempts (
  id bigint generated always as identity primary key,
  username text not null check (char_length(username) between 1 and 64),
  ip_hash text not null check (ip_hash ~ '^[0-9a-f]{64}$'),
  attempted_at timestamptz not null default now()
);
create index auth_login_attempts_username_idx on public.auth_login_attempts (username, attempted_at);
create index auth_login_attempts_ip_idx on public.auth_login_attempts (ip_hash, attempted_at);

-- ---------------------------------------------------------------------
-- updated_at on every table that has it
-- ---------------------------------------------------------------------
do $$
declare
  target text;
begin
  foreach target in array array[
    'providers', 'profiles', 'households', 'bills', 'appliances', 'advisories',
    'advisory_preparation', 'brownout_plans', 'tips_snapshots', 'scenarios', 'setup_progress'
  ] loop
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', target);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- Every new account gets exactly one profile and one household.
-- A failure here would block every sign-up, so this does nothing else.
-- ---------------------------------------------------------------------
create function public.handle_new_user() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, left(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')), 50))
  on conflict (id) do nothing;
  insert into public.households (owner_id)
  values (new.id)
  on conflict (owner_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Row limits. The browser writes to these tables directly, so the database
-- itself stops one account from filling it. An AFTER trigger counts only rows
-- that were really added, so replacing an existing row is still allowed at the cap.
-- ---------------------------------------------------------------------
create function public.enforce_household_row_limit() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  cap integer;
  held integer;
begin
  cap := tg_argv[0]::integer;
  -- One household's inserts into one table run one at a time, so the count is exact.
  perform pg_advisory_xact_lock(hashtextextended(tg_table_name || ':' || new.household_id::text, 0));
  execute format('select count(*) from public.%I where household_id = $1', tg_table_name)
    into held using new.household_id;
  if held > cap then
    raise exception 'household row limit reached for %', tg_table_name
      using hint = 'row_limit', detail = format('limit=%s', cap);
  end if;
  return null;
end;
$$;

create trigger enforce_row_limit after insert on public.bills
  for each row execute function public.enforce_household_row_limit('240');
create trigger enforce_row_limit after insert on public.appliances
  for each row execute function public.enforce_household_row_limit('150');
create trigger enforce_row_limit after insert on public.advisories
  for each row execute function public.enforce_household_row_limit('200');
create trigger enforce_row_limit after insert on public.advisory_preparation
  for each row execute function public.enforce_household_row_limit('500');
create trigger enforce_row_limit after insert on public.brownout_plans
  for each row execute function public.enforce_household_row_limit('100');
create trigger enforce_row_limit after insert on public.scenarios
  for each row execute function public.enforce_household_row_limit('50');

commit;
