-- Add reference_type column to transactions table for mafia payments
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS reference_type TEXT;

-- Update the check constraint for type to include mafia-related types
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_type_check 
  CHECK (type IN ('credit', 'debit'));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_transactions_reference_type ON public.transactions(reference_type);
CREATE INDEX IF NOT EXISTS idx_transactions_reference_id ON public.transactions(reference_id);

