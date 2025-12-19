-- Add membership status system
-- Users can be: 'member' (full access), 'waitlist' (limited access), 'rejected'

-- Add membership columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS membership_status TEXT DEFAULT 'waitlist';
ALTER TABLE users ADD COLUMN IF NOT EXISTS membership_approved_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS membership_approved_by UUID REFERENCES users(id);

-- Add constraint for valid status values
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_membership_status_check;
ALTER TABLE users ADD CONSTRAINT users_membership_status_check 
  CHECK (membership_status IN ('member', 'waitlist', 'rejected'));

-- Create index for efficient membership queries
CREATE INDEX IF NOT EXISTS idx_users_membership_status ON users(membership_status);

-- Add comment for documentation
COMMENT ON COLUMN users.membership_status IS 'User membership status: member (full access), waitlist (profile + browse offers only), rejected';
COMMENT ON COLUMN users.membership_approved_at IS 'Timestamp when user was approved as member';
COMMENT ON COLUMN users.membership_approved_by IS 'Admin user ID who approved the membership';

