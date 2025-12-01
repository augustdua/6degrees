-- ============================================================================
-- DEMO OFFERS OWNERSHIP MIGRATION
-- Ensures all demo offers are created by August Dua (app owner)
-- Created: 2025-12-01
-- ============================================================================

-- August Dua's user ID
DO $$
DECLARE
    august_id UUID := 'dddffff1-bfed-40a6-a99c-28dccb4c5014';
BEGIN
    -- Update all existing demo offers to be owned by August
    UPDATE public.offers
    SET 
        offer_creator_id = august_id,
        connection_user_id = august_id,
        updated_at = NOW()
    WHERE is_demo = TRUE
    AND offer_creator_id != august_id;

    -- Update all existing demo connection requests to be owned by August
    UPDATE public.connection_requests
    SET 
        creator_id = august_id,
        updated_at = NOW()
    WHERE is_demo = TRUE
    AND creator_id != august_id;

    RAISE NOTICE 'Updated demo offers and requests to be owned by August Dua';
END $$;

-- Add a comment documenting this policy
COMMENT ON COLUMN public.offers.is_demo IS 'Demo offers are always created by app owner (August Dua) for showcase purposes';

-- ============================================================================
-- COMPLETION
-- ============================================================================
SELECT 'Demo offers ownership migration completed' as status;

