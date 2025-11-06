import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tfbwfcnjdmbqmoyljeys.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmYndmY25qZG1icW1veWxqZXlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjcyODQ5NzEsImV4cCI6MjA0Mjg2MDk3MX0.ztEfe9NiJFbkt_bX-JN0pVKVK8j_lvlGRKaOADH_FQ0';

console.log('🔧 Supabase URL:', supabaseUrl);
console.log('🔧 Supabase Anon Key:', supabaseAnonKey.substring(0, 20) + '...');

// Use the same configuration as the main app
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: 'sb-6degree-miniapp', // custom key to avoid collisions with main app
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
});

