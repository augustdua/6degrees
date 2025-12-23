-- Zaurq role system (ZAURQ_USER / ZAURQ_PARTNER)
-- Created: 2025-12-23
--
-- Adds a single role enum to users, and backfills from existing membership_status.
-- We keep membership_status for backward compatibility during rollout, but the app
-- should transition to using users.role.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'zaurq_role') THEN
    CREATE TYPE zaurq_role AS ENUM ('ZAURQ_USER', 'ZAURQ_PARTNER');
  END IF;
END $$;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role zaurq_role DEFAULT 'ZAURQ_USER';

-- Backfill role from existing membership_status (if present)
UPDATE users
SET role = CASE
  WHEN COALESCE(membership_status, '') = 'member' THEN 'ZAURQ_PARTNER'::zaurq_role
  ELSE 'ZAURQ_USER'::zaurq_role
END
WHERE role IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

COMMENT ON COLUMN users.role IS 'Zaurq role: ZAURQ_USER (standard) or ZAURQ_PARTNER (invite/review approved)';


