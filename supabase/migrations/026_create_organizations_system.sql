-- Organizations System Migration
-- This creates a searchable organizations database similar to LinkedIn

-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  domain TEXT, -- company domain (e.g., google.com)
  industry TEXT,
  description TEXT,
  website TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_organizations junction table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS user_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  position TEXT, -- e.g., "Software Engineer", "Student", "CEO"
  start_date DATE,
  end_date DATE, -- null means currently here
  is_current BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, organization_id, position) -- prevent duplicate entries
);

-- Create indexes for fast searching
CREATE INDEX IF NOT EXISTS idx_organizations_name ON organizations USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_organizations_domain ON organizations(domain);
CREATE INDEX IF NOT EXISTS idx_user_organizations_user_id ON user_organizations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_organizations_org_id ON user_organizations(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_organizations_current ON user_organizations(user_id, is_current) WHERE is_current = true;

-- Row Level Security Policies
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;

-- Everyone can read organizations (for search)
CREATE POLICY "Anyone can view organizations"
  ON organizations FOR SELECT
  USING (true);

-- Only admins can create/update organizations (for now, we'll seed them)
CREATE POLICY "Service role can manage organizations"
  ON organizations FOR ALL
  USING (auth.role() = 'service_role');

-- Users can view all user_organizations (to see others' organizations in profiles)
CREATE POLICY "Anyone can view user organizations"
  ON user_organizations FOR SELECT
  USING (true);

-- Users can only insert/update their own user_organizations
CREATE POLICY "Users can manage their own organizations"
  ON user_organizations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own organizations"
  ON user_organizations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own organizations"
  ON user_organizations FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column_orgs()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column_orgs();

CREATE TRIGGER update_user_organizations_updated_at
    BEFORE UPDATE ON user_organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column_orgs();

-- Seed with popular organizations (tech companies, universities, etc.)
INSERT INTO organizations (name, logo_url, domain, industry, description, website) VALUES
  -- Tech Companies
  ('Google', 'https://logo.clearbit.com/google.com', 'google.com', 'Technology', 'Search engine and technology company', 'https://google.com'),
  ('Microsoft', 'https://logo.clearbit.com/microsoft.com', 'microsoft.com', 'Technology', 'Software and technology corporation', 'https://microsoft.com'),
  ('Apple', 'https://logo.clearbit.com/apple.com', 'apple.com', 'Technology', 'Consumer electronics and software', 'https://apple.com'),
  ('Amazon', 'https://logo.clearbit.com/amazon.com', 'amazon.com', 'Technology', 'E-commerce and cloud computing', 'https://amazon.com'),
  ('Meta', 'https://logo.clearbit.com/meta.com', 'meta.com', 'Technology', 'Social media and technology', 'https://meta.com'),
  ('Netflix', 'https://logo.clearbit.com/netflix.com', 'netflix.com', 'Technology', 'Streaming entertainment service', 'https://netflix.com'),
  ('Tesla', 'https://logo.clearbit.com/tesla.com', 'tesla.com', 'Automotive', 'Electric vehicles and clean energy', 'https://tesla.com'),
  ('Uber', 'https://logo.clearbit.com/uber.com', 'uber.com', 'Technology', 'Ride-sharing and delivery platform', 'https://uber.com'),
  ('Airbnb', 'https://logo.clearbit.com/airbnb.com', 'airbnb.com', 'Technology', 'Vacation rental marketplace', 'https://airbnb.com'),
  ('Stripe', 'https://logo.clearbit.com/stripe.com', 'stripe.com', 'Technology', 'Payment processing platform', 'https://stripe.com'),

  -- Indian Tech Companies
  ('Flipkart', 'https://logo.clearbit.com/flipkart.com', 'flipkart.com', 'E-commerce', 'Indian e-commerce platform', 'https://flipkart.com'),
  ('Zomato', 'https://logo.clearbit.com/zomato.com', 'zomato.com', 'Food Tech', 'Food delivery and restaurant discovery', 'https://zomato.com'),
  ('Swiggy', 'https://logo.clearbit.com/swiggy.com', 'swiggy.com', 'Food Tech', 'Food delivery platform', 'https://swiggy.com'),
  ('Paytm', 'https://logo.clearbit.com/paytm.com', 'paytm.com', 'Fintech', 'Digital payments and financial services', 'https://paytm.com'),
  ('BYJU''S', 'https://logo.clearbit.com/byjus.com', 'byjus.com', 'EdTech', 'Online education platform', 'https://byjus.com'),

  -- Universities
  ('Stanford University', 'https://logo.clearbit.com/stanford.edu', 'stanford.edu', 'Education', 'Private research university', 'https://stanford.edu'),
  ('MIT', 'https://logo.clearbit.com/mit.edu', 'mit.edu', 'Education', 'Massachusetts Institute of Technology', 'https://mit.edu'),
  ('Harvard University', 'https://logo.clearbit.com/harvard.edu', 'harvard.edu', 'Education', 'Private Ivy League research university', 'https://harvard.edu'),
  ('IIT Delhi', NULL, 'iitd.ac.in', 'Education', 'Indian Institute of Technology Delhi', 'https://home.iitd.ac.in'),
  ('IIT Bombay', NULL, 'iitb.ac.in', 'Education', 'Indian Institute of Technology Bombay', 'https://iitb.ac.in'),
  ('IIT Madras', NULL, 'iitm.ac.in', 'Education', 'Indian Institute of Technology Madras', 'https://iitm.ac.in'),

  -- Finance
  ('Goldman Sachs', 'https://logo.clearbit.com/goldmansachs.com', 'goldmansachs.com', 'Finance', 'Investment banking and financial services', 'https://goldmansachs.com'),
  ('JPMorgan Chase', 'https://logo.clearbit.com/jpmorganchase.com', 'jpmorganchase.com', 'Finance', 'Multinational banking corporation', 'https://jpmorganchase.com'),
  ('McKinsey & Company', 'https://logo.clearbit.com/mckinsey.com', 'mckinsey.com', 'Consulting', 'Management consulting firm', 'https://mckinsey.com')
ON CONFLICT DO NOTHING;

-- Create a function to search organizations by name
CREATE OR REPLACE FUNCTION search_organizations(search_query TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  logo_url TEXT,
  domain TEXT,
  industry TEXT,
  description TEXT,
  website TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.name,
    o.logo_url,
    o.domain,
    o.industry,
    o.description,
    o.website
  FROM organizations o
  WHERE
    o.name ILIKE '%' || search_query || '%'
    OR o.domain ILIKE '%' || search_query || '%'
    OR o.industry ILIKE '%' || search_query || '%'
  ORDER BY
    CASE
      WHEN o.name ILIKE search_query THEN 1
      WHEN o.name ILIKE search_query || '%' THEN 2
      WHEN o.name ILIKE '%' || search_query || '%' THEN 3
      ELSE 4
    END,
    o.name
  LIMIT 20;
END;
$$ LANGUAGE plpgsql STABLE;
