## Founder Profile deploy notes

### 1) Apply Supabase migrations
- `supabase/migrations/20251225210000_founder_projects.sql`
- `supabase/migrations/20251225211000_daily_standups_project_and_blockers.sql`

### 2) Verify backend endpoints
- **My venture project**
  - `GET /api/profile/me/project`
  - `PUT /api/profile/me/project`
- **Public venture project**
  - `GET /api/profile/:userId/project`
- **Public standup feed (completed standups only)**
  - `GET /api/profile/:userId/standups?limit=20`
- **Daily standup submit now supports blockers**
  - `POST /api/daily-standup/submit` body supports optional `blockers`
  - `GET /api/daily-standup/history` returns `blockers` + `project_id`

### 3) Frontend smoke test
- Submit a standup with blockers → check it appears in:
  - `UserProfile` (owner) “Founder Journey” card
  - `PublicProfile` (public) “Founder Journey” section (only if `is_profile_public` is true)
- Edit venture fields (demo/pitch URLs) → save → refresh page → values persist


