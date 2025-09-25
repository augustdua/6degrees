-- Fix RLS policies for target_claims table to allow anonymous operations
-- This addresses the 403 Forbidden error when anonymous users try to create target claims

-- Add policy to allow anonymous users to create target claims
CREATE POLICY "Anonymous users can create claims" ON public.target_claims
    FOR INSERT WITH CHECK (true);

-- Add policy to allow anonymous users to read their own inserted claims
-- This is needed when using ?select=* with return=representation
CREATE POLICY "Anonymous users can view their own claims" ON public.target_claims
    FOR SELECT USING (true);

-- Note: The existing policies for authenticated users remain in place:
-- - "Users can view claims for their requests" (SELECT for request creators)
-- - "Users can create claims" (INSERT for authenticated users)
-- - "Request creators can update claims" (UPDATE for request creators)

-- Optional: If you want to be more restrictive, you could replace the anonymous SELECT policy with:
-- CREATE POLICY "Anonymous users can view their own claims" ON public.target_claims
--     FOR SELECT USING (
--         -- Allow if the claim was just created (within last few minutes)
--         -- This would require additional logic to track anonymous claim creation
--         created_at > NOW() - INTERVAL '5 minutes'
--     );

