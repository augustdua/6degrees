-- ============================================================================
-- TAGGING SYSTEM MIGRATION
-- Adds comprehensive tagging support to requests and offers
-- Created: 2025-11-19
-- ============================================================================

-- ============================================================================
-- PART 1: CREATE TAGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tags (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    category TEXT,
    description TEXT,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert predefined tags
INSERT INTO public.tags (name, category) VALUES
-- Startups & Business
('Startups', 'Business'),
('Fundraising', 'Business'),
('Scaling', 'Business'),
('Product', 'Business'),
('Marketing & Growth', 'Business'),
('Early Stage Marketing', 'Marketing'),
('Company Culture', 'Business'),
('E-Commerce', 'Business'),
('Founder', 'Business'),
('Sales & Business Development', 'Business'),
('Operations', 'Business'),
('Hiring & Managing', 'Business'),
('Mergers & Acquisitions', 'Finance'),
('Fashion', 'Industry'),
('AI', 'Technology'),
('Crypto, NFTs, & Web3', 'Technology'),
('GTM', 'Business'),
('Product Market Fit', 'Business'),
('Board Member', 'Business'),
('Dtc', 'Business'),
('Angel Investor', 'Finance'),
('CEO', 'Role'),
('CFO', 'Role'),
('CMO', 'Role'),
('Investor', 'Finance'),
('Acquisition', 'Business'),
('Board Governance', 'Business'),
('Bootstrapping', 'Business'),
('Branding', 'Marketing'),
('COO', 'Role'),
('Interior Designer', 'Design'),
('Media', 'Industry'),
('Retail', 'Industry'),
('Stylist', 'Design'),
('AD100', 'Design'),
('Artificial Intelligence', 'Technology'),
('Business Strategy', 'Business'),
('Career Coach', 'Career'),
('CPO', 'Role'),
('CTO', 'Role'),
('Ecommerce', 'Business'),
('Fitness', 'Wellness'),
('Go-To-Market', 'Business'),
('Marketplaces', 'Business'),
('Product Management', 'Business'),
('Product Marketing', 'Marketing'),
('Trainer', 'Wellness'),
('Commerce', 'Business'),
('Consumer Product Goods (CPG)', 'Business'),
('CPG', 'Business'),
('Customer Acquisition', 'Marketing'),
('Digital Transformation', 'Technology'),
('Entertainment', 'Industry'),
('Event Planning', 'Business'),
('Finance', 'Finance'),
('Food', 'Industry'),
('Hair', 'Beauty'),
('Influencer Marketing', 'Marketing'),
('Insurance', 'Finance'),
('International Expansion', 'Business'),
('Investor Relations', 'Finance'),
('IP', 'Legal'),
('Marketing', 'Marketing'),
('Podcast', 'Media'),
('Products', 'Business'),
('Public Relations', 'Marketing'),
('SaaS', 'Technology'),
('Social Apps', 'Technology'),
('Software Engineer', 'Technology'),
('Strategy', 'Business'),
('Sustainability', 'Business'),
('User Acquisition', 'Marketing'),
('Venture Capital', 'Finance'),
('Writing', 'Content'),
('Agency', 'Business'),
('American Airlines', 'Company'),
('Angel', 'Finance'),
('Apple', 'Company'),
('Augmented Reality', 'Technology'),
('Automation', 'Technology'),
('B2B', 'Business'),
('Bitcoin', 'Crypto'),
('Blockchain', 'Technology'),
('Boeing', 'Company'),
('Brick Mortar', 'Business'),
('Business', 'Business'),
('Business of Fashion', 'Industry'),
('Career', 'Career'),
('Clean Energy', 'Sustainability'),
('Climate Tech', 'Technology'),
('Community', 'Business'),
('Consumer Apps', 'Technology'),
('Content Marketing', 'Marketing'),
('CRO', 'Role'),
('Dating', 'Industry'),
('Design', 'Design'),
('Digital Marketing', 'Marketing'),
('Direct-To-Consumer', 'Business'),
('Editor', 'Content'),
('Entrepreneur', 'Business'),
('Facebook', 'Company'),
('Filmmaking', 'Media'),
('Financial Literacy', 'Finance'),
('Food & Beverage', 'Industry'),
('Fraud', 'Security'),
('Furniture', 'Industry'),
('Gaming', 'Industry'),
('Graphic Design', 'Design'),
('Growth', 'Business'),
('Hard Tech', 'Technology'),
('HealthTech', 'Technology'),
('HGTV', 'Company'),
('Home', 'Industry'),
('Home Organizer', 'Services'),
('Hypno', 'Wellness'),
('Hypnotherapy', 'Wellness'),
('Influencer', 'Marketing'),
('Investing', 'Finance'),
('IPO', 'Finance'),
('Licensing', 'Legal'),
('M&A', 'Finance'),
('Machine Learning', 'Technology'),
('Manufacturing', 'Industry'),
('Medical', 'Healthcare'),
('Merchandising', 'Business'),
('Monetizing A Podcast', 'Media'),
('Myspace', 'Company'),
('Nutrition', 'Wellness'),
('Omnichannel', 'Business'),
('Partnerships', 'Business'),
('Performance Marketing', 'Marketing'),
('Personal Branding', 'Marketing'),
('PR', 'Marketing'),
('Pre-Seed', 'Finance'),
('Producer', 'Media'),
('Product Roadmapping', 'Business'),
('Seed', 'Finance'),
('Skincare', 'Beauty'),
('Social Media', 'Marketing'),
('Social Media Marketing', 'Marketing'),
('Social Networks', 'Technology'),
('Solana', 'Crypto'),
('Stripe', 'Company'),
('Subscription', 'Business'),
('Supply Chain', 'Operations'),
('Target', 'Company'),
('Turnarounds', 'Business'),
('Uber', 'Company'),
('User Experience (UX)', 'Design'),
('Vc', 'Finance'),
('Viral Marketing', 'Marketing'),
('Walmart', 'Company')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- PART 2: ADD TAGS COLUMNS TO CONNECTION_REQUESTS
-- ============================================================================

ALTER TABLE public.connection_requests 
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.connection_requests 
ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;

-- Create GIN index for fast tag queries
CREATE INDEX IF NOT EXISTS idx_connection_requests_tags 
ON public.connection_requests USING GIN (tags);

-- Create index for demo filtering
CREATE INDEX IF NOT EXISTS idx_connection_requests_is_demo 
ON public.connection_requests(is_demo);

-- ============================================================================
-- PART 3: ADD TAGS COLUMNS TO OFFERS
-- ============================================================================

ALTER TABLE public.offers 
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.offers 
ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;

-- Create GIN index for fast tag queries
CREATE INDEX IF NOT EXISTS idx_offers_tags 
ON public.offers USING GIN (tags);

-- Create index for demo filtering
CREATE INDEX IF NOT EXISTS idx_offers_is_demo 
ON public.offers(is_demo);

-- ============================================================================
-- PART 4: CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to increment tag usage count
CREATE OR REPLACE FUNCTION increment_tag_usage(tag_name TEXT)
RETURNS void AS $$
BEGIN
    UPDATE tags
    SET usage_count = usage_count + 1,
        updated_at = NOW()
    WHERE name = tag_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get popular tags
CREATE OR REPLACE FUNCTION get_popular_tags(limit_count INTEGER DEFAULT 20)
RETURNS TABLE (
    tag_name TEXT,
    usage_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH request_tags AS (
        SELECT jsonb_array_elements_text(tags) AS tag
        FROM connection_requests
        WHERE tags IS NOT NULL AND jsonb_array_length(tags) > 0
    ),
    offer_tags AS (
        SELECT jsonb_array_elements_text(tags) AS tag
        FROM offers
        WHERE tags IS NOT NULL AND jsonb_array_length(tags) > 0
    ),
    all_tags AS (
        SELECT tag FROM request_tags
        UNION ALL
        SELECT tag FROM offer_tags
    )
    SELECT 
        tag AS tag_name,
        COUNT(*) AS usage_count
    FROM all_tags
    GROUP BY tag
    ORDER BY usage_count DESC, tag ASC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search requests by tags
CREATE OR REPLACE FUNCTION search_requests_by_tags(
    tag_names TEXT[],
    include_demo_data BOOLEAN DEFAULT TRUE,
    limit_count INTEGER DEFAULT 50,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    creator_id UUID,
    target TEXT,
    message TEXT,
    reward NUMERIC,
    status TEXT,
    tags JSONB,
    is_demo BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cr.id,
        cr.creator_id,
        cr.target,
        cr.message,
        cr.reward,
        cr.status,
        cr.tags,
        cr.is_demo,
        cr.created_at
    FROM connection_requests cr
    WHERE 
        cr.status = 'active'
        AND (include_demo_data OR cr.is_demo = FALSE)
        AND (
            tag_names IS NULL 
            OR cr.tags ?| tag_names  -- Check if any of the tags match
        )
    ORDER BY cr.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search offers by tags
CREATE OR REPLACE FUNCTION search_offers_by_tags(
    tag_names TEXT[],
    include_demo_data BOOLEAN DEFAULT TRUE,
    limit_count INTEGER DEFAULT 50,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    offer_creator_id UUID,
    connection_user_id UUID,
    title TEXT,
    description TEXT,
    asking_price_inr NUMERIC,
    currency TEXT,
    status TEXT,
    tags JSONB,
    is_demo BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id,
        o.offer_creator_id,
        o.connection_user_id,
        o.title,
        o.description,
        o.asking_price_inr,
        o.currency,
        o.status,
        o.tags,
        o.is_demo,
        o.created_at
    FROM offers o
    WHERE 
        o.status = 'active'
        AND (include_demo_data OR o.is_demo = FALSE)
        AND (
            tag_names IS NULL 
            OR o.tags ?| tag_names  -- Check if any of the tags match
        )
    ORDER BY o.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 5: UPDATE RLS POLICIES (if needed)
-- ============================================================================

-- Tags table should be readable by all authenticated users
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Tags are viewable by all authenticated users" ON public.tags;
DROP POLICY IF EXISTS "Only admins can modify tags" ON public.tags;

-- Create policies
CREATE POLICY "Tags are viewable by all authenticated users"
    ON public.tags FOR SELECT
    TO authenticated
    USING (true);

-- Only admins can insert/update/delete tags
CREATE POLICY "Only admins can modify tags"
    ON public.tags FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.email IN ('augustdua@gmail.com')  -- Add admin emails
        )
    );

-- ============================================================================
-- COMPLETION
-- ============================================================================

COMMENT ON TABLE public.tags IS 'Predefined tags for categorizing requests and offers';
COMMENT ON COLUMN public.connection_requests.tags IS 'JSONB array of tag names for categorization';
COMMENT ON COLUMN public.connection_requests.is_demo IS 'Flag to indicate demo/fake data for testing';
COMMENT ON COLUMN public.offers.tags IS 'JSONB array of tag names for categorization';
COMMENT ON COLUMN public.offers.is_demo IS 'Flag to indicate demo/fake data for testing';

