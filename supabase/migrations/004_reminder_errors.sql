-- Minha Rotina, version 4: remember why a reminder could not be sent,
-- so a permanent refusal (e.g. an address the e-mail service rejects) is not retried every minute.
alter table public.reminders add column if not exists last_error text;
