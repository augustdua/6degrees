-- Run this in Supabase SQL Editor to fix public profile access
-- This allows anyone (even non-logged-in users) to view public profiles

-- Grant execute permission on the get_public_profile function
GRANT EXECUTE ON FUNCTION get_public_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_public_profile(UUID) TO anon;

-- Fix RLS policies for offers table (allow anonymous to view active offers)
DROP POLICY IF EXISTS "Anyone can view active offers" ON offers;
CREATE POLICY "Anyone can view active offers" ON offers
  FOR SELECT
  USING (status = 'active');

-- Fix RLS policies for connection_requests table
DROP POLICY IF EXISTS "Anyone can view active requests" ON connection_requests;
CREATE POLICY "Anyone can view active requests" ON connection_requests
  FOR SELECT
  USING (status = 'active');

-- Verify everything works
SELECT 'Profile function test:' as test;
SELECT get_public_profile('dddffff1-bfed-40a6-a99c-28dccb4c5014'::UUID);

SELECT 'Offers query test:' as test;
SELECT COUNT(*) as active_offers FROM offers WHERE status = 'active';

SELECT 'Requests query test:' as test;
SELECT COUNT(*) as active_requests FROM connection_requests WHERE status = 'active';

