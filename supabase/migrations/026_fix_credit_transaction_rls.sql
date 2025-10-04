-- Fix RLS issue when awarding referral credits
-- The trigger needs to be able to insert credits for other users (referrers)

-- Option 1: Add a policy to allow service role to insert any credit transaction
CREATE POLICY "Service can insert credit transactions"
ON credit_transactions
FOR INSERT
TO service_role
WITH CHECK (true);

-- Option 2: Allow authenticated users to insert referral credits for others
-- This is safer as it only applies to referral_join type
CREATE POLICY "Users can award referral credits to others"
ON credit_transactions
FOR INSERT
TO authenticated
WITH CHECK (
  source = 'referral_join' OR
  source = 'others_joined' OR
  auth.uid() = user_id
);

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can create their own transactions" ON credit_transactions;

COMMENT ON POLICY "Users can award referral credits to others" ON credit_transactions IS
'Allows users to award referral credits to others when they join a chain, or create their own transactions';
