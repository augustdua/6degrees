/**
 * Check User Script
 * Usage: node scripts/db/check-user.js [user_id]
 */
const { Client } = require('pg');

const CONNECTION_STRING = 'postgresql://postgres:V2jDbk6SUWOUuEBz@db.tfbwfcnjdmbqmoyljeys.supabase.co:5432/postgres';

const userId = process.argv[2] || 'dddffff1-bfed-40a6-a99c-28dccb4c5014';

async function checkUser() {
  const client = new Client({ connectionString: CONNECTION_STRING });
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');
    console.log(`🔍 Checking user: ${userId}\n`);

    // Check public.users
    console.log('=== public.users ===');
    const result1 = await client.query(
      'SELECT id, email, first_name, last_name, created_at FROM public.users WHERE id = $1',
      [userId]
    );
    
    if (result1.rows.length > 0) {
      console.log('✅ User FOUND:');
      console.table(result1.rows);
    } else {
      console.log('❌ User NOT FOUND in public.users');
    }

    // Check auth.users
    console.log('\n=== auth.users ===');
    const result2 = await client.query(
      'SELECT id, email, created_at, last_sign_in_at FROM auth.users WHERE id = $1',
      [userId]
    );
    
    if (result2.rows.length > 0) {
      console.log('✅ User FOUND:');
      console.table(result2.rows);
    } else {
      console.log('❌ User NOT FOUND in auth.users');
    }

    // Summary
    console.log('\n=== Summary ===');
    const inPublic = result1.rows.length > 0;
    const inAuth = result2.rows.length > 0;
    
    if (inPublic && inAuth) {
      console.log('✅ User exists in both tables - all good!');
    } else if (inAuth && !inPublic) {
      console.log('⚠️  User exists in auth.users but NOT in public.users - needs sync!');
    } else if (!inAuth && !inPublic) {
      console.log('❌ User does not exist anywhere');
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

checkUser();

