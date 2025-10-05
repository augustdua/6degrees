-- Migration: Fix RLS policy to allow viewing pending requests in feed
-- The feed controller fetches both 'pending' and 'active' requests for the bids feed
-- But the RLS policy was only allowing 'active' requests to be publicly viewable

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can view requests they participate in" ON connection_requests;

-- Recreate with updated logic to allow both pending and active requests
CREATE POLICY "Users can view requests they participate in" ON connection_requests
    FOR SELECT
    USING (
        -- User is the creator
        creator_id = auth.uid()
        OR
        -- User is a participant in a chain for this request
        EXISTS (
            SELECT 1 FROM chains
            WHERE chains.request_id = connection_requests.id
            AND EXISTS (
                SELECT 1 FROM jsonb_array_elements(chains.participants) AS participant
                WHERE (participant->>'userid')::uuid = auth.uid()
            )
        )
        OR
        -- Request is publicly viewable (pending or active, not expired, not deleted)
        (
            status IN ('pending', 'active')
            AND expires_at > now()
            AND deleted_at IS NULL
        )
    );

COMMENT ON POLICY "Users can view requests they participate in" ON connection_requests
IS 'Users can view requests they created, requests they are participating in via chains, or active/pending public requests';
