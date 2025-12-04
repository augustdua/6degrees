-- Fix public profile access for anonymous users
-- The get_public_profile function exists but anonymous users can't call it

-- Grant execute permission to both authenticated and anonymous users
GRANT EXECUTE ON FUNCTION get_public_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_public_profile(UUID) TO anon;

-- Also ensure the underlying tables have appropriate RLS policies for public profiles

-- Users table - allow reading public profiles
DROP POLICY IF EXISTS "Anyone can view public user profiles" ON users;
CREATE POLICY "Anyone can view public user profiles" ON users
  FOR SELECT
  USING (is_profile_public = true OR id = auth.uid());

-- Organizations table - should be readable by anyone
DROP POLICY IF EXISTS "Anyone can view organizations" ON organizations;
CREATE POLICY "Anyone can view organizations" ON organizations
  FOR SELECT
  USING (true);

-- User organizations - readable if user's profile is public
DROP POLICY IF EXISTS "Anyone can view user organizations for public profiles" ON user_organizations;
CREATE POLICY "Anyone can view user organizations for public profiles" ON user_organizations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = user_organizations.user_id 
      AND (users.is_profile_public = true OR users.id = auth.uid())
    )
  );

-- Featured connections - readable if user's profile is public
DROP POLICY IF EXISTS "Anyone can view featured connections for public profiles" ON user_featured_connections;
CREATE POLICY "Anyone can view featured connections for public profiles" ON user_featured_connections
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = user_featured_connections.user_id 
      AND (users.is_profile_public = true OR users.id = auth.uid())
    )
  );

-- Offers - public offers are viewable by anyone
DROP POLICY IF EXISTS "Anyone can view active offers" ON offers;
CREATE POLICY "Anyone can view active offers" ON offers
  FOR SELECT
  USING (status = 'active' AND approved_by_target = true);

-- Connection requests - public requests viewable by anyone  
DROP POLICY IF EXISTS "Anyone can view active requests" ON connection_requests;
CREATE POLICY "Anyone can view active requests" ON connection_requests
  FOR SELECT
  USING (status = 'active');

