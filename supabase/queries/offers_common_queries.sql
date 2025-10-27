-- ============================================================================
-- OFFERS SYSTEM - COMMON QUERIES REFERENCE
-- ============================================================================
-- Quick reference for frequently used queries in the application

-- ============================================================================
-- PUBLIC FEED QUERIES
-- ============================================================================

-- 1. Get all active offers for marketplace feed
SELECT 
  o.id,
  o.title,
  o.description,
  o.asking_price_inr,
  o.created_at,
  o.updated_at,
  -- Creator info
  creator.id as creator_id,
  creator.first_name || ' ' || creator.last_name as creator_name,
  creator.avatar_url as creator_avatar,
  creator.company as creator_company,
  -- Connection info (target person)
  connection.id as connection_id,
  connection.first_name || ' ' || connection.last_name as connection_name,
  connection.avatar_url as connection_avatar,
  -- Organization details
  oc.target_organization,
  oc.target_position,
  oc.target_logo_url,
  oc.relationship_type,
  oc.relationship_description,
  -- Stats
  COALESCE((SELECT COUNT(*) FROM offer_bids WHERE offer_id = o.id), 0) as bids_count,
  COALESCE((SELECT COUNT(*) FROM offer_likes WHERE offer_id = o.id), 0) as likes_count
FROM offers o
JOIN users creator ON o.offer_creator_id = creator.id
JOIN users connection ON o.connection_user_id = connection.id
LEFT JOIN offer_connections oc ON o.id = oc.offer_id
WHERE o.status = 'active'
ORDER BY o.created_at DESC
LIMIT 50;

-- 2. Get single offer by ID with full details
SELECT 
  o.*,
  creator.id as creator_id,
  creator.first_name as creator_first_name,
  creator.last_name as creator_last_name,
  creator.avatar_url as creator_avatar_url,
  creator.bio as creator_bio,
  connection.id as connection_id,
  connection.first_name as connection_first_name,
  connection.last_name as connection_last_name,
  connection.avatar_url as connection_avatar_url,
  connection.bio as connection_bio,
  connection.company as connection_company,
  connection.role as connection_role,
  oc.target_organization,
  oc.target_position,
  oc.target_logo_url,
  oc.relationship_type,
  oc.relationship_description
FROM offers o
JOIN users creator ON o.offer_creator_id = creator.id
JOIN users connection ON o.connection_user_id = connection.id
LEFT JOIN offer_connections oc ON o.id = oc.offer_id
WHERE o.id = :offer_id;

-- ============================================================================
-- MY OFFERS QUERIES (Dashboard)
-- ============================================================================

-- 3. Get all offers created by current user
SELECT 
  o.id,
  o.title,
  o.description,
  o.asking_price_inr,
  o.status,
  o.approved_by_target,
  o.target_approved_at,
  o.target_rejected_at,
  o.created_at,
  o.updated_at,
  connection.first_name || ' ' || connection.last_name as connection_name,
  connection.avatar_url as connection_avatar,
  oc.target_organization,
  oc.target_position,
  COALESCE((SELECT COUNT(*) FROM offer_bids WHERE offer_id = o.id), 0) as bids_count,
  COALESCE((SELECT COUNT(*) FROM offer_bids WHERE offer_id = o.id AND status = 'pending'), 0) as pending_bids_count
FROM offers o
JOIN users connection ON o.connection_user_id = connection.id
LEFT JOIN offer_connections oc ON o.id = oc.offer_id
WHERE o.offer_creator_id = :current_user_id
ORDER BY 
  CASE 
    WHEN o.status = 'pending_approval' THEN 1
    WHEN o.status = 'active' THEN 2
    ELSE 3
  END,
  o.created_at DESC;

-- 4. Get pending approval offers for current user (offers they need to approve)
SELECT 
  o.id,
  o.title,
  o.description,
  o.asking_price_inr,
  o.created_at,
  creator.id as creator_id,
  creator.first_name || ' ' || creator.last_name as creator_name,
  creator.avatar_url as creator_avatar,
  oc.target_organization,
  oc.target_position,
  oc.relationship_type,
  oc.relationship_description
FROM offers o
JOIN users creator ON o.offer_creator_id = creator.id
LEFT JOIN offer_connections oc ON o.id = oc.offer_id
WHERE o.connection_user_id = :current_user_id
  AND o.status = 'pending_approval'
ORDER BY o.created_at DESC;

-- ============================================================================
-- BIDS QUERIES
-- ============================================================================

