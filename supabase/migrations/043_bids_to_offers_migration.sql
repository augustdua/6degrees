-- ============================================================================
-- BIDS TO OFFERS MIGRATION
-- Transforms marketplace from "bids" to "offers" with direct connections
-- Created: 2025-10-27
-- ============================================================================

-- ============================================================================
-- PART 1: RENAME TABLES (network_listings → offers)
-- ============================================================================

-- Rename main marketplace table
ALTER TABLE IF EXISTS network_listings RENAME TO offers;

-- Rename bids table
ALTER TABLE IF EXISTS listing_bids RENAME TO offer_bids;

-- Rename contacts/connections table
ALTER TABLE IF EXISTS listing_contacts RENAME TO offer_connections;

-- Rename likes table (already done in previous migration, but ensure consistency)
-- paynet_likes already exists and references network_listings, will update later

-- Rename availability table
ALTER TABLE IF EXISTS listing_availability RENAME TO offer_availability;

-- Rename intro_calls to intros
ALTER TABLE IF EXISTS intro_calls RENAME TO intros;

-- Rename reviews table foreign keys will be updated
-- Keep reviews table as is for now

-- ============================================================================
-- PART 2: UPDATE OFFERS TABLE STRUCTURE
-- ============================================================================

-- Rename seller_id to offer_creator_id for clarity (only if seller_id exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'offers' AND column_name = 'seller_id'
  ) THEN
    ALTER TABLE offers RENAME COLUMN seller_id TO offer_creator_id;
  END IF;
END $$;

-- Add connection_user_id column to link to actual platform user being offered
ALTER TABLE offers ADD COLUMN IF NOT EXISTS connection_user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Add approval tracking columns (only if they don't exist)
ALTER TABLE offers ADD COLUMN IF NOT EXISTS approved_by_target BOOLEAN DEFAULT FALSE;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS target_approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS target_rejected_at TIMESTAMP WITH TIME ZONE;

-- Update status constraint to include new statuses
ALTER TABLE offers DROP CONSTRAINT IF EXISTS network_listings_status_check;
ALTER TABLE offers DROP CONSTRAINT IF EXISTS offers_status_check;
ALTER TABLE offers ADD CONSTRAINT offers_status_check CHECK (status IN (
  'pending_approval', 'draft', 'active', 'paused', 'deleted', 'rejected'
));

-- Remove deposit/escrow complexity
ALTER TABLE offers DROP COLUMN IF EXISTS deposit_amount_inr CASCADE;
ALTER TABLE offers DROP COLUMN IF EXISTS verification_status CASCADE;
ALTER TABLE offers DROP COLUMN IF EXISTS verified_at CASCADE;

-- Update any existing prices below minimum to meet new constraint
UPDATE offers SET asking_price_inr = 100 WHERE asking_price_inr < 100;

-- Update constraint on asking_price (keep it flexible)
ALTER TABLE offers DROP CONSTRAINT IF EXISTS network_listings_asking_price_inr_check;
ALTER TABLE offers DROP CONSTRAINT IF EXISTS offers_asking_price_inr_check;
ALTER TABLE offers ADD CONSTRAINT offers_asking_price_inr_check CHECK (asking_price_inr >= 100);

-- Add index on connection_user_id
CREATE INDEX IF NOT EXISTS idx_offers_connection_user ON offers(connection_user_id);

-- Update existing indexes (rename from network_listings)
DROP INDEX IF EXISTS idx_network_listings_seller;
DROP INDEX IF EXISTS idx_network_listings_status;
DROP INDEX IF EXISTS idx_network_listings_verified;
DROP INDEX IF EXISTS idx_network_listings_rating;

-- Get the correct column name for creator
DO $$
DECLARE
  creator_column TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'offers' AND column_name = 'offer_creator_id') THEN
    creator_column := 'offer_creator_id';
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'offers' AND column_name = 'seller_id') THEN
    creator_column := 'seller_id';
  ELSE
    RAISE EXCEPTION 'Neither offer_creator_id nor seller_id column found in offers table';
  END IF;
  
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_offers_creator ON offers(%I)', creator_column);
END $$;

CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_offers_rating ON offers(average_rating DESC) WHERE average_rating IS NOT NULL;

-- ============================================================================
-- PART 3: UPDATE OFFER_CONNECTIONS TABLE
-- ============================================================================

-- Add connected_user_id to reference actual 6Degree platform user
ALTER TABLE offer_connections ADD COLUMN IF NOT EXISTS connected_user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Add new fields for organization info and relationship
ALTER TABLE offer_connections ADD COLUMN IF NOT EXISTS target_organization TEXT;
ALTER TABLE offer_connections ADD COLUMN IF NOT EXISTS target_position TEXT;
ALTER TABLE offer_connections ADD COLUMN IF NOT EXISTS target_logo_url TEXT;
ALTER TABLE offer_connections ADD COLUMN IF NOT EXISTS relationship_type TEXT CHECK (relationship_type IN (
  'former_colleague', 'current_colleague', 'mentor', 'friend', 'business_partner', 'family', 'other'
));
ALTER TABLE offer_connections ADD COLUMN IF NOT EXISTS relationship_description TEXT;

-- Remove photo verification fields
ALTER TABLE offer_connections DROP COLUMN IF EXISTS photo_url CASCADE;
ALTER TABLE offer_connections DROP COLUMN IF EXISTS verified CASCADE;
ALTER TABLE offer_connections DROP COLUMN IF EXISTS verified_at CASCADE;

-- Rename listing_id to offer_id (only if listing_id exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'offer_connections' AND column_name = 'listing_id'
  ) THEN
    ALTER TABLE offer_connections RENAME COLUMN listing_id TO offer_id;
  END IF;
END $$;

-- Update foreign key constraint
ALTER TABLE offer_connections DROP CONSTRAINT IF EXISTS listing_contacts_listing_id_fkey;
ALTER TABLE offer_connections DROP CONSTRAINT IF EXISTS offer_connections_offer_id_fkey;

-- Only add constraint if offer_id column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'offer_connections' AND column_name = 'offer_id'
  ) THEN
    ALTER TABLE offer_connections ADD CONSTRAINT offer_connections_offer_id_fkey 
      FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Update indexes
DROP INDEX IF EXISTS idx_listing_contacts_listing;
CREATE INDEX IF NOT EXISTS idx_offer_connections_offer ON offer_connections(offer_id);
CREATE INDEX IF NOT EXISTS idx_offer_connections_user ON offer_connections(connected_user_id);

-- ============================================================================
-- PART 4: UPDATE OFFER_BIDS TABLE
-- ============================================================================

-- Rename foreign key columns (only if they exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'offer_bids' AND column_name = 'listing_id'
  ) THEN
    ALTER TABLE offer_bids RENAME COLUMN listing_id TO offer_id;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'offer_bids' AND column_name = 'seller_id'
  ) THEN
    ALTER TABLE offer_bids RENAME COLUMN seller_id TO offer_creator_id;
  END IF;
END $$;

-- Update foreign key constraints
ALTER TABLE offer_bids DROP CONSTRAINT IF EXISTS listing_bids_listing_id_fkey;
ALTER TABLE offer_bids DROP CONSTRAINT IF EXISTS listing_bids_seller_id_fkey;
ALTER TABLE offer_bids DROP CONSTRAINT IF EXISTS offer_bids_offer_id_fkey;
ALTER TABLE offer_bids DROP CONSTRAINT IF EXISTS offer_bids_offer_creator_id_fkey;

ALTER TABLE offer_bids ADD CONSTRAINT offer_bids_offer_id_fkey 
  FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE;
ALTER TABLE offer_bids ADD CONSTRAINT offer_bids_offer_creator_id_fkey 
  FOREIGN KEY (offer_creator_id) REFERENCES users(id) ON DELETE CASCADE;

