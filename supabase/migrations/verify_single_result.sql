-- ============================================================================
-- SINGLE RESULT VERIFICATION - Everything in ONE Table
-- ============================================================================

WITH verification_checks AS (
  -- Check 1: Tables exist
  SELECT 
    1 as sort_order,
    '📊 TABLES' as category,
    'Core tables' as check_name,
    CASE 
      WHEN (SELECT COUNT(*) FROM information_schema.tables 
            WHERE table_schema = 'public'
            AND table_name IN ('offers', 'offer_connections', 'offer_bids', 'offer_availability', 'offer_likes')) = 5
      THEN '✅ PASS - All 5 tables exist'
      ELSE '❌ FAIL - Missing tables'
    END as status
  
  UNION ALL
  
  -- Check 2: Offers columns
  SELECT 
    2,
    '📊 TABLES',
    'Offers columns',
    CASE 
      WHEN (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_name = 'offers'
            AND column_name IN ('id', 'offer_creator_id', 'connection_user_id', 'title', 'description',
                                'asking_price_inr', 'status', 'approved_by_target', 'target_approved_at',
                                'target_rejected_at', 'created_at', 'updated_at')) >= 12
      THEN '✅ PASS - All required columns exist'
      ELSE '❌ FAIL - Missing columns'
    END
  
  UNION ALL
  
  -- Check 3: Organization fields
  SELECT 
    3,
    '📊 TABLES',
    'Organization fields',
    CASE 
      WHEN (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_name = 'offer_connections'
            AND column_name IN ('target_organization', 'target_position', 'target_logo_url', 
                                'relationship_type', 'relationship_description')) = 5
      THEN '✅ PASS - All org fields present'
      ELSE '❌ FAIL - Missing org fields'
    END
  
  UNION ALL
  
  -- Check 4: Status constraint
  SELECT 
    4,
    '🔒 CONSTRAINTS',
    'Status values',
    CASE 
      WHEN EXISTS (SELECT 1 FROM information_schema.check_constraints
                   WHERE constraint_name = 'offers_status_check'
                   AND check_clause LIKE '%pending_approval%'
                   AND check_clause LIKE '%rejected%')
      THEN '✅ PASS - Includes pending_approval, rejected'
      ELSE '❌ FAIL - Missing new statuses'
    END
  
  UNION ALL
  
  -- Check 5: Price constraint
  SELECT 
    5,
    '🔒 CONSTRAINTS',
    'Price constraint',
    CASE 
      WHEN EXISTS (SELECT 1 FROM information_schema.check_constraints
                   WHERE constraint_name = 'offers_asking_price_inr_check')
      THEN '✅ PASS - Price constraint exists'
      ELSE '❌ FAIL - Missing price constraint'
    END
  
  UNION ALL
  
  -- Check 6: RLS Policies
  SELECT 
    6,
    '🔐 SECURITY',
    'RLS Policies',
    '✅ ' || COUNT(*)::text || ' policies active'
  FROM pg_policies
  WHERE tablename IN ('offers', 'offer_connections', 'offer_bids', 'offer_availability', 'offer_likes')
  
  UNION ALL
  
  -- Check 7: Triggers
  SELECT 
    7,
    '⚙️  AUTOMATION',
    'Triggers',
    '✅ ' || COUNT(*)::text || ' triggers configured'
  FROM information_schema.triggers
  WHERE event_object_table IN ('offers', 'offer_bids', 'reviews', 'offer_likes')
  
  UNION ALL
  
  -- Check 8: Indexes
  SELECT 
    8,
    '⚡ PERFORMANCE',
    'Indexes',
    '✅ ' || COUNT(*)::text || ' indexes created'
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename IN ('offers', 'offer_connections', 'offer_bids', 'offer_availability', 'offer_likes')
  
  UNION ALL
  
  -- Check 9: Offers count
  SELECT 
    9,
    '📈 DATA COUNTS',
    'Offers',
    COUNT(*)::text || ' records'
  FROM offers
  
  UNION ALL
  
  -- Check 10: Connections count
  SELECT 
    10,
    '📈 DATA COUNTS',
    'Offer Connections',
    COUNT(*)::text || ' records'
  FROM offer_connections
  
  UNION ALL
  
  -- Check 11: Bids count
  SELECT 
    11,
    '📈 DATA COUNTS',
    'Offer Bids',
    COUNT(*)::text || ' records'
  FROM offer_bids
  
  UNION ALL
  
  -- Check 12: Availability count
  SELECT 
    12,
    '📈 DATA COUNTS',
    'Offer Availability',
    COUNT(*)::text || ' records'
  FROM offer_availability
  
  UNION ALL
  
  -- Check 13: Likes count
  SELECT 
    13,
    '📈 DATA COUNTS',
    'Offer Likes',
    COUNT(*)::text || ' records'
  FROM offer_likes
  
  UNION ALL
  
  -- Check 14: NULL connection_user_id
  SELECT 
    14,
    '✅ DATA QUALITY',
    'Offers with NULL connection_user_id',
    CASE 
      WHEN COUNT(*) = 0 THEN '✅ PASS - No NULL values'
      ELSE '❌ FAIL - ' || COUNT(*)::text || ' offers with NULL'
    END
  FROM offers
  WHERE connection_user_id IS NULL
  
  UNION ALL
  
  -- Check 15: Pending approvals
  SELECT 
    15,
    '✅ DATA QUALITY',
    'Pending approval offers',
    COUNT(*)::text || ' waiting for approval'
  FROM offers
  WHERE status = 'pending_approval'
  
  UNION ALL
  
  -- Check 16: Active offers
  SELECT 
    16,
    '✅ DATA QUALITY',
    'Active offers (in marketplace)',
    COUNT(*)::text || ' live'
  FROM offers
  WHERE status = 'active'
  
  UNION ALL
  
  -- Check 17: Missing connections
  SELECT 
    17,
    '✅ DATA QUALITY',
    'Offers missing offer_connections',
    CASE 
      WHEN COUNT(*) = 0 THEN '✅ PASS - All offers have connections'
      ELSE '⚠️  WARNING - ' || COUNT(*)::text || ' offers missing connections'
    END
  FROM offers o
  LEFT JOIN offer_connections oc ON o.id = oc.offer_id
  WHERE oc.id IS NULL
  
  UNION ALL
  
  -- Final summary
  SELECT 
    99,
    '🎉 SUMMARY',
    'Verification Status',
    'All checks completed - Review results above'
)
SELECT 
  category,
  check_name,
  status
FROM verification_checks
ORDER BY sort_order;

