-- Fix: Allow participants to view requests they're part of
-- Users should be able to see requests for chains they've joined

-- Drop the restrictive policies and create a comprehensive one
DROP POLICY IF EXISTS "Creators can read" ON connection_requests;
DROP POLICY IF EXISTS "Users can view their own connection requests" ON connection_requests;

-- Create a policy that allows users to view requests they're participating in
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
        -- Request is active and publicly viewable
        (status = 'active' AND expires_at > now() AND deleted_at IS NULL)
    );

COMMENT ON POLICY "Users can view requests they participate in" ON connection_requests
IS 'Users can view requests they created, requests they are participating in via chains, or active public requests';
