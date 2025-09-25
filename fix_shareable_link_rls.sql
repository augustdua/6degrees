-- Fix RLS policies to allow anonymous access to shareable links
-- This addresses the "Invite does not exist" error for shareable links

-- Add policy to allow anonymous users to view connection requests via shareable links
CREATE POLICY "Anonymous users can view active requests via shareable link" ON public.connection_requests
    FOR SELECT USING (
        status = 'active' 
        AND expires_at > NOW() 
        AND deleted_at IS NULL
        AND shareable_link IS NOT NULL
    );

-- Optional: If you want to be more restrictive, you could use:
-- CREATE POLICY "Anonymous users can view active requests via shareable link" ON public.connection_requests
--     FOR SELECT USING (
--         status = 'active' 
--         AND expires_at > NOW() 
--         AND deleted_at IS NULL
--         AND shareable_link IS NOT NULL
--         AND shareable_link LIKE '%/r/%'  -- Only allow links that look like shareable links
--     );

-- Verify the policies were created
SELECT 
    'POLICIES_CHECK' as check_type,
    policyname,
    cmd as operation,
    permissive,
    roles,
    qual as condition,
    with_check as insert_check
FROM pg_policies 
WHERE tablename = 'connection_requests'
ORDER BY policyname;

