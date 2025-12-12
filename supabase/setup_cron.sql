-- Setup cron job for automatic reminder sending
-- Run this in Supabase Dashboard → SQL Editor

-- Step 1: Enable extensions
CREATE EXTENSION IF NOT EXISTS http;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Step 2: Get Secret Key from Settings → API → Secret keys (sb_secret_...)
-- Replace YOUR_SERVICE_ROLE_KEY_HERE on line 28 with your actual Service Role Key

-- Step 3: Create function to call Edge Function
CREATE OR REPLACE FUNCTION send_reminders_cron()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  response jsonb;
  service_role_key text;
BEGIN
  -- Replace YOUR_SECRET_KEY_HERE with your Secret Key from Settings → API
  service_role_key := 'YOUR_SERVICE_ROLE_KEY_HERE';
  
  -- Call Edge Function
  BEGIN
    SELECT content::jsonb INTO response
    FROM http((
      'POST',
      'https://qvhcrarovkpmfferfigh.supabase.co/functions/v1/send-reminders',
      ARRAY[
        http_header('Content-Type', 'application/json'),
        http_header('Authorization', 'Bearer ' || service_role_key)
      ],
      'application/json',
      '{}'
    )::http_request);
    
    RAISE NOTICE 'Reminder send result: %', response;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error sending reminders: %', SQLERRM;
  END;
END;
$$;

-- Step 4: Schedule to run every minute
SELECT cron.schedule(
  'send-reminders-every-minute',
  '* * * * *',
  $$SELECT send_reminders_cron();$$
);

-- Useful commands:
-- View all cron jobs: SELECT * FROM cron.job;
-- View specific cron job: SELECT * FROM cron.job WHERE jobid = (SELECT jobid FROM cron.job WHERE schedule = '* * * * *' LIMIT 1);
-- View execution history: SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
-- Manual test: SELECT send_reminders_cron();
-- Remove cron job: SELECT cron.unschedule('send-reminders-every-minute');

