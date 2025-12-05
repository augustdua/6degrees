# Forum Communities System - Core Build

## Overview
Discord-style forum with 4 communities, quick replies for zero-typing engagement, and interaction tracking. Forum added as tab in Feed page.

---

## Database Schema (`supabase/migrations/102_forum_communities.sql`)

### 1. `forum_communities`
```sql
id UUID PRIMARY KEY, name TEXT, slug TEXT UNIQUE, description TEXT, icon TEXT, color TEXT, created_at TIMESTAMPTZ
```
Seeds: build-in-public, network, wins, failures

### 2. `forum_posts`
```sql
id, community_id, user_id, content TEXT, media_urls TEXT[]
project_id UUID (nullable), day_number INT, milestone_title TEXT
post_type TEXT ('regular','request','win','failure','bip_day')
is_pinned BOOLEAN, is_deleted BOOLEAN, created_at, updated_at
```

### 3. `forum_projects` (Build in Public)
```sql
id, user_id, name, url, description, logo_url, started_at, is_active BOOLEAN
```

### 4. `forum_comments` (flat + quick replies)
```sql
id, post_id, user_id, content TEXT
quick_reply_type TEXT NULL (can_intro, paid_intro, watching, ship_it, dm_me)
created_at, is_deleted BOOLEAN
```

### 5. `forum_reactions`
```sql
id, user_id, target_type TEXT ('post'|'comment'), target_id UUID, emoji TEXT, created_at
```
Only 8 emojis allowed: ❤️ 🔥 🚀 💯 🙌 🤝 💸 👀

### 6. `forum_interactions` (tracking everything)
```sql
user_id, interaction_type TEXT, post_id, comment_id, community_id, metadata JSONB, created_at
INDEX on created_at (for cleanup cron)
```
Types: view, scroll_50, scroll_90, time_spent, reaction, quick_reply, comment, share

### 7. `forum_follows`
```sql
user_id, community_id (nullable), project_id (nullable), created_at
```

---

## Backend API (`backend/src/routes/forum.ts`)

**Communities:**
- `GET /api/forum/communities` - List all 4 communities
- `GET /api/forum/communities/:slug` - Get community details

**Posts:**
- `GET /api/forum/posts?community=&page=&limit=` - Feed with pagination
- `POST /api/forum/posts` - Create post
- `GET /api/forum/posts/:id` - Get post with comments
- `DELETE /api/forum/posts/:id` - Delete own post

**Quick Replies (zero typing):**
- `POST /api/forum/posts/:postId/quick-reply` - One-tap comment
  Body: `{ type: "can_intro" | "paid_intro" | "watching" | "ship_it" | "dm_me" }`

**Comments:**
- `POST /api/forum/posts/:id/comments` - Add comment
- `DELETE /api/forum/comments/:id` - Delete own comment

**Reactions:**
- `POST /api/forum/reactions` - Add/toggle reaction (only 8 emojis enforced)
- `GET /api/forum/posts/:id/reactions` - Get reaction counts

**Build in Public:**
- `GET /api/forum/projects/mine` - My projects
- `POST /api/forum/projects` - Create project
- `GET /api/forum/projects/:id/timeline` - Get all days for a project

**Tracking:**
- `POST /api/forum/track-batch` - Accept array of up to 100 interactions

---

## Frontend

### Navigation
Add "Forum" as tab in Feed.tsx (alongside Offers, Requests, People, etc.)

### Forum Sub-tabs
When Forum tab active, show: All | Build in Public | Network | Wins | Failures

### Components
- `ForumTabContent.tsx` - Community sub-tabs + post feed
- `ForumPostCard.tsx` - Post with reactions + quick replies
- `ForumReactionBar.tsx` - 8 animated emojis: ❤️ 🔥 🚀 💯 🙌 🤝 💸 👀
- `ForumQuickReplyBar.tsx` - 5 buttons:
  - 🤝 I can intro you
  - 💸 Paid intro available
  - 👀 Watching this
  - 🚀 Ship it
  - DM me
- `ForumCommentList.tsx` - Flat comments (quick replies shown as styled comments)
- `CreateForumPostModal.tsx` - Post creation
- `ProjectTimeline.tsx` - Day-by-day Build in Public view

### Hooks
- `useForumPosts.ts` - Fetch/paginate posts
- `useForumReactions.ts` - Handle reactions
- `useForumInteractionTracker.ts` - Batch send every 5 seconds

---

## Quick Reply Display
When user taps quick reply, shows as comment:
> "Rohan · Black Platinum · I can intro you 🤝" (42 reactions)

---

## Build in Public UI
- Day X badge (auto-calculated from project start)
- Update content + media (1-4 images or 1 video)
- Milestone markers (special styling)
- Quick navigation between days

---

## Interaction Tracking
Track on frontend, batch send every 5 seconds:
```typescript
{
  type: 'view' | 'scroll_50' | 'scroll_90' | 'time_spent' | 'reaction' | 'quick_reply' | 'comment' | 'share',
  post_id: string,
  community_id: string,
  metadata: {
    scroll_depth: 0.75,
    time_spent_ms: 12000,
    source: 'feed' | 'direct' | 'notification'
  }
}
```

---

## To-dos

- [x] Fix connection search in connection stories modal
- [x] Add public view toggle on profile page
- [ ] Create forum database migration (7 tables + seeds + indexes)
- [ ] Build forum API routes and controllers
- [ ] Add Forum tab to Feed.tsx with community sub-tabs
- [ ] Build ForumPostCard with reaction bar (8 emojis) + quick reply bar (5 buttons)
- [ ] Build ForumCommentList showing quick replies as styled comments
- [ ] Build CreateForumPostModal
- [ ] Build Build in Public project timeline UI
- [ ] Implement batch interaction tracking hook + API
