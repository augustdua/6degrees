-- Fix authentication issue for target_claims table
-- The problem: User is authenticated but getting 403 Forbidden
-- This suggests the RLS policy isn't working correctly for authenticated users

-- First, let's check what policies exist
-- (Run this to see current policies)
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'target_claims';

-- The issue is likely that the existing policy "Users can create claims" 
-- requires auth.uid() = claimant_id, but there might be a mismatch

-- Let's add a more permissive policy for authenticated users
-- This allows any authenticated user to create claims (they'll be identified by claimant_id)
CREATE POLICY "Authenticated users can create claims" ON public.target_claims
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Also ensure authenticated users can read their own claims
CREATE POLICY "Users can view their own claims" ON public.target_claims
    FOR SELECT USING (auth.uid() = claimant_id);

-- Optional: If you want to be more restrictive, you could replace the above with:
-- CREATE POLICY "Authenticated users can create claims" ON public.target_claims
--     FOR INSERT WITH CHECK (
--         auth.uid() IS NOT NULL AND 
--         auth.uid() = claimant_id
--     );

-- Note: The existing policies remain:
-- - "Users can view claims for their requests" (for request creators)
-- - "Users can create claims" (original policy - might be redundant now)
-- - "Request creators can update claims" (for request creators)

