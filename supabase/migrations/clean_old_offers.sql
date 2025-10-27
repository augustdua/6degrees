-- ============================================================================
-- CLEAN OLD OFFERS - Reset for New Workflow
-- ============================================================================
-- This script removes all old offers that were created before the new approval workflow
-- Run this to start with a clean slate

-- ============================================================================
-- PART 1: BACKUP COUNT (for verification)
-- ============================================================================

SELECT 
  '===== BEFORE CLEANUP =====' as section;

SELECT 
  'offers' as table_name,
  COUNT(*) as record_count
FROM offers
UNION ALL
SELECT 
  'offer_connections',
  COUNT(*)
FROM offer_connections
UNION ALL
SELECT 
  'offer_bids',
  COUNT(*)
FROM offer_bids
UNION ALL
SELECT 
  'offer_availability',
  COUNT(*)
FROM offer_availability
UNION ALL
SELECT 
  'offer_likes',
  COUNT(*)
FROM offer_likes;

-- ============================================================================
-- PART 2: DELETE OLD DATA
-- ============================================================================

-- Note: Foreign key CASCADE will handle related records automatically
-- Order matters: delete in reverse dependency order for safety

DO $$
DECLARE
  v_deleted_intros INTEGER := 0;
  v_deleted_likes INTEGER;
  v_deleted_availability INTEGER;
  v_deleted_bids INTEGER;
  v_deleted_connections INTEGER;
  v_deleted_offers INTEGER;
BEGIN
  -- Delete intros (if table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'intros') THEN
    DELETE FROM intros;
    GET DIAGNOSTICS v_deleted_intros = ROW_COUNT;
    RAISE NOTICE '✅ Deleted % intros', v_deleted_intros;
  END IF;

  -- Delete offer_likes
  DELETE FROM offer_likes;
  GET DIAGNOSTICS v_deleted_likes = ROW_COUNT;
  RAISE NOTICE '✅ Deleted % offer_likes', v_deleted_likes;

  -- Delete offer_availability
  DELETE FROM offer_availability;
  GET DIAGNOSTICS v_deleted_availability = ROW_COUNT;
  RAISE NOTICE '✅ Deleted % offer_availability records', v_deleted_availability;

  -- Delete offer_bids
  DELETE FROM offer_bids;
  GET DIAGNOSTICS v_deleted_bids = ROW_COUNT;
  RAISE NOTICE '✅ Deleted % offer_bids', v_deleted_bids;

  -- Delete offer_connections
  DELETE FROM offer_connections;
  GET DIAGNOSTICS v_deleted_connections = ROW_COUNT;
  RAISE NOTICE '✅ Deleted % offer_connections', v_deleted_connections;

  -- Delete offers
  DELETE FROM offers;
  GET DIAGNOSTICS v_deleted_offers = ROW_COUNT;
  RAISE NOTICE '✅ Deleted % offers', v_deleted_offers;

  -- Summary
  RAISE NOTICE '';
  RAISE NOTICE '============================';
  RAISE NOTICE 'CLEANUP COMPLETE';
  RAISE NOTICE '============================';
  RAISE NOTICE 'Deleted: % offers', v_deleted_offers;
  RAISE NOTICE 'Deleted: % bids', v_deleted_bids;
  RAISE NOTICE 'Deleted: % connections', v_deleted_connections;
  RAISE NOTICE 'Deleted: % availability slots', v_deleted_availability;
  RAISE NOTICE 'Deleted: % likes', v_deleted_likes;
  IF v_deleted_intros > 0 THEN
    RAISE NOTICE 'Deleted: % intros', v_deleted_intros;
  END IF;
END $$;

-- ============================================================================
-- PART 3: VERIFY CLEANUP
-- ============================================================================

SELECT 
  '===== AFTER CLEANUP =====' as section;

SELECT 
  'offers' as table_name,
  COUNT(*) as record_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ Clean'
    ELSE '⚠️  Still has records'
  END as status
FROM offers
UNION ALL
SELECT 
  'offer_connections',
  COUNT(*),
  CASE WHEN COUNT(*) = 0 THEN '✅ Clean' ELSE '⚠️  Still has records' END
FROM offer_connections
UNION ALL
SELECT 
  'offer_bids',
  COUNT(*),
  CASE WHEN COUNT(*) = 0 THEN '✅ Clean' ELSE '⚠️  Still has records' END
FROM offer_bids
UNION ALL
SELECT 
  'offer_availability',
  COUNT(*),
  CASE WHEN COUNT(*) = 0 THEN '✅ Clean' ELSE '⚠️  Still has records' END
