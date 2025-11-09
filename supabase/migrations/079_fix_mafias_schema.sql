-- Fix mafias table schema to match controller expectations
-- This migration adds the missing columns that were supposed to be in migration 070

-- Add slug column if it doesn't exist
ALTER TABLE public.mafias ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Add currency column if it doesn't exist
ALTER TABLE public.mafias ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD' NOT NULL;

-- Add conversation_id column if it doesn't exist
ALTER TABLE public.mafias ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL;

-- Add member_count column if it doesn't exist
ALTER TABLE public.mafias ADD COLUMN IF NOT EXISTS member_count INTEGER DEFAULT 0 NOT NULL;

-- Rename founding_member_limit to founding_members_limit if needed
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'mafias' AND column_name = 'founding_member_limit') THEN
        ALTER TABLE public.mafias RENAME COLUMN founding_member_limit TO founding_members_limit;
    END IF;
END $$;

-- Add founding_members_limit if it doesn't exist
ALTER TABLE public.mafias ADD COLUMN IF NOT EXISTS founding_members_limit INTEGER DEFAULT 10 NOT NULL CHECK (founding_members_limit >= 1 AND founding_members_limit <= 10);

-- Add monthly_price_usd and monthly_price_inr columns
ALTER TABLE public.mafias ADD COLUMN IF NOT EXISTS monthly_price_usd NUMERIC(10,2) DEFAULT 0.00 NOT NULL CHECK (monthly_price_usd >= 0);
ALTER TABLE public.mafias ADD COLUMN IF NOT EXISTS monthly_price_inr NUMERIC(10,2) DEFAULT 0.00 NOT NULL CHECK (monthly_price_inr >= 0);

-- Migrate data from old monthly_price column to new columns (if monthly_price exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'mafias' AND column_name = 'monthly_price') THEN
        -- Copy monthly_price to monthly_price_usd
        UPDATE public.mafias SET monthly_price_usd = monthly_price WHERE monthly_price IS NOT NULL;
        -- Drop old column
        ALTER TABLE public.mafias DROP COLUMN monthly_price;
    END IF;
END $$;

-- Generate slugs for existing records that don't have one
UPDATE public.mafias 
SET slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL;

-- Add constraints (drop if exists first, then add)
DO $$
BEGIN
    -- Drop existing constraints if they exist
    ALTER TABLE public.mafias DROP CONSTRAINT IF EXISTS mafias_slug_check;
    ALTER TABLE public.mafias DROP CONSTRAINT IF EXISTS mafias_name_check;
    ALTER TABLE public.mafias DROP CONSTRAINT IF EXISTS mafias_description_check;
    
    -- Add new constraints
    ALTER TABLE public.mafias ADD CONSTRAINT mafias_slug_check CHECK (length(slug) >= 3 AND length(slug) <= 100);
    ALTER TABLE public.mafias ADD CONSTRAINT mafias_name_check CHECK (length(name) >= 3 AND length(name) <= 100);
    ALTER TABLE public.mafias ADD CONSTRAINT mafias_description_check CHECK (length(description) >= 10 AND length(description) <= 1000);
END $$;

-- Drop all existing RLS policies (some depend on status column)
DROP POLICY IF EXISTS "Anyone can view active mafias" ON public.mafias;
DROP POLICY IF EXISTS "Users can view their own mafias" ON public.mafias;
DROP POLICY IF EXISTS "Anyone can view all mafias" ON public.mafias;
DROP POLICY IF EXISTS "Users can insert their own mafias" ON public.mafias;
DROP POLICY IF EXISTS "Creators can update their mafias" ON public.mafias;
DROP POLICY IF EXISTS "Creators can delete their mafias" ON public.mafias;

-- Drop old status column if it exists (we're not using it anymore)
ALTER TABLE public.mafias DROP COLUMN IF EXISTS status;

-- Recreate RLS policies without status dependency
CREATE POLICY "Anyone can view all mafias" ON public.mafias
    FOR SELECT
    USING (true);

CREATE POLICY "Users can insert their own mafias" ON public.mafias
    FOR INSERT
    WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their mafias" ON public.mafias
    FOR UPDATE
    USING (auth.uid() = creator_id);

CREATE POLICY "Creators can delete their mafias" ON public.mafias
    FOR DELETE
    USING (auth.uid() = creator_id);

-- Create index for slug lookups
CREATE INDEX IF NOT EXISTS idx_mafias_slug ON public.mafias(slug);
CREATE INDEX IF NOT EXISTS idx_mafias_creator_id ON public.mafias(creator_id);
CREATE INDEX IF NOT EXISTS idx_mafias_conversation_id ON public.mafias(conversation_id);

