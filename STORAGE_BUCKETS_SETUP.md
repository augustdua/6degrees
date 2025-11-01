# Storage Buckets Setup Guide

## Buckets to Create in Supabase Dashboard

### 1. **message-media** (For Chat Photos/Videos/Files)

**Settings:**
```
Bucket Name: message-media
Public: NO (Private)
File Size Limit: 50 MB (52428800 bytes)
Allowed MIME Types:
  - image/jpeg, image/jpg, image/png, image/gif, image/webp
  - video/mp4, video/quicktime, video/webm
  - application/pdf
  - application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document
  - application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
```

**File Structure:**
```
message-media/
  ├── {user_id_1}/
  │   ├── 1699123456789_photo.jpg
  │   ├── 1699123789012_document.pdf
  │   └── 1699124012345_video.mp4
  ├── {user_id_2}/
  │   └── ...
```

**Purpose:** Store photos, videos, and documents shared in direct messages

---

## How to Create Buckets

### Option 1: Via Supabase Dashboard (Recommended)

1. Go to **Storage** in Supabase Dashboard
2. Click **"New bucket"**
3. Enter bucket name: `message-media`
4. Set **Public**: `OFF` (unchecked)
5. Configure **File Size Limit**: `52428800` (50MB)
6. Configure **Allowed MIME Types** (see list above)
7. Click **"Create bucket"**
8. Run migration `063_create_message_media_bucket.sql` to set up policies

### Option 2: Via SQL (Alternative)

Run the migration file:
```sql
-- In Supabase SQL Editor
-- Copy and paste contents of:
supabase/migrations/063_create_message_media_bucket.sql
```

---

## Storage Policies (Applied by Migration)

The migration `063_create_message_media_bucket.sql` creates these policies:

1. ✅ **Upload** - Users can upload to their own folder
2. ✅ **View** - Users can view media from conversations they're in
3. ✅ **Update** - Users can update their own uploads
4. ✅ **Delete** - Users can delete their own uploads

---

## File Size Limits

| Media Type | Max Size | Notes |
|------------|----------|-------|
| Images | 50 MB | JPEG, PNG, GIF, WebP |
| Videos | 50 MB | MP4, QuickTime, WebM |
| Documents | 50 MB | PDF, Word, Excel |

**Note:** You can adjust limits in bucket settings

---

## Example Usage (Frontend)

### Upload Image
```typescript
const uploadImage = async (file: File) => {
  const { data: { user } } = await supabase.auth.getUser();
  
  // Create file path: {user_id}/{timestamp}_{filename}
  const filePath = `${user.id}/${Date.now()}_${file.name}`;
  
  // Upload to storage
  const { data, error } = await supabase.storage
    .from('message-media')
    .upload(filePath, file);
  
  if (error) throw error;
  
  // Save message with media reference
  await supabase.from('messages').insert({
    sender_id: user.id,
    receiver_id: recipientId,
    content: '', // Empty for media-only messages
    message_type: 'image',
    media_type: 'image',
    media_size: file.size,
    metadata: {
      media_url: filePath,
      media_name: file.name
    }
  });
  
  return filePath;
};
```

### Get Public URL (for display)
```typescript
const getMediaUrl = (filePath: string) => {
  const { data } = supabase.storage
    .from('message-media')
    .getPublicUrl(filePath);
  
  return data.publicUrl;
};
```

---

## Security

✅ **Private bucket** - Files not publicly accessible
✅ **Authentication required** - Must be logged in
✅ **Folder isolation** - Users can only upload to their own folder
✅ **Conversation-based access** - Can only view media from your conversations
✅ **MIME type restrictions** - Only allowed file types can be uploaded
✅ **Size limits** - Prevents abuse with large files

---

## Monitoring

Check storage usage:
```sql
SELECT 
  bucket_id,
  COUNT(*) as file_count,
  pg_size_pretty(SUM(metadata->>'size')::bigint) as total_size
FROM storage.objects
WHERE bucket_id = 'message-media'
GROUP BY bucket_id;
```

---

## Cleanup (Optional)

Delete orphaned files (no associated message):
```sql
-- Find media files without associated messages
SELECT o.name 
FROM storage.objects o
WHERE o.bucket_id = 'message-media'
  AND NOT EXISTS (
    SELECT 1 FROM messages m
    WHERE m.metadata->>'media_url' = o.name
  );
```

---

## Cost Estimation

Supabase Storage pricing:
- **Storage**: $0.021/GB/month
- **Bandwidth**: $0.09/GB

Example:
- 1000 users
- 10 images per user (avg 2MB each)
- Total: 20GB storage = ~$0.42/month
- Downloads: 100GB/month = ~$9/month

