# Video Likes & Comments Integration Guide

## 📋 Summary

Good news! We can **reuse existing tables** for the new video likes and comments features. No new tables needed!

## ✅ What Already Exists

### 1. **`chain_likes` table** - For Video Likes
- Already has `request_id` column that references `connection_requests`
- Already has `chain_id` column that references `chains`
- **Can be used for both chain likes AND video likes!**

**Structure:**
```sql
- id (uuid)
- user_id (uuid) → references users
- chain_id (uuid) → references chains
- request_id (uuid) → references connection_requests ✨ USE THIS FOR VIDEOS
- created_at (timestamp)
```

### 2. **`group_messages` table** - For Comments
- Stores chain group chat messages
- In the UI, we renamed "Group Chat" to "Comments" (no DB change needed)
- Links to chains via `chain_id`

**Structure:**
```sql
- id (uuid)
- chain_id (uuid) → references chains
- sender_id (uuid) → references users
- content (text)
- sent_at (timestamp)
- edited_at (timestamp)
```

### 3. **`message_reactions` table** - For Comment Reactions
- Already supports emoji reactions (❤️ 👍 😂) on group messages
- References `group_messages.id`

## 🆕 What the Migration Adds

**File:** `supabase/migrations/038_add_video_likes_and_comments_counts.sql`

### New Columns:
1. **`connection_requests.likes_count`** (integer, default 0)
   - Denormalized count for performance
   - Auto-updated by trigger

2. **`chains.comments_count`** (integer, default 0)
   - Denormalized count for performance
   - Auto-updated by trigger

### New Triggers:
- `trg_update_request_likes_count` - Auto-updates `likes_count` when likes are added/removed
- `trg_update_chain_comments_count` - Auto-updates `comments_count` when messages are added/removed

### Backfill:
- Counts all existing likes and comments and populates the new columns

## 🔧 Backend Integration

### 1. Like a Video (Connection Request)

**Endpoint:** `POST /api/requests/:requestId/like`

```typescript
// backend/src/controllers/requestController.ts
export const likeVideo = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { requestId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if already liked
    const { data: existingLike } = await supabase
      .from('chain_likes')
      .select('id')
      .eq('user_id', userId)
      .eq('request_id', requestId)
      .maybeSingle();

    if (existingLike) {
      // Unlike - delete the like
      const { error } = await supabase
        .from('chain_likes')
        .delete()
        .eq('user_id', userId)
        .eq('request_id', requestId);

      if (error) throw error;

      // Get updated count
      const { data: request } = await supabase
        .from('connection_requests')
        .select('likes_count')
        .eq('id', requestId)
        .single();

      return res.json({ 
        liked: false, 
        likesCount: request?.likes_count || 0 
      });
    } else {
      // Like - insert new like
      // Note: chain_id can be NULL for video likes on requests without chains yet
      const { error } = await supabase
        .from('chain_likes')
        .insert({
          user_id: userId,
          request_id: requestId,
          chain_id: null // Optional: fetch chain_id if exists
        });

      if (error) throw error;

      // Get updated count
      const { data: request } = await supabase
        .from('connection_requests')
        .select('likes_count')
        .eq('id', requestId)
        .single();

      return res.json({ 
        liked: true, 
        likesCount: request?.likes_count || 0 
      });
    }
  } catch (error) {
    console.error('Error toggling like:', error);
    return res.status(500).json({ error: 'Failed to toggle like' });
  }
};
```

### 2. Get Video with Like Status

When fetching connection requests, include like status:

```typescript
const { data: request } = await supabase
  .from('connection_requests')
  .select(`
    *,
    likes_count,
    user_has_liked:chain_likes!request_id(user_id)
  `)
  .eq('id', requestId)
  .eq('chain_likes.user_id', userId)
  .single();

// Check if user liked it
const isLiked = request.user_has_liked && request.user_has_liked.length > 0;
```

### 3. Get Comments for a Request

**Endpoint:** `GET /api/requests/:requestId/comments`

