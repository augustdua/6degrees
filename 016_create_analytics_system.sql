-- Create analytics and link tracking system for 6Degrees
-- Migration 016: Analytics System

-- Create link_clicks table to track all link interactions
CREATE TABLE public.link_clicks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  clicked_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- User whose link was clicked
  link_type TEXT NOT NULL CHECK (link_type IN (
    'linkedin_profile', 'email', 'profile_view', 'connection_request',
    'external_link', 'share_link', 'referral_link'
  )),
  link_url TEXT NOT NULL,
  source_page TEXT, -- Which page the click originated from
  referrer TEXT,
  user_agent TEXT,
  ip_address INET,
  country TEXT,
  city TEXT,
  device_type TEXT,
  browser TEXT,
  clicked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  session_id TEXT,

  -- Additional metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create link_shares table to track sharing activities
CREATE TABLE public.link_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- User who shared
  shared_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- User being shared
  share_type TEXT NOT NULL CHECK (share_type IN (
    'profile', 'connection', 'platform', 'referral', 'custom_link'
  )),
  share_medium TEXT NOT NULL CHECK (share_medium IN (
    'linkedin', 'twitter', 'facebook', 'email', 'whatsapp', 'telegram',
    'copy_link', 'qr_code', 'direct_message', 'other'
  )),
  share_url TEXT NOT NULL,
  shared_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  -- Track engagement from shares
  clicks_from_share INTEGER DEFAULT 0,
  conversions_from_share INTEGER DEFAULT 0,

  -- Additional metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create user_analytics table for aggregated user metrics
CREATE TABLE public.user_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Profile metrics
  profile_views INTEGER DEFAULT 0,
  profile_views_today INTEGER DEFAULT 0,
  profile_views_this_week INTEGER DEFAULT 0,
  profile_views_this_month INTEGER DEFAULT 0,

  -- Link metrics
  linkedin_clicks INTEGER DEFAULT 0,
  email_clicks INTEGER DEFAULT 0,
  total_link_clicks INTEGER DEFAULT 0,

  -- Share metrics
  times_shared INTEGER DEFAULT 0,
  shares_generated INTEGER DEFAULT 0,
  share_click_through_rate DECIMAL(5,4) DEFAULT 0.0,

  -- Connection metrics
  connection_requests_received INTEGER DEFAULT 0,
  connection_requests_sent INTEGER DEFAULT 0,
  connections_made INTEGER DEFAULT 0,

  -- Engagement metrics
  avg_time_on_profile DECIMAL(10,2) DEFAULT 0.0,
  bounce_rate DECIMAL(5,4) DEFAULT 0.0,
  return_visitor_rate DECIMAL(5,4) DEFAULT 0.0,

  -- Date tracking
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create daily_analytics table for time-series data
CREATE TABLE public.daily_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analytics_date DATE NOT NULL,

  profile_views INTEGER DEFAULT 0,
  linkedin_clicks INTEGER DEFAULT 0,
  email_clicks INTEGER DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,
  shares_made INTEGER DEFAULT 0,
  shares_received INTEGER DEFAULT 0,
  connections_made INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- Ensure one record per user per day
  CONSTRAINT unique_user_analytics_date UNIQUE (user_id, analytics_date)
);

-- Create indexes for performance
CREATE INDEX idx_link_clicks_user ON public.link_clicks(user_id, clicked_at DESC);
CREATE INDEX idx_link_clicks_clicked_user ON public.link_clicks(clicked_user_id, clicked_at DESC);
CREATE INDEX idx_link_clicks_type ON public.link_clicks(link_type, clicked_at DESC);
CREATE INDEX idx_link_clicks_date ON public.link_clicks(clicked_at DESC);

CREATE INDEX idx_link_shares_user ON public.link_shares(user_id, shared_at DESC);
CREATE INDEX idx_link_shares_shared_user ON public.link_shares(shared_user_id, shared_at DESC);
CREATE INDEX idx_link_shares_type ON public.link_shares(share_type, shared_at DESC);

CREATE INDEX idx_user_analytics_user ON public.user_analytics(user_id);
CREATE INDEX idx_daily_analytics_user_date ON public.daily_analytics(user_id, analytics_date DESC);

-- Enable RLS
ALTER TABLE public.link_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.link_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for link_clicks
CREATE POLICY "Users can view clicks on their own links" ON public.link_clicks
FOR SELECT USING (
  clicked_user_id = auth.uid() OR
  user_id = auth.uid()
);

CREATE POLICY "Anyone can create click records" ON public.link_clicks
FOR INSERT WITH CHECK (true); -- Allow anonymous tracking

-- RLS Policies for link_shares
CREATE POLICY "Users can view their own shares" ON public.link_shares
FOR SELECT USING (user_id = auth.uid() OR shared_user_id = auth.uid());

CREATE POLICY "Users can create share records" ON public.link_shares
FOR INSERT WITH CHECK (user_id = auth.uid());

-- RLS Policies for user_analytics
CREATE POLICY "Users can view their own analytics" ON public.user_analytics
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can manage user analytics" ON public.user_analytics
FOR ALL USING (true);

-- RLS Policies for daily_analytics
CREATE POLICY "Users can view their own daily analytics" ON public.daily_analytics
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can manage daily analytics" ON public.daily_analytics
FOR ALL USING (true);

