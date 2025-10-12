-- Migration: Add likes_count and comments_count for video features
-- This migration adds denormalized count columns for performance
-- and sets up triggers to keep them in sync

-- ============================================
-- 1. Add likes_count to connection_requests
-- ============================================
ALTER TABLE public.connection_requests
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0 NOT NULL;

-- Create index for likes_count (useful for sorting/filtering)
CREATE INDEX IF NOT EXISTS idx_connection_requests_likes_count 
ON public.connection_requests(likes_count DESC) WHERE likes_count > 0;

-- ============================================
-- 2. Add comments_count to chains
-- ============================================
ALTER TABLE public.chains
ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0 NOT NULL;

-- Create index for comments_count
CREATE INDEX IF NOT EXISTS idx_chains_comments_count 
ON public.chains(comments_count DESC) WHERE comments_count > 0;

-- ============================================
-- 3. Backfill likes_count for connection_requests
-- ============================================
UPDATE public.connection_requests cr
SET likes_count = (
    SELECT COUNT(*)
    FROM public.chain_likes cl
    WHERE cl.request_id = cr.id
);

-- ============================================
-- 4. Backfill comments_count for chains
-- ============================================
UPDATE public.chains c
SET comments_count = (
    SELECT COUNT(*)
    FROM public.group_messages gm
    WHERE gm.chain_id = c.id
);

-- ============================================
-- 5. Create trigger function to update likes_count
-- ============================================
CREATE OR REPLACE FUNCTION update_request_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment likes_count when a like is added
        UPDATE public.connection_requests
        SET likes_count = likes_count + 1
        WHERE id = NEW.request_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement likes_count when a like is removed
        UPDATE public.connection_requests
        SET likes_count = GREATEST(likes_count - 1, 0)
        WHERE id = OLD.request_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. Create trigger to auto-update likes_count
-- ============================================
DROP TRIGGER IF EXISTS trg_update_request_likes_count ON public.chain_likes;

CREATE TRIGGER trg_update_request_likes_count
    AFTER INSERT OR DELETE ON public.chain_likes
    FOR EACH ROW
    EXECUTE FUNCTION update_request_likes_count();

-- ============================================
-- 7. Create trigger function to update comments_count
-- ============================================
CREATE OR REPLACE FUNCTION update_chain_comments_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment comments_count when a comment is added
        UPDATE public.chains
        SET comments_count = comments_count + 1
        WHERE id = NEW.chain_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement comments_count when a comment is removed
        UPDATE public.chains
        SET comments_count = GREATEST(comments_count - 1, 0)
        WHERE id = OLD.chain_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. Create trigger to auto-update comments_count
-- ============================================
DROP TRIGGER IF EXISTS trg_update_chain_comments_count ON public.group_messages;

CREATE TRIGGER trg_update_chain_comments_count
    AFTER INSERT OR DELETE ON public.group_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_chain_comments_count();

-- ============================================
-- 9. Add helpful comment to clarify chain_likes usage
-- ============================================
COMMENT ON TABLE public.chain_likes IS 'Stores likes for both chains and connection_requests (videos). Use request_id for video likes.';
COMMENT ON COLUMN public.chain_likes.request_id IS 'References connection_requests.id - use this for video likes feature';
COMMENT ON COLUMN public.chain_likes.chain_id IS 'References chains.id - use this for chain likes feature';

COMMENT ON TABLE public.group_messages IS 'Chain group chat messages (called "Comments" in the UI)';
COMMENT ON COLUMN public.chains.comments_count IS 'Denormalized count of group_messages for this chain (auto-updated by trigger)';
COMMENT ON COLUMN public.connection_requests.likes_count IS 'Denormalized count of likes for this request/video (auto-updated by trigger)';

-- ============================================
-- 10. Verify the migration
-- ============================================
DO $$
DECLARE
    total_requests INTEGER;
    requests_with_counts INTEGER;
    total_chains INTEGER;
    chains_with_counts INTEGER;
BEGIN
    -- Check connection_requests
    SELECT COUNT(*) INTO total_requests FROM public.connection_requests;
    SELECT COUNT(*) INTO requests_with_counts 
    FROM public.connection_requests 
    WHERE likes_count IS NOT NULL;
    
    -- Check chains
    SELECT COUNT(*) INTO total_chains FROM public.chains;
    SELECT COUNT(*) INTO chains_with_counts 
    FROM public.chains 
    WHERE comments_count IS NOT NULL;
    
    RAISE NOTICE '✅ Migration complete!';
    RAISE NOTICE '📊 Connection requests: % total, % with likes_count', total_requests, requests_with_counts;
    RAISE NOTICE '📊 Chains: % total, % with comments_count', total_chains, chains_with_counts;
    
    IF requests_with_counts = total_requests AND chains_with_counts = total_chains THEN
        RAISE NOTICE '✅ All counts successfully initialized!';
    ELSE
        RAISE WARNING '⚠️  Some counts may not be initialized properly';
    END IF;
END $$;