```typescript
export const getRequestComments = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { requestId } = req.params;

    // First, get the chain for this request
    const { data: chain } = await supabase
      .from('chains')
      .select('id')
      .eq('request_id', requestId)
      .maybeSingle();

    if (!chain) {
      return res.json({ comments: [], count: 0 });
    }

    // Get comments (group messages) for this chain
    const { data: comments, error } = await supabase
      .from('group_messages')
      .select(`
        id,
        content,
        sent_at,
        edited_at,
        sender:users!sender_id (
          id,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .eq('chain_id', chain.id)
      .order('sent_at', { ascending: true });

    if (error) throw error;

    return res.json({ 
      comments: comments || [], 
      count: comments?.length || 0 
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return res.status(500).json({ error: 'Failed to fetch comments' });
  }
};
```

## 🎨 Frontend Integration

### 1. Update VideoModal.tsx

```typescript
// Add state for fetching like status from backend
const [isLiked, setIsLiked] = useState(false);
const [likeCount, setLikeCount] = useState(0);

// Fetch like status on mount
useEffect(() => {
  if (requestId) {
    fetch(`/api/requests/${requestId}/like-status`)
      .then(res => res.json())
      .then(data => {
        setIsLiked(data.isLiked);
        setLikeCount(data.likesCount);
      });
  }
}, [requestId]);

const handleLike = async () => {
  try {
    const response = await fetch(`/api/requests/${requestId}/like`, {
      method: 'POST'
    });
    const data = await response.json();
    setIsLiked(data.liked);
    setLikeCount(data.likesCount);
  } catch (error) {
    console.error('Failed to toggle like:', error);
  }
};
```

### 2. Update VideoFeedCard.tsx

Same approach as VideoModal - fetch and update like status from backend.

### 3. Fetch Comments Count

When displaying videos, include the comments count:

```typescript
// In useRequests hook or wherever you fetch connection requests
const { data } = await supabase
  .from('connection_requests')
  .select(`
    *,
    likes_count,
    chain:chains!request_id (
      id,
      comments_count
    )
  `)
  .eq('id', requestId)
  .single();

// Display comments_count in UI
<span>{data.chain?.comments_count || 0}</span>
```

## 🗂️ Database Relationships

```
connection_requests (videos)
    ↓
    ├── chain_likes (request_id) → Video Likes
    └── chains
            ├── group_messages (chain_id) → Comments
            └── message_reactions (message_id) → Comment Reactions
```

## ⚙️ Migration Instructions

1. **Review the migration file:**
   ```bash
   cat supabase/migrations/038_add_video_likes_and_comments_counts.sql
   ```

2. **Apply the migration:**
   ```bash
   # Using Supabase CLI
   supabase db push

   # OR manually in Supabase SQL Editor
   # Copy and paste the migration file contents
   ```

3. **Verify the migration:**
   ```sql
   -- Check that columns were added
   SELECT likes_count FROM connection_requests LIMIT 5;
   SELECT comments_count FROM chains LIMIT 5;

   -- Check that triggers were created
   SELECT trigger_name FROM information_schema.triggers 
   WHERE trigger_name LIKE '%likes%' OR trigger_name LIKE '%comments%';
   ```

## 📝 Testing Checklist

- [ ] Migration runs successfully
- [ ] `likes_count` column exists on `connection_requests`
- [ ] `comments_count` column exists on `chains`
- [ ] Existing likes are backfilled correctly
- [ ] Existing comments are backfilled correctly
- [ ] Triggers auto-update counts when likes are added/removed
- [ ] Triggers auto-update counts when comments are added/removed
- [ ] Backend API endpoints work for liking videos
- [ ] Backend API endpoints work for fetching comments
- [ ] Frontend displays like counts correctly
- [ ] Frontend displays comment counts correctly
- [ ] Frontend can toggle likes
- [ ] Frontend can view comments

## 🚀 Ready to Deploy

Once the migration is applied and tested, the new like and comment features will be fully functional!

**No data loss, no breaking changes** - everything is backward compatible.

