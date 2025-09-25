-- Fix target claims authentication by adding automatic claimant_id setting
-- This allows the frontend to omit claimant_id and have it set automatically

-- Create function to set claimant_id to current user
CREATE OR REPLACE FUNCTION set_claimant_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Set claimant_id to the current authenticated user
    NEW.claimant_id := auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically set claimant_id on insert
DROP TRIGGER IF EXISTS trigger_set_claimant_id ON public.target_claims;
CREATE TRIGGER trigger_set_claimant_id
    BEFORE INSERT ON public.target_claims
    FOR EACH ROW
    EXECUTE FUNCTION set_claimant_id();

-- Update RLS policy to ensure users can read their own claims
DROP POLICY IF EXISTS "Users can view their own claims" ON public.target_claims;
CREATE POLICY "Users can view their own claims" ON public.target_claims
    FOR SELECT USING (auth.uid() = claimant_id);

-- Ensure the existing insert policy still works
-- (This should already exist: "Users can create claims" FOR INSERT WITH CHECK (auth.uid() = claimant_id))