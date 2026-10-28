-- Minha Rotina, version 2: calendar events, to-dos and e-mail reminders.

-- 1. Allow the new kinds of rows.
alter table public.records drop constraint if exists records_kind_check;
alter table public.records add constraint records_kind_check
  check (kind in ('page', 'db', 'item', 'doc', 'event', 'todo', 'note', 'habit', 'habitlog', 'settings'));

-- 2. One row per e-mail that still has to go out. The app writes them when an event is saved.
create table if not exists public.reminders (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  event_id   text        not null,
  send_at    timestamptz not null,
  title      text        not null,
  when_label text        not null,
  sent_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists reminders_due_idx on public.reminders (send_at) where sent_at is null;
create index if not exists reminders_event_idx on public.reminders (user_id, event_id);

alter table public.reminders enable row level security;
drop policy if exists "reminders: read own" on public.reminders;
drop policy if exists "reminders: insert own" on public.reminders;
drop policy if exists "reminders: delete own" on public.reminders;
create policy "reminders: read own"   on public.reminders for select using (auth.uid() = user_id);
create policy "reminders: insert own" on public.reminders for insert with check (auth.uid() = user_id);
create policy "reminders: delete own" on public.reminders for delete using (auth.uid() = user_id);

-- 3. Used only by the send-reminders function (service role): due reminders with the person's e-mail.
create or replace function public.due_reminders(max_rows int default 100)
returns table (id uuid, email text, title text, when_label text, send_at timestamptz)
language sql security definer set search_path = public, auth as $$
  select r.id, u.email::text, r.title, r.when_label, r.send_at
  from public.reminders r
  join auth.users u on u.id = r.user_id
  where r.sent_at is null and r.send_at <= now() and r.send_at > now() - interval '6 hours'
  order by r.send_at
  limit max_rows
$$;
revoke all on function public.due_reminders(int) from public, anon, authenticated;
grant execute on function public.due_reminders(int) to service_role;
