-- Fix chain creation permissions
-- Drop the existing policy and create a more permissive one

DROP POLICY IF EXISTS "Users can create chains" ON public.chains;

-- Allow anyone to create chains (for anonymous users joining chains)
CREATE POLICY "Anyone can create chains" ON public.chains
    FOR INSERT WITH CHECK (true);

-- Also allow anyone to view chains (needed for joining)
DROP POLICY IF EXISTS "Users can view chains they participate in" ON public.chains;

CREATE POLICY "Anyone can view chains" ON public.chains
    FOR SELECT USING (true);

-- Allow anyone to update chains (needed for adding participants)
DROP POLICY IF EXISTS "Users can update chains they participate in" ON public.chains;

CREATE POLICY "Anyone can update chains" ON public.chains
    FOR UPDATE USING (true);
