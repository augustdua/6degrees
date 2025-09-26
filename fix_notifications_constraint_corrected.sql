-- Fix notifications constraint to include all existing types plus chain_reminder
-- Based on your existing types: chain_rejected, claim_approved, reward_received, target_claim

-- 1) Drop the existing constraint
ALTER TABLE public.notifications
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- 2) Add the corrected constraint with all your existing types + chain_reminder
ALTER TABLE public.notifications
ADD CONSTRAINT notifications_type_check
CHECK (type IN (
  'chain_joined',
  'target_claim',
  'chain_approved',
  'chain_rejected',
  'reward_received',
  'claim_approved',     -- This was missing from my original list
  'chain_reminder'      -- New type we're adding
));

-- 3) Verify the constraint was added successfully
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_schema = 'public'
AND constraint_name = 'notifications_type_check';