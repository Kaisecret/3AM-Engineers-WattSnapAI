-- Preserve the fields already saved by the offline interface. Existing ownership
-- policies apply to these columns; only the existing owner may update them.
begin;

alter table public.bills
  add column subsidy_centavos integer check (subsidy_centavos between 0 and amount_centavos),
  add column charges jsonb check (charges is null or (jsonb_typeof(charges) = 'array' and octet_length(charges::text) <= 8192)),
  add column readings jsonb check (readings is null or (jsonb_typeof(readings) = 'object' and octet_length(readings::text) <= 2048));

alter table public.households
  add column monthly_subsidy_centavos integer check (monthly_subsidy_centavos between 0 and 1000000),
  add column dismissed_provider_advisories jsonb not null default '[]'
    check (case when jsonb_typeof(dismissed_provider_advisories) = 'array'
      then jsonb_array_length(dismissed_provider_advisories) <= 500 and octet_length(dismissed_provider_advisories::text) <= 65536
      else false end);

-- Contact email is a household preference. It does not change the Auth login email.
alter table public.profiles add column contact_email text
  check (contact_email is null or char_length(contact_email) between 3 and 254);
alter table public.advisories add column original_feed jsonb
  check (original_feed is null or (jsonb_typeof(original_feed) = 'object' and octet_length(original_feed::text) <= 2048));

grant update (monthly_subsidy_centavos, dismissed_provider_advisories) on public.households to authenticated;
grant update (contact_email) on public.profiles to authenticated;

commit;
