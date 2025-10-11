# Photo Avatar Privacy & Security

## Overview
This document outlines how user photos are handled when creating personal AI avatars for video generation.

---

## Photo Data Flow

### 1. **User Upload**
- User uploads their photo in Video Studio
- Photo is validated (type, size < 10MB)
- Photo is temporarily stored in Supabase Storage

### 2. **Processing**
- Photo is uploaded to `avatars/temp/` folder in Supabase
- Public URL is generated (temporary access)
- URL is sent to HeyGen API for cartoon avatar generation
- HeyGen processes the photo and returns cartoon avatar images

### 3. **Automatic Deletion**
- ✅ **Original photo is deleted** immediately after HeyGen processing
- Only the **cartoon avatar preview** URL is kept
- Original photo is NOT stored in the database

---

## What's Stored

### ✅ Stored in Database:
- `heygen_avatar_preview_url` - Cartoon avatar preview (NOT original photo)
- `heygen_avatar_group_id` - HeyGen's trained model ID
- `heygen_avatar_photo_id` - Talking photo ID for video generation
- `heygen_avatar_image_key` - HeyGen's internal image key

### ❌ NOT Stored:
- Original user photo
- Original photo URL
- Any raw photo data

---

## Security Measures

### Current Implementation:

1. **Temporary Storage**
   - Photos stored in `temp/` folder
   - Automatically deleted after processing
   - Maximum lifetime: ~30 seconds

2. **No Database Storage**
   - Original photo URL never saved to database
   - Only cartoon avatar references stored

3. **User Notification**
   - Users are informed their original photo is deleted
   - Toast message: "Your original photo has been securely deleted"

### Third-Party Processing:

- **HeyGen API**: Photos are sent to HeyGen for AI processing
- HeyGen's data handling: Check [HeyGen Privacy Policy](https://www.heygen.com/privacy)
- After processing, HeyGen stores cartoon avatars (not original photos)

---

## Recommended Additional Measures

### For Production:

1. **Add Privacy Notice**
   ```tsx
   <p className="text-xs text-muted-foreground mt-2">
     Your photo will be processed by HeyGen to create a cartoon avatar.
     The original photo will be immediately deleted after processing.
     <a href="/privacy" className="underline">Privacy Policy</a>
   </p>
   ```

2. **Use Private Bucket with Signed URLs** (Future Enhancement)
   - Instead of public bucket, use private bucket
   - Generate signed URLs with 1-minute expiration
   - Even more secure than current implementation

3. **Add User Consent Checkbox**
   ```tsx
   <label>
     <input type="checkbox" checked={consent} onChange={...} />
     I agree to have my photo processed by HeyGen to create an AI avatar
   </label>
   ```

4. **GDPR Compliance** (if targeting EU users)
   - Add right to deletion (delete avatar group)
   - Data processing agreement with HeyGen
   - Privacy policy updates

5. **Audit Logging**
   - Log photo upload/deletion events
   - Track HeyGen API calls
   - Monitor for security incidents

---

## User Rights

### Current Capabilities:
- ✅ User can see their cartoon avatar preview
- ✅ Original photo is auto-deleted
- ⚠️ User cannot delete trained avatar (future feature)

### Future Enhancements:
- Add "Delete My Avatar" button
- Call HeyGen API to delete avatar group
- Remove all avatar data from database

---

## Summary

### ✅ **Your photos ARE safe because:**
1. Original photos are **automatically deleted** after processing
2. Original photo URLs are **never stored** in the database
3. Only **cartoon avatars** (not original photos) are kept
4. Photos are stored in a `temp/` folder indicating temporary status

### ⚠️ **What to be aware of:**
1. Photos are processed by **HeyGen** (third-party)
2. Cartoon avatars remain in HeyGen's system (for video generation)
3. Bucket needs to be public for HeyGen to access photos (temporary)

### 🔒 **Recommended for production:**
- Add explicit privacy notice
- Consider GDPR compliance if needed
- Add user consent checkbox
- Implement "Delete Avatar" feature

---

## Questions?

If you have concerns about photo privacy:
1. Review HeyGen's privacy policy
2. Consider implementing signed URLs for extra security
3. Add explicit user consent mechanisms
4. Implement data deletion features
