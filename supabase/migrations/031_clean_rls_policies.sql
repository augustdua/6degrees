-- Migration: Clean up all RLS policies to fix infinite recursion
--
-- Problem: Multiple overlapping policies with recursive EXISTS queries
-- causing infinite recursion for unauthenticated users.
--
-- Solution: Drop ALL old policies and create ONE clean policy without recursion.

-- Drop ALL existing SELECT policies
DROP POLICY IF EXISTS "Anonymous users can view active shareable requests" ON connection_requests;
DROP POLICY IF EXISTS "Creators can read" ON connection_requests;
DROP POLICY IF EXISTS "Users can view all active connection requests" ON connection_requests;
DROP POLICY IF EXISTS "Users can view requests they participate in" ON connection_requests;
DROP POLICY IF EXISTS "Users can view their own connection requests" ON connection_requests;

-- Create ONE clean policy for SELECT without any EXISTS recursion
CREATE POLICY "connection_requests_select_policy" ON connection_requests
    FOR SELECT
    USING (
        -- Public access: Active/pending requests that are not deleted and not expired
        (
            status IN ('pending', 'active')
            AND expires_at > now()
            AND deleted_at IS NULL
        )
        OR
        -- Authenticated users can see their own requests (any status)
        (auth.uid() IS NOT NULL AND creator_id = auth.uid())
    );

COMMENT ON POLICY "connection_requests_select_policy" ON connection_requests
IS 'Allows public viewing of active/pending requests, and authenticated users can view their own requests';
