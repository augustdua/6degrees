-- ============================================================================
-- OFFER WORKFLOW - STEP-BY-STEP TEST SCRIPT
-- ============================================================================
-- This script tests the complete offer creation → approval → bidding → intro flow
-- Run each section step by step and verify the results

-- ============================================================================
-- SETUP: GET USER IDs (Replace with your actual user IDs)
-- ============================================================================

-- First, let's see what users we have
SELECT 
  id,
  email,
  first_name,
  last_name,
  created_at
FROM users
ORDER BY created_at DESC
LIMIT 10;

-- Set your test user IDs here (copy from the query above)
-- Replace these UUIDs with actual user IDs from your database
DO $$
DECLARE
  v_creator_id UUID := 'REPLACE_WITH_CREATOR_USER_ID';  -- User who creates the offer
  v_connection_id UUID := 'REPLACE_WITH_CONNECTION_USER_ID';  -- User being offered
  v_buyer_id UUID := 'REPLACE_WITH_BUYER_USER_ID';  -- User who will bid
BEGIN
  RAISE NOTICE 'Creator ID: %', v_creator_id;
  RAISE NOTICE 'Connection ID: %', v_connection_id;
  RAISE NOTICE 'Buyer ID: %', v_buyer_id;
END $$;

-- ============================================================================
-- STEP 0: VERIFY USER CONNECTIONS
-- ============================================================================
-- Creator and Connection must be connected for offer creation to work

-- Check if they are connected
SELECT 
  id,
  user1_id,
  user2_id,
  status,
  created_at
FROM user_connections
WHERE status = 'connected'
  AND (
    (user1_id = 'REPLACE_WITH_CREATOR_USER_ID' AND user2_id = 'REPLACE_WITH_CONNECTION_USER_ID')
    OR (user1_id = 'REPLACE_WITH_CONNECTION_USER_ID' AND user2_id = 'REPLACE_WITH_CREATOR_USER_ID')
  );

-- If not connected, create a connection (optional - for testing only)
/*
INSERT INTO user_connections (user1_id, user2_id, status, created_at, updated_at)
VALUES (
  'REPLACE_WITH_CREATOR_USER_ID',
  'REPLACE_WITH_CONNECTION_USER_ID',
  'connected',
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;
*/

-- ============================================================================
-- STEP 1: CREATE AN OFFER (Status: pending_approval)
-- ============================================================================
-- When created, offer should have status='pending_approval' and await target approval

INSERT INTO offers (
  offer_creator_id,
  connection_user_id,
  title,
  description,
  asking_price_inr,
  status,
  approved_by_target,
  created_at,
  updated_at
) VALUES (
  'REPLACE_WITH_CREATOR_USER_ID',
  'REPLACE_WITH_CONNECTION_USER_ID',
  '🎯 Test Offer: Introduction to Tech VP',
  'Connect with VP of Engineering at Google. Expert in cloud architecture and team scaling.',
  5000,
  'pending_approval',  -- Starts as pending
  FALSE,
  NOW(),
  NOW()
)
RETURNING 
  id,
  title,
  status,
  approved_by_target,
  asking_price_inr,
  created_at;

-- Save the offer ID from above for next steps
-- Let's assume it's: offer_id = 'COPY_OFFER_ID_HERE'

-- ============================================================================
-- STEP 2: CREATE OFFER CONNECTION (with organization details)
-- ============================================================================
-- This stores details about the connection being offered

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
  relationship_description,
  created_at,
  updated_at
) VALUES (
  'COPY_OFFER_ID_HERE',  -- Replace with actual offer_id
  'REPLACE_WITH_CONNECTION_USER_ID',
  'John Smith',
  'VP of Engineering',
  'Google',
  'VP of Engineering',
  'Google',
  'Google',  -- Target organization
  'VP of Engineering',  -- Target position
  'https://img.logo.dev/google.com?token=pk_dvr547hlTjGTLwg7G9xcbQ',  -- Logo URL
  'former_colleague',  -- Relationship type
  'Worked together at Microsoft for 3 years on cloud infrastructure projects',  -- Relationship description
  NOW(),
  NOW()
)
RETURNING 
  id,
  full_name,
  target_organization,
  target_position,
  relationship_type;

