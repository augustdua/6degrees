-- Zaurq Club members (partners-only view, invite-only population)
-- Created: 2025-12-23
--
-- Each Zaurq Partner has a curated club of <10 members (enforced by app logic).

CREATE TABLE IF NOT EXISTS zaurq_club_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  member_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(partner_user_id, member_user_id)
);

CREATE INDEX IF NOT EXISTS idx_zaurq_club_members_partner ON zaurq_club_members(partner_user_id);
CREATE INDEX IF NOT EXISTS idx_zaurq_club_members_member ON zaurq_club_members(member_user_id);

ALTER TABLE zaurq_club_members ENABLE ROW LEVEL SECURITY;

-- Partners can read their own club list
DROP POLICY IF EXISTS "Partners can read their own club" ON zaurq_club_members;
CREATE POLICY "Partners can read their own club" ON zaurq_club_members
  FOR SELECT USING (auth.uid() = partner_user_id);

-- Default: no client-side inserts (invite-only managed by review/admin tooling)
-- Service role can manage
DROP POLICY IF EXISTS "Service role full access to zaurq_club_members" ON zaurq_club_members;
CREATE POLICY "Service role full access to zaurq_club_members" ON zaurq_club_members
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

COMMENT ON TABLE zaurq_club_members IS 'Curated <10 member club per Zaurq Partner (invite-only population)';


