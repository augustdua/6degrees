# Quick Start: Populate Chain Paths

## Step 1: Check your backend .env file

Make sure `backend/.env` has:
```env
SUPABASE_URL=https://tfbwfcnjdmbqmoyljeys.supabase.co
SUPABASE_ANON_KEY=your_anon_key
# OR
SUPABASE_SERVICE_KEY=your_service_key
```

## Step 2: Run the script

```bash
cd backend
npm run populate-paths
```

## Expected Output:

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

## Step 3: Verify

```bash
# Use psql to verify
psql "postgresql://postgres.tfbwfcnjdmbqmoyljeys:xNITe8JKRWe8imvh@aws-1-eu-north-1.pooler.supabase.com:6543/postgres" \
  -c "SELECT COUNT(*) as total_paths FROM chain_paths;"
```

Should show: `total_paths | 17` (or similar)

## Done! 🎉

Your existing chains now have paths stored in the database, ready for:
- Subtree-based reward decay
- Freeze mechanics per subtree
- Efficient reward distribution when chains complete