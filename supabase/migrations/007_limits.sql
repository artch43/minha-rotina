-- Minha Rotina, version 7: limits that keep one account from abusing the reminder service.

-- 1. Sane values only. The app never writes anything outside these limits.
alter table public.reminders drop constraint if exists reminders_title_len;
alter table public.reminders add constraint reminders_title_len check (char_length(title) <= 300 and char_length(when_label) <= 200) not valid;
alter table public.reminders drop constraint if exists reminders_phone_format;
alter table public.reminders add constraint reminders_phone_format check (phone is null or phone ~ '^\+[0-9]{10,15}$') not valid;

-- 2. At most 1000 pending reminders per person (a busy calendar uses a few dozen).
create or replace function public.reminders_cap() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.reminders where user_id = new.user_id and sent_at is null) >= 1000 then
    raise exception 'Too many pending reminders' using errcode = 'check_violation';
  end if;
  return new;
end $$;
drop trigger if exists reminders_cap on public.reminders;
create trigger reminders_cap before insert on public.reminders for each row execute function public.reminders_cap();

-- 3. The send function also gets the user id, to apply its daily limits per person.
drop function if exists public.due_reminders(int);
create function public.due_reminders(max_rows int default 100)
returns table (id uuid, user_id uuid, email text, title text, when_label text, send_at timestamptz, channel text, phone text)
language sql security definer set search_path = public, auth as $$
  select r.id, r.user_id, u.email::text, r.title, r.when_label, r.send_at, r.channel, r.phone
  from public.reminders r
  join auth.users u on u.id = r.user_id
  where r.sent_at is null and r.send_at <= now() and r.send_at > now() - interval '6 hours'
  order by r.send_at
  limit max_rows
$$;
revoke all on function public.due_reminders(int) from public, anon, authenticated;
grant execute on function public.due_reminders(int) to service_role;

-- What each person was sent in the last 24 hours (successful sends only), per channel and number.
create or replace function public.reminders_sent_today(ids uuid[])
returns table (user_id uuid, channel text, phone text, sent bigint)
language sql security definer set search_path = public as $$
  select r.user_id, r.channel, r.phone, count(*)
  from public.reminders r
  where r.user_id = any(ids) and r.sent_at > now() - interval '24 hours' and r.last_error is null
  group by r.user_id, r.channel, r.phone
$$;
revoke all on function public.reminders_sent_today(uuid[]) from public, anon, authenticated;
grant execute on function public.reminders_sent_today(uuid[]) to service_role;

-- 4. Attachments: pictures and PDF only (SVG can carry scripts).
update storage.buckets
  set allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif', 'image/heic', 'image/heif', 'application/pdf']
  where id = 'anexos';
