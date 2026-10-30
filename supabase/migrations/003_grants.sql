-- Organizer, version 3: explicit access for signed-in people.
-- Newer Supabase projects no longer grant table access to the API roles automatically,
-- which shows up in the app as "permission denied for table records".
-- Row Level Security (001 and 002) still limits everyone to their own rows.

grant usage on schema public to anon, authenticated;

revoke all on table public.records from anon;
grant select, insert, update, delete on table public.records to authenticated;

revoke all on table public.reminders from anon;
grant select, insert, delete on table public.reminders to authenticated;

grant select, insert, update, delete on table public.records, public.reminders to service_role;