FROM offer_availability
UNION ALL
SELECT 
  'offer_likes',
  COUNT(*),
  CASE WHEN COUNT(*) = 0 THEN '✅ Clean' ELSE '⚠️  Still has records' END
FROM offer_likes;

-- ============================================================================
-- PART 4: RESET SEQUENCES (Optional)
-- ============================================================================

-- Reset any statistics on the tables
DO $$
BEGIN
  -- Update offers stats columns to 0 for any future records
  ALTER TABLE offers ALTER COLUMN total_bids_received SET DEFAULT 0;
  ALTER TABLE offers ALTER COLUMN total_bids_accepted SET DEFAULT 0;
  ALTER TABLE offers ALTER COLUMN total_successful_calls SET DEFAULT 0;
  
  RAISE NOTICE '✅ Reset table defaults';
END $$;

-- ============================================================================
-- PART 5: VERIFICATION SUMMARY
-- ============================================================================

SELECT 
  '🎉 CLEANUP COMPLETE!' as status,
  'All old offers and related data have been deleted' as message,
  'System ready for new offer workflow with approval flow' as next_step;

-- Check that tables still exist and are accessible
SELECT 
  'Table Structure Check' as verification,
  table_name,
  'EXISTS' as status
FROM information_schema.tables
WHERE table_name IN ('offers', 'offer_connections', 'offer_bids', 'offer_availability', 'offer_likes')
ORDER BY table_name;

-- ============================================================================
-- OPTIONAL: CREATE SAMPLE DATA (Uncomment to use)
-- ============================================================================

/*
-- This creates sample offers with proper structure
-- Replace USER_IDs with actual IDs from your database

-- First, check available users
SELECT 
  id,
  email,
  first_name || ' ' || last_name as name,
  company,
  role
FROM users
ORDER BY created_at DESC
LIMIT 10;

-- Example: Create a sample offer (uncomment and edit)
DO $$
DECLARE
  v_creator_id UUID := 'REPLACE_WITH_ACTUAL_USER_ID';
  v_connection_id UUID := 'REPLACE_WITH_ACTUAL_USER_ID';
  v_offer_id UUID;
  v_connection_record_id UUID;
BEGIN
  -- Verify users are connected
  IF NOT EXISTS (
    SELECT 1 FROM user_connections 
    WHERE status = 'connected'
      AND ((user1_id = v_creator_id AND user2_id = v_connection_id)
        OR (user1_id = v_connection_id AND user2_id = v_creator_id))
  ) THEN
    RAISE NOTICE '⚠️  Users are not connected. Creating connection...';
    
    INSERT INTO user_connections (user1_id, user2_id, status, created_at, updated_at)
    VALUES (v_creator_id, v_connection_id, 'connected', NOW(), NOW())
    ON CONFLICT DO NOTHING;
  END IF;

  -- Create sample offer
  INSERT INTO offers (
    offer_creator_id,
    connection_user_id,
    title,
    description,
    asking_price_inr,
    status,
    approved_by_target
  ) VALUES (
    v_creator_id,
    v_connection_id,
    '🎯 Sample Offer: Introduction to Tech Leader',
    'Connect with an experienced tech leader with 15+ years in Silicon Valley. Expert in product strategy and scaling startups.',
    5000,
    'pending_approval',
    FALSE
  )
  RETURNING id INTO v_offer_id;

  -- Create offer_connection
  INSERT INTO offer_connections (
    offer_id,
    connected_user_id,
    full_name,
    role_title,
    company,
    public_role,
    public_company,
    target_organization,
    target_position,
    target_logo_url,
    relationship_type,
    relationship_description
  )
  SELECT
    v_offer_id,
    v_connection_id,
    u.first_name || ' ' || u.last_name,
    'VP of Engineering',
    'Google',
    'VP of Engineering',
    'Google',
    'Google',
    'VP of Engineering',
    'https://logo.clearbit.com/google.com',
    'former_colleague',
    'Worked together at Microsoft for 3 years on cloud infrastructure'
  FROM users u
  WHERE u.id = v_connection_id
  RETURNING id INTO v_connection_record_id;

  RAISE NOTICE '✅ Created sample offer: %', v_offer_id;
  RAISE NOTICE '✅ Created offer_connection: %', v_connection_record_id;
  RAISE NOTICE '⚠️  Offer is pending_approval - needs target to approve';
END $$;
*/

-- ============================================================================
-- END OF CLEANUP SCRIPT
-- ============================================================================

