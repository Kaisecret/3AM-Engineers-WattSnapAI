-- =====================================================================
-- Provider advisories
-- Announcements read from a provider's own public page. They belong to the
-- provider, not to a household: every signed-in account may read the published
-- ones, and only the server (secret key) writes.
--
-- Never edit this file after it has run on the production project.
-- A correction is a new migration file with a later timestamp.
-- =====================================================================

-- Everything below is one transaction: if any statement fails, nothing is applied.
begin;

-- ---------------------------------------------------------------------
-- provider_advisories: one row per post seen on the provider's page
-- queued    fetched, waiting to be read
-- reading   reserved by one run; attempts was counted before the model was called
-- published an advisory the app may show; details is the app's advisory document
-- ignored   read and found not to be an advisory
-- failed    could not be read; retried until attempts reaches 3
-- ---------------------------------------------------------------------
create table public.provider_advisories (
  id uuid primary key default gen_random_uuid(),
  provider_id text not null references public.providers (id),
  external_post_id text not null check (char_length(external_post_id) between 1 and 200),
  post_url text not null check (char_length(post_url) <= 500 and post_url ~ '^https://([a-z0-9-]+\.)*facebook\.com/'),
  posted_at timestamptz not null,
  status text not null default 'queued' check (status in ('queued', 'reading', 'published', 'ignored', 'failed')),
  attempts smallint not null default 0 check (attempts between 0 and 3),
  failure text check (char_length(failure) <= 200),
  details jsonb check (details is null or (jsonb_typeof(details) = 'object' and octet_length(details::text) <= 32768)),
  type text generated always as (details ->> 'type') stored
    check (type is null or type in ('scheduled', 'unscheduled', 'notice', 'restored')),
  -- The day the advisory stops mattering: its end date, or its date. ISO dates sort as text.
  schedule_end text generated always as (coalesce(nullif(details ->> 'endDate', ''), nullif(details ->> 'date', ''))) stored
    check (schedule_end is null or schedule_end ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  original_text text not null default '' check (char_length(original_text) <= 12000),
  read_from_images boolean not null default false,
  -- What reading needs: caption, image links, image text. Never granted to app users.
  source jsonb not null default '{}' check (jsonb_typeof(source) = 'object' and octet_length(source::text) <= 65536),
  model text check (char_length(model) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint provider_advisories_post unique (provider_id, external_post_id),
  constraint provider_advisories_published check (
    status <> 'published' or (details is not null and details ->> 'type' is not null and btrim(original_text) <> '')
  )
);
create index provider_advisories_schedule_idx on public.provider_advisories (provider_id, schedule_end) where status = 'published';
create index provider_advisories_posted_idx on public.provider_advisories (provider_id, posted_at desc);

create trigger set_updated_at before update on public.provider_advisories
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- provider_advisory_runs: a log of scrape runs, also used for the spend limits
-- ---------------------------------------------------------------------
create table public.provider_advisory_runs (
  id bigint generated always as identity primary key,
  provider_id text not null references public.providers (id),
  trigger text not null check (trigger in ('email', 'cron', 'manual')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  outcome text check (outcome in ('ok', 'failed', 'skipped')),
  fetched integer not null default 0 check (fetched >= 0),
  detected integer not null default 0 check (detected >= 0),
  inserted integer not null default 0 check (inserted >= 0),
  queued_left integer not null default 0 check (queued_left >= 0),
  error text check (char_length(error) <= 500)
);
create index provider_advisory_runs_started_idx on public.provider_advisory_runs (provider_id, started_at desc);

-- ---------------------------------------------------------------------
-- provider_advisory_state: one row per provider
-- pending_ranges lists the time ranges whose posts are not all fetched yet.
-- The lease lets one run at a time fetch and change those ranges.
-- last_fresh_started_at is when the latest successful fetch of new posts began: a
-- notification that arrived before it has been served.
-- ---------------------------------------------------------------------
create table public.provider_advisory_state (
  provider_id text primary key references public.providers (id),
  pending_ranges jsonb not null default '[]'
    check (case when jsonb_typeof(pending_ranges) = 'array' then jsonb_array_length(pending_ranges) <= 5 else false end),
  last_backlog_call boolean not null default false,
  last_fresh_started_at timestamptz,
  lease_owner uuid,
  lease_until timestamptz
);
insert into public.provider_advisory_state (provider_id) values ('anteco');

-- ---------------------------------------------------------------------
-- Takes the lease when it is free or expired and returns the crawl state.
-- Returns no row while another run holds it. One statement, database clock.
-- ---------------------------------------------------------------------
create function public.claim_advisory_crawl(p_provider text, p_owner uuid, p_seconds integer)
returns table (pending_ranges jsonb, last_backlog_call boolean)
language sql
set search_path = ''
as $$
  update public.provider_advisory_state as state
     set lease_owner = p_owner,
         lease_until = now() + make_interval(secs => least(greatest(p_seconds, 1), 600))
   where state.provider_id = p_provider
     and (state.lease_until is null or state.lease_until < now())
  returning state.pending_ranges, state.last_backlog_call;
$$;

-- ---------------------------------------------------------------------
-- Stores one fetched page and the range change it caused, together or not at all.
-- Returns how many posts were new. Raises when the caller no longer holds the lease.
-- ---------------------------------------------------------------------
create function public.store_advisory_batch(p_provider text, p_owner uuid, p_posts jsonb, p_ranges jsonb, p_backlog_call boolean, p_fresh_started_at timestamptz)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  added integer;
begin
  -- Locks the state row, so the lease cannot change hands while this page is written.
  perform 1 from public.provider_advisory_state as state
    where state.provider_id = p_provider and state.lease_owner = p_owner and state.lease_until > now()
    for update;
  if not found then
    raise exception 'advisory crawl lease is not held' using hint = 'lease_lost';
  end if;

  with incoming as (
    select * from jsonb_to_recordset(p_posts) as post(id text, url text, posted_at timestamptz, source jsonb)
  ), written as (
    insert into public.provider_advisories as stored (provider_id, external_post_id, post_url, posted_at, source)
    select p_provider, incoming.id, incoming.url, incoming.posted_at, incoming.source from incoming
    on conflict (provider_id, external_post_id) do update
      -- A post still waiting to be read gets fresh image links. A decided post is left alone.
      set source = excluded.source
      where stored.status in ('queued', 'failed')
    returning (stored.xmax = 0) as is_new
  )
  select count(*) filter (where written.is_new) into added from written;

  update public.provider_advisory_state as state
     set pending_ranges = p_ranges, last_backlog_call = p_backlog_call,
         -- Null for a backlog page, which says nothing about new posts.
         last_fresh_started_at = coalesce(p_fresh_started_at, state.last_fresh_started_at)
   where state.provider_id = p_provider;
  return added;
end;
$$;

-- ---------------------------------------------------------------------
-- Housekeeping after a run.
-- Finished posts older than 180 days go, except a published advisory whose schedule ended
-- less than 30 days ago or has not ended: an interruption announced long ago is kept.
-- A post still waiting to be read is never deleted, whatever its age.
-- ---------------------------------------------------------------------
create function public.prune_provider_advisories(p_provider text)
returns void
language sql
set search_path = ''
as $$
  delete from public.provider_advisories as stored
   where stored.provider_id = p_provider
     and stored.posted_at < now() - interval '180 days'
     and (stored.status in ('published', 'ignored') or (stored.status = 'failed' and stored.attempts >= 3))
     and not (
       stored.status = 'published' and stored.schedule_end is not null
       -- Manila has no daylight saving time: its date is the UTC time plus eight hours.
       and stored.schedule_end >= to_char((now() at time zone 'utc') + interval '8 hours' - interval '30 days', 'YYYY-MM-DD')
     );
  delete from public.provider_advisory_runs as run
   where run.provider_id = p_provider and run.started_at < now() - interval '30 days';
  -- A read that died on its last attempt would otherwise stay "reading" for ever.
  update public.provider_advisories as stored
     set status = 'failed', failure = 'interrupted'
   where stored.provider_id = p_provider and stored.status = 'reading'
     and stored.attempts >= 3 and stored.updated_at < now() - interval '10 minutes';
$$;

-- =====================================================================
-- Security rules. Start from nothing, then grant exactly what each role needs.
-- =====================================================================
revoke all on table public.provider_advisories, public.provider_advisory_runs, public.provider_advisory_state
from public, anon, authenticated;

-- Only the columns the app shows. source, attempts, failure and model stay with the server.
grant select (id, provider_id, post_url, posted_at, status, details, schedule_end, original_text, read_from_images)
  on table public.provider_advisories to authenticated;

grant all on table public.provider_advisories, public.provider_advisory_runs, public.provider_advisory_state
to service_role;

revoke all on function public.claim_advisory_crawl(text, uuid, integer) from public, anon, authenticated;
revoke all on function public.store_advisory_batch(text, uuid, jsonb, jsonb, boolean, timestamptz) from public, anon, authenticated;
revoke all on function public.prune_provider_advisories(text) from public, anon, authenticated;
grant execute on function public.claim_advisory_crawl(text, uuid, integer) to service_role;
grant execute on function public.store_advisory_batch(text, uuid, jsonb, jsonb, boolean, timestamptz) to service_role;
grant execute on function public.prune_provider_advisories(text) to service_role;

alter table public.provider_advisories enable row level security;
create policy "provider advisories: signed-in users read published" on public.provider_advisories
  for select to authenticated using (status = 'published');

-- No policies: only the secret key, which bypasses row-level security, can reach these tables.
alter table public.provider_advisory_runs enable row level security;
alter table public.provider_advisory_state enable row level security;

commit;
