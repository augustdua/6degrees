### Daily (in-house guide)

This document is the canonical reference for how **Zaurq** integrates Daily for real-time audio/video (rooms + meeting tokens), and how we should build new Daily-backed features safely.

---

### What we use Daily for (in Zaurq)
- **Coworking**: recurring scheduled sessions, book + join.
- **Intro / consultation calls**: per-call rooms with meeting tokens.

---

### API key ownership + security
- **API key location**: Daily Dashboard → **Developers** section.
- **Who can view**: domain owners/admins; **members cannot** view/regenerate.
- **Never put the API key in frontend/browser code**. All Daily REST API calls must happen server-side.
- **In Zaurq**: API key is provided via environment variable `DAILY_API_KEY` (backend only).

---

### REST API authentication
Daily REST API uses Bearer token auth:

```bash
curl --request GET \
  --url https://api.daily.co/v1/rooms \
  --header "Authorization: Bearer DAILY_API_KEY"
```

Behavior:
- **Missing/bad Authorization header** → HTTP **400** with `error: "authorization-header-error"`.
- **Invalid API key** → HTTP **401** with `error: "authentication-error"`.

---

### Rate limits (design implications)
Daily rate limits can return **429 rate-limit-error**. Implement retries with **exponential backoff**.

Expected limits (may change over time):
- **Most endpoints**: ~20 req/s (or 100 requests / 5 sec window)
- **DELETE /rooms/:name** and **GET /recordings**: ~2 req/s (or 50 / 30 sec)
- **Start recording / livestream / PSTN / SIP**: ~1 req/s (or 5 / 5 sec)

---

### Error responses (what to log)
Daily errors come as HTTP 4xx/5xx with body:

```json
{
  "error": "invalid-request-error",
  "info": "bad Authorization header format"
}
```

Stable: `error` string. Unstable: `info` (human-readable and may change).

---

### Pagination (Rooms, Recordings)
Room list/recordings list:
- returns max **100** objects per call
- supports `limit`, `starting_after`, `ending_before` (`ending_before=OLDEST` supported)

Example:

```bash
curl -H "Authorization: Bearer DAILY_API_KEY" \
  "https://api.daily.co/v1/rooms?limit=5"
```

---

### Rooms (core concepts)
- A Daily **room** is a joinable location with configuration, accessible at:
  - `https://<your-domain>.daily.co/<room-name>/`
- Recommended production pattern: **create rooms server-side**, never hardcode sensitive URLs.
- Security model:
  - `privacy: "public"`: anyone with URL can join
  - `privacy: "private"`: require a meeting token (recommended for Zaurq)
- Time bounds:
  - `properties.nbf`: not-before timestamp (seconds)
  - `properties.exp`: expires timestamp (seconds)
  - Optional: `eject_at_room_exp` to kick participants when expired.

Zaurq rule of thumb:
- **All product rooms should be private**.
- Always set a reasonable **exp** (especially for scheduled sessions).

---

### Meeting tokens (core concepts)
Meeting tokens allow controlled access to rooms without exposing your API key.

**Important gotcha (Zaurq-specific):**
- Daily rejects the property `user_data` inside meeting token properties (we saw: `invalid property name 'user_data'`).
- Therefore: **do not send `user_data` in meeting token payloads**.
- If you need metadata, store it in **our DB** (recommended) or use Daily **meeting session data** endpoints.

Minimal meeting-token payload we use:
- `room_name`
- `user_name`
- optional: `is_owner`
- optional: `exp`

---

### Where our code lives
- **Backend wrappers**: `backend/src/services/dailyService.ts`
  - `createNamedRoom(roomName, expiresIn, maxParticipants)`
  - `generateMeetingToken(roomName, userName, isOwner, expiresIn)`
- **Backend usage examples**:
  - Coworking: `backend/src/routes/coworking.ts`
  - Consultation calls: `backend/src/controllers/consultationController.ts`
  - Intro/PayNet calls: `backend/src/controllers/paynetController.ts`
- **Frontend joining** (custom app): `frontend/src/components/DailyCallProvider.tsx`
  - Uses `@daily-co/daily-js` and joins via `callObject.join({ url, token, userName })`

---

### Recommended Zaurq patterns
- **Backend-only Daily calls**:
  - create room (idempotent when possible)
  - generate meeting token
  - return `{ roomUrl, token }` to frontend
- **Retries/backoff**:
  - retry 429 with exponential backoff + jitter
  - log Daily `error` + `info` for debugging (but do not rely on `info` being stable)
- **Storage of app metadata**:
  - store booking intent / participants / roles in **Supabase** tables
  - do not rely on unsupported token properties















