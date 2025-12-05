# Database Utility Scripts

Helper scripts for database operations.

## Setup

Make sure `pg` is installed:
```bash
npm install pg
```

## Scripts

### check-user.js
Check if a user exists in both `auth.users` and `public.users` tables.

```bash
# Check default user (August)
node scripts/db/check-user.js

# Check specific user
node scripts/db/check-user.js "user-uuid-here"
```

### run-sql.js
Run arbitrary SQL queries.

```bash
# Run inline SQL
node scripts/db/run-sql.js "SELECT * FROM users LIMIT 5"

# Run SQL from file
node scripts/db/run-sql.js path/to/query.sql
```

### sync-user.js
Sync a user from `auth.users` to `public.users` (if missing).

```bash
# Sync default user
node scripts/db/sync-user.js

# Sync specific user
node scripts/db/sync-user.js "user-uuid-here"
```

## Connection

These scripts connect directly to the Supabase PostgreSQL database.

