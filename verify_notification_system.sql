-- Comprehensive verification of the notification system setup

\echo '=== CHECKING NOTIFICATIONS TABLE ==='
-- Check notifications table structure
\d+ notifications

\echo '=== CHECKING NOTIFICATION TYPE CONSTRAINT ==='
-- Check the type constraint
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_schema = 'public'
AND constraint_name = 'notifications_type_check';

\echo '=== CHECKING EXISTING NOTIFICATION TYPES ==='
-- Check what notification types exist
SELECT DISTINCT type, COUNT(*) as count
FROM public.notifications
GROUP BY type
ORDER BY type;

\echo '=== CHECKING NOTIFICATION FUNCTIONS ==='
-- Check if our functions exist
SELECT proname, prosrc IS NOT NULL as has_code
FROM pg_proc
WHERE proname IN ('find_unshared_chain_tails', 'enqueue_chain_tail_reminders');

\echo '=== CHECKING RECENT CHAIN_REMINDER NOTIFICATIONS ==='
-- Check recent chain reminder notifications
SELECT
  user_id,
  title,
  LEFT(message, 60) || '...' as message_preview,
  data->>'chain_id' as chain_id,
  data->>'hours_since_joined' as hours,
  created_at
FROM public.notifications
WHERE type = 'chain_reminder'
ORDER BY created_at DESC
LIMIT 5;

\echo '=== TESTING FIND DEAD-END FUNCTION ==='
-- Test the function to find dead-ends
SELECT
  'Dead-end participants found:' as info,
  COUNT(*) as total_count
FROM public.find_unshared_chain_tails(0, 0);

-- Show details of a few dead-ends
SELECT
  user_id,
  chain_id,
  hours_since_joined
FROM public.find_unshared_chain_tails(0, 0)
LIMIT 3;

\echo '=== CHECKING INDEXES ==='
-- Check if our notification index exists
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'notifications'
AND indexname LIKE '%chain_reminder%';

\echo '=== SYSTEM STATUS SUMMARY ==='
SELECT
  'Total notifications' as metric,
  COUNT(*) as value
FROM public.notifications
UNION ALL
SELECT
  'Chain reminder notifications',
  COUNT(*)
FROM public.notifications
WHERE type = 'chain_reminder'
UNION ALL
SELECT
  'Active chains',
  COUNT(*)
FROM public.chains
WHERE status = 'active'
UNION ALL
SELECT
  'Current dead-ends',
  COUNT(*)
FROM public.find_unshared_chain_tails(1, 24);

\echo '=== VERIFICATION COMPLETE ==='