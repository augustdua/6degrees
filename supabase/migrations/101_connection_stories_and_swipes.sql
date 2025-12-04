-- Migration: Connection Stories & People Matching System
-- Purpose: Enable photo stories with featured connections + swipe-based matching

-- ============================================
-- 0. UPDATE INTRO_CALLS FOR MATCH CALLS
-- Add call_type and make offer_id nullable
-- ============================================

-- Add call_type column if not exists
ALTER TABLE intro_calls ADD COLUMN IF NOT EXISTS call_type TEXT DEFAULT 'offer_intro';
ALTER TABLE intro_calls ADD COLUMN IF NOT EXISTS duration_minutes INT DEFAULT 30;
ALTER TABLE intro_calls ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;

-- Make offer_id nullable for match calls (which don't have an offer)
ALTER TABLE intro_calls ALTER COLUMN offer_id DROP NOT NULL;

-- Add index for call_type
CREATE INDEX IF NOT EXISTS idx_intro_calls_call_type ON intro_calls(call_type);

-- ============================================
-- 1. CONNECTION STORIES TABLE
-- Photos with featured connections + how-they-met stories
-- ============================================

CREATE TABLE IF NOT EXISTS connection_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  featured_connection_id UUID REFERENCES users(id) ON DELETE SET NULL,
  featured_connection_name TEXT, -- For connections not on platform yet
  featured_connection_email TEXT, -- To link later when they join
  photo_url TEXT NOT NULL,
  story TEXT, -- 1-2 line story: "Met at Y Combinator Demo Day 2023"
  location TEXT, -- Optional: "San Francisco, CA"
  year INT, -- Optional: Year they met
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_connection_stories_user ON connection_stories(user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_connection_stories_featured ON connection_stories(featured_connection_id) WHERE featured_connection_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_connection_stories_display_order ON connection_stories(user_id, display_order);

-- ============================================
-- 2. PEOPLE SWIPES TABLE
-- Track left/right swipes on people page
-- ============================================

CREATE TABLE IF NOT EXISTS people_swipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  swiper_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  swiped_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('left', 'right')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Prevent duplicate swipes
  UNIQUE(swiper_id, swiped_id)
);

-- Indexes for match detection
CREATE INDEX IF NOT EXISTS idx_people_swipes_swiper ON people_swipes(swiper_id, direction);
CREATE INDEX IF NOT EXISTS idx_people_swipes_swiped ON people_swipes(swiped_id, direction);
CREATE INDEX IF NOT EXISTS idx_people_swipes_mutual ON people_swipes(swiped_id, swiper_id, direction) 
  WHERE direction = 'right';

-- ============================================
-- 3. PEOPLE MATCHES TABLE
-- Mutual right swipes = match
-- ============================================

CREATE TABLE IF NOT EXISTS people_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  matched_at TIMESTAMPTZ DEFAULT NOW(),
  -- Match status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'call_scheduled', 'call_completed', 'connected', 'expired')),
  -- Call scheduling
  call_scheduled_at TIMESTAMPTZ,
  call_id UUID REFERENCES intro_calls(id),
  -- Conversation
  conversation_started BOOLEAN DEFAULT false,
  -- Ensure user1_id < user2_id to prevent duplicates
  CONSTRAINT user_order CHECK (user1_id < user2_id),
  UNIQUE(user1_id, user2_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_people_matches_user1 ON people_matches(user1_id, status);
CREATE INDEX IF NOT EXISTS idx_people_matches_user2 ON people_matches(user2_id, status);
CREATE INDEX IF NOT EXISTS idx_people_matches_pending ON people_matches(status) WHERE status = 'pending';

-- ============================================
-- 4. STORAGE BUCKET FOR CONNECTION STORY PHOTOS
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'connection-stories',
  'connection-stories',
  true,  -- Public so images load without signed URLs
  10485760,  -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
DROP POLICY IF EXISTS "Users can upload connection story photos" ON storage.objects;
CREATE POLICY "Users can upload connection story photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'connection-stories' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Anyone can view connection story photos" ON storage.objects;
CREATE POLICY "Anyone can view connection story photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'connection-stories');

DROP POLICY IF EXISTS "Users can update their connection story photos" ON storage.objects;
CREATE POLICY "Users can update their connection story photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'connection-stories'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can delete their connection story photos" ON storage.objects;
CREATE POLICY "Users can delete their connection story photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'connection-stories'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================
-- 5. ROW LEVEL SECURITY POLICIES
-- ============================================

ALTER TABLE connection_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE people_swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE people_matches ENABLE ROW LEVEL SECURITY;

-- Connection Stories: Users can manage their own, anyone can view active ones
DROP POLICY IF EXISTS "Users can manage their own stories" ON connection_stories;
CREATE POLICY "Users can manage their own stories"
ON connection_stories FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Anyone can view active stories" ON connection_stories;
CREATE POLICY "Anyone can view active stories"
ON connection_stories FOR SELECT
TO authenticated
USING (is_active = true);

-- People Swipes: Users can only see/create their own swipes
DROP POLICY IF EXISTS "Users can manage their own swipes" ON people_swipes;
CREATE POLICY "Users can manage their own swipes"
ON people_swipes FOR ALL
TO authenticated
USING (swiper_id = auth.uid())
WITH CHECK (swiper_id = auth.uid());

-- People Matches: Users can see matches they're part of
DROP POLICY IF EXISTS "Users can view their matches" ON people_matches;
CREATE POLICY "Users can view their matches"
ON people_matches FOR SELECT
TO authenticated
USING (user1_id = auth.uid() OR user2_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their matches" ON people_matches;
CREATE POLICY "Users can update their matches"
ON people_matches FOR UPDATE
TO authenticated
USING (user1_id = auth.uid() OR user2_id = auth.uid());

-- ============================================
-- 6. FUNCTION: CHECK FOR MATCH AFTER SWIPE
-- ============================================

CREATE OR REPLACE FUNCTION check_for_match()
RETURNS TRIGGER AS $$
DECLARE
  v_mutual_swipe BOOLEAN;
  v_user1 UUID;
  v_user2 UUID;
  v_match_id UUID;
  v_intro_id UUID;
BEGIN
  -- Only check for right swipes
  IF NEW.direction != 'right' THEN
    RETURN NEW;
  END IF;

  -- Check if there's a mutual right swipe
  SELECT EXISTS(
    SELECT 1 FROM people_swipes
    WHERE swiper_id = NEW.swiped_id
      AND swiped_id = NEW.swiper_id
      AND direction = 'right'
  ) INTO v_mutual_swipe;

  IF v_mutual_swipe THEN
    -- Order user IDs consistently (smaller first)
    IF NEW.swiper_id < NEW.swiped_id THEN
      v_user1 := NEW.swiper_id;
      v_user2 := NEW.swiped_id;
    ELSE
      v_user1 := NEW.swiped_id;
      v_user2 := NEW.swiper_id;
    END IF;

    -- Create intro_call for the match (15 min networking call)
    INSERT INTO intro_calls (
      buyer_id,
      target_id,
      creator_id,
      status,
      call_type,
      duration_minutes
    ) VALUES (
      v_user1,        -- First user as buyer
      v_user2,        -- Second user as target
      v_user1,        -- Creator is the one who completed the match
      'pending',      -- Pending until scheduled
      'match_call',   -- Special type for match calls
      15              -- 15 minute call
    )
    RETURNING id INTO v_intro_id;

    -- Create match with intro reference
    INSERT INTO people_matches (user1_id, user2_id, call_id, status)
    VALUES (v_user1, v_user2, v_intro_id, 'pending')
    ON CONFLICT (user1_id, user2_id) DO UPDATE SET
      call_id = v_intro_id,
      status = 'pending';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to check for matches after each right swipe
DROP TRIGGER IF EXISTS trigger_check_match ON people_swipes;
CREATE TRIGGER trigger_check_match
AFTER INSERT ON people_swipes
FOR EACH ROW
EXECUTE FUNCTION check_for_match();

-- ============================================
-- 7. FUNCTION: GET SWIPEABLE USERS
-- Returns users for the swipe deck (excludes already swiped)
-- ============================================

CREATE OR REPLACE FUNCTION get_swipeable_users(
  p_user_id UUID,
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  last_name TEXT,
  bio TEXT,
  profile_picture_url TEXT,
  social_capital_score INT,
  mutual_orgs_count INT,
  connection_stories JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.first_name,
    u.last_name,
    u.bio,
    u.profile_picture_url,
    COALESCE(u.social_capital_score, 0)::INT as social_capital_score,
    -- Count mutual organizations
    (
      SELECT COUNT(DISTINCT uo1.organization_id)::INT
      FROM user_organizations uo1
      JOIN user_organizations uo2 ON uo1.organization_id = uo2.organization_id
      WHERE uo1.user_id = p_user_id AND uo2.user_id = u.id
    ) as mutual_orgs_count,
    -- Get their connection stories (limit 3)
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', cs.id,
            'photo_url', cs.photo_url,
            'story', cs.story,
            'featured_connection_name', COALESCE(
              fc.first_name || ' ' || fc.last_name,
              cs.featured_connection_name
            )
          )
          ORDER BY cs.display_order
        )
        FROM connection_stories cs
        LEFT JOIN users fc ON cs.featured_connection_id = fc.id
        WHERE cs.user_id = u.id AND cs.is_active = true
        LIMIT 3
      ),
      '[]'::jsonb
    ) as connection_stories
  FROM users u
  WHERE u.id != p_user_id
    AND u.is_discoverable = true
    -- Exclude users already swiped on
    AND NOT EXISTS (
      SELECT 1 FROM people_swipes ps
      WHERE ps.swiper_id = p_user_id AND ps.swiped_id = u.id
    )
    -- Exclude users already matched with
    AND NOT EXISTS (
      SELECT 1 FROM people_matches pm
      WHERE (pm.user1_id = p_user_id AND pm.user2_id = u.id)
         OR (pm.user1_id = u.id AND pm.user2_id = p_user_id)
    )
  ORDER BY 
    -- Prioritize users with connection stories
    CASE WHEN EXISTS (
      SELECT 1 FROM connection_stories cs WHERE cs.user_id = u.id AND cs.is_active = true
    ) THEN 0 ELSE 1 END,
    -- Then by social capital score
    u.social_capital_score DESC NULLS LAST,
    -- Some randomness for variety
    random()
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. FUNCTION: GET USER MATCHES
-- ============================================

