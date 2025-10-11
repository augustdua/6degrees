-- Fix chain_paths constraint to allow single-person paths (creator only)
-- The original constraint required path_length >= 2, which breaks when creating new chains
-- with only a creator

-- Drop the old constraint
ALTER TABLE chain_paths 
DROP CONSTRAINT IF EXISTS path_length_check;

-- Add the corrected constraint (allow path_length >= 1)
ALTER TABLE chain_paths 
ADD CONSTRAINT path_length_check CHECK (path_length >= 1);

-- Comment explaining the fix
COMMENT ON CONSTRAINT path_length_check ON chain_paths IS 
'Allows paths with at least 1 participant (creator-only paths are valid when chains are first created)';

