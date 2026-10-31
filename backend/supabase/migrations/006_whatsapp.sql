-- Organizer, version 6: each reminder goes out by e-mail or by WhatsApp, as chosen on the event or task.
alter table public.reminders add column if not exists channel text not null default 'email';
alter table public.reminders drop constraint if exists reminders_channel_check;
alter table public.reminders add constraint reminders_channel_check check (channel in ('email', 'whatsapp'));
-- The number to send to (only for WhatsApp), in international format, e.g. +5511987654321.
alter table public.reminders add column if not exists phone text;

-- The send-reminders function now also needs the channel and the number.
drop function if exists public.due_reminders(int);
create function public.due_reminders(max_rows int default 100)
returns table (id uuid, email text, title text, when_label text, send_at timestamptz, channel text, phone text)
language sql security definer set search_path = public, auth as $$
  select r.id, u.email::text, r.title, r.when_label, r.send_at, r.channel, r.phone
  from public.reminders r
  join auth.users u on u.id = r.user_id
  where r.sent_at is null and r.send_at <= now() and r.send_at > now() - interval '6 hours'
  order by r.send_at
  limit max_rows
$$;
revoke all on function public.due_reminders(int) from public, anon, authenticated;
grant execute on function public.due_reminders(int) to service_role;
