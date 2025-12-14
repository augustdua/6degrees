-- Create dedicated News community (idempotent)
-- This keeps news separate from General and allows better "All" feed mixing.

ALTER TABLE forum_communities
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

ALTER TABLE forum_communities
  ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 999;

INSERT INTO forum_communities (name, slug, description, icon, color, is_active, display_order)
VALUES ('News', 'news', 'Startup and business news', '📰', '#CBAA5A', true, 15)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  is_active = true,
  display_order = 15;