-- Update indexes
DROP INDEX IF EXISTS idx_listing_bids_listing;
DROP INDEX IF EXISTS idx_listing_bids_seller;
DROP INDEX IF EXISTS idx_listing_bids_buyer;
DROP INDEX IF EXISTS idx_listing_bids_status;
DROP INDEX IF EXISTS idx_listing_bids_created;

CREATE INDEX IF NOT EXISTS idx_offer_bids_offer ON offer_bids(offer_id);
CREATE INDEX IF NOT EXISTS idx_offer_bids_creator ON offer_bids(offer_creator_id);
CREATE INDEX IF NOT EXISTS idx_offer_bids_buyer ON offer_bids(buyer_id);
CREATE INDEX IF NOT EXISTS idx_offer_bids_status ON offer_bids(status);
CREATE INDEX IF NOT EXISTS idx_offer_bids_created ON offer_bids(created_at DESC);

-- ============================================================================
-- PART 5: UPDATE OFFER_AVAILABILITY TABLE
-- ============================================================================

-- Rename foreign key columns (only if they exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'offer_availability' AND column_name = 'listing_id'
  ) THEN
    ALTER TABLE offer_availability RENAME COLUMN listing_id TO offer_id;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'offer_availability' AND column_name = 'seller_id'
  ) THEN
    ALTER TABLE offer_availability RENAME COLUMN seller_id TO offer_creator_id;
  END IF;
END $$;

-- Update foreign key constraints
ALTER TABLE offer_availability DROP CONSTRAINT IF EXISTS listing_availability_listing_id_fkey;
ALTER TABLE offer_availability DROP CONSTRAINT IF EXISTS offer_availability_offer_id_fkey;

ALTER TABLE offer_availability ADD CONSTRAINT offer_availability_offer_id_fkey 
  FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE;

-- Update indexes
DROP INDEX IF EXISTS idx_availability_listing;
CREATE INDEX IF NOT EXISTS idx_offer_availability_offer ON offer_availability(offer_id);

-- ============================================================================
-- PART 6: UPDATE INTROS TABLE (formerly intro_calls)
-- ============================================================================

-- Only proceed if intros table exists (either already renamed or will be created)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'intros'
  ) THEN
    -- Rename columns (only if they exist)
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'intros' AND column_name = 'listing_id'
    ) THEN
      ALTER TABLE intros RENAME COLUMN listing_id TO offer_id;
    END IF;
    
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'intros' AND column_name = 'seller_id'
    ) THEN
      ALTER TABLE intros RENAME COLUMN seller_id TO offer_creator_id;
    END IF;

    -- Add AI copilot integration fields
    ALTER TABLE intros ADD COLUMN IF NOT EXISTS pipecat_session_id TEXT;
    ALTER TABLE intros ADD COLUMN IF NOT EXISTS ai_transcript TEXT;

    -- Simplify status (remove no-show tracking)
    ALTER TABLE intros DROP COLUMN IF EXISTS seller_joined CASCADE;
    ALTER TABLE intros DROP COLUMN IF EXISTS buyer_joined CASCADE;
    ALTER TABLE intros DROP COLUMN IF EXISTS target_joined CASCADE;

    -- Update status constraint to match simplified flow
    ALTER TABLE intros DROP CONSTRAINT IF EXISTS intro_calls_status_check;
    ALTER TABLE intros DROP CONSTRAINT IF EXISTS intros_status_check;
    ALTER TABLE intros ADD CONSTRAINT intros_status_check 
      CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show'));

    -- Update foreign key constraints
    ALTER TABLE intros DROP CONSTRAINT IF EXISTS intro_calls_listing_id_fkey;
    ALTER TABLE intros DROP CONSTRAINT IF EXISTS intro_calls_seller_id_fkey;
    ALTER TABLE intros DROP CONSTRAINT IF EXISTS intro_calls_target_contact_id_fkey;
    ALTER TABLE intros DROP CONSTRAINT IF EXISTS intros_offer_id_fkey;
    ALTER TABLE intros DROP CONSTRAINT IF EXISTS intros_offer_creator_id_fkey;
    ALTER TABLE intros DROP CONSTRAINT IF EXISTS intros_target_contact_id_fkey;

    ALTER TABLE intros ADD CONSTRAINT intros_offer_id_fkey 
      FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE;
    ALTER TABLE intros ADD CONSTRAINT intros_offer_creator_id_fkey 
      FOREIGN KEY (offer_creator_id) REFERENCES users(id) ON DELETE CASCADE;
    ALTER TABLE intros ADD CONSTRAINT intros_target_contact_id_fkey 
      FOREIGN KEY (target_contact_id) REFERENCES offer_connections(id) ON DELETE CASCADE;

    -- Update indexes
    DROP INDEX IF EXISTS idx_intro_calls_listing;
    DROP INDEX IF EXISTS idx_intro_calls_seller;
    DROP INDEX IF EXISTS idx_intro_calls_buyer;

    CREATE INDEX IF NOT EXISTS idx_intros_offer ON intros(offer_id);
    CREATE INDEX IF NOT EXISTS idx_intros_creator ON intros(offer_creator_id);
    CREATE INDEX IF NOT EXISTS idx_intros_buyer ON intros(buyer_id);
    CREATE INDEX IF NOT EXISTS idx_intros_scheduled ON intros(scheduled_start);
  END IF;
