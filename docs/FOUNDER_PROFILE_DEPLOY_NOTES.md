## Founder Profile deploy notes (Deprecated)

The **Founder Journey / Daily Standups / Coworking** surfaces were removed from the app.

- **Do not apply** the old founder/standup migrations.
- **Do not rely** on `/api/profile/*project*`, `/api/profile/*standups*`, or `/api/daily-standup/*` endpoints.

If your DB previously had these tables/columns, use the cleanup migration:
- `supabase/migrations/20260109150000_drop_coworking_standups_founder_journey.sql`













