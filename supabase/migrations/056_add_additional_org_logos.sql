-- Add support for multiple organization logos on offers
-- target_position is for the primary organization only
-- additional_org_logos stores array of other company logos

ALTER TABLE offers
ADD COLUMN IF NOT EXISTS additional_org_logos JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN offers.additional_org_logos IS 'Array of additional organization logos to showcase connection breadth: [{"name": "Google", "logo_url": "..."}, ...]';

-- Example structure:
-- [
--   {"name": "Google", "logo_url": "https://img.logo.dev/google.com?token=pk_dvr547hlTjGTLwg7G9xcbQ"},
--   {"name": "Microsoft", "logo_url": "https://img.logo.dev/microsoft.com?token=pk_dvr547hlTjGTLwg7G9xcbQ"}
-- ]

