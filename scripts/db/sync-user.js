/**
 * Sync User from auth.users to public.users
 * Usage: node scripts/db/sync-user.js [user_id]
 */
const { Client } = require('pg');

const CONNECTION_STRING = 'postgresql://postgres:V2jDbk6SUWOUuEBz@db.tfbwfcnjdmbqmoyljeys.supabase.co:5432/postgres';

const userId = process.argv[2] || 'dddffff1-bfed-40a6-a99c-28dccb4c5014';

async function syncUser() {
  const client = new Client({ connectionString: CONNECTION_STRING });
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');
    console.log(`🔄 Syncing user: ${userId}\n`);

    // Check if user exists in auth.users
    const authResult = await client.query(
      'SELECT id, email, raw_user_meta_data, created_at FROM auth.users WHERE id = $1',
      [userId]
    );
    
    if (authResult.rows.length === 0) {
      console.log('❌ User not found in auth.users - cannot sync');
      return;
    }

    const authUser = authResult.rows[0];
    console.log('Found in auth.users:', authUser.email);

    // Check if already in public.users
    const publicResult = await client.query(
      'SELECT id FROM public.users WHERE id = $1',
      [userId]
    );

    if (publicResult.rows.length > 0) {
      console.log('✅ User already exists in public.users');
      return;
    }

    // Extract metadata
    const meta = authUser.raw_user_meta_data || {};
    const firstName = meta.first_name || meta.name?.split(' ')[0] || authUser.email.split('@')[0];
    const lastName = meta.last_name || meta.name?.split(' ').slice(1).join(' ') || '';

    // Insert into public.users
    const insertResult = await client.query(`
      INSERT INTO public.users (id, email, first_name, last_name, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING id, email, first_name, last_name
    `, [userId, authUser.email, firstName, lastName, authUser.created_at]);

    console.log('✅ User synced to public.users:');
    console.table(insertResult.rows);

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

syncUser();

