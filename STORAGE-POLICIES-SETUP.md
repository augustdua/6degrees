# Storage Policies Setup Guide

## ⚠️ Important: Storage policies CANNOT be created via SQL Editor
You must create them through the Supabase Dashboard UI.

## Step-by-Step Instructions

### 1. Navigate to Storage Policies
1. Go to: https://supabase.com/dashboard/project/tfbwfcnjdmbqmoyljeys/storage/buckets
2. Click on the **6DegreeRequests** bucket
3. Click the **Policies** tab at the top
4. You'll see one existing policy: "Public Read Access hn7qfa_0"

---

## Policy 1: Users Can Upload to Their Own Folder

**Purpose:** Users can only upload videos/thumbnails to their own user-specific folder

1. Click **New Policy**
2. Select **For full customization** → **Get started**
3. Configure:
   - **Policy name**: `Users can upload to their own folder`
   - **Allowed operation**: Check ✅ **INSERT**
   - **Target roles**: `authenticated`
   - **USING expression**: Leave empty
   - **WITH CHECK expression**: 
   ```sql
   (bucket_id = '6DegreeRequests'::text) AND 
   (
     (name ~ ('^request-videos/'::text || (auth.uid())::text || '/'::text)) OR
     (name ~ ('^thumbnails/'::text || (auth.uid())::text || '/'::text))
   )
   ```
4. Click **Review** → **Save policy**

---

## Policy 2: Users Can Update Their Own Files

**Purpose:** Users can only update files in their own folder

1. Click **New Policy**
2. Select **For full customization** → **Get started**
3. Configure:
   - **Policy name**: `Users can modify their own files`
   - **Allowed operation**: Check ✅ **UPDATE**
   - **Target roles**: `authenticated`
   - **USING expression**: 
   ```sql
   (bucket_id = '6DegreeRequests'::text) AND 
   (
     (name ~ ('^request-videos/'::text || (auth.uid())::text || '/'::text)) OR
     (name ~ ('^thumbnails/'::text || (auth.uid())::text || '/'::text))
   )
   ```
   - **WITH CHECK expression**: Same as USING above:
   ```sql
   (bucket_id = '6DegreeRequests'::text) AND 
   (
     (name ~ ('^request-videos/'::text || (auth.uid())::text || '/'::text)) OR
     (name ~ ('^thumbnails/'::text || (auth.uid())::text || '/'::text))
   )
   ```
4. Click **Review** → **Save policy**

---

## Policy 3: Users Can Delete Their Own Files

**Purpose:** Users can only delete files from their own folder

1. Click **New Policy**
2. Select **For full customization** → **Get started**
3. Configure:
   - **Policy name**: `Users can delete their own files`
   - **Allowed operation**: Check ✅ **DELETE**
   - **Target roles**: `authenticated`
   - **USING expression**: 
   ```sql
   (bucket_id = '6DegreeRequests'::text) AND 
   (
     (name ~ ('^request-videos/'::text || (auth.uid())::text || '/'::text)) OR
     (name ~ ('^thumbnails/'::text || (auth.uid())::text || '/'::text))
   )
   ```
   - **WITH CHECK expression**: Leave empty
4. Click **Review** → **Save policy**

---

## Policy 4: Update Public Read Policy (Optional)

The existing "Public Read Access hn7qfa_0" policy already allows public reading, which is fine since:
- Request access is controlled by the `connection_requests` table RLS
- Videos are only accessible via URLs stored in valid requests

**If you want to be more explicit:**

1. Find the existing policy "Public Read Access hn7qfa_0"
2. Click **Edit**
3. Update the **USING expression** to:
   ```sql
   (bucket_id = '6DegreeRequests'::text) AND 
   (
     (name ~ '^request-videos/'::text) OR 
     (name ~ '^thumbnails/'::text)
   )
   ```
4. Save

---

## Verification

After creating all policies, you should see:
- ✅ Public Read Access hn7qfa_0 (SELECT)
- ✅ Users can upload to their own folder (INSERT)
- ✅ Users can modify their own files (UPDATE)
- ✅ Users can delete their own files (DELETE)

## Quick Test

To verify the policies work:

1. **Test Upload to Own Folder** (should work):
   ```javascript
   // In your app, upload a video as User A
   // It should succeed uploading to: request-videos/{userA-id}/video.mp4
   ```

2. **Test Upload to Other Folder** (should fail):
   ```javascript
   // Try to manually upload to: request-videos/{otherUserId}/video.mp4
   // Should get permission denied error
   ```

3. **Test Public Read** (should work):
   ```javascript
   // Open a video URL in browser (unauthenticated)
   // Should be able to view the video
   ```

## Alternative: Skip Storage RLS (Less Secure)

If you want to skip storage-level RLS for now (since your app logic already prevents cross-user access), you can keep just the public read policy and rely on:

1. **Application-level security**: Users can only upload through your backend API, which enforces the userId in the path
2. **Request-level RLS**: Users can only see video URLs for requests they have access to

This is less secure because:
- A user with the full URL could technically access any video
- But they'd need to guess the exact UUID + timestamp + user ID

The storage RLS adds defense-in-depth security.

