# Forum Database Structure

## Tables Overview

| Table | Purpose |
|-------|---------|
| `forum_communities` | 4 predefined communities |
| `forum_projects` | Build in Public projects |
| `forum_posts` | Posts in communities |
| `forum_comments` | Comments + quick replies |
| `forum_reactions` | Emoji reactions |
| `forum_interactions` | Tracking data |
| `forum_follows` | User follows |

---

## 1. forum_communities

Pre-seeded with 4 communities.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Display name |
| slug | TEXT | URL slug (unique) |
| description | TEXT | Community description |
| icon | TEXT | Emoji icon |
| color | TEXT | Hex color |
| created_at | TIMESTAMPTZ | Created timestamp |

**Seeded Values:**
| slug | name | icon | color |
|------|------|------|-------|
| build-in-public | Build in Public | 🚀 | #10B981 |
| network | Network | 🤝 | #8B5CF6 |
| wins | Wins & Brags | 🏆 | #F59E0B |
| failures | Failures & Lessons | 💔 | #EF4444 |

---

## 2. forum_projects

For Build in Public tracking.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Owner (FK → users) |
| name | TEXT | Project name |
| url | TEXT | Project URL (optional) |
| description | TEXT | Description (optional) |
| logo_url | TEXT | Logo URL (optional) |
| started_at | DATE | Start date |
| is_active | BOOLEAN | Active status |
| created_at | TIMESTAMPTZ | Created timestamp |
| updated_at | TIMESTAMPTZ | Updated timestamp |

---

## 3. forum_posts

Main posts table.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| community_id | UUID | FK → forum_communities |
| user_id | UUID | FK → users |
| content | TEXT | Post content |
| media_urls | TEXT[] | Array of image URLs |
| project_id | UUID | FK → forum_projects (optional) |
| day_number | INTEGER | Day number for BIP (optional) |
| milestone_title | TEXT | Milestone title (optional) |
| post_type | TEXT | 'regular', 'request', 'win', 'failure', 'bip_day' |
| is_pinned | BOOLEAN | Pinned status |
| is_deleted | BOOLEAN | Soft delete |
| created_at | TIMESTAMPTZ | Created timestamp |
| updated_at | TIMESTAMPTZ | Updated timestamp |

---

## 4. forum_comments

Comments and quick replies.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| post_id | UUID | FK → forum_posts |
| user_id | UUID | FK → users |
| content | TEXT | Comment text (null for quick replies) |
| quick_reply_type | TEXT | NULL or: 'can_intro', 'paid_intro', 'watching', 'ship_it', 'dm_me' |
| is_deleted | BOOLEAN | Soft delete |
| created_at | TIMESTAMPTZ | Created timestamp |

**Quick Reply Types:**
| Type | Display Text |
|------|-------------|
| can_intro | I can intro you 🤝 |
| paid_intro | Paid intro available 💸 |
| watching | Watching this 👀 |
| ship_it | Ship it 🚀 |
| dm_me | DM me 💬 |

---

## 5. forum_reactions

Emoji reactions on posts/comments.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK → users |
| target_type | TEXT | 'post' or 'comment' |
| target_id | UUID | Post ID or Comment ID |
| emoji | TEXT | One of 8 allowed emojis |
| created_at | TIMESTAMPTZ | Created timestamp |

**Allowed Emojis:** ❤️ 🔥 🚀 💯 🙌 🤝 💸 👀

---

## Sample Insert Queries

### Create a Build in Public Post

```sql
-- First get the community ID
-- build-in-public community

INSERT INTO forum_posts (
  community_id,
  user_id,
  content,
  media_urls,
  day_number,
  milestone_title,
  post_type
) VALUES (
  (SELECT id FROM forum_communities WHERE slug = 'build-in-public'),
  'USER_UUID_HERE',
  'Day 42: Finally hit $5k MRR! 🎉 The cold email strategy is working. Sent 200 emails, got 15 replies, closed 3 deals.',
  ARRAY['https://example.com/screenshot.png'],
  42,
  'Hit $5k MRR',
  'bip_day'
);
```

### Create a Network Post (Looking for Intro)

```sql
INSERT INTO forum_posts (
  community_id,
  user_id,
  content,
  post_type
) VALUES (
  (SELECT id FROM forum_communities WHERE slug = 'network'),
  'USER_UUID_HERE',
  'Looking for an intro to any VC partner at Sequoia India. Building a B2B SaaS for SMBs, $50k ARR, growing 20% MoM.',
  'request'
);
```

### Create a Win Post

```sql
INSERT INTO forum_posts (
  community_id,
  user_id,
  content,
  media_urls,
  post_type
) VALUES (
  (SELECT id FROM forum_communities WHERE slug = 'wins'),
  'USER_UUID_HERE',
  'Just closed our seed round! $1.5M from Accel and angels. Took 3 months and 47 meetings. Happy to share learnings.',
  ARRAY['https://example.com/celebration.jpg'],
  'win'
);
```

### Create a Failure Post

```sql
INSERT INTO forum_posts (
  community_id,
  user_id,
  content,
  post_type
) VALUES (
  (SELECT id FROM forum_communities WHERE slug = 'failures'),
  'USER_UUID_HERE',
  'Shut down my startup after 18 months. Raised $500k, burned through it in 14 months. Key learnings: 1) Validate before building 2) Hire slow, fire fast 3) Don''t ignore churn signals',
  'failure'
);
```

### Add a Comment

```sql
INSERT INTO forum_comments (
  post_id,
  user_id,
  content
) VALUES (
  'POST_UUID_HERE',
  'USER_UUID_HERE',
  'Congrats! Would love to learn more about your cold email strategy.'
);
```

### Add a Quick Reply

```sql
INSERT INTO forum_comments (
  post_id,
  user_id,
  content,
  quick_reply_type
) VALUES (
  'POST_UUID_HERE',
  'USER_UUID_HERE',
  'I can intro you 🤝',
  'can_intro'
);
```

### Add Reactions

```sql
INSERT INTO forum_reactions (user_id, target_type, target_id, emoji)
VALUES 
  ('USER_UUID_HERE', 'post', 'POST_UUID_HERE', '🔥'),
  ('USER_UUID_HERE', 'post', 'POST_UUID_HERE', '🚀');
```

---

## Get User IDs for Testing

```sql
-- Get some user IDs to use for synthetic data
SELECT id, first_name, last_name, email 
FROM users 
LIMIT 20;
```

## Get Community IDs

```sql
SELECT id, slug, name FROM forum_communities;
```

