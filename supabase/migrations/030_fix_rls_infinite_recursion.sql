-- Migration: Fix infinite recursion in RLS policy for unauthenticated users
--
-- Problem: When unauthenticated users (incognito mode) access shareable links,
-- the RLS policy checks auth.uid() conditions first, causing infinite recursion
-- in the EXISTS queries that check chains and participants.
--
-- Solution: Reorder the policy to check public access FIRST, so it short-circuits
-- before checking auth.uid()-dependent conditions for public requests.

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can view requests they participate in" ON connection_requests;

-- Recreate with public access check FIRST to prevent infinite recursion
CREATE POLICY "Users can view requests they participate in" ON connection_requests
    FOR SELECT
    USING (
        -- CHECK PUBLIC ACCESS FIRST (for unauthenticated users and shareable links)
        -- This prevents infinite recursion by short-circuiting before auth.uid() checks
        (
            status IN ('pending', 'active')
            AND expires_at > now()
            AND deleted_at IS NULL
        )
        OR
        -- User is the creator (only for authenticated users)
        (auth.uid() IS NOT NULL AND creator_id = auth.uid())
        OR
        -- User is a participant in a chain for this request (only for authenticated users)
        (
            auth.uid() IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM chains
                WHERE chains.request_id = connection_requests.id
                AND EXISTS (
                    SELECT 1 FROM jsonb_array_elements(chains.participants) AS participant
                    WHERE (participant->>'userid')::uuid = auth.uid()
                )
            )
        )
    );

COMMENT ON POLICY "Users can view requests they participate in" ON connection_requests
IS 'Public requests are checked first to avoid infinite recursion for unauthenticated users. Authenticated users can also view requests they created or participate in.';
