# Fix Video Bucket Issue

## Problem
Videos are returning 400 Bad Request because the Supabase Storage bucket `6DegreeRequests` either doesn't exist or isn't public.

## Solution

### Step 1: Create the Bucket in Supabase

1. Go to https://supabase.com/dashboard/project/tfbwfcnjdmbqmoyljeys
2. Click **Storage** in the left sidebar
3. Click **New bucket**
4. Configure:
   - **Name**: `6DegreeRequests`
   - **Public bucket**: Toggle **ON** (important!)
   - Click **Create bucket**

### Step 2: Set Public Access Policy

1. Click on the `6DegreeRequests` bucket
2. Go to **Policies** tab
3. Click **New Policy**
4. Select **For full customization** → **Get started**
5. Configure:
   - **Policy name**: `Public Read Access`
   - **Allowed operations**: Check **SELECT** (read)
   - **Policy definition**: Enter `true` (allows public access)
6. Click **Review** → **Save policy**

### Step 3: Restart Backend

After creating the bucket, restart your backend server:

```bash
cd backend
npm run dev
```

### Step 4: Re-upload Existing Videos

Any videos that were already uploaded may have broken URLs. You'll need to:
1. Re-upload them through the Video Studio
2. OR manually update the video URLs in the database

## Verification

To verify the bucket is working:
1. Upload a test video through your app
2. Check that the video URL looks like:
   ```
   https://tfbwfcnjdmbqmoyljeys.supabase.co/storage/v1/object/public/6DegreeRequests/request-videos/[filename].mp4
   ```
3. Open the URL in a browser - it should play the video

## Alternative: Use a Different Bucket Name

If you already have a different bucket for videos, you can change the bucket name in:
- `backend/.env` → set `SUPABASE_VIDEO_BUCKET=your-bucket-name`
- Restart the backend server
