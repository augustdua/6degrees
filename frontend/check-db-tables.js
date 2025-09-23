// Simple script to check what tables exist in the Supabase database
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tfbwfcnjdmbqmoyljeys.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmYndmY25qZG1icW1veWxqZXlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUwNzQ4NjYsImV4cCI6MjA1MDY1MDg2Nn0.tuArvsw6OK9WG52VRuYMlUJYhKHFtzMaA8v6L28hNRA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTables() {
  try {
    console.log('Checking database tables...');
    
    // Try to query each table to see if it exists
    const tables = ['users', 'connection_requests', 'chains', 'invites', 'wallets', 'transactions', 'target_claims', 'notifications'];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`❌ Table '${table}': ${error.message}`);
        } else {
          console.log(`✅ Table '${table}': exists (${data.length} rows)`);
        }
      } catch (err) {
        console.log(`❌ Table '${table}': ${err.message}`);
      }
    }
  } catch (error) {
    console.error('Error checking tables:', error);
  }
}

checkTables();
