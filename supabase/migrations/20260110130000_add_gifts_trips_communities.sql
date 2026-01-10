-- Add partner-only communities: Gifts and Trips
-- These appear alongside Events in the Forum UI.

INSERT INTO forum_communities (name, slug, description, icon, color, is_active)
VALUES
  ('Gifts', 'gifts', 'Gift ideas and thoughtful outreach', '🎁', '#CBAA5A', true),
  ('Trips', 'trips', 'Trips, meetups, and IRL plans', '✈️', '#38BDF8', true)
ON CONFLICT (slug) DO NOTHING;

NOTIFY pgrst, 'reload schema';