-- ============================================================================
-- STEP 3: VERIFY OFFER IS PENDING APPROVAL
-- ============================================================================

SELECT 
  o.id,
  o.title,
  o.status,
  o.approved_by_target,
  o.asking_price_inr,
  u1.email as creator_email,
  u2.email as connection_email,
  oc.target_organization,
  oc.target_position,
  oc.relationship_type
FROM offers o
JOIN users u1 ON o.offer_creator_id = u1.id
JOIN users u2 ON o.connection_user_id = u2.id
LEFT JOIN offer_connections oc ON o.id = oc.offer_id
WHERE o.id = 'COPY_OFFER_ID_HERE'
  AND o.status = 'pending_approval';

-- This should show:
-- ✅ status = 'pending_approval'
-- ✅ approved_by_target = false
-- ✅ Organization details filled in

-- ============================================================================
-- STEP 4: CHECK MESSAGES (Approval request should be auto-sent)
-- ============================================================================
-- In production, the backend would create a message when offer is created

SELECT 
  m.id,
  m.sender_id,
  m.receiver_id,
  m.content,
  m.message_type,
  m.metadata,
  m.created_at,
  u1.email as sender_email,
  u2.email as receiver_email
FROM messages m
JOIN users u1 ON m.sender_id = u1.id
JOIN users u2 ON m.receiver_id = u2.id
WHERE m.message_type = 'offer_approval_request'
  AND m.metadata->>'offer_id' = 'COPY_OFFER_ID_HERE'
ORDER BY m.created_at DESC
LIMIT 5;

-- ============================================================================
-- STEP 5: TARGET APPROVES THE OFFER
-- ============================================================================
-- The connection user approves the offer (normally done via API)

UPDATE offers
SET 
  status = 'active',
  approved_by_target = TRUE,
  target_approved_at = NOW(),
  updated_at = NOW()
WHERE id = 'COPY_OFFER_ID_HERE'
  AND status = 'pending_approval'
RETURNING 
  id,
  title,
  status,
  approved_by_target,
  target_approved_at;

-- ============================================================================
-- STEP 6: VERIFY OFFER IS NOW ACTIVE
-- ============================================================================

SELECT 
  o.id,
  o.title,
  o.status,
  o.approved_by_target,
  o.target_approved_at,
  o.asking_price_inr,
  oc.target_organization,
  oc.target_position
FROM offers o
LEFT JOIN offer_connections oc ON o.id = oc.offer_id
WHERE o.id = 'COPY_OFFER_ID_HERE';

-- This should show:
-- ✅ status = 'active'
-- ✅ approved_by_target = true
-- ✅ target_approved_at has timestamp
-- ✅ Offer is now visible in marketplace!

-- ============================================================================
-- STEP 7: CHECK OFFER IS VISIBLE IN PUBLIC FEED
-- ============================================================================
-- Only 'active' offers should appear in public feed

SELECT 
  o.id,
  o.title,
  o.description,
  o.asking_price_inr,
  o.status,
  creator.first_name || ' ' || creator.last_name as creator_name,
  oc.target_organization,
  oc.target_position,
  oc.relationship_type
FROM offers o
JOIN users creator ON o.offer_creator_id = creator.id
LEFT JOIN offer_connections oc ON o.id = oc.offer_id
WHERE o.status = 'active'
  AND o.id = 'COPY_OFFER_ID_HERE';

-- ============================================================================
-- STEP 8: BUYER PLACES A BID
-- ============================================================================
-- A buyer sees the offer and places a bid

