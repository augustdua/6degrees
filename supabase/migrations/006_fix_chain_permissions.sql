-- Fix chain creation permissions
-- Drop the existing restrictive policies

DROP POLICY IF EXISTS "chains_insert_if_participant" ON public.chains;
DROP POLICY IF EXISTS "chains_select_if_participant" ON public.chains;
DROP POLICY IF EXISTS "chains_update_if_participant" ON public.chains;

-- Allow authenticated users to create chains
CREATE POLICY "Authenticated users can create chains" ON public.chains
    FOR INSERT TO authenticated WITH CHECK (true);

-- Allow authenticated users to view chains (needed for joining and viewing)
CREATE POLICY "Authenticated users can view chains" ON public.chains
    FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to update chains (needed for adding participants)
CREATE POLICY "Authenticated users can update chains" ON public.chains
    FOR UPDATE TO authenticated USING (true);

-- Clean up duplicate chains for the same request
-- This will keep only the chain with the most participants for each request
WITH ranked_chains AS (
  SELECT 
    id,
    request_id,
    participants,
    ROW_NUMBER() OVER (
      PARTITION BY request_id 
      ORDER BY jsonb_array_length(participants) DESC, created_at ASC
    ) as rn
  FROM chains
)
DELETE FROM chains 
WHERE id IN (
  SELECT id FROM ranked_chains WHERE rn > 1
);
