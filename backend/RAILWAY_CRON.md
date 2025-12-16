# Railway cron setup (daily report generation)

## 1) Env vars (backend service)
- `CRON_SECRET`: random long string (shared between Railway cron and backend)
- `SYSTEM_USER_ID`: the user id that "publishes" the generated posts
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `PERPLEXITY_API_KEY`, `GEMINI_API_KEY`, `GEMINI_MODEL`

Optional:
- `MARKET_RESEARCH_SAVE_RUNS=true`
- `MARKET_GAPS_SAVE_RUNS=true`
- `MARKET_RESEARCH_RUNS_DIR=/app/runs` (Railway volume) or leave default
- `MARKET_GAPS_RUNS_DIR=/app/runs`

## 2) Cron endpoints
Configure Railway cron (or Railway Scheduler) to `POST` daily:

- Market Research: `POST /api/jobs/market-research/daily`
- Market Gaps: `POST /api/jobs/market-gaps/daily`

Include header:
- `x-cron-secret: <CRON_SECRET>`

## 3) Supabase lists
Run the SQL scripts:
- `scripts/create_report_topic_tables.sql`
- `scripts/rename_pain_points_to_market_gaps.sql`

Then insert rows into:
- `market_research_topics`
- `market_gap_categories` (must include a `brand_set` JSON array)

## 4) De-dupe behavior
The backend inserts tags:
- `mr:<topic_key>` for research
- `mg:<category_key>` for market gaps

If a post with that tag already exists in the target community, the job skips it and tries another row.



