-- Migration 069: Add AI-generated use cases to offers table
-- Stores 3 example questions/use cases that can be asked to the target person

-- Add use_cases column (JSONB array of strings)
ALTER TABLE offers 
  ADD COLUMN IF NOT EXISTS use_cases JSONB DEFAULT '[]'::jsonb;

-- Add comment
COMMENT ON COLUMN offers.use_cases IS 'AI-generated use cases/questions (3 examples) that can be asked to the target person during intro calls';

-- Verify the column was added
SELECT 
    column_name,
    data_type,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public'
    AND table_name = 'offers'
    AND column_name = 'use_cases';

