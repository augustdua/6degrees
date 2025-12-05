-- Fix forum tables foreign keys to reference public.users instead of auth.users
-- This is a fix migration for partial application of 102

-- Drop and recreate foreign key constraints if they exist
DO $$ 
BEGIN
  -- forum_projects
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
             WHERE constraint_name = 'forum_projects_user_id_fkey' 
             AND table_name = 'forum_projects') THEN
    ALTER TABLE forum_projects DROP CONSTRAINT forum_projects_user_id_fkey;
  END IF;
  
  -- forum_posts  
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
             WHERE constraint_name = 'forum_posts_user_id_fkey' 
             AND table_name = 'forum_posts') THEN
    ALTER TABLE forum_posts DROP CONSTRAINT forum_posts_user_id_fkey;
  END IF;
  
  -- forum_comments
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
             WHERE constraint_name = 'forum_comments_user_id_fkey' 
             AND table_name = 'forum_comments') THEN
    ALTER TABLE forum_comments DROP CONSTRAINT forum_comments_user_id_fkey;
  END IF;
  
  -- forum_reactions
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
             WHERE constraint_name = 'forum_reactions_user_id_fkey' 
             AND table_name = 'forum_reactions') THEN
    ALTER TABLE forum_reactions DROP CONSTRAINT forum_reactions_user_id_fkey;
  END IF;
  
  -- forum_interactions
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
             WHERE constraint_name = 'forum_interactions_user_id_fkey' 
             AND table_name = 'forum_interactions') THEN
    ALTER TABLE forum_interactions DROP CONSTRAINT forum_interactions_user_id_fkey;
  END IF;
  
  -- forum_follows
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
             WHERE constraint_name = 'forum_follows_user_id_fkey' 
             AND table_name = 'forum_follows') THEN
    ALTER TABLE forum_follows DROP CONSTRAINT forum_follows_user_id_fkey;
  END IF;
END $$;

-- Re-add constraints referencing public.users
ALTER TABLE forum_projects 
  ADD CONSTRAINT forum_projects_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE forum_posts 
  ADD CONSTRAINT forum_posts_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE forum_comments 
  ADD CONSTRAINT forum_comments_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE forum_reactions 
  ADD CONSTRAINT forum_reactions_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE forum_interactions 
  ADD CONSTRAINT forum_interactions_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE forum_follows 
  ADD CONSTRAINT forum_follows_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Seed communities if not already seeded
INSERT INTO forum_communities (name, slug, description, icon, color) VALUES
  ('Build in Public', 'build-in-public', 'Daily progress, revenue screenshots, Day X updates', '🚀', '#10B981'),
  ('Network', 'network', 'Who can intro whom? Post your requests here → get paid offers', '🤝', '#8B5CF6'),
  ('Wins & Brags', 'wins', 'Closed deals, funding, big hires, revenue PRs', '🏆', '#F59E0B'),
  ('Failures & Lessons', 'failures', 'What went wrong and what you learned', '💔', '#EF4444')
ON CONFLICT (slug) DO NOTHING;

