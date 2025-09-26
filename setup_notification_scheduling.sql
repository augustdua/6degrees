-- Setup automatic chain reminder notifications
-- Choose one of these scheduling options based on your Supabase setup

-- OPTION A: Using pg_cron (if available in your Supabase project)
-- Uncomment these lines if you have pg_cron enabled:

/*
-- Enable pg_cron extension (run this once)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule chain reminders every 30 minutes
-- This will find dead-end users (1+ hours old) and send reminders (with 24h cooldown)
SELECT cron.schedule(
  'chain-tail-reminders-30m',
  '*/30 * * * *',  -- Every 30 minutes
  $$ SELECT public.enqueue_chain_tail_reminders(1, 24); $$
);

-- View scheduled jobs
SELECT * FROM cron.job;

-- To remove the job later (if needed):
-- SELECT cron.unschedule('chain-tail-reminders-30m');
*/

-- OPTION B: Manual scheduling for testing
-- Run these manually to test the system:

-- Test: Find current dead-ends (0 hour minimum, 0 hour cooldown for testing)
SELECT 'Current dead-end participants:' as info;
SELECT user_id, chain_id, hours_since_joined
FROM public.find_unshared_chain_tails(0, 0)
ORDER BY hours_since_joined DESC;

-- Test: Create notifications for all current dead-ends
SELECT 'Creating test notifications...' as info;
SELECT public.enqueue_chain_tail_reminders(0, 0) as notifications_created;

-- Production: Find dead-ends (1+ hours old, 24h cooldown)
SELECT 'Production dead-ends (1h+, 24h cooldown):' as info;
SELECT user_id, chain_id, hours_since_joined
FROM public.find_unshared_chain_tails(1, 24)
ORDER BY hours_since_joined DESC;

-- Production: Create notifications (1+ hours old, 24h cooldown)
SELECT 'Creating production notifications...' as info;
SELECT public.enqueue_chain_tail_reminders(1, 24) as notifications_created;

-- Check recent notifications
SELECT 'Recent chain reminder notifications:' as info;
SELECT
  user_id,
  title,
  LEFT(message, 50) || '...' as message_preview,
  data->>'hours_since_joined' as hours,
  created_at
FROM public.notifications
WHERE type = 'chain_reminder'
ORDER BY created_at DESC
LIMIT 10;

-- OPTION C: Supabase Edge Function (Alternative)
-- Create an Edge Function that calls enqueue_chain_tail_reminders()
-- and schedule it with Supabase's cron functionality

-- RECOMMENDED SCHEDULE:
-- - Every 15-30 minutes during active hours (9 AM - 9 PM)
-- - Every 2 hours during off hours
-- - Parameters: 1 hour minimum age, 24 hour cooldown

-- TIMING EXAMPLES:
-- First reminder: 1 hour after joining (if no children)
-- Second reminder: 25 hours after joining (24h cooldown + 1h minimum)
-- Third reminder: 49 hours after joining (24h cooldown + 1h minimum)
-- Then stops (you can add a max_reminders check in the function if needed)