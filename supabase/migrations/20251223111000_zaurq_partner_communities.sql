-- Zaurq partner communities
-- Created: 2025-12-23
--
-- Adds:
-- - Events community (partner-only in UI)
-- - Zaurq Partners community (curated feed for partners)

INSERT INTO forum_communities (name, slug, description, icon, color)
VALUES
  ('Events', 'events', 'Invite-only events and IRL gatherings for Zaurq Partners', '📅', '#CBAA5A'),
  ('Zaurq Partners', 'zaurq-partners', 'Curated signal: only traction from the wider community', '✦', '#CBAA5A')
ON CONFLICT (slug) DO NOTHING;

-- Ensure these communities are active (if is_active exists)
UPDATE forum_communities
SET is_active = true
WHERE slug IN ('events', 'zaurq-partners') AND (is_active IS NULL OR is_active = false);


