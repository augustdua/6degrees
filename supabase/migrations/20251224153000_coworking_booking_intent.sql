-- Add required work intent to coworking bookings (private to the booker)

ALTER TABLE public.coworking_bookings
ADD COLUMN IF NOT EXISTS work_intent TEXT;

-- Backfill existing rows to a non-empty value so we can enforce NOT NULL
UPDATE public.coworking_bookings
SET work_intent = COALESCE(NULLIF(work_intent, ''), 'Focus session')
WHERE work_intent IS NULL OR work_intent = '';

ALTER TABLE public.coworking_bookings
ALTER COLUMN work_intent SET NOT NULL;

COMMENT ON COLUMN public.coworking_bookings.work_intent IS 'Private note: what the user plans to work on during this session.';


