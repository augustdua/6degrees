-- Comprehensive fix for target_claims authentication issues
-- This addresses the 403 Forbidden error for authenticated users

-- Step 1: Check current policies
SELECT 
    'BEFORE_FIX' as status,
    policyname,
    cmd as operation,
    permissive,
    roles,
    qual as condition,
    with_check as insert_check
FROM pg_policies 
WHERE tablename = 'target_claims'
ORDER BY policyname;

-- Step 2: Drop the problematic policy if it exists
DROP POLICY IF EXISTS "Users can create claims" ON public.target_claims;

-- Step 3: Create a more robust policy for authenticated users
CREATE POLICY "Authenticated users can create claims" ON public.target_claims
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND 
        auth.uid() = claimant_id
    );

-- Step 4: Ensure users can read their own claims
CREATE POLICY "Users can read their own claims" ON public.target_claims
    FOR SELECT USING (auth.uid() = claimant_id);

-- Step 5: Verify the policies were created
SELECT 
    'AFTER_FIX' as status,
    policyname,
    cmd as operation,
    permissive,
    roles,
    qual as condition,
    with_check as insert_check
FROM pg_policies 
WHERE tablename = 'target_claims'
ORDER BY policyname;

-- Step 6: Test the auth.uid() function (run this while logged in)
SELECT 
    'AUTH_TEST' as test_type,
    auth.uid() as current_user_id,
    CASE 
        WHEN auth.uid() IS NOT NULL THEN 'User is authenticated'
        ELSE 'User is anonymous'
    END as auth_status;