-- 5. Get all bids on a specific offer (for offer creator)
SELECT 
  b.id,
  b.bid_amount_inr,
  b.status,
  b.message,
  b.created_at,
  b.accepted_at,
  buyer.id as buyer_id,
  buyer.first_name || ' ' || buyer.last_name as buyer_name,
  buyer.avatar_url as buyer_avatar,
  buyer.bio as buyer_bio,
  buyer.company as buyer_company,
  buyer.role as buyer_role
FROM offer_bids b
JOIN users buyer ON b.buyer_id = buyer.id
WHERE b.offer_id = :offer_id
  AND b.offer_creator_id = :current_user_id
ORDER BY b.bid_amount_inr DESC, b.created_at ASC;

-- 6. Get my bids (for buyer)
SELECT 
  b.id,
  b.bid_amount_inr,
  b.status,
  b.message,
  b.created_at,
  b.accepted_at,
  o.id as offer_id,
  o.title as offer_title,
  o.description as offer_description,
  o.asking_price_inr as offer_asking_price,
  creator.first_name || ' ' || creator.last_name as creator_name,
  creator.avatar_url as creator_avatar
FROM offer_bids b
JOIN offers o ON b.offer_id = o.id
JOIN users creator ON b.offer_creator_id = creator.id
WHERE b.buyer_id = :current_user_id
ORDER BY b.created_at DESC;

-- ============================================================================
-- INTROS QUERIES
-- ============================================================================

-- 7. Get my intros (scheduled intro calls)
SELECT 
  i.id,
  i.scheduled_start,
  i.scheduled_end,
  i.actual_start,
  i.actual_end,
  i.status,
  i.daily_room_url,
  i.daily_room_name,
  i.pipecat_session_id,
  -- Offer details
  o.id as offer_id,
  o.title as offer_title,
  o.description as offer_description,
  -- Buyer details
  buyer.id as buyer_id,
  buyer.first_name as buyer_first_name,
  buyer.last_name as buyer_last_name,
  buyer.avatar_url as buyer_avatar_url,
  -- Creator details
  creator.id as creator_id,
  creator.first_name as creator_first_name,
  creator.last_name as creator_last_name,
  creator.avatar_url as creator_avatar_url
FROM intros i
JOIN offers o ON i.offer_id = o.id
JOIN users buyer ON i.buyer_id = buyer.id
JOIN users creator ON i.offer_creator_id = creator.id
WHERE (i.buyer_id = :current_user_id OR i.offer_creator_id = :current_user_id)
ORDER BY i.scheduled_start DESC;

-- 8. Get upcoming intros (next 7 days)
SELECT 
  i.*,
  o.title as offer_title,
  buyer.first_name || ' ' || buyer.last_name as buyer_name,
  creator.first_name || ' ' || creator.last_name as creator_name
FROM intros i
JOIN offers o ON i.offer_id = o.id
JOIN users buyer ON i.buyer_id = buyer.id
JOIN users creator ON i.offer_creator_id = creator.id
WHERE (i.buyer_id = :current_user_id OR i.offer_creator_id = :current_user_id)
  AND i.status = 'scheduled'
  AND i.scheduled_start >= NOW()
  AND i.scheduled_start <= NOW() + INTERVAL '7 days'
ORDER BY i.scheduled_start ASC;

-- ============================================================================
-- USER CONNECTIONS QUERIES (for offer creation)
-- ============================================================================

-- 9. Get my direct connections (for creating offers)
SELECT 
  u.id,
  u.first_name,
  u.last_name,
  u.avatar_url,
  u.company,
  u.role,
  u.bio,
  uc.created_at as connected_since
FROM user_connections uc
JOIN users u ON (
  CASE 
    WHEN uc.user1_id = :current_user_id THEN uc.user2_id
    ELSE uc.user1_id
  END = u.id
)
WHERE (uc.user1_id = :current_user_id OR uc.user2_id = :current_user_id)
  AND uc.status = 'connected'
ORDER BY u.first_name, u.last_name;

-- ============================================================================
-- LIKES QUERIES
-- ============================================================================

-- 10. Check if user has liked an offer
SELECT EXISTS (
  SELECT 1 
  FROM offer_likes 
  WHERE offer_id = :offer_id 
    AND user_id = :current_user_id
) as has_liked;

-- 11. Get all offers liked by user
SELECT 
  o.*,
  ol.created_at as liked_at,
  creator.first_name || ' ' || creator.last_name as creator_name
