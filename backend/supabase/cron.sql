-- Run once in the SQL Editor AFTER deploying the send-reminders function.
-- Replace <PROJECT_REF> (Project Settings → General) and <CRON_SECRET> (the same value saved as a function secret).
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('send-reminders') where exists (select 1 from cron.job where jobname = 'send-reminders');
select cron.schedule(
  'send-reminders',
  '* * * * *',
  $$ select net.http_post(
       url := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-reminders',
       headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>', 'Content-Type', 'application/json'),
       body := '{}'::jsonb
     ) $$
);