END $$;

-- ============================================================================
-- PART 7: UPDATE PAYNET_LIKES TABLE
-- ============================================================================

-- Rename paynet_likes to offer_likes (only if paynet_likes exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'paynet_likes'
  ) THEN
    ALTER TABLE paynet_likes RENAME TO offer_likes;
  END IF;
END $$;

-- Update foreign key to point to offers (only if listing_id exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'offer_likes' AND column_name = 'listing_id'
  ) THEN
    ALTER TABLE offer_likes RENAME COLUMN listing_id TO offer_id;
  END IF;
END $$;

ALTER TABLE offer_likes DROP CONSTRAINT IF EXISTS paynet_likes_listing_id_fkey;
ALTER TABLE offer_likes DROP CONSTRAINT IF EXISTS offer_likes_listing_id_fkey;
ALTER TABLE offer_likes DROP CONSTRAINT IF EXISTS offer_likes_offer_id_fkey;
ALTER TABLE offer_likes ADD CONSTRAINT offer_likes_offer_id_fkey 
  FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE;

-- Update indexes
DROP INDEX IF EXISTS idx_paynet_likes_listing;
DROP INDEX IF EXISTS idx_paynet_likes_user;
CREATE INDEX IF NOT EXISTS idx_offer_likes_offer ON offer_likes(offer_id);
CREATE INDEX IF NOT EXISTS idx_offer_likes_user ON offer_likes(user_id);

-- ============================================================================
-- PART 8: UPDATE REVIEWS TABLE
-- ============================================================================

-- Rename foreign key columns (only if listing_id exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reviews' AND column_name = 'listing_id'
  ) THEN
    ALTER TABLE reviews RENAME COLUMN listing_id TO offer_id;
  END IF;
END $$;

-- Update foreign key constraint
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_listing_id_fkey;
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_offer_id_fkey;
ALTER TABLE reviews ADD CONSTRAINT reviews_offer_id_fkey 
  FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE;

-- Update indexes
DROP INDEX IF EXISTS idx_reviews_listing;
CREATE INDEX IF NOT EXISTS idx_reviews_offer ON reviews(offer_id);

-- ============================================================================
-- PART 9: DROP BROKER & VERIFICATION TABLES
-- ============================================================================

-- Drop verification tables (no longer needed)
DROP TABLE IF EXISTS ai_verification_reports CASCADE;
DROP TABLE IF EXISTS persona_verifications CASCADE;
DROP TABLE IF EXISTS broker_verifications CASCADE;

-- Drop escrow tables (simplified payment model)
DROP TABLE IF EXISTS escrow_transactions CASCADE;
DROP TABLE IF EXISTS seller_deposits CASCADE;