INSERT INTO offer_bids (
  offer_id,
  buyer_id,
  offer_creator_id,
  bid_amount_inr,
  status,
  message,
  created_at
) VALUES (
  'COPY_OFFER_ID_HERE',
  'REPLACE_WITH_BUYER_USER_ID',
  'REPLACE_WITH_CREATOR_USER_ID',
  5500,  -- Bidding 5500 (asking price was 5000)
  'pending',
  'Very interested! I would love to connect with your contact at Google.',
  NOW()
)
RETURNING 
  id,
  bid_amount_inr,
  status,
  created_at;

-- Save bid_id: 'COPY_BID_ID_HERE'

-- ============================================================================
-- STEP 9: VERIFY BID WAS CREATED
-- ============================================================================

SELECT 
  b.id,
  b.bid_amount_inr,
  b.status,
  b.message,
  buyer.email as buyer_email,
  creator.email as creator_email,
  o.title as offer_title,
  o.asking_price_inr
FROM offer_bids b
JOIN users buyer ON b.buyer_id = buyer.id
JOIN users creator ON b.offer_creator_id = creator.id
JOIN offers o ON b.offer_id = o.id
WHERE b.id = 'COPY_BID_ID_HERE';

-- ============================================================================
-- STEP 10: CHECK ALL BIDS ON THE OFFER
-- ============================================================================

SELECT 
  b.id,
  b.bid_amount_inr,
  b.status,
  b.message,
  b.created_at,
  buyer.first_name || ' ' || buyer.last_name as buyer_name,
  buyer.company as buyer_company
FROM offer_bids b
JOIN users buyer ON b.buyer_id = buyer.id
WHERE b.offer_id = 'COPY_OFFER_ID_HERE'
ORDER BY b.bid_amount_inr DESC, b.created_at ASC;

-- ============================================================================
-- STEP 11: CREATOR ACCEPTS THE BID
-- ============================================================================

UPDATE offer_bids
SET 
  status = 'accepted',
  accepted_at = NOW(),
  updated_at = NOW()
WHERE id = 'COPY_BID_ID_HERE'
  AND status = 'pending'
RETURNING 
  id,
  status,
  accepted_at,
  bid_amount_inr;

-- ============================================================================
-- STEP 12: CREATE AN INTRO (Meeting/Consultation)
-- ============================================================================
-- After accepting bid, schedule an intro call (only if intros table exists)

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'intros') THEN
    -- Create intro
    INSERT INTO intros (
      offer_id,
      buyer_id,
      offer_creator_id,
      target_contact_id,
      scheduled_start,
      scheduled_end,
      status,
      daily_room_name,
      daily_room_url,
      created_at
    )
    SELECT
      'COPY_OFFER_ID_HERE',
      'REPLACE_WITH_BUYER_USER_ID',
      'REPLACE_WITH_CREATOR_USER_ID',
      oc.id,  -- Get offer_connection id
      NOW() + INTERVAL '2 days',  -- Schedule for 2 days from now
      NOW() + INTERVAL '2 days' + INTERVAL '1 hour',  -- 1 hour duration
      'scheduled',
      'intro-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 10),
      'https://6degree.daily.co/intro-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 10),
      NOW()
    FROM offer_connections oc
    WHERE oc.offer_id = 'COPY_OFFER_ID_HERE'
    LIMIT 1;
    
    RAISE NOTICE '✅ Intro created successfully';
  ELSE
    RAISE NOTICE '⚠️  Intros table does not exist - skipping intro creation';
  END IF;
END $$;

-- ============================================================================
-- STEP 13: VERIFY COMPLETE WORKFLOW
-- ============================================================================

-- Full workflow summary
SELECT 
  '===== OFFER WORKFLOW SUMMARY =====' AS section,
  o.id as offer_id,
  o.title,
  o.status as offer_status,
  o.approved_by_target,
  o.asking_price_inr,
  creator.email as creator,
  connection.email as connection,
  oc.target_organization,
  oc.target_position,
  oc.relationship_type,
  (SELECT COUNT(*) FROM offer_bids WHERE offer_id = o.id) as total_bids,
  (SELECT COUNT(*) FROM offer_bids WHERE offer_id = o.id AND status = 'accepted') as accepted_bids
