-- Add new problem-focused communities for founder discussions
-- These communities help founders share and discover pain points and market opportunities

INSERT INTO forum_communities (name, slug, description, icon, color) VALUES
  ('Pain Points', 'pain-points', 'Share problems you''re solving or struggling with. Find others facing similar challenges', '🎯', '#DC2626'),
  ('Market Gaps', 'market-gaps', 'Discuss untapped opportunities, underserved markets, and gaps you''ve spotted', '🔍', '#7C3AED')
ON CONFLICT (slug) DO NOTHING;