CREATE OR REPLACE FUNCTION get_user_matches(p_user_id UUID)
RETURNS TABLE (
  match_id UUID,
  matched_user_id UUID,
  matched_user_name TEXT,
  matched_user_photo TEXT,
  matched_user_score INT,
  matched_at TIMESTAMPTZ,
  status TEXT,
  call_scheduled_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pm.id as match_id,
    CASE WHEN pm.user1_id = p_user_id THEN pm.user2_id ELSE pm.user1_id END as matched_user_id,
    u.first_name || ' ' || u.last_name as matched_user_name,
    u.profile_picture_url as matched_user_photo,
    COALESCE(u.social_capital_score, 0)::INT as matched_user_score,
    pm.matched_at,
    pm.status,
    pm.call_scheduled_at
  FROM people_matches pm
  JOIN users u ON u.id = CASE WHEN pm.user1_id = p_user_id THEN pm.user2_id ELSE pm.user1_id END
  WHERE pm.user1_id = p_user_id OR pm.user2_id = p_user_id
  ORDER BY pm.matched_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_swipeable_users(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_matches(UUID) TO authenticated;

-- ============================================
-- 9. UPDATE TIMESTAMP TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION update_connection_story_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_story_timestamp ON connection_stories;
CREATE TRIGGER trigger_update_story_timestamp
BEFORE UPDATE ON connection_stories
FOR EACH ROW
EXECUTE FUNCTION update_connection_story_timestamp();

-- ============================================
-- 10. ADD INDEXES FOR PERFORMANCE
-- ============================================

-- User organizations for mutual org lookup
CREATE INDEX IF NOT EXISTS idx_user_orgs_for_matching 
ON user_organizations(user_id, organization_id);

COMMENT ON TABLE connection_stories IS 'Photos with featured connections + how-they-met stories (like Hinge)';
COMMENT ON TABLE people_swipes IS 'Track left/right swipes for people matching';
COMMENT ON TABLE people_matches IS 'Mutual right swipes create matches for call scheduling';

