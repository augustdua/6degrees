-- Add photo field to offers table for creator to upload a photo with the connection

ALTER TABLE offers
ADD COLUMN IF NOT EXISTS offer_photo_url TEXT;

COMMENT ON COLUMN offers.offer_photo_url IS 'URL to photo of creator with the connection (uploaded to storage)';

-- Note: Storage bucket 'offer-photos' must be created manually in Supabase Dashboard:
-- 1. Go to Storage → Create new bucket
-- 2. Name: offer-photos
-- 3. Public: Yes
-- 4. File size limit: 5MB
-- 
-- Then set up RLS policies in Storage → offer-photos → Policies:
--
-- Policy 1: "Anyone can view offer photos"
--   Operation: SELECT
--   Policy: (bucket_id = 'offer-photos')
--
-- Policy 2: "Users can upload their own offer photos"
--   Operation: INSERT
--   Policy: (bucket_id = 'offer-photos' AND (storage.foldername(name))[1] = auth.uid()::text)
--
-- Policy 3: "Users can update their own offer photos"
--   Operation: UPDATE
--   Policy: (bucket_id = 'offer-photos' AND (storage.foldername(name))[1] = auth.uid()::text)
--
-- Policy 4: "Users can delete their own offer photos"
--   Operation: DELETE
--   Policy: (bucket_id = 'offer-photos' AND (storage.foldername(name))[1] = auth.uid()::text)

