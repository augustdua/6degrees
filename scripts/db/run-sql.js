/**
 * Run SQL Script
 * Usage: node scripts/db/run-sql.js "SELECT * FROM users LIMIT 5"
 * Or:    node scripts/db/run-sql.js path/to/file.sql
 */
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const CONNECTION_STRING = 'postgresql://postgres:V2jDbk6SUWOUuEBz@db.tfbwfcnjdmbqmoyljeys.supabase.co:5432/postgres';

async function runSQL() {
  let sql = process.argv[2];
  
  if (!sql) {
    console.log('Usage: node scripts/db/run-sql.js "SELECT * FROM users LIMIT 5"');
    console.log('   Or: node scripts/db/run-sql.js path/to/file.sql');
    process.exit(1);
  }

  // Check if it's a file path
  if (sql.endsWith('.sql') && fs.existsSync(sql)) {
    sql = fs.readFileSync(sql, 'utf8');
    console.log('📄 Running SQL from file...\n');
  }

  const client = new Client({ connectionString: CONNECTION_STRING });
  
  try {
    await client.connect();
    console.log('✅ Connected\n');
    
    const result = await client.query(sql);
    
    if (result.rows && result.rows.length > 0) {
      console.table(result.rows);
      console.log(`\n📊 ${result.rows.length} row(s) returned`);
    } else if (result.rowCount !== null) {
      console.log(`✅ Query executed. ${result.rowCount} row(s) affected.`);
    } else {
      console.log('✅ Query executed successfully.');
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

runSQL();

