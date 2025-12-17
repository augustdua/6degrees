# Railway Scheduler (cron) setup — daily Market Research + Market Gaps

This schedules **one daily automation job** that:
- Fetches RSS news (Inc42 + Entrackr)
- Uses Gemini to pick **1 Market Research topic** + **1 Market Gap category** (and a brand set)
- Upserts the chosen topic/category into Supabase tables
- Publishes **1 Market Research report** + **1 Market Gap report** to the forum
- Is **idempotent per day (UTC)** (cron retries won’t double-post)

---

## 1) Required environment variables (Railway backend service)

Set these in the Railway service that runs the backend API:

- **Security**
  - `CRON_SECRET`: long random string (shared between Railway Scheduler request and backend)
- **Supabase (service role; required for inserts/upserts)**
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- **Publishing**
  - `SYSTEM_USER_ID`: the user id that "publishes" the generated forum posts
- **AI keys**
  - `GEMINI_API_KEY`
  - `GEMINI_MODEL` (optional; defaults to `gemini-2.0-flash`)
  - `PERPLEXITY_API_KEY` (used by report generation pipelines)

Optional (debug / artifacts):
- `MARKET_RESEARCH_SAVE_RUNS=true`
- `MARKET_GAPS_SAVE_RUNS=true`
- `MARKET_RESEARCH_RUNS_DIR=/app/runs` (if you attach a Railway volume) or leave default
- `MARKET_GAPS_RUNS_DIR=/app/runs`

---

## 2) Database setup (Supabase)

Run these SQL scripts once:
- `scripts/create_report_topic_tables.sql`
- `scripts/rename_pain_points_to_market_gaps.sql`

Notes:
- `market_gap_categories.brand_set` must be a JSON array of strings (brands), otherwise the MG pipeline can’t run.

---

## 3) Railway Scheduler — exact setup

In Railway:
- Go to **your backend service**
- Open **Scheduler / Cron** (Railway UI wording varies)
- **Create a new scheduled HTTP request**

Configure the request:
- **Method**: `POST`
- **URL**: `https://<YOUR_RAILWAY_DOMAIN>/api/jobs/daily`
  - The backend mounts `jobsRoutes` at `/api/jobs`, so the combined endpoint is `/api/jobs/daily`.
- **Headers**:
  - `x-cron-secret: <CRON_SECRET>`
  - `content-type: application/json`
- **Body** (optional; recommended):

```json
{
  "limit": 40,
  "country_context": "India",
  "priority": 90
}
```

Suggested schedule:
- Pick a consistent time (e.g. **07:30 UTC**). The job’s day-tagging uses **UTC**.

---

## 4) Test it manually (before scheduling)

Run a dry-run from your local machine to validate auth + env vars without publishing:

```bash
curl -X POST "https://<YOUR_RAILWAY_DOMAIN>/api/jobs/daily" \
  -H "x-cron-secret: <CRON_SECRET>" \
  -H "content-type: application/json" \
  --data "{\"dry_run\": true, \"limit\": 40, \"country_context\": \"India\", \"priority\": 90}"
```

Expected: `200` with `{ ok: true, dry_run: true, ... }`

Then run the real one (publishes 1 MR + 1 MG):

```bash
curl -X POST "https://<YOUR_RAILWAY_DOMAIN>/api/jobs/daily" \
  -H "x-cron-secret: <CRON_SECRET>" \
  -H "content-type: application/json" \
  --data "{\"limit\": 40, \"country_context\": \"India\", \"priority\": 90}"
```

---

## 5) What “idempotent” means (de-dupe behavior)

The backend tags posts:
- Market Research: `mr:day:YYYY-MM-DD` (+ `mr:topic:<topic_key>`)
- Market Gaps: `mg:day:YYYY-MM-DD` (+ `mg:category:<category_key>`)

If a post already exists in that community with today’s `mr:day:*` / `mg:day:*` tag, the job **skips** publishing for that community.

---

## 6) Troubleshooting

- **401 Unauthorized**
  - Missing/wrong `x-cron-secret` header
  - `CRON_SECRET` not set on the backend service
- **500 Missing GEMINI_API_KEY / SYSTEM_USER_ID / SUPABASE_* **
  - Env vars aren’t configured on Railway (or you forgot to redeploy after adding them)
- **200 skipped: already_ran_today**
  - It already published today (by UTC day tag). This is expected for cron retries.
- **200 skipped: no_active_topics / no_active_categories**
  - Your topic/category tables are empty or inactive. Seed them or rely on the idea agent (combined endpoint) to upsert.
- **Market gaps skipped: missing_brand_set**
  - The category row has no `brand_set` array (required).

---

## 7) Other endpoints (optional)

These exist but are usually unnecessary if you use the combined daily automation:
- `POST /api/jobs/market-research/daily`
- `POST /api/jobs/market-gaps/daily`
- `POST /api/jobs/ideas/preview` (idea agent only)

All of them require the same header: `x-cron-secret: <CRON_SECRET>`