FROM offer_likes ol
JOIN offers o ON ol.offer_id = o.id
JOIN users creator ON o.offer_creator_id = creator.id
WHERE ol.user_id = :current_user_id
  AND o.status = 'active'
ORDER BY ol.created_at DESC;

-- ============================================================================
-- STATISTICS QUERIES
-- ============================================================================

-- 12. Get offer stats for creator dashboard
SELECT 
  COUNT(*) FILTER (WHERE status = 'active') as active_offers,
  COUNT(*) FILTER (WHERE status = 'pending_approval') as pending_approval,
  COUNT(*) FILTER (WHERE status = 'rejected') as rejected_offers,
  COALESCE(SUM((SELECT COUNT(*) FROM offer_bids WHERE offer_id = offers.id)), 0) as total_bids_received,
  COALESCE(SUM((SELECT COUNT(*) FROM offer_bids WHERE offer_id = offers.id AND status = 'accepted')), 0) as total_bids_accepted,
  COALESCE(SUM(asking_price_inr) FILTER (WHERE status = 'active'), 0) as total_active_offer_value
FROM offers
WHERE offer_creator_id = :current_user_id;

-- 13. Get top performing offers
SELECT 
  o.id,
  o.title,
  o.asking_price_inr,
  COUNT(DISTINCT ob.id) as total_bids,
  COUNT(DISTINCT ol.id) as total_likes,
  MAX(ob.bid_amount_inr) as highest_bid,
  o.created_at
FROM offers o
LEFT JOIN offer_bids ob ON o.id = ob.offer_id
LEFT JOIN offer_likes ol ON o.id = ol.offer_id
WHERE o.offer_creator_id = :current_user_id
  AND o.status = 'active'
GROUP BY o.id, o.title, o.asking_price_inr, o.created_at
ORDER BY total_bids DESC, total_likes DESC
LIMIT 10;

-- ============================================================================
-- SEARCH & FILTER QUERIES
-- ============================================================================

-- 14. Search offers by keyword
SELECT DISTINCT
  o.id,
  o.title,
  o.description,
  o.asking_price_inr,
  creator.first_name || ' ' || creator.last_name as creator_name,
  oc.target_organization,
  oc.target_position,
  ts_rank(
    to_tsvector('english', o.title || ' ' || o.description || ' ' || COALESCE(oc.target_organization, '') || ' ' || COALESCE(oc.target_position, '')),
    plainto_tsquery('english', :search_query)
  ) as relevance
FROM offers o
JOIN users creator ON o.offer_creator_id = creator.id
LEFT JOIN offer_connections oc ON o.id = oc.offer_id
WHERE o.status = 'active'
  AND (
    to_tsvector('english', o.title || ' ' || o.description || ' ' || COALESCE(oc.target_organization, '') || ' ' || COALESCE(oc.target_position, ''))
    @@ plainto_tsquery('english', :search_query)
  )
ORDER BY relevance DESC, o.created_at DESC;

-- 15. Filter offers by price range
SELECT 
  o.id,
  o.title,
  o.asking_price_inr,
  oc.target_organization,
  oc.target_position
FROM offers o
LEFT JOIN offer_connections oc ON o.id = oc.offer_id
WHERE o.status = 'active'
  AND o.asking_price_inr BETWEEN :min_price AND :max_price
ORDER BY o.asking_price_inr ASC;

-- 16. Filter offers by organization
SELECT 
  o.*,
  oc.target_organization,
  oc.target_position,
  creator.first_name || ' ' || creator.last_name as creator_name
FROM offers o
JOIN users creator ON o.offer_creator_id = creator.id
JOIN offer_connections oc ON o.id = oc.offer_id
WHERE o.status = 'active'
  AND LOWER(oc.target_organization) LIKE LOWER(:organization_query || '%')
ORDER BY o.created_at DESC;

-- ============================================================================
-- APPROVAL WORKFLOW QUERIES
-- ============================================================================

-- 17. Approve an offer
UPDATE offers
SET 
  status = 'active',
  approved_by_target = TRUE,
  target_approved_at = NOW(),
  updated_at = NOW()
WHERE id = :offer_id
  AND connection_user_id = :current_user_id
  AND status = 'pending_approval'
RETURNING *;

-- 18. Reject an offer
UPDATE offers
SET 
  status = 'rejected',
  approved_by_target = FALSE,
  target_rejected_at = NOW(),
  updated_at = NOW()
WHERE id = :offer_id
  AND connection_user_id = :current_user_id
  AND status = 'pending_approval'
RETURNING *;

-- ============================================================================
-- END OF COMMON QUERIES
-- ============================================================================