-- Function to track a link click
CREATE OR REPLACE FUNCTION track_link_click(
  p_clicked_user_id UUID,
  p_link_type TEXT,
  p_link_url TEXT,
  p_source_page TEXT DEFAULT NULL,
  p_referrer TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_click_id UUID;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid(); -- May be null for anonymous users

  -- Insert click record
  INSERT INTO public.link_clicks (
    user_id,
    clicked_user_id,
    link_type,
    link_url,
    source_page,
    referrer,
    user_agent,
    ip_address,
    metadata
  )
  VALUES (
    v_user_id,
    p_clicked_user_id,
    p_link_type,
    p_link_url,
    p_source_page,
    p_referrer,
    p_user_agent,
    p_ip_address::inet,
    p_metadata
  )
  RETURNING id INTO v_click_id;

  -- Update user analytics
  INSERT INTO public.user_analytics (user_id, last_updated)
  VALUES (p_clicked_user_id, now())
  ON CONFLICT (user_id) DO UPDATE SET
    total_link_clicks = user_analytics.total_link_clicks + 1,
    linkedin_clicks = CASE WHEN p_link_type = 'linkedin_profile'
      THEN user_analytics.linkedin_clicks + 1
      ELSE user_analytics.linkedin_clicks END,
    email_clicks = CASE WHEN p_link_type = 'email'
      THEN user_analytics.email_clicks + 1
      ELSE user_analytics.email_clicks END,
    profile_views = CASE WHEN p_link_type = 'profile_view'
      THEN user_analytics.profile_views + 1
      ELSE user_analytics.profile_views END,
    last_updated = now();

  -- Update daily analytics
  INSERT INTO public.daily_analytics (user_id, analytics_date, total_clicks, created_at)
  VALUES (p_clicked_user_id, CURRENT_DATE, 1, now())
  ON CONFLICT (user_id, analytics_date) DO UPDATE SET
    total_clicks = daily_analytics.total_clicks + 1,
    linkedin_clicks = CASE WHEN p_link_type = 'linkedin_profile'
      THEN daily_analytics.linkedin_clicks + 1
      ELSE daily_analytics.linkedin_clicks END,
    email_clicks = CASE WHEN p_link_type = 'email'
      THEN daily_analytics.email_clicks + 1
      ELSE daily_analytics.email_clicks END,
    profile_views = CASE WHEN p_link_type = 'profile_view'
      THEN daily_analytics.profile_views + 1
      ELSE daily_analytics.profile_views END;

  RETURN v_click_id;
END;
$$;

-- Function to track a share
CREATE OR REPLACE FUNCTION track_link_share(
  p_shared_user_id UUID,
  p_share_type TEXT,
  p_share_medium TEXT,
  p_share_url TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_share_id UUID;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to track shares';
  END IF;

  -- Insert share record
  INSERT INTO public.link_shares (
    user_id,
    shared_user_id,
    share_type,
    share_medium,
    share_url,
    metadata
  )
  VALUES (
    v_user_id,
    p_shared_user_id,
    p_share_type,
    p_share_medium,
    p_share_url,
    p_metadata
  )
  RETURNING id INTO v_share_id;

  -- Update user analytics for sharer
  INSERT INTO public.user_analytics (user_id, last_updated)
  VALUES (v_user_id, now())
  ON CONFLICT (user_id) DO UPDATE SET
    shares_generated = user_analytics.shares_generated + 1,
    last_updated = now();

  -- Update user analytics for shared user
  INSERT INTO public.user_analytics (user_id, last_updated)
  VALUES (p_shared_user_id, now())
  ON CONFLICT (user_id) DO UPDATE SET
    times_shared = user_analytics.times_shared + 1,
    last_updated = now();

  RETURN v_share_id;
END;
$$;

-- Function to get user analytics
CREATE OR REPLACE FUNCTION get_user_analytics(
  p_user_id UUID DEFAULT NULL,
  p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  total_profile_views INTEGER,
  total_link_clicks INTEGER,
  linkedin_clicks INTEGER,
  email_clicks INTEGER,
  times_shared INTEGER,
  shares_generated INTEGER,
  connections_made INTEGER,
  daily_stats JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Only allow users to see their own analytics
  IF v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(ua.profile_views, 0)::INTEGER,
    COALESCE(ua.total_link_clicks, 0)::INTEGER,
    COALESCE(ua.linkedin_clicks, 0)::INTEGER,
    COALESCE(ua.email_clicks, 0)::INTEGER,
    COALESCE(ua.times_shared, 0)::INTEGER,
    COALESCE(ua.shares_generated, 0)::INTEGER,
    COALESCE(ua.connections_made, 0)::INTEGER,
    COALESCE(
      json_agg(
        json_build_object(
          'date', da.analytics_date,
          'profile_views', da.profile_views,
          'total_clicks', da.total_clicks,
          'linkedin_clicks', da.linkedin_clicks,
          'email_clicks', da.email_clicks,
          'shares_made', da.shares_made
        ) ORDER BY da.analytics_date DESC
      ) FILTER (WHERE da.analytics_date IS NOT NULL),
      '[]'::json
    )::jsonb
  FROM public.user_analytics ua
  LEFT JOIN public.daily_analytics da ON (
    da.user_id = ua.user_id AND
    da.analytics_date >= CURRENT_DATE - INTERVAL '1 day' * p_days_back
  )
  WHERE ua.user_id = v_user_id
  GROUP BY ua.profile_views, ua.total_link_clicks, ua.linkedin_clicks,
           ua.email_clicks, ua.times_shared, ua.shares_generated, ua.connections_made;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION track_link_click TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION track_link_share TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_user_analytics TO authenticated, service_role;

-- Create trigger to initialize user analytics when user is created
CREATE OR REPLACE FUNCTION initialize_user_analytics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_analytics (user_id, created_at, last_updated)
  VALUES (NEW.id, now(), now())
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_initialize_user_analytics
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION initialize_user_analytics();