-- Remove is_broker column from users
ALTER TABLE users DROP COLUMN IF EXISTS is_broker CASCADE;

-- ============================================================================
-- PART 10: UPDATE RLS POLICIES
-- ============================================================================

-- Drop old policies
DROP POLICY IF EXISTS "Anyone can view active listings" ON offers;
DROP POLICY IF EXISTS "Sellers can view their own listings" ON offers;
DROP POLICY IF EXISTS "Sellers can create listings" ON offers;
DROP POLICY IF EXISTS "Sellers can update their own listings" ON offers;
DROP POLICY IF EXISTS "Sellers can delete their own listings" ON offers;
DROP POLICY IF EXISTS "Anyone can view active offers" ON offers;
DROP POLICY IF EXISTS "Offer creators can view their own offers" ON offers;
DROP POLICY IF EXISTS "Users can create offers" ON offers;
DROP POLICY IF EXISTS "Offer creators can update their own offers" ON offers;
DROP POLICY IF EXISTS "Offer creators can delete their own offers" ON offers;

-- Create new policies for offers
CREATE POLICY "Anyone can view active offers" ON offers
  FOR SELECT USING (status = 'active');

CREATE POLICY "Offer creators can view their own offers" ON offers
  FOR SELECT USING (auth.uid() = offer_creator_id);

CREATE POLICY "Users can create offers" ON offers
  FOR INSERT WITH CHECK (auth.uid() = offer_creator_id);

CREATE POLICY "Offer creators can update their own offers" ON offers
  FOR UPDATE USING (auth.uid() = offer_creator_id);

CREATE POLICY "Offer creators can delete their own offers" ON offers
  FOR DELETE USING (auth.uid() = offer_creator_id);

-- Update offer_connections policies
DROP POLICY IF EXISTS "Anyone can view public contact info" ON offer_connections;
DROP POLICY IF EXISTS "Sellers can manage their listing contacts" ON offer_connections;
DROP POLICY IF EXISTS "Anyone can view public connection info" ON offer_connections;
DROP POLICY IF EXISTS "Offer creators can manage their connections" ON offer_connections;

CREATE POLICY "Anyone can view public connection info" ON offer_connections
  FOR SELECT USING (
    offer_id IN (SELECT id FROM offers WHERE status = 'active')
  );

CREATE POLICY "Offer creators can manage their connections" ON offer_connections
  FOR ALL USING (
    offer_id IN (SELECT id FROM offers WHERE offer_creator_id = auth.uid())
  );

-- Update offer_bids policies
DROP POLICY IF EXISTS "Buyers can view their own bids" ON offer_bids;
DROP POLICY IF EXISTS "Sellers can view bids on their listings" ON offer_bids;
DROP POLICY IF EXISTS "Buyers can create bids" ON offer_bids;
DROP POLICY IF EXISTS "Sellers can update bids on their listings" ON offer_bids;
DROP POLICY IF EXISTS "Offer creators can view bids on their offers" ON offer_bids;
DROP POLICY IF EXISTS "Offer creators can update bids on their offers" ON offer_bids;

CREATE POLICY "Buyers can view their own bids" ON offer_bids
  FOR SELECT USING (auth.uid() = buyer_id);

CREATE POLICY "Offer creators can view bids on their offers" ON offer_bids
  FOR SELECT USING (auth.uid() = offer_creator_id);

CREATE POLICY "Buyers can create bids" ON offer_bids
  FOR INSERT WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Offer creators can update bids on their offers" ON offer_bids
  FOR UPDATE USING (auth.uid() = offer_creator_id);

-- Update offer_availability policies
DROP POLICY IF EXISTS "Anyone can view listing availability" ON offer_availability;
DROP POLICY IF EXISTS "Sellers can manage their availability" ON offer_availability;
DROP POLICY IF EXISTS "Anyone can view offer availability" ON offer_availability;
DROP POLICY IF EXISTS "Offer creators can manage their availability" ON offer_availability;

