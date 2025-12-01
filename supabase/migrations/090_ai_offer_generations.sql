-- Migration: AI Offer Generations History
-- This migration creates the ai_offer_generations table to track AI offer generation history
-- and adds ai_generation_id column to the offers table to link offers to their generation

-- 1. Create the ai_offer_generations table
CREATE TABLE IF NOT EXISTS public.ai_offer_generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster lookups by user
CREATE INDEX IF NOT EXISTS idx_ai_offer_generations_user_id ON public.ai_offer_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_offer_generations_created_at ON public.ai_offer_generations(created_at DESC);

-- 2. Add ai_generation_id column to offers table
ALTER TABLE public.offers 
ADD COLUMN IF NOT EXISTS ai_generation_id UUID REFERENCES public.ai_offer_generations(id) ON DELETE SET NULL;

-- Add index for faster lookups by generation
CREATE INDEX IF NOT EXISTS idx_offers_ai_generation_id ON public.offers(ai_generation_id);

-- 3. Enable RLS on ai_offer_generations
ALTER TABLE public.ai_offer_generations ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for ai_offer_generations
-- Users can read their own generation history
CREATE POLICY "Users can view own generation history"
    ON public.ai_offer_generations
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own generation records
CREATE POLICY "Users can create own generation records"
    ON public.ai_offer_generations
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Service role can do everything (for backend)
CREATE POLICY "Service role has full access to ai_offer_generations"
    ON public.ai_offer_generations
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- 5. Grant permissions
GRANT ALL ON public.ai_offer_generations TO authenticated;
GRANT ALL ON public.ai_offer_generations TO service_role;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

