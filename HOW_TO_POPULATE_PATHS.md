# How to Populate Chain Paths for Existing Chains

You have **3 active chains** that need paths populated. Here are your options:

## Option 1: TypeScript Script (Recommended) ✅

This handles complex tree structures automatically using DFS traversal.

### Steps:

1. **Navigate to backend directory:**
```bash
cd backend
```

2. **Make sure your `.env` is configured:**
```bash
# backend/.env should have:
SUPABASE_URL=https://tfbwfcnjdmbqmoyljeys.supabase.co
SUPABASE_SERVICE_KEY=your_service_key
```

3. **Run the populate script:**
```bash
npm run populate-paths
```

### What it does:
- Fetches all active chains
- For each chain:
  - Builds parent-child adjacency list
  - Finds all leaf nodes (nodes with no children)
  - Runs DFS from creator to each leaf
  - Identifies subtree roots (direct children of creator)
  - Inserts paths into `chain_paths` table
- Shows progress and summary

### Expected Output:
```
🔄 Starting chain paths population...

📊 Found 3 active chains

Processing chain: fe6c99c1-7d0e-4911-8247-350c80bb0a91
  - Participants: 2
  - Paths found: 1
  ✅ Successfully inserted 1 paths

Processing chain: 35c701e0-0198-4b8a-a873-d2f4aef96fc4
  - Participants: 2
  - Paths found: 1
  ✅ Successfully inserted 1 paths

Processing chain: ccd70ea4-90f4-435b-8093-a869d03b6e98
  - Participants: 25
  - Paths found: 15
  ✅ Successfully inserted 15 paths

📊 Summary:
   Total chains processed: 3
   Total paths created: 17

✅ Script completed successfully!
```

---

## Option 2: Via API Endpoint

If the TypeScript script fails, you can use the API endpoint manually.

### Steps:

1. **Start your backend server:**
```bash
cd backend
npm run dev
```

2. **Get an auth token** (use Supabase dashboard or login via frontend)

3. **Call the API for each chain:**

```bash
# Chain 1
curl -X POST http://localhost:3001/api/paths/fe6c99c1-7d0e-4911-8247-350c80bb0a91/update \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json"

# Chain 2
curl -X POST http://localhost:3001/api/paths/35c701e0-0198-4b8a-a873-d2f4aef96fc4/update \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json"

# Chain 3 (large - 25 participants)
curl -X POST http://localhost:3001/api/paths/ccd70ea4-90f4-435b-8093-a869d03b6e98/update \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json"
```

---

## Option 3: Simple SQL (Only for Simple Chains)

**⚠️ Warning:** This only works for 2-level chains (creator → child). For complex trees, use Option 1.

### Steps:

1. **Open Supabase SQL Editor:**
   - Go to: https://supabase.com/dashboard/project/tfbwfcnjdmbqmoyljeys/sql

2. **Run this query to see your chain structures:**
```sql
SELECT
    c.id as chain_id,
    c.status,
    jsonb_array_length(c.participants) as participant_count,
    c.participants
FROM chains c
WHERE c.status = 'active';
```

3. **For simple 2-level chains, run:**
```sql
INSERT INTO chain_paths (
    chain_id,
    path_id,
    creator_id,
    leaf_userid,
    subtree_root_id,
    path_userids,
    path_participants,
    base_reward,
    current_reward,
    path_length,
    is_complete
)
SELECT
    c.id as chain_id,
    c.id || '-' || (p->>'userid') as path_id,
    (SELECT (p2->>'userid')::uuid FROM jsonb_array_elements(c.participants) p2 WHERE p2->>'role' = 'creator') as creator_id,
    (p->>'userid')::uuid as leaf_userid,
    (p->>'userid')::uuid as subtree_root_id,
    ARRAY[
        (SELECT (p2->>'userid')::uuid FROM jsonb_array_elements(c.participants) p2 WHERE p2->>'role' = 'creator'),
        (p->>'userid')::uuid
    ] as path_userids,
    jsonb_build_array(
        (SELECT p2 FROM jsonb_array_elements(c.participants) p2 WHERE p2->>'role' = 'creator'),
        p
    ) as path_participants,
    c.total_reward / (jsonb_array_length(c.participants) - 1) as base_reward,
    c.total_reward / (jsonb_array_length(c.participants) - 1) as current_reward,
    2 as path_length,
    (p->>'role' = 'target') as is_complete
FROM chains c
CROSS JOIN LATERAL jsonb_array_elements(c.participants) p
WHERE c.status = 'active'
    AND p->>'role' != 'creator'
    AND NOT EXISTS (
        SELECT 1 FROM chain_paths cp WHERE cp.chain_id = c.id
    );
```

---

## Verify Paths Were Created

After running any option, verify with:

```sql
-- Check path counts
SELECT
    c.id as chain_id,
    c.status,
    jsonb_array_length(c.participants) as participants,
    COUNT(cp.id) as paths_created
FROM chains c
LEFT JOIN chain_paths cp ON cp.chain_id = c.id
WHERE c.status = 'active'
GROUP BY c.id, c.status, c.participants;
```

Expected result:
```
chain_id                              | participants | paths_created
--------------------------------------|--------------|---------------
fe6c99c1-7d0e-4911-8247-350c80bb0a91 | 2            | 1
35c701e0-0198-4b8a-a873-d2f4aef96fc4 | 2            | 1
ccd70ea4-90f4-435b-8093-a869d03b6e98 | 25           | ~15-20
```

---

## Troubleshooting

### Script fails with "buildChainPaths is not defined"
- Make sure you're in the `backend` directory
- Run `npm install` first

### "Cannot find module 'dotenv/config'"
```bash
cd backend
npm install dotenv
```

### "Connection refused" when calling API
- Make sure backend is running: `npm run dev`
- Check the port (default: 3001)

### Paths created but rewards show 0
- This is expected initially
- Rewards will be calculated based on `base_reward` and decay logic
- Set `base_reward` values when chain completes

---

## Recommended Approach

**Use Option 1 (TypeScript Script)** - it's the most reliable and handles all edge cases:

```bash
cd backend
npm run populate-paths
```

Takes ~5 seconds and shows detailed progress!