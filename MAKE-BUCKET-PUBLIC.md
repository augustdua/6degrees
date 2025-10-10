# How to Make Supabase Storage Bucket Public

## Step-by-Step Guide

### 1. Go to Supabase Storage Dashboard

Visit: https://supabase.com/dashboard/project/tfbwfcnjdmbqmoyljeys/storage/buckets

### 2. Make the Bucket Public

**If the bucket `6DegreeRequests` already exists:**

1. Click on the **⋮** (three dots) next to the `6DegreeRequests` bucket
2. Select **Edit bucket**
3. Toggle **Public bucket** to **ON** ✅
4. Click **Save**

**If the bucket doesn't exist yet:**

1. Click **New bucket** button
2. Enter name: `6DegreeRequests`
3. Toggle **Public bucket** to **ON** ✅
4. Click **Create bucket**

### 3. Add Public Access Policy (Important!)

Even after making the bucket public, you need to add a policy:

1. Click on the `6DegreeRequests` bucket name
2. Click the **Policies** tab at the top
3. Click **New Policy** button
4. Click **For full customization** → **Get started**
5. Configure the policy:
   - **Policy name**: `Allow public read access`
   - **Allowed operation**: Check ✅ **SELECT** (read)
   - **Target roles**: Leave as `public`
   - **USING expression**: Enter `true`
   - **WITH CHECK expression**: Leave empty
6. Click **Review**
7. Click **Save policy**

### 4. Verify It Works

Test the bucket by opening a video URL in your browser:

```
https://tfbwfcnjdmbqmoyljeys.supabase.co/storage/v1/object/public/6DegreeRequests/request-videos/test.mp4
```

If you see a video or get a 404 (file not found) instead of 400 (bad request), the bucket is working!

### 5. Re-upload Videos

**Important:** Any videos uploaded before the bucket was made public will have broken URLs. You need to:

1. Go to Video Studio for each request
2. Upload the video again
3. The new URL will work correctly

## Quick Visual Guide

```
Storage → 6DegreeRequests → ⋮ → Edit bucket → Toggle "Public bucket" ON → Save

Then:

6DegreeRequests → Policies → New Policy → Custom →
  Name: "Allow public read access"
  Operation: SELECT ✅
  USING: true
  → Save
```

## Troubleshooting

**Still getting 400 errors?**
- Clear your browser cache
- Verify the policy was saved (go to Policies tab and check it's there)
- Make sure the bucket shows a 🌐 globe icon (indicates it's public)

**Getting 403 Forbidden?**
- The bucket is public but the policy is missing
- Go back to Step 3 and add the public access policy

**Getting 404 Not Found?**
- Good! The bucket is working, but the file doesn't exist
- Re-upload your videos