CREATE POLICY "Anyone can view offer availability" ON offer_availability
  FOR SELECT USING (
    offer_id IN (SELECT id FROM offers WHERE status = 'active')
  );

CREATE POLICY "Offer creators can manage their availability" ON offer_availability
  FOR ALL USING (auth.uid() = offer_creator_id);

-- Update intros policies (only if table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'intros'
  ) THEN
    DROP POLICY IF EXISTS "Participants can view their calls" ON intros;
    DROP POLICY IF EXISTS "Participants can view their consultations" ON intros;
    DROP POLICY IF EXISTS "Participants can view their intros" ON intros;

    CREATE POLICY "Participants can view their intros" ON intros
      FOR SELECT USING (
        auth.uid() = offer_creator_id OR
        auth.uid() = buyer_id
      );
  END IF;
END $$;

-- Update offer_likes policies
DROP POLICY IF EXISTS "Anyone can view likes" ON offer_likes;
DROP POLICY IF EXISTS "Users can like listings" ON offer_likes;
DROP POLICY IF EXISTS "Users can unlike listings" ON offer_likes;
DROP POLICY IF EXISTS "Users can like offers" ON offer_likes;
DROP POLICY IF EXISTS "Users can unlike offers" ON offer_likes;

CREATE POLICY "Anyone can view likes" ON offer_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can like offers" ON offer_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike offers" ON offer_likes
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- PART 11: UPDATE TRIGGERS AND FUNCTIONS
-- ============================================================================

-- Drop old triggers
DROP TRIGGER IF EXISTS trigger_update_listing_stats ON offer_bids;
DROP TRIGGER IF EXISTS trigger_update_seller_stats ON offer_bids;
DROP TRIGGER IF EXISTS trigger_update_listing_rating ON reviews;
DROP TRIGGER IF EXISTS trigger_update_listing_likes ON offer_likes;
DROP TRIGGER IF EXISTS trigger_update_offer_stats ON offer_bids;
DROP TRIGGER IF EXISTS trigger_update_offer_creator_stats ON offer_bids;
DROP TRIGGER IF EXISTS trigger_update_offer_rating ON reviews;
DROP TRIGGER IF EXISTS trigger_update_offer_likes_count ON offer_likes;

-- Update function to use new table names
CREATE OR REPLACE FUNCTION update_offer_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE offers
    SET total_bids_received = total_bids_received + 1
    WHERE id = NEW.offer_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != 'accepted' AND NEW.status = 'accepted' THEN
      UPDATE offers
      SET total_bids_accepted = total_bids_accepted + 1
      WHERE id = NEW.offer_id;
    END IF;
    IF OLD.status != 'verified_success' AND NEW.status = 'verified_success' THEN
      UPDATE offers
      SET total_successful_calls = total_successful_calls + 1
      WHERE id = NEW.offer_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_offer_stats
AFTER INSERT OR UPDATE ON offer_bids
FOR EACH ROW
EXECUTE FUNCTION update_offer_stats();

-- Update seller stats function
CREATE OR REPLACE FUNCTION update_offer_creator_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'verified_success' THEN
    UPDATE users
    SET
      seller_total_calls = seller_total_calls + 1,
      seller_successful_calls = seller_successful_calls + 1
    WHERE id = NEW.offer_creator_id;
  ELSIF NEW.status = 'verified_failure' THEN
    UPDATE users
    SET seller_total_calls = seller_total_calls + 1
    WHERE id = NEW.offer_creator_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_offer_creator_stats
AFTER UPDATE ON offer_bids
FOR EACH ROW
WHEN (OLD.status != NEW.status AND NEW.status IN ('verified_success', 'verified_failure'))
EXECUTE FUNCTION update_offer_creator_stats();

