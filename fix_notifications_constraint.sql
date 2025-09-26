-- First, let's see what notification types currently exist
SELECT DISTINCT type FROM public.notifications ORDER BY type;

-- Check current constraint
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name LIKE '%notifications%'
AND table_name = 'notifications';

-- See any notification types that would violate the new constraint
SELECT DISTINCT type
FROM public.notifications
WHERE type NOT IN ('chain_joined', 'target_claim', 'chain_approved', 'chain_rejected', 'reward_received', 'chain_reminder')
ORDER BY type;