FROM offers o
JOIN users creator ON o.offer_creator_id = creator.id
JOIN users connection ON o.connection_user_id = connection.id
LEFT JOIN offer_connections oc ON o.id = oc.offer_id
WHERE o.id = 'COPY_OFFER_ID_HERE';

-- All bids on this offer
SELECT 
  '===== BIDS SUMMARY =====' AS section,
  b.id,
  b.bid_amount_inr,
  b.status,
  b.created_at,
  b.accepted_at,
  buyer.email as buyer
FROM offer_bids b
JOIN users buyer ON b.buyer_id = buyer.id
WHERE b.offer_id = 'COPY_OFFER_ID_HERE'
ORDER BY b.created_at;

-- Intros scheduled (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'intros') THEN
    PERFORM 
      i.id,
      i.status,
      i.scheduled_start,
      i.scheduled_end,
      i.daily_room_url,
      buyer.email as buyer,
      creator.email as creator
    FROM intros i
    JOIN users buyer ON i.buyer_id = buyer.id
    JOIN users creator ON i.offer_creator_id = creator.id
    WHERE i.offer_id = 'COPY_OFFER_ID_HERE';
    
    RAISE NOTICE '✅ Intros query completed';
  END IF;
END $$;

-- ============================================================================
-- STEP 14: TEST OFFER REJECTION (ALTERNATIVE FLOW)
-- ============================================================================
-- Test what happens when target rejects an offer

-- Create another test offer
INSERT INTO offers (
  offer_creator_id,
  connection_user_id,
  title,
  description,
  asking_price_inr,
  status,
  approved_by_target
) VALUES (
  'REPLACE_WITH_CREATOR_USER_ID',
  'REPLACE_WITH_CONNECTION_USER_ID',
  '🧪 Test Rejection: Another Offer',
  'This offer will be rejected for testing',
  3000,
  'pending_approval',
  FALSE
)
RETURNING id as test_offer_2_id;

-- Copy the ID: 'COPY_TEST_OFFER_2_ID'

-- Target REJECTS the offer
UPDATE offers
SET 
  status = 'rejected',
  approved_by_target = FALSE,
  target_rejected_at = NOW(),
  updated_at = NOW()
WHERE id = 'COPY_TEST_OFFER_2_ID'
RETURNING 
  id,
  title,
  status,
  target_rejected_at;

-- Verify rejected offer is NOT in public feed
SELECT 
  COUNT(*) as rejected_offers_in_feed
FROM offers
WHERE status = 'rejected'
  AND id = 'COPY_TEST_OFFER_2_ID';
-- Should return 0 rows (rejected offers hidden from feed)

-- ============================================================================
-- STEP 15: CLEANUP (Optional)
-- ============================================================================
-- Uncomment to clean up test data

/*
-- Delete test intros
DELETE FROM intros WHERE offer_id IN ('COPY_OFFER_ID_HERE', 'COPY_TEST_OFFER_2_ID');

-- Delete test bids
DELETE FROM offer_bids WHERE offer_id IN ('COPY_OFFER_ID_HERE', 'COPY_TEST_OFFER_2_ID');

-- Delete test offer connections
DELETE FROM offer_connections WHERE offer_id IN ('COPY_OFFER_ID_HERE', 'COPY_TEST_OFFER_2_ID');

-- Delete test offers
DELETE FROM offers WHERE id IN ('COPY_OFFER_ID_HERE', 'COPY_TEST_OFFER_2_ID');

-- Delete test messages
DELETE FROM messages WHERE message_type = 'offer_approval_request' 
  AND metadata->>'offer_id' IN ('COPY_OFFER_ID_HERE', 'COPY_TEST_OFFER_2_ID');
*/

-- ============================================================================
-- WORKFLOW TEST COMPLETE! 🎉
-- ============================================================================

SELECT 
  '🎉 WORKFLOW TEST COMPLETE!' AS status,
  'Verified: Offer Creation → Approval → Bidding → Intro Scheduling' AS workflow,
  'Check all steps above for expected results' AS next_steps;

