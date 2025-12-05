/**
 * Check Storage Buckets and Policies
 * Usage: node scripts/db/check-storage.js
 */
const { Client } = require('pg');

const CONNECTION_STRING = 'postgresql://postgres:V2jDbk6SUWOUuEBz@db.tfbwfcnjdmbqmoyljeys.supabase.co:5432/postgres';

async function checkStorage() {
  const client = new Client({ connectionString: CONNECTION_STRING });
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check all storage buckets
    console.log('=== Storage Buckets ===');
    const bucketsResult = await client.query(`
      SELECT id, name, public, file_size_limit, allowed_mime_types, created_at
      FROM storage.buckets
      ORDER BY name
    `);
    
    if (bucketsResult.rows.length > 0) {
      console.table(bucketsResult.rows);
    } else {
      console.log('❌ No storage buckets found!');
    }

    // Check connection-stories bucket specifically
    console.log('\n=== connection-stories Bucket ===');
    const csResult = await client.query(`
      SELECT * FROM storage.buckets WHERE id = 'connection-stories'
    `);
    
    if (csResult.rows.length > 0) {
      console.log('✅ Bucket exists:');
      console.log(JSON.stringify(csResult.rows[0], null, 2));
    } else {
      console.log('❌ connection-stories bucket NOT FOUND!');
    }

    // Check storage policies
    console.log('\n=== Storage Policies ===');
    const policiesResult = await client.query(`
      SELECT 
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual
      FROM pg_policies
      WHERE schemaname = 'storage'
      ORDER BY tablename, policyname
    `);
    
    if (policiesResult.rows.length > 0) {
      console.table(policiesResult.rows.map(p => ({
        table: p.tablename,
        policy: p.policyname,
        command: p.cmd,
        roles: p.roles?.join(', ')
      })));
    } else {
      console.log('❌ No storage policies found!');
    }

    // Check if there are any files in connection-stories
    console.log('\n=== Files in connection-stories ===');
    const filesResult = await client.query(`
      SELECT name, bucket_id, created_at, updated_at
      FROM storage.objects
      WHERE bucket_id = 'connection-stories'
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    if (filesResult.rows.length > 0) {
      console.table(filesResult.rows);
    } else {
      console.log('No files uploaded yet to connection-stories bucket');
    }

    // Check profile-pictures bucket too
    console.log('\n=== profile-pictures Bucket ===');
    const ppResult = await client.query(`
      SELECT * FROM storage.buckets WHERE id = 'profile-pictures' OR name = 'profile-pictures'
    `);
    
    if (ppResult.rows.length > 0) {
      console.log('✅ Bucket exists:');
      console.log(JSON.stringify(ppResult.rows[0], null, 2));
    } else {
      console.log('❌ profile-pictures bucket NOT FOUND!');
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

checkStorage();

