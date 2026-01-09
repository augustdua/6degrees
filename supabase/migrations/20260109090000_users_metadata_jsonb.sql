-- Add a JSONB metadata column on public.users for app-level integrations/state.
-- We store per-user integration state (e.g. WhatsApp/Baileys auth state) here.

BEGIN;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.users.metadata IS 'App-level metadata (integrations, feature flags, sync state). Do not store large blobs unless necessary.';

COMMIT;

NOTIFY pgrst, 'reload schema';


