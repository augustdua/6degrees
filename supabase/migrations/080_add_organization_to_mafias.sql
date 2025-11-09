-- Add organization_id to mafias table
ALTER TABLE public.mafias 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Create index for organization lookups
CREATE INDEX IF NOT EXISTS idx_mafias_organization_id ON public.mafias(organization_id);

-- Update the getAllMafias and getMyMafias RPC functions don't exist yet, 
-- but the backend controller will need to join with organizations table
-- to get the logo_url

