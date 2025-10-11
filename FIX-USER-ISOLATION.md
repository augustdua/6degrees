# Fix: User Isolation for Videos and Avatars

## Problem Summary
- **Videos**: All users could see each other's videos because they were stored in a shared `request-videos/` folder
- **Avatars**: Users were seeing avatars from other users' HeyGen groups because the API was fetching ALL avatars

## Solution Applied

### 1. ✅ User-Specific Folders for Videos
**Changed Files:**
- `backend/src/controllers/requestController.ts`
- `frontend/src/components/VideoUploader.tsx`

**What Changed:**
- Videos now stored in: `request-videos/{userId}/{filename}`
- Thumbnails now stored in: `thumbnails/{userId}/{filename}`

### 2. ✅ Storage Bucket RLS Policies
**Migration File:** `supabase/migrations/036_add_storage_rls_for_user_videos.sql`

**What It Does:**
- Users can only UPLOAD to their own folder (`request-videos/{userId}/` and `thumbnails/{userId}/`)
- Users can only UPDATE/DELETE files in their own folder
- Public can still VIEW videos (needed for sharing), but files are organized by user

### 3. ✅ Avatar Filtering by User's Group
**Changed Files:**
- `backend/src/controllers/requestController.ts` (getAvatars function)

**What Changed:**
- The `/api/requests/heygen/avatars` endpoint now:
  1. Gets the authenticated user's ID
  2. Fetches the user's `heygen_avatar_group_id` from the database
  3. Returns ONLY avatars from that specific group
  4. Returns empty array if user has no avatar group yet

**Before:**
```javascript
// Returned ALL avatars from ALL groups
const avatars = await getHeyGenAvatars();
```

**After:**
```javascript
// Returns ONLY avatars from the user's own group
const { getGroupAvatars } = require('../services/heygenPhotoAvatarService');
const groupAvatars = await getGroupAvatars(userData.heygen_avatar_group_id);
```

## How to Apply These Fixes

### Step 1: Create Storage RLS Policies in Supabase Dashboard
**⚠️ Important:** Storage policies cannot be created via SQL due to permissions. You must use the Dashboard UI.

Follow the step-by-step guide in `STORAGE-POLICIES-SETUP.md` to create 3 policies:
1. **Users can upload to their own folder** (INSERT)
2. **Users can modify their own files** (UPDATE)  
3. **Users can delete their own files** (DELETE)

**Quick Link:** https://supabase.com/dashboard/project/tfbwfcnjdmbqmoyljeys/storage/buckets

This will enforce user folder isolation at the storage level.

### Step 2: Restart Your Backend Server
```bash
cd backend
npm run dev
```

### Step 3: Test the Isolation

#### Test Avatar Isolation:
1. Login as User A
2. Go to Video Studio → Generate Video
3. Check avatar list - should ONLY see User A's avatars from their group
4. Login as User B (different account)
5. Check avatar list - should ONLY see User B's avatars (different from User A)

#### Test Video Isolation:
1. Login as User A
2. Upload a video to a request
3. Check the video URL - should contain User A's ID: 
   ```
   .../request-videos/{userA-id}/...
   ```
4. Login as User B
5. Upload a video
6. Check the video URL - should contain User B's ID:
   ```
   .../request-videos/{userB-id}/...
   ```

### Step 4: Migration for Existing Videos (Optional)
If you have existing videos in the old location (`request-videos/{filename}`), you'll need to migrate them:

```sql
-- This is a MANUAL step if you have old videos to migrate
-- Check what files exist in old location first
SELECT name FROM storage.objects 
WHERE bucket_id = '6DegreeRequests' 
  AND name ~ '^request-videos/[^/]+$'
  AND name NOT ~ '^request-videos/[0-9a-f]{8}-[0-9a-f]{4}';

-- Then manually move them or re-upload through the UI
```

## What Each User Sees Now

### User A (augustduamath@gmail.com)
- **Avatars**: Only avatars from group `6a771152539443bd8f84767a643ecaa9`
- **Videos**: Uploaded to `request-videos/dddffff1-bfed-40a6-a99c-28dccb4c5014/`

### User B (any other user)
- **Avatars**: Only avatars from their own group (or empty if no group)
- **Videos**: Uploaded to `request-videos/{their-user-id}/`

## Security Benefits
1. ✅ **Avatar Privacy**: Users cannot see other users' custom avatars
2. ✅ **Video Organization**: Videos are organized by user, making it easier to manage
3. ✅ **Upload Control**: Users can only upload to their own folders
4. ✅ **Modification Control**: Users can only modify/delete their own files

## Notes
- Public can still VIEW videos because connection requests need to be shareable
- The actual access control for viewing requests is handled by the `connection_requests` table RLS policies
- Videos are only accessible if someone has the full URL (which comes from a valid request)