-- Update rating function
CREATE OR REPLACE FUNCTION update_offer_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE offers
  SET average_rating = (
    SELECT AVG(rating)::NUMERIC(3,2)
    FROM reviews
    WHERE offer_id = NEW.offer_id
  )
  WHERE id = NEW.offer_id;

  UPDATE users
  SET seller_rating = (
    SELECT AVG(rating)::NUMERIC(3,2)
    FROM reviews
    WHERE reviewed_id = NEW.reviewed_id AND reviewer_role = 'buyer'
  )
  WHERE id = NEW.reviewed_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_offer_rating
AFTER INSERT OR UPDATE ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_offer_rating();

-- Update likes count function
CREATE OR REPLACE FUNCTION update_offer_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE offers
    SET updated_at = NOW()
    WHERE id = NEW.offer_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE offers
    SET updated_at = NOW()
    WHERE id = OLD.offer_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_offer_likes_count
AFTER INSERT OR DELETE ON offer_likes
FOR EACH ROW
EXECUTE FUNCTION update_offer_likes_count();

-- ============================================================================
-- PART 12: UPDATE BACKWARD COMPATIBILITY VIEWS
-- ============================================================================

-- Drop old views
DROP VIEW IF EXISTS bids CASCADE;
DROP VIEW IF EXISTS bid_responses CASCADE;

-- Create new views pointing to offers
CREATE OR REPLACE VIEW bids AS
SELECT
  id,
  offer_creator_id as creator_id,
  title,
  description,
  'general'::text as connection_type,
  asking_price_inr as price,
  status,
  created_at,
  updated_at
FROM offers
WHERE status IN ('active', 'paused', 'draft');

CREATE OR REPLACE VIEW bid_responses AS
SELECT
  id,
  offer_id as bid_id,
  buyer_id as responder_id,
  NULL::text as message,
  status,
  created_at
FROM offer_bids;

-- ============================================================================
-- PART 13: GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions on new tables
GRANT SELECT, INSERT, UPDATE, DELETE ON offers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON offer_connections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON offer_availability TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON offer_bids TO authenticated;
GRANT SELECT, INSERT, DELETE ON offer_likes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON reviews TO authenticated;

-- Grant permissions on intros table (only if it exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'intros'
  ) THEN
    GRANT SELECT ON intros TO authenticated;
  END IF;
END $$;

-- Grant on views
GRANT SELECT ON bids TO authenticated;
GRANT SELECT ON bid_responses TO authenticated;

-- ============================================================================
-- PART 14: ADD COMMENTS
-- ============================================================================

COMMENT ON TABLE offers IS 'User offers to connect others to their first-degree connections on 6Degree platform';
COMMENT ON TABLE offer_connections IS 'Platform users that offer creators can connect buyers to (must be in user_connections)';
COMMENT ON TABLE offer_bids IS 'Buyer bids on connection offers';
COMMENT ON TABLE offer_availability IS 'Calendar slots for scheduling intros';
COMMENT ON TABLE offer_likes IS 'User likes on offers';
COMMENT ON COLUMN offers.connection_user_id IS 'The 6Degree platform user being offered for connection';
COMMENT ON COLUMN offers.offer_creator_id IS 'User who created the offer (must be connected to connection_user_id)';
COMMENT ON COLUMN offer_connections.connected_user_id IS 'Reference to actual 6Degree platform user';

-- Add comments for intros table (only if it exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'intros'
  ) THEN
    COMMENT ON TABLE intros IS 'Scheduled 3-way intro calls with AI copilot moderation';
    COMMENT ON COLUMN intros.pipecat_session_id IS 'Pipecat AI copilot session identifier';
  END IF;
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 043: Bids to Offers migration completed successfully';
  RAISE NOTICE '   - Renamed network_listings → offers';
  RAISE NOTICE '   - Renamed listing_bids → offer_bids';
  RAISE NOTICE '   - Renamed listing_contacts → offer_connections';
  RAISE NOTICE '   - Renamed intro_calls → consultations';
  RAISE NOTICE '   - Removed broker & verification tables';
  RAISE NOTICE '   - Updated all foreign keys, indexes, and policies';
  RAISE NOTICE '   - Maintained backward compatibility with views';
END $$;

