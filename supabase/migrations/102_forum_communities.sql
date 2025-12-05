    -- Forum Communities System Migration
    -- Created: December 2024

    -- ============================================================================
    -- 1. forum_communities - The 4 predefined communities
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS forum_communities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT NOT NULL,
    color TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Seed the 4 communities
    INSERT INTO forum_communities (name, slug, description, icon, color) VALUES
    ('Build in Public', 'build-in-public', 'Daily progress, revenue screenshots, Day X updates', '🚀', '#10B981'),
    ('Network', 'network', 'Who can intro whom? Post your requests here → get paid offers', '🤝', '#8B5CF6'),
    ('Wins & Brags', 'wins', 'Closed deals, funding, big hires, revenue PRs', '🏆', '#F59E0B'),
    ('Failures & Lessons', 'failures', 'What went wrong and what you learned', '💔', '#EF4444')
    ON CONFLICT (slug) DO NOTHING;

    -- ============================================================================
    -- 2. forum_projects - For Build in Public tracking
    -- ============================================================================
CREATE TABLE IF NOT EXISTS forum_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    url TEXT,
    description TEXT,
    logo_url TEXT,
    started_at DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX idx_forum_projects_user_id ON forum_projects(user_id);
    CREATE INDEX idx_forum_projects_is_active ON forum_projects(is_active);

    -- ============================================================================
    -- 3. forum_posts - Posts in communities
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS forum_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    community_id UUID NOT NULL REFERENCES forum_communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
    media_urls TEXT[] DEFAULT '{}',
    
    -- Build in Public specific fields
    project_id UUID REFERENCES forum_projects(id) ON DELETE SET NULL,
    day_number INTEGER,
    milestone_title TEXT,
    
    -- Post type
    post_type TEXT DEFAULT 'regular' CHECK (post_type IN ('regular', 'request', 'win', 'failure', 'bip_day')),
    
    -- Moderation
    is_pinned BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX idx_forum_posts_community_id ON forum_posts(community_id);
    CREATE INDEX idx_forum_posts_user_id ON forum_posts(user_id);
    CREATE INDEX idx_forum_posts_project_id ON forum_posts(project_id);
    CREATE INDEX idx_forum_posts_created_at ON forum_posts(created_at DESC);
    CREATE INDEX idx_forum_posts_not_deleted ON forum_posts(is_deleted) WHERE is_deleted = false;

    -- ============================================================================
    -- 4. forum_comments - Flat comments (Discord style) + Quick Replies
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS forum_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT,
    
    -- Quick reply type (NULL = normal comment)
    quick_reply_type TEXT CHECK (quick_reply_type IN ('can_intro', 'paid_intro', 'watching', 'ship_it', 'dm_me')),
    
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX idx_forum_comments_post_id ON forum_comments(post_id);
    CREATE INDEX idx_forum_comments_user_id ON forum_comments(user_id);
    CREATE INDEX idx_forum_comments_created_at ON forum_comments(created_at);

    -- ============================================================================
    -- 5. forum_reactions - Emoji reactions on posts/comments
    -- Only 8 emojis allowed: ❤️ 🔥 🚀 💯 🙌 🤝 💸 👀
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS forum_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment')),
    target_id UUID NOT NULL,
    emoji TEXT NOT NULL CHECK (emoji IN ('❤️', '🔥', '🚀', '💯', '🙌', '🤝', '💸', '👀')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One reaction per emoji per user per target
    UNIQUE(user_id, target_type, target_id, emoji)
    );

    CREATE INDEX idx_forum_reactions_target ON forum_reactions(target_type, target_id);
    CREATE INDEX idx_forum_reactions_user_id ON forum_reactions(user_id);

    -- ============================================================================
    -- 6. forum_interactions - Track EVERYTHING for GNN/recommendations
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS forum_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    interaction_type TEXT NOT NULL CHECK (interaction_type IN (
        'view', 'scroll_50', 'scroll_90', 'time_spent', 
        'reaction', 'quick_reply', 'comment', 'share'
    )),
    post_id UUID REFERENCES forum_posts(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES forum_comments(id) ON DELETE CASCADE,
    community_id UUID REFERENCES forum_communities(id) ON DELETE CASCADE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Index for cleanup cron (delete old rows)
    CREATE INDEX idx_forum_interactions_created_at ON forum_interactions(created_at);
    CREATE INDEX idx_forum_interactions_user_id ON forum_interactions(user_id);
    CREATE INDEX idx_forum_interactions_post_id ON forum_interactions(post_id);
    CREATE INDEX idx_forum_interactions_community_id ON forum_interactions(community_id);

    -- ============================================================================
    -- 7. forum_follows - Follow communities/projects
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS forum_follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    community_id UUID REFERENCES forum_communities(id) ON DELETE CASCADE,
    project_id UUID REFERENCES forum_projects(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Can follow either community or project, not both in same row
    CHECK (
        (community_id IS NOT NULL AND project_id IS NULL) OR
        (community_id IS NULL AND project_id IS NOT NULL)
    ),
    
    -- One follow per user per target
    UNIQUE(user_id, community_id),
    UNIQUE(user_id, project_id)
    );

    CREATE INDEX idx_forum_follows_user_id ON forum_follows(user_id);
    CREATE INDEX idx_forum_follows_community_id ON forum_follows(community_id);
    CREATE INDEX idx_forum_follows_project_id ON forum_follows(project_id);

    -- ============================================================================
    -- RLS Policies
    -- ============================================================================

    -- Enable RLS
    ALTER TABLE forum_communities ENABLE ROW LEVEL SECURITY;
    ALTER TABLE forum_projects ENABLE ROW LEVEL SECURITY;
    ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
    ALTER TABLE forum_comments ENABLE ROW LEVEL SECURITY;
    ALTER TABLE forum_reactions ENABLE ROW LEVEL SECURITY;
    ALTER TABLE forum_interactions ENABLE ROW LEVEL SECURITY;
    ALTER TABLE forum_follows ENABLE ROW LEVEL SECURITY;

    -- Communities: Everyone can read
    CREATE POLICY "Anyone can read communities" ON forum_communities
    FOR SELECT USING (true);

    -- Projects: Owner can CRUD, everyone can read active projects
    CREATE POLICY "Users can create own projects" ON forum_projects
    FOR INSERT WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update own projects" ON forum_projects
    FOR UPDATE USING (auth.uid() = user_id);

    CREATE POLICY "Users can delete own projects" ON forum_projects
    FOR DELETE USING (auth.uid() = user_id);

    CREATE POLICY "Anyone can read active projects" ON forum_projects
    FOR SELECT USING (is_active = true OR auth.uid() = user_id);

    -- Posts: Owner can CRUD, everyone can read non-deleted
    CREATE POLICY "Users can create posts" ON forum_posts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update own posts" ON forum_posts
    FOR UPDATE USING (auth.uid() = user_id);

    CREATE POLICY "Users can delete own posts" ON forum_posts
    FOR DELETE USING (auth.uid() = user_id);

    CREATE POLICY "Anyone can read non-deleted posts" ON forum_posts
    FOR SELECT USING (is_deleted = false OR auth.uid() = user_id);

    -- Comments: Owner can CRUD, everyone can read non-deleted
    CREATE POLICY "Users can create comments" ON forum_comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update own comments" ON forum_comments
    FOR UPDATE USING (auth.uid() = user_id);

    CREATE POLICY "Users can delete own comments" ON forum_comments
    FOR DELETE USING (auth.uid() = user_id);

    CREATE POLICY "Anyone can read non-deleted comments" ON forum_comments
    FOR SELECT USING (is_deleted = false OR auth.uid() = user_id);

    -- Reactions: Users can manage their own, everyone can read
    CREATE POLICY "Users can create reactions" ON forum_reactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can delete own reactions" ON forum_reactions
    FOR DELETE USING (auth.uid() = user_id);

    CREATE POLICY "Anyone can read reactions" ON forum_reactions
    FOR SELECT USING (true);

    -- Interactions: Users can only insert their own, read their own
    CREATE POLICY "Users can create own interactions" ON forum_interactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can read own interactions" ON forum_interactions
    FOR SELECT USING (auth.uid() = user_id);

    -- Follows: Users can manage their own, everyone can read
    CREATE POLICY "Users can create follows" ON forum_follows
    FOR INSERT WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can delete own follows" ON forum_follows
    FOR DELETE USING (auth.uid() = user_id);

    CREATE POLICY "Anyone can read follows" ON forum_follows
    FOR SELECT USING (true);

    -- ============================================================================
    -- Service role bypass for backend
    -- ============================================================================
    CREATE POLICY "Service role full access to forum_communities" ON forum_communities
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

    CREATE POLICY "Service role full access to forum_projects" ON forum_projects
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

    CREATE POLICY "Service role full access to forum_posts" ON forum_posts
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

    CREATE POLICY "Service role full access to forum_comments" ON forum_comments
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

    CREATE POLICY "Service role full access to forum_reactions" ON forum_reactions
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

    CREATE POLICY "Service role full access to forum_interactions" ON forum_interactions
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

    CREATE POLICY "Service role full access to forum_follows" ON forum_follows
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

