-- Add 'deleted' status to connection_requests
ALTER TABLE public.connection_requests
    DROP CONSTRAINT connection_requests_status_check;

ALTER TABLE public.connection_requests
    ADD CONSTRAINT connection_requests_status_check
    CHECK (status IN ('active', 'completed', 'expired', 'cancelled', 'deleted'));

-- Add missing DELETE policies for RLS

-- Connection requests DELETE policy
CREATE POLICY "Users can delete their own connection requests" ON public.connection_requests
    FOR DELETE USING (auth.uid() = creator_id);

-- Chains DELETE policy
CREATE POLICY "Users can delete chains for their own requests" ON public.chains
    FOR DELETE USING (
        request_id IN (
            SELECT id FROM public.connection_requests WHERE creator_id = auth.uid()
        )
    );

-- Rewards DELETE policy
CREATE POLICY "Users can delete their own rewards" ON public.rewards
    FOR DELETE USING (auth.uid() = user_id);

-- Target claims DELETE policy
CREATE POLICY "Request creators can delete claims for their requests" ON public.target_claims
    FOR DELETE USING (
        request_id IN (
            SELECT id FROM public.connection_requests WHERE creator_id = auth.uid()
        )
    );

-- Invites DELETE policy
CREATE POLICY "Users can delete invites they sent" ON public.invites
    FOR DELETE USING (auth.uid() = inviter_id);

-- Notifications DELETE policy
CREATE POLICY "Users can delete their own notifications" ON public.notifications
    FOR DELETE USING (auth.uid() = user_